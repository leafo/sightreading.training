import * as React from "react"
import {getSession} from "st/app"
import {csrfToken} from "st/globals"

export const normalizeDiagramSize = value => Number.isInteger(value) && value >= 0 && value <= 100 ? value : 20
export const diagramWidth = zoom => 140 * (0.75 + normalizeDiagramSize(zoom) / 80)
const listeners = new Set()
let timer, saving = false, pending = null
const sessionValues = new Map()
const user = () => getSession()?.currentUser
const key = () => `music-tools:diagram-size:v1${user() ? `.user.${user().id}` : ""}`
export function readDiagramSize() {
  if (sessionValues.has(key())) return sessionValues.get(key())
  try {
    const saved = JSON.parse(localStorage.getItem(key()))
    if (saved?.pending || !user()) return normalizeDiagramSize(saved?.value)
  } catch { /* Use the account value when browser storage is unavailable. */ }
  return normalizeDiagramSize(user()?.trainerPreferences?.diagramZoom)
}
async function flush() {
  if (saving || pending === null || !user()) return
  const value = pending, account = user(), storageKey = key()
  saving = true
  try {
    const response = await fetch("/trainer-preferences.json", {method: "POST", credentials: "same-origin", keepalive: true,
      body: new URLSearchParams({diagram_zoom: value, csrf_token: csrfToken()})})
    const result = await response.json()
    if (!response.ok || !result.success) throw new Error("save failed")
    account.trainerPreferences = {...account.trainerPreferences, diagramZoom: value}
    if (pending === value) {
      pending = null
      try { localStorage.setItem(storageKey, JSON.stringify({value, pending: false})) } catch { /* Account saved. */ }
    }
  } catch {
    window.dispatchEvent(new CustomEvent("diagram-size-status", {detail: "Diagram size could not sync to your account. Reconnect or change the slider to retry."}))
  }
  finally { saving = false; if (pending !== null && pending !== value) flush() }
}
export function setDiagramSize(value) {
  value = normalizeDiagramSize(value)
  sessionValues.set(key(), value)
  try { localStorage.setItem(key(), JSON.stringify({value, pending: !!user()})) } catch { /* Session still works. */ }
  listeners.forEach(listener => listener(value))
  if (user()) { pending = value; clearTimeout(timer); timer = setTimeout(flush, 400) }
}
export function useDiagramSize() {
  const [value, setValue] = React.useState(readDiagramSize)
  React.useEffect(() => {
    listeners.add(setValue)
    const refresh = () => { sessionValues.delete(key()); setValue(readDiagramSize()) }
    const retry = () => { if (user()) { pending = readDiagramSize(); flush() } }
    try { if (user() && JSON.parse(localStorage.getItem(key()))?.pending) retry() } catch { /* No pending cache. */ }
    window.addEventListener("storage", refresh)
    window.addEventListener("online", retry)
    window.addEventListener("pagehide", flush)
    return () => { listeners.delete(setValue); window.removeEventListener("storage", refresh); window.removeEventListener("online", retry); window.removeEventListener("pagehide", flush) }
  }, [])
  return value
}
