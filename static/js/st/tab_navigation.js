// A single keyboard contract for tool tabs, including wraparound and endpoints.
export function tabNavigationIndex(key, index, count) {
  if (count < 1) return null
  switch (key) {
    case "ArrowRight": return (index + 1) % count
    case "ArrowLeft": return (index + count - 1) % count
    case "Home": return 0
    case "End": return count - 1
    default: return null
  }
}
