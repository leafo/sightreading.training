import * as React from "react"
import Lightbox from "st/components/lightbox"
import styles from "./tool_options.module.css"

export default function ToolOptions({children}) {
  const [open, setOpen] = React.useState(false)
  return <>
    <button type="button" className={styles.gear} aria-label="Options" aria-haspopup="dialog"
      aria-expanded={open} onClick={() => setOpen(true)}>
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="m10 3-1 3-3 1-3-1-2 4 3 2v3l-2 2 3 3 3-1 2 2 1 2h4l1-3 3-1 2-3-2-2v-3l2-2-2-4-3 1-2-1-1-3Z" transform="translate(1 -1) scale(.9)" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
    {open && <Lightbox className={styles.flyout} ariaLabelledby="tool-options-title" onClose={() => setOpen(false)}>
      <div className={styles.heading}><h2 id="tool-options-title">Options</h2><button type="button" onClick={() => setOpen(false)} aria-label="Close options">×</button></div>
      <div className={styles.controls}>{children}</div>
    </Lightbox>}
  </>
}
