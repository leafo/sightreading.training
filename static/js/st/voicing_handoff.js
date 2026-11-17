import {voicingToken, chordToken} from "st/voicing_markup"
export function createLabHandoff(context, storage = globalThis.sessionStorage) {
  const id = crypto.randomUUID()
  storage.setItem(`sheet-lab:${id}`, JSON.stringify(context))
  return id
}
export function readLabHandoff(id, storage = globalThis.sessionStorage) {
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(id || "")) return null
  try {
    const value = JSON.parse(storage.getItem(`sheet-lab:${id}`))
    return typeof value?.source === "string" && typeof value?.name === "string" ? value : null
  } catch { return null }
}
export function incomingVoicing(params) {
  const raw = params.get("voicing")
  if (!raw || raw.length > 180 || raw[0] !== "[" || raw.at(-1) !== "]") return null
  const token = chordToken(raw.slice(1, -1))
  if (!token?.frets || token.error) throw new Error("The incoming guitar voicing is invalid.")
  voicingToken(token.name, token.frets)
  return token
}
