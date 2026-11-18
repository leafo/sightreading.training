import * as React from "react"
import {Navigate} from "react-router-dom"

import {getSession} from "st/app"
import {postAuth} from "st/auth"
import {setTitle} from "st/globals"
import {TextInputRow} from "st/components/forms"
import Toast from "st/components/toast"

import pageStyles from "../page_container.module.css"
import formStyles from "st/components/form.module.css"

export default function AccountPage({onSave}) {
  const user = getSession().currentUser
  const [name, setName] = React.useState(user?.displayName ?? "")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState("")
  const [notice, setNotice] = React.useState("")

  React.useEffect(() => { setTitle("Account") }, [])

  if (!user) return <Navigate replace to="/login" />

  async function save(event) {
    event.preventDefault()
    if (saving) return

    setSaving(true)
    setError("")
    setNotice("")
    const fields = new FormData(event.currentTarget)
    fields.set("account_id", user.id)
    try {
      const result = await postAuth("/display-name.json", fields)
      if (result.currentUser?.id !== user.id) {
        setError(result.errors?.[0] || "Could not save your display name. Please try again.")
        return
      }
      const displayName = result.currentUser.displayName ?? ""
      setName(displayName)
      onSave(displayName)
      setNotice("Display name saved")
    } catch {
      setError("Could not save your display name. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return <div className={pageStyles.page_container}>
    <h2>Account</h2>
    <p>Login username <strong>{user.username}</strong></p>
    <p>Your display name appears in the site menu and on songs you share. Leave it blank to use your username.</p>
    <form onSubmit={save}>
      <TextInputRow name="display_name" value={name} disabled={saving}
        onChange={event => setName(event.target.value)}>Display name</TextInputRow>
      {error && <div className={formStyles.form_error} role="alert">{error}</div>}
      <button className="big_button" disabled={saving}>{saving ? "Saving…" : "Save display name"}</button>
    </form>
    <Toast message={notice} onDismiss={() => setNotice("")} />
  </div>
}
