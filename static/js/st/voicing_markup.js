// Portable guitar shapes: standard E A D G B E tuning, low string first.
export const SHAPE_PATTERN = /^(?:x|\d{1,2})(?:-(?:x|\d{1,2})){5}$/i
export const ALIAS_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,23}$/
export function validFrets(frets) {
  return Array.isArray(frets) && frets.length === 6 && frets.every(f => f === null || Number.isInteger(f) && f >= 0 && f <= 24) && frets.some(f => f !== null)
}
export function fretText(frets) { return frets.map(f => f === null ? "x" : f).join("-") }
export function parseFrets(text) {
  if (!SHAPE_PATTERN.test(text)) throw new Error("Use six frets, low E to high e; x mutes a string. Frets must be 0–24.")
  const frets = text.split("-").map(f => f.toLowerCase() === "x" ? null : Number(f))
  if (!validFrets(frets)) throw new Error("Choose at least one sounding string and frets from 0–24.")
  return frets
}
export function chordToken(text) {
  const match = text.match(/^([A-G][#b♯♭]?[\w+°øΔ#♯♭(),/-]*)(?:@([^\s]+)|:([a-zA-Z][a-zA-Z0-9_-]{0,23}))?$/)
  if (!match) return null
  const [, name, shape, alias] = match
  let frets, error
  if (shape) { try { frets = parseFrets(shape) } catch (e) { error = e.message } }
  return {name, ...(shape ? {shape, frets, error} : {}), ...(alias ? {alias} : {})}
}
export function voicingToken(name, frets) {
  if (!chordToken(name) || chordToken(name).name !== name || !validFrets(frets)) throw new Error("Choose a named chord and a valid guitar shape.")
  return `[${name}@${fretText(frets)}]`
}
export function readDefinitions(source) {
  const definitions = [], errors = [], keys = new Set()
  source.split(/\r\n?|\n/).forEach((line, lineIndex) => {
    if (!/^\s*\{voicing:/i.test(line)) return
    const m = line.match(/^\s*\{voicing:\s*([^\s=]+)\s*=\s*([^\s}]+)\s*\}\s*$/i)
    const token = m && chordToken(m[1])
    try {
      if (!token?.alias) throw new Error("Use {voicing: C7:verse = x-3-2-3-1-x}.")
      const frets = parseFrets(m[2]), key = `${token.name}:${token.alias}`
      if (keys.has(key)) throw new Error(`Duplicate voicing ${key}; use a unique label.`)
      keys.add(key)
      definitions.push({...token, frets, key, lineIndex})
    } catch (e) { errors.push({lineIndex, message: `Line ${lineIndex + 1}: ${e.message}`}) }
  })
  return {definitions, errors}
}
export function shiftedFrets(frets, shift) {
  const result = frets.map(f => f === null ? null : f + shift)
  return validFrets(result) ? result : null
}
export function putDefinition(source, name, alias, frets) {
  if (!ALIAS_PATTERN.test(alias)) throw new Error("Use a label starting with a letter, up to 24 letters, numbers, underscores or hyphens.")
  voicingToken(name, frets)
  const {definitions} = readDefinitions(source)
  const existing = definitions.find(d => d.name === name && d.alias === alias)
  const line = `{voicing: ${name}:${alias} = ${fretText(frets)}}`
  const lines = source.split(/\r\n?|\n/)
  if (existing) lines[existing.lineIndex] = line
  else lines.unshift(line)
  return lines.join("\n")
}
export function addDefinition(source, name, frets) {
  const {definitions} = readDefinitions(source)
  const existing = definitions.find(d => d.name === name && fretText(d.frets) === fretText(frets))
  if (existing) return {source, alias: existing.alias}
  let index = 1
  while (definitions.some(d => d.name === name && d.alias === `shape${index}`)) index++
  const alias = `shape${index}`
  return {source: putDefinition(source, name, alias, frets), alias}
}
