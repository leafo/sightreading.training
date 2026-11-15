import * as React from "react"
import {useDiagramSize, setDiagramSize} from "st/diagram_size"
import Toast from "st/components/toast"
import styles from "./guitar_visuals.module.css"
export default function DiagramSize() {
  const value = useDiagramSize()
  const [message, setMessage] = React.useState(null)
  React.useEffect(() => {
    const status = event => setMessage(event.detail)
    window.addEventListener("diagram-size-status", status)
    return () => window.removeEventListener("diagram-size-status", status)
  }, [])
  return <><label className={styles.size_control}>Diagram size
    <input type="range" min="0" max="100" step="1" value={value} onChange={event => setDiagramSize(Number(event.target.value))} />
    <output>{value}%</output>
  </label><Toast message={message} onDismiss={() => setMessage(null)} /></>
}
