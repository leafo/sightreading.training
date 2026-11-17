import * as React from "react"
import {Link} from "react-router-dom"
import Toast from "st/components/toast"
import {voicingToken} from "st/voicing_markup"

// The portable token carries the actual frets; no catalog identifier can drift.
export default function VoicingTransfer({name, frets}) {
  const [message, setMessage] = React.useState(null)
  let token
  try { token = voicingToken(name, frets) } catch { return null }
  return <div>
    <button type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(token); setMessage("Chord Sheet markup copied") }
      catch { setMessage("Could not copy. Allow clipboard access and try again.") }
    }}>Copy markup</button>{" "}
    <Link reloadDocument to={`/chord-sheet?voicing=${encodeURIComponent(token)}`}>Add to sheet</Link>
    <Toast message={message} onDismiss={() => setMessage(null)} />
  </div>
}
