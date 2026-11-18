export function practiceRecap(dates, hits, misses) {
  const totalHits = hits.reduce((total, count) => total + Number(count), 0)
  const totalMisses = misses.reduce((total, count) => total + Number(count), 0)
  const attempts = totalHits + totalMisses

  if (!attempts) return ""

  const accuracy = Math.round(100 * totalHits / attempts)
  return [
    "My Napland Music Tools practice recap",
    `${dates[0]} to ${dates.at(-1)}`,
    `${totalHits} hits · ${totalMisses} misses · ${accuracy}% accuracy`,
  ].join("\n")
}
