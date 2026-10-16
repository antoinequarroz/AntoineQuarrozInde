/** Download a private PDF without putting the admin session in a new tab or URL. */
export async function downloadAdminPdf(path: string, filename: string, headers: Record<string, string>) {
  const blob = await $fetch<Blob>(path, { headers, responseType: 'blob' })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  try {
    link.click()
  }
  finally {
    link.remove()
    // Keep the object URL alive until the browser has consumed the download.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }
}
