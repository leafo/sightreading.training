import * as React from "react"
import {IconBase} from "./icons"

export class IconTimer extends IconBase {
  width = 24
  height = 24
  svgOpts = {fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round"}
  path = '<circle cx="12" cy="14" r="8"/><path d="M9 2h6M12 2v4M18 7l2-2M12 10v4l2 2"/>'
}

export function IconEye({hidden = false}) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>
    {hidden && <path d="m3 3 18 18"/>}
  </svg>
}

export function IconVoicings() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M4 4h16M4 10h16M4 16h16M6 3v18M12 3v18M18 3v18"/><circle cx="6" cy="10" r="2" fill="currentColor"/><circle cx="18" cy="16" r="2" fill="currentColor"/>
  </svg>
}

export function IconChordLab() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 3h6M10 3v7L4 19a1.3 1.3 0 0 0 1 2h14a1.3 1.3 0 0 0 1-2l-6-9V3M7 15h10"/><circle cx="11" cy="18" r=".7" fill="currentColor"/>
  </svg>
}

// Reused action glyphs keep stroke, scale and meaning consistent across tools.
export function ActionIcon({name, size = 20}) {
  const paths = {
    help: <><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17v.5"/></>,
    feedback: <><path d="M21 11a8 8 0 0 1-8 8H8l-5 3V5a2 2 0 0 1 2-2h8a8 8 0 0 1 8 8Z"/><path d="M7 8h9M7 12h6"/></>,
    stats: <><path d="M4 3v17h17M8 15v-4M13 15V6M18 15v-7"/></>,
    save: <><path d="M5 3h12l4 4v14H3V3h2Z"/><path d="M7 3v6h9V3M7 21v-8h10v8"/></>,
    trash: <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    play: <path fill="currentColor" stroke="none" d="M7 4v16l14-8z"/>,
    stop: <rect fill="currentColor" stroke="none" x="5" y="5" width="14" height="14" rx="1"/>,
    volume: <path d="M11 4 6 8H3v8h3l5 4zM15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16"/>,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/></>,
    sheet: <path d="M14 3H4v18h16V9l-6-6ZM14 3v6h6M8 15h8M12 11v8"/>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
