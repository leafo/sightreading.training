// Only the natural fifth may be optional. Root, defining third, and extensions
// remain required. Altered fifths and ordinary triads must retain every tone.
export function optionalFifth(classes, root = classes[0]) {
  const pc = offset => (root + offset) % 12
  return classes.length >= 4 && classes.includes(pc(7)) &&
    (classes.includes(pc(3)) || classes.includes(pc(4))) &&
    [9, 10, 11].some(interval => classes.includes(pc(interval))) ? pc(7) : null
}
export function matchesChordTones(actual, classes, root = classes[0]) {
  if (actual.size === classes.length && classes.every(note => actual.has(note))) return {omittedFifth: false}
  const fifth = optionalFifth(classes, root)
  if (fifth !== null && !actual.has(fifth) && actual.size === classes.length - 1 && classes.every(note => note === fifth || actual.has(note))) return {omittedFifth: true}
  return null
}
