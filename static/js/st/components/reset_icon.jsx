import {IconBase} from "./icons"

// Reset icon attribution is displayed on the About page.
export default class IconReset extends IconBase {
  width = 24
  height = 24
  svgOpts = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  }
  path = "<path d='M3 10a9 9 0 1 1 2.6 8.4'/><path d='M3 3v7h7'/>"
}
