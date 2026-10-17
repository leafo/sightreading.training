import {loadTrainerPreferences, saveTrainerPreferences, serializeTrainerPreferences} from "st/trainer_preferences"
import {csrfToken} from "st/globals"

export default class TrainerPreferenceStore {
  constructor(user, onStatus = () => {}) {
    this.user = user
    this.onStatus = onStatus
    // Keep account caches separate from guests and other accounts on this device.
    this.storage = {
      getItem: key => window.localStorage.getItem(user ? `${key}.user.${user.id}` : key),
      setItem: (key, value) => window.localStorage.setItem(user ? `${key}.user.${user.id}` : key, value),
    }
    this.flush = this.flush.bind(this)
    this.online = () => this.flush()
  }

  load() {
    const remote = this.user?.trainerPreferences
    if (remote?.version === 1) {
      const restored = loadTrainerPreferences({getItem: () => JSON.stringify(remote)})
      this.lastSaved = serializeTrainerPreferences(restored)
      try {
        if (this.storage.getItem("sightreading.trainer.pending.v1") === "true") {
          return loadTrainerPreferences(this.storage)
        }
      } catch (e) { /* The account copy still works with local storage blocked. */ }
      return restored
    }
    return loadTrainerPreferences(this.storage)
  }

  start() {
    window.addEventListener("pagehide", this.flush)
    window.addEventListener("online", this.online)
  }

  stop() {
    window.removeEventListener("pagehide", this.flush)
    window.removeEventListener("online", this.online)
    this.flush()
  }

  save(state) {
    saveTrainerPreferences(state, this.storage)
    const document = serializeTrainerPreferences(state)
    if (!this.user || document === this.desired) return
    this.desired = document
    if (document === this.lastSaved) return
    try { this.storage.setItem("sightreading.trainer.pending.v1", "true") } catch (e) {}
    clearTimeout(this.timer)
    this.timer = setTimeout(this.flush, 400)
  }

  async flush() {
    clearTimeout(this.timer)
    if (!this.user || !this.desired || this.desired === this.lastSaved || this.saving) return
    const document = this.desired
    this.saving = true
    this.onStatus("Saving settings…")
    let success = false
    try {
      const body = new URLSearchParams({preferences: document, csrf_token: csrfToken()})
      const response = await fetch("/trainer-preferences.json", {
        method: "POST", credentials: "same-origin", body, keepalive: true,
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error("Settings save failed")
      this.lastSaved = document
      if (this.desired === document) {
        try { this.storage.setItem("sightreading.trainer.pending.v1", "false") } catch (e) {}
      }
      this.user.trainerPreferences = JSON.parse(document)
      success = true
      this.onStatus("Settings saved to account")
    } catch (e) {
      this.onStatus("Settings could not sync to your account. Change a setting or reconnect to retry.")
    } finally {
      this.saving = false
      // Serialize requests so an older response cannot overwrite a newer change.
      if (success && this.desired !== this.lastSaved) this.flush()
    }
  }
}
