import {loadTrainerPreferences, saveTrainerPreferences} from "st/trainer_preferences"
import NoteStats from "st/note_stats"
import TrainerPreferenceStore from "st/trainer_preference_store"
import {STAVES, GENERATORS} from "st/data"
import {KeySignature, ChromaticKeySignature} from "st/music"

function memoryStorage() {
  const data = new Map()
  return {
    getItem: key => data.get(key) || null,
    setItem: (key, value) => data.set(key, value),
  }
}

describe("trainer preferences", function() {
  it("restores every generator input and staff without serializing runtime state", function() {
    for (const staff of STAVES) {
      for (const generator of GENERATORS.filter(g => !g.debug && g.mode === staff.mode)) {
        const storage = memoryStorage()
        const settings = {}
        for (const input of generator.inputs || []) {
          switch (input.type) {
            case "select": settings[input.name] = input.values.at(-1).name; break
            case "range": settings[input.name] = input.max; break
            case "note": settings[input.name] = input.min; break
            case "noteRange": settings[input.name] = [60, 60]; break
            case "bool": settings[input.name] = true; break
            case "toggles": settings[input.name] = Object.fromEntries(input.options.map(k => [k, true])); break
          }
        }
        const state = {
          currentStaff: staff, currentGenerator: generator, currentGeneratorSettings: settings,
          keySignature: new KeySignature(-6), mode: "scroll", scrollSpeed: 175,
          keyboardOpen: false, settingsOpen: true,
        }
        saveTrainerPreferences(state, storage)
        const restored = loadTrainerPreferences(storage)
        for (const input of generator.inputs || []) {
          if (input.type !== "noteRange") expect(restored.currentGeneratorSettings[input.name]).toEqual(settings[input.name])
        }
        expect(restored.currentStaff).toBe(staff)
        expect(restored.currentGenerator).toBe(generator)
        expect(restored.keySignature.name()).toBe(state.keySignature.name())
        expect(restored.mode).toBe("scroll")
        expect(restored.scrollSpeed).toBe(175)
        expect(restored.keyboardOpen).toBeFalse()
        expect(restored.settingsOpen).toBeTrue()
        // Restoring and saving is stable, including clamped note ranges.
        saveTrainerPreferences(restored, storage)
        expect(loadTrainerPreferences(storage)).toEqual(restored)
      }
    }
  })

  it("restores the chromatic key", function() {
    const storage = memoryStorage()
    const state = loadTrainerPreferences(storage)
    state.keySignature = new ChromaticKeySignature()
    saveTrainerPreferences(state, storage)
    expect(loadTrainerPreferences(storage).keySignature).toEqual(state.keySignature)
  })

  it("handles corrupt data, outdated versions and inaccessible storage", function() {
    const storage = memoryStorage()
    const defaults = loadTrainerPreferences(storage)
    for (const value of ["{broken", "null", '{"version":2}', '{"version":1,"staff":"removed","generator":"removed","speed":"bad"}']) {
      storage.setItem("sightreading.trainer.v1", value)
      expect(loadTrainerPreferences(storage)).toEqual(defaults)
    }
    const blocked = {getItem() { throw new Error("blocked") }, setItem() { throw new Error("blocked") }}
    expect(loadTrainerPreferences(blocked)).toEqual(defaults)
    expect(() => saveTrainerPreferences(defaults, blocked)).not.toThrow()
  })
})

describe("practice session counters", function() {
  it("keeps the last completed streak through repeated misses and a new streak", function() {
    const stats = new NoteStats()
    stats.hitNotes(["C5"])
    stats.hitNotes(["D5"])
    stats.missNotes(["E5"])
    expect(stats.streak).toBe(0)
    expect(stats.lastStreak).toBe(2)
    stats.missNotes(["E5"])
    stats.hitNotes(["E5"])
    expect(stats.streak).toBe(1)
    expect(stats.lastStreak).toBe(2)
    stats.missNotes(["F5"])
    expect(stats.lastStreak).toBe(1)
  })

  it("resets session stats without losing pending history or user binding", function() {
    const stats = new NoteStats({id: 7})
    spyOn(stats, "flushLater")
    stats.hitNotes(["C5"])
    stats.missNotes(["D5"])
    stats.reset()
    expect([stats.hits, stats.misses, stats.streak, stats.lastStreak, stats.averageHitTime]).toEqual([0, 0, 0, 0, 0])
    expect(stats.noteHitStats).toEqual({})
    expect(stats.lastHitTime).toBeUndefined()
    expect(stats.buffer).toEqual({hits: 1, misses: 1})
    expect(stats.currentUser).toEqual({id: 7})
  })
})

describe("account preference storage", function() {
  it("loads account settings before device defaults and separates account caches", function() {
    const preferences = {version: 1, staff: "bass", mode: "scroll", speed: 180, keyboardOpen: false}
    const store = new TrainerPreferenceStore({id: 123, trainerPreferences: preferences})
    const state = store.load()
    expect(state.currentStaff.name).toBe("bass")
    expect(state.mode).toBe("scroll")
    expect(state.scrollSpeed).toBe(180)
    expect(state.keyboardOpen).toBeFalse()
    store.save(state)
    clearTimeout(store.timer)
    expect(JSON.parse(localStorage.getItem("sightreading.trainer.v1.user.123")).staff).toBe("bass")
    localStorage.removeItem("sightreading.trainer.v1.user.123")
    localStorage.removeItem("sightreading.trainer.pending.v1.user.123")
  })

  it("sends authenticated preferences, preserves newer queued changes and reports failures", async function() {
    const lookup = document.getElementById.bind(document)
    spyOn(document, "getElementById").and.callFake(id => id === "csrf_token" ? {getAttribute: () => "test-csrf"} : lookup(id))
    const statuses = []
    const store = new TrainerPreferenceStore({id: 124}, status => statuses.push(status))
    const state = store.load()
    let release
    spyOn(window, "fetch").and.callFake(() => new Promise(resolve => { release = resolve }))
    store.save(state)
    const first = store.flush()
    state.scrollSpeed = 200
    store.save(state)
    release({ok: true, json: async () => ({success: true})})
    await first
    expect(window.fetch.calls.count()).toBe(2)
    const request = window.fetch.calls.mostRecent().args
    expect(request[0]).toBe("/trainer-preferences.json")
    expect(JSON.parse(request[1].body.get("preferences")).speed).toBe(200)
    expect(request[1].body.get("csrf_token")).toBeTruthy()
    release({ok: true, json: async () => ({success: false})})
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(statuses.at(-1)).toContain("could not sync to your account")
    expect(JSON.parse(store.lastSaved).speed).toBe(100)
    clearTimeout(store.timer)
    const resumed = new TrainerPreferenceStore({id: 124, trainerPreferences: JSON.parse(store.lastSaved)})
    expect(resumed.load().scrollSpeed).toBe(200)
    localStorage.removeItem("sightreading.trainer.v1.user.124")
    localStorage.removeItem("sightreading.trainer.pending.v1.user.124")
  })
})
