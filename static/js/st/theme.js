export const THEME_KEY = "napland:theme"
export const THEMES = ["light", "dark", "system"]

export function readTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return THEMES.includes(value) ? value : "system"
  } catch {
    return "system"
  }
}

export function applyTheme(preference, systemDark) {
  const dark = preference === "dark" || (preference === "system" && systemDark)
  document.documentElement.dataset.theme = dark ? "dark" : "light"
  document.documentElement.style.colorScheme = dark ? "dark" : "light"
}

let currentPreference = readTheme()

export function initializeTheme() {
  const media = window.matchMedia("(prefers-color-scheme: dark)")
  const refresh = () => applyTheme(currentPreference, media.matches)
  refresh()
  media.addEventListener("change", refresh)
  window.addEventListener("storage", event => {
    if (event.key === THEME_KEY || event.key === null) {
      currentPreference = readTheme()
      refresh()
    }
  })
}

export function setTheme(preference) {
  if (!THEMES.includes(preference)) return
  currentPreference = preference
  try { localStorage.setItem(THEME_KEY, preference) } catch {}
  applyTheme(preference, window.matchMedia("(prefers-color-scheme: dark)").matches)
}
