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
