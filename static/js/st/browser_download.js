// Both songbook and text exports share the same object-URL lifecycle.
export function downloadFile(contents, filename, type) {
  const url = URL.createObjectURL(new Blob([contents], {type}))
  try {
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
  } finally {
    // Delay cleanup so the browser has time to begin consuming the URL.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
