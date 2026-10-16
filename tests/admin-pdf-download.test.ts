import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadAdminPdf } from '../app/utils/downloadAdminPdf'

describe('private admin PDF download', () => {
  const fetchPdf = vi.fn()
  const click = vi.fn()
  const remove = vi.fn()
  const append = vi.fn()
  const createObjectURL = vi.fn(() => 'blob:private-pdf')
  const revokeObjectURL = vi.fn()
  let link: { href: string, download: string, click: typeof click, remove: typeof remove }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    link = { href: '', download: '', click, remove }
    vi.stubGlobal('$fetch', fetchPdf)
    vi.stubGlobal('document', { createElement: () => link, body: { appendChild: append } })
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('fetches the PDF with the session header and downloads a local blob', async () => {
    const pdf = new Blob(['%PDF-1.7 test'], { type: 'application/pdf' })
    fetchPdf.mockResolvedValueOnce(pdf)

    await downloadAdminPdf('/api/quotes/pdf?id=17', 'devis-DEV-TEST.pdf', { Authorization: 'Bearer test-admin-session' })

    expect(fetchPdf).toHaveBeenCalledWith('/api/quotes/pdf?id=17', {
      headers: { Authorization: 'Bearer test-admin-session' }, responseType: 'blob',
    })
    expect(createObjectURL).toHaveBeenCalledWith(pdf)
    expect(link.href).toBe('blob:private-pdf')
    expect(link.download).toBe('devis-DEV-TEST.pdf')
    expect(append).toHaveBeenCalledWith(link)
    expect(click).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledOnce()
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:private-pdf')
  })

  it('propagates an unauthorized response without saving an error page as PDF', async () => {
    const unauthorized = new Error('Unauthorized')
    fetchPdf.mockRejectedValueOnce(unauthorized)

    await expect(downloadAdminPdf('/api/quotes/pdf?id=17', 'devis.pdf', {})).rejects.toBe(unauthorized)
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(click).not.toHaveBeenCalled()
  })

  it('releases the private blob even if the browser download fails', async () => {
    fetchPdf.mockResolvedValueOnce(new Blob(['%PDF-1.7']))
    click.mockImplementationOnce(() => { throw new Error('Download blocked') })

    await expect(downloadAdminPdf('/api/quotes/pdf?id=17', 'devis.pdf', {})).rejects.toThrow('Download blocked')
    expect(remove).toHaveBeenCalledOnce()
    vi.runAllTimers()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:private-pdf')
  })
})
