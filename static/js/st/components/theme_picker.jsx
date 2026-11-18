import * as React from "react"
import {readTheme, setTheme, THEMES, THEME_KEY} from "st/theme"
import styles from "./theme_picker.module.css"

function ThemeIcon({theme}) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {theme === "light" ? <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </> : theme === "dark" ? <path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z" /> : <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8m-4-4v4" />
    </>}
  </svg>
}

export default function ThemePicker() {
  const [theme, updateTheme] = React.useState(readTheme)
  React.useEffect(() => {
    const sync = event => {
      if (event.key === THEME_KEY || event.key === null) updateTheme(readTheme())
    }
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [])
  return <details className={styles.picker}>
    <summary title={`Theme: ${theme}`} aria-label={`Choose theme (current: ${theme})`}>
      <ThemeIcon theme={theme} />
    </summary>
    <div className={styles.options} role="group" aria-label="Color theme">
      {THEMES.map(value => <button key={value} type="button"
        title={value[0].toUpperCase() + value.slice(1)}
        aria-label={value[0].toUpperCase() + value.slice(1)}
        aria-pressed={theme === value}
        onClick={event => {
          setTheme(value)
          updateTheme(value)
          const details = event.currentTarget.closest("details")
          details.open = false
          details.querySelector("summary").focus()
        }}>
        <ThemeIcon theme={value} />
      </button>)}
    </div>
  </details>
}
