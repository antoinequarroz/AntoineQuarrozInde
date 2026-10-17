import { execFile } from 'node:child_process'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { createError } from 'h3'

export const MAX_SOCIAL_VIDEO_BYTES = 20 * 1024 * 1024
export const MAX_SOCIAL_VIDEO_REQUEST_BYTES = Math.ceil(MAX_SOCIAL_VIDEO_BYTES / 3) * 4 + 1024
const run = promisify(execFile)

function invalid(message = 'MP4 invalide : H.264, yuv420p, 3 à 60 s, 23 à 60 images/s, format 9:16 à 1,91:1 requis.'): never {
  throw createError({ statusCode: 400, message })
}

export function validateSocialVideoProbe(value: unknown) {
  const probe = value as { streams?: Record<string, unknown>[], format?: Record<string, unknown> }
  if (!probe || !Array.isArray(probe.streams) || !String(probe.format?.format_name || '').split(',').includes('mp4')) invalid()
  const videos = probe.streams.filter(stream => stream.codec_type === 'video')
  const audios = probe.streams.filter(stream => stream.codec_type === 'audio')
  if (videos.length !== 1 || audios.length > 1 || probe.streams.length !== videos.length + audios.length) invalid()
  const video = videos[0]!
  const width = Number(video.width), height = Number(video.height), duration = Number(probe.format?.duration)
  const parts = String(video.avg_frame_rate || '').split('/').map(Number)
  const fps = parts.length === 2 ? parts[0]! / parts[1]! : NaN
  const sideData = Array.isArray(video.side_data_list) ? video.side_data_list as Record<string, unknown>[] : []
  const tags = video.tags as Record<string, unknown> | undefined
  if (video.codec_name !== 'h264' || video.pix_fmt !== 'yuv420p'
    || audios.some(audio => audio.codec_name !== 'aac' || ![1, 2].includes(Number(audio.channels)) || !Number.isFinite(Number(audio.sample_rate)) || Number(audio.sample_rate) < 8000 || Number(audio.sample_rate) > 48000)
    || (tags?.rotate != null && Number(tags.rotate) % 360 !== 0) || sideData.some(data => data.rotation != null && Number(data.rotation) % 360 !== 0)
    || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 320 || height < 320 || width > 1920 || height > 1920
    || width / height < 9 / 16 || width / height > 1.91 || !Number.isFinite(duration) || duration < 3 || duration > 60
    || !Number.isFinite(fps) || fps < 23 || fps > 60) invalid()
  return { width, height, duration, fps }
}

export function isStrictSocialVideoBucket(bucket: Record<string, unknown> | null | undefined) {
  return bucket?.public === true && Number(bucket.file_size_limit) > 0 && Number(bucket.file_size_limit) <= MAX_SOCIAL_VIDEO_BYTES
    && Array.isArray(bucket.allowed_mime_types) && bucket.allowed_mime_types.length === 1 && bucket.allowed_mime_types[0] === 'video/mp4'
}

export async function validateSocialVideoDataUrl(value: unknown) {
  if (typeof value !== 'string') invalid('Fichier vidéo requis.')
  const match = /^data:video\/mp4;base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)
  if (!match || match[1]!.length % 4 !== 0) invalid('Seules les vidéos MP4 sont acceptées.')
  if (match[1]!.length > Math.ceil(MAX_SOCIAL_VIDEO_BYTES / 3) * 4) throw createError({ statusCode: 413, message: 'Vidéo trop volumineuse (20 Mo maximum).' })
  const buffer = Buffer.from(match[1]!, 'base64')
  if (buffer.length > MAX_SOCIAL_VIDEO_BYTES) throw createError({ statusCode: 413, message: 'Vidéo trop volumineuse (20 Mo maximum).' })
  if (buffer.length < 24 || buffer.toString('ascii', 4, 8) !== 'ftyp' || buffer.readUInt32BE(0) < 16 || buffer.readUInt32BE(0) > buffer.length) invalid('La signature du fichier ne correspond pas à un MP4.')
  const directory = await mkdtemp(join(tmpdir(), 'social-video-'))
  try {
    const path = join(directory, 'input.mp4')
    await writeFile(path, buffer, { mode: 0o600 })
    let output: string
    try {
      const result = await run(process.env.SOCIAL_FFPROBE_PATH || 'ffprobe', ['-v', 'error', '-protocol_whitelist', 'file,pipe',
        '-format_whitelist', 'mov,mp4,m4a,3gp,3g2,mj2', '-show_entries', 'stream=codec_type,codec_name,width,height,pix_fmt,avg_frame_rate,channels,sample_rate:stream_tags=rotate:stream_side_data=rotation:format=duration,format_name', '-of', 'json', path],
      { timeout: 10_000, maxBuffer: 64 * 1024, windowsHide: true, env: { PATH: process.env.PATH } })
      output = result.stdout
    }
    catch (error: unknown) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') throw createError({ statusCode: 503, message: 'La vérification vidéo est indisponible sur le serveur.' })
      invalid('Le fichier MP4 est illisible ou sa vérification a échoué.')
    }
    let probe: unknown
    try { probe = JSON.parse(output) }
    catch { invalid('La vérification du MP4 a échoué.') }
    const metadata = validateSocialVideoProbe(probe)
    return { buffer, mime: 'video/mp4' as const, extension: 'mp4' as const, ...metadata }
  }
  finally { await rm(directory, { recursive: true, force: true }) }
}
