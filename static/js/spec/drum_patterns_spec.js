import {TRACKS, PRESETS, STORAGE_KEY, emptyPattern, validatePattern, resizePattern, readSavedPatterns, stepDuration, TIME_SIGNATURES, changeTimeSignature, changeSubdivision, meterFor, stepMarker} from "st/drum_patterns"
import {DRUM_KITS, KIT_VOICES} from "st/drum_kits"
import DrumAudio from "st/drum_audio"
import Toast from "st/components/toast"
import DrumMachinePage from "st/components/pages/drum_machine_page"

describe("Drum patterns", () => {
  it("provides eighteen independently editable, valid presets", () => {
    expect(PRESETS.length).toBe(18)
    for (const preset of PRESETS) {
      const pattern = validatePattern(preset.pattern)
      expect(Object.keys(pattern.tracks).length).toBe(TRACKS.length)
      pattern.tracks.kick[0] = !pattern.tracks.kick[0]
      expect(pattern.tracks.kick[0]).not.toBe(preset.pattern.tracks.kick[0])
    }
  })
  it("repeats a bar on extension and preserves the first bar on shortening", () => {
    const pattern = validatePattern(PRESETS[3].pattern)
    const extended = resizePattern(pattern, 2)
    expect(extended.tracks.kick).toEqual([...pattern.tracks.kick, ...pattern.tracks.kick])
    extended.tracks.kick[16] = false
    expect(resizePattern(extended, 1)).toEqual(pattern)
  })
  it("delays offbeat eighths while keeping quarter notes and whole bars constant", () => {
    for (const bpm of [30, 100, 240]) for (const swing of [0, 0.33, 0.5]) {
      const durations = Array.from({length: 4}, (_, i) => stepDuration(bpm, swing, i))
      expect(durations[0] + durations[1]).toBeCloseTo(30 / bpm * (1 + swing), 8)
      expect(durations.reduce((a, b) => a + b)).toBeCloseTo(60 / bpm, 8)
      expect(Array.from({length: 16}, (_, i) => stepDuration(bpm, swing, i)).reduce((a, b) => a + b)).toBeCloseTo(240 / bpm, 8)
    }
  })
  it("rejects corrupt or unsafe persisted values", () => {
    for (const patch of [{bpm: 0}, {bpm: Infinity}, {swing: -1}, {bars: 8}, {tracks: {}}, {timeSignature: "7/8"}, {timeSignature: ["4/4"]}, {timeSignature: "3/4"}]) {
      expect(() => validatePattern({...emptyPattern(), ...patch})).toThrow()
    }
    expect(() => readSavedPatterns({getItem: () => "{}"})).toThrow()
    expect(() => readSavedPatterns({getItem: () => "invalid json"})).toThrow()
  })
  it("round trips named patterns without sharing their step arrays", () => {
    const data = [{name: "My groove", pattern: resizePattern(PRESETS[0].pattern, 2)}]
    const storage = {getItem: key => key === STORAGE_KEY ? JSON.stringify(data) : null}
    expect(readSavedPatterns(storage)).toEqual(data)
    expect(readSavedPatterns({getItem: () => null})).toEqual([])
  })
})

describe("Drum audio lifecycle", () => {
  it("schedules the blues shuffle ride with alternating long and short eighths", async () => {
    jasmine.clock().install()
    spyOn(window, "requestAnimationFrame").and.returnValue(1)
    spyOn(window, "cancelAnimationFrame")
    const audio = new DrumAudio(() => {})
    audio.context = {
      currentTime: 0, sampleRate: 1, resume: async () => {},
      createGain: () => ({gain: {}, connect() {}, disconnect() {}}),
      createBuffer: () => ({getChannelData: () => new Float32Array(1)})
    }
    spyOn(audio, "hit")
    try {
      const pattern = PRESETS.find(p => p.name === "Blues shuffle").pattern
      await audio.start(() => pattern, () => ({}), 0.7)
      for (let tick = 0; tick < 120; tick++) {
        audio.context.currentTime += 0.025
        jasmine.clock().tick(25)
      }
      const hits = audio.hit.calls.allArgs().filter(([id]) => id === "ride").map(([, time]) => time)
      expect(hits.length).toBeGreaterThanOrEqual(9)
      for (let i = 0; i < 9; i++) {
        expect(hits[i]).toBeCloseTo(0.04 + i * 30 / pattern.bpm + (i % 2) * 30 / pattern.bpm * pattern.swing, 8)
      }
    } finally {
      audio.stop()
      jasmine.clock().uninstall()
    }
  })
  it("cancels a pending audio start when stopped before resume finishes", async () => {
    const audio = new DrumAudio(() => {})
    let resume
    audio.context = {resume: () => new Promise(resolve => { resume = resolve }), close: () => {}}
    const start = audio.start(() => emptyPattern(), () => ({}), 0.7)
    audio.stop()
    resume()
    expect(await start).toBe(false)
    expect(audio.timer).toBeUndefined()
    audio.dispose()
  })
})

describe("Drum tempo editing", () => {
  let page
  beforeEach(() => {
    page = new DrumMachinePage({})
    // Exercise the component's state transitions without mounting an audio page.
    page.setState = (update, callback) => {
      Object.assign(page.state, typeof update === "function" ? update(page.state) : update)
      if (callback) callback()
    }
  })
  it("allows clearing and typing a replacement tempo while playback retains a valid BPM", () => {
    for (const value of ["", "1", "12"]) {
      page.changeTempo(value)
      expect(page.state.tempoInput).toBe(value)
      expect(page.state.pattern.bpm).toBe(100)
    }
    page.changeTempo("125")
    expect(page.state.pattern.bpm).toBe(125)
    page.commitTempo()
    expect(page.state.tempoInput).toBe("125")
  })
  it("clamps out-of-range entries on commit and restores empty entries", () => {
    for (const [input, expected] of [["999", 240], ["2", 30], ["", 30]]) {
      page.changeTempo(input)
      page.commitTempo()
      expect(page.state.pattern.bpm).toBe(expected)
      expect(page.state.tempoInput).toBe(String(expected))
    }
  })
  it("restarts playback at the beginning when changing time signature", () => {
    page.state.playing = true
    page.state.currentStep = 15
    spyOn(page.audio, "stop")
    spyOn(page, "togglePlayback")
    page.changePattern(changeTimeSignature(page.state.pattern, "3/4"))
    expect(page.audio.stop).toHaveBeenCalled()
    expect(page.state.currentStep).toBe(-1)
    expect(page.state.pattern.timeSignature).toBe("3/4")
    expect(page.togglePlayback).toHaveBeenCalled()
  })
  it("updates the tempo field when loading another pattern", () => {
    page.changeTempo("")
    page.changePattern(validatePattern(PRESETS[1].pattern))
    expect(page.state.tempoInput).toBe(String(PRESETS[1].pattern.bpm))
  })
})


describe("Drum time signatures", () => {
  it("builds and round trips one- and two-bar patterns in every meter", () => {
    for (const [signature, meter] of Object.entries(TIME_SIGNATURES)) for (const bars of [1, 2]) {
      const pattern = emptyPattern(bars, signature)
      pattern.tracks.kick[pattern.tracks.kick.length - 1] = true
      expect(pattern.tracks.kick.length).toBe(meter.steps * bars)
      expect(validatePattern(pattern)).toEqual(pattern)
      const saved = [{name: signature, pattern}]
      expect(readSavedPatterns({getItem: () => JSON.stringify(saved)})).toEqual(saved)
    }
  })
  it("loads legacy saved patterns as 4/4 without changing their hits", () => {
    const legacy = validatePattern(PRESETS[0].pattern)
    delete legacy.timeSignature
    const [saved] = readSavedPatterns({getItem: () => JSON.stringify([{name: "Old beat", pattern: legacy}])})
    expect(saved.pattern.timeSignature).toBe("4/4")
    expect(saved.pattern.tracks).toEqual(legacy.tracks)
  })
  it("changes meters per bar without shifting the second bar's hits", () => {
    const pattern = emptyPattern(2)
    pattern.tracks.kick[0] = true
    pattern.tracks.kick[16] = true
    pattern.tracks.snare[15] = true
    pattern.tracks.snare[31] = true
    const longer = changeTimeSignature(pattern, "5/4")
    expect(longer.tracks.kick[20]).toBeTrue()
    expect(longer.tracks.snare[35]).toBeTrue()
    expect(longer.tracks.snare.slice(16, 20)).toEqual([false, false, false, false])
    const shorter = changeTimeSignature(longer, "3/4")
    expect(shorter.tracks.kick[12]).toBeTrue()
    expect(shorter.tracks.snare.every(hit => !hit)).toBeTrue()
    expect(pattern.tracks.snare[15]).toBeTrue()
  })
  it("repeats and shortens bars correctly in every meter", () => {
    for (const signature of Object.keys(TIME_SIGNATURES)) {
      const pattern = emptyPattern(1, signature)
      pattern.tracks.kick[0] = true
      const extended = resizePattern(pattern, 2)
      expect(extended.tracks.kick).toEqual([...pattern.tracks.kick, ...pattern.tracks.kick])
      expect(resizePattern(extended, 1)).toEqual(pattern)
    }
  })
  it("keeps bar timing constant with swing and uses two dotted quarters for 6/8", () => {
    for (const [signature, meter] of Object.entries(TIME_SIGNATURES)) {
      for (const bpm of [30, 100, 240]) for (const swing of [0, 0.33, 0.5]) {
        const durations = Array.from({length: meter.steps}, (_, i) => stepDuration(bpm, swing, i, signature))
        expect(durations.reduce((a, b) => a + b)).toBeCloseTo(meter.steps / (meter.tempoSteps || meter.beatSteps) * 60 / bpm, 8)
        if (swing > 0) expect(durations[0]).toBeGreaterThan(durations[2])
      }
    }
  })
  it("labels bar boundaries and compound beat groups", () => {
    expect(stepMarker(emptyPattern(2, "3/4"), 12)).toEqual({label: "2.1", size: "quarter"})
    expect(stepMarker(emptyPattern(1, "5/4"), 16)).toEqual({label: "1.5", size: "quarter"})
    expect(stepMarker(emptyPattern(), 2)).toEqual({label: "&", size: "eighth"})
    expect(stepMarker(emptyPattern(), 3)).toEqual({label: "a", size: "sixteenth"})
    expect(stepMarker(emptyPattern(1, "6/8"), 4)).toEqual({label: "1.2", size: "quarter"})
  })
  it("shows all six numbered beats with four subdivisions each in 6/8", () => {
    const pattern = emptyPattern(2, "6/8")
    expect(pattern.tracks.kick.length).toBe(48)
    expect(Array.from({length: 28}, (_, step) => stepMarker(pattern, step).label)).toEqual([
      "1.1", "e", "&", "a", "1.2", "e", "&", "a", "1.3", "e", "&", "a", "1.4", "e", "&", "a", "1.5", "e", "&", "a", "1.6", "e", "&", "a", "2.1", "e", "&", "a"
    ])
    expect(stepDuration(100, 0.5, 0, "6/8")).toBeGreaterThan(stepDuration(100, 0.5, 2, "6/8"))
  })
  it("expands legacy 6/8 saves without moving hits in time or between bars", () => {
    const legacy = emptyPattern(2, "6/8")
    for (const [id] of TRACKS) legacy.tracks[id] = Array(24).fill(false)
    legacy.tracks.kick[0] = true
    legacy.tracks.snare[18] = true
    const migrated = validatePattern(legacy)
    expect(migrated.tracks.snare.length).toBe(48)
    expect(migrated.tracks.kick[0]).toBeTrue()
    expect(migrated.tracks.snare[36]).toBeTrue()
    expect(migrated.tracks.snare.filter(Boolean).length).toBe(1)
    expect(migrated.tracks.snare[37]).toBeFalse()
    expect(validatePattern(migrated)).toEqual(migrated)
  })
  it("loops the audio scheduler at each meter's actual bar boundary", async () => {
    jasmine.clock().install()
    spyOn(window, "requestAnimationFrame").and.returnValue(1)
    spyOn(window, "cancelAnimationFrame")
    try {
      for (const [signature, meter] of Object.entries(TIME_SIGNATURES)) for (const bars of [1, 2]) {
        const audio = new DrumAudio(() => {})
        audio.context = {
          currentTime: 0, sampleRate: 1, resume: async () => {},
          createGain: () => ({gain: {}, connect() {}, disconnect() {}}),
          createBuffer: () => ({getChannelData: () => new Float32Array(1)})
        }
        const hits = []
        audio.hit = (id, time) => hits.push(time)
        const pattern = emptyPattern(bars, signature)
        pattern.bpm = 120
        pattern.tracks.kick[0] = true
        const loopSeconds = bars * meter.steps / (meter.tempoSteps || meter.beatSteps) * 0.5
        try {
          await audio.start(() => pattern, () => ({}), 0.7)
          for (let tick = 0; tick < Math.ceil((loopSeconds + 0.1) / 0.025); tick++) {
            audio.context.currentTime += 0.025
            jasmine.clock().tick(25)
          }
          expect(hits.length).toBe(2)
          expect(hits[1] - hits[0]).toBeCloseTo(loopSeconds, 8)
        } finally { audio.stop() }
      }
    } finally { jasmine.clock().uninstall() }
  })
})


describe("Drum preset coverage", () => {
  it("provides two distinct playable grooves in each new meter", () => {
    for (const signature of ["3/4", "5/4", "6/8"]) {
      const presets = PRESETS.filter(item => item.pattern.timeSignature === signature)
      expect(presets.length).toBe(2)
      expect(presets[0].pattern.tracks).not.toEqual(presets[1].pattern.tracks)
      for (const {pattern} of presets) {
        expect(validatePattern(pattern)).toEqual(pattern)
        expect(pattern.tracks.kick.some(Boolean)).toBeTrue()
        expect(pattern.tracks.snare.some(Boolean)).toBeTrue()
      }
    }
  })
})

describe("Drum saved-pattern controls", () => {
  let page, storage
  beforeEach(() => {
    storage = {getItem: () => null, setItem: jasmine.createSpy("setItem")}
    spyOnProperty(window, "localStorage", "get").and.returnValue(storage)
    page = new DrumMachinePage({})
    page.setState = (update, callback) => {
      Object.assign(page.state, typeof update === "function" ? update(page.state) : update)
      if (callback) callback()
    }
  })
  it("saves a new pattern, selects it, and overwrites it without duplicating the entry", () => {
    page.changePattern(emptyPattern(1, "5/4"))
    page.state.name = "Five alive"
    page.save()
    expect(page.state.selectedName).toBe("Five alive")
    page.state.pattern.tracks.kick[19] = true
    page.save()
    const saved = JSON.parse(storage.setItem.calls.mostRecent().args[1])
    expect(saved.length).toBe(1)
    expect(saved[0].pattern.timeSignature).toBe("5/4")
    expect(saved[0].pattern.tracks.kick[19]).toBeTrue()
  })
  it("loads a selected pattern including its meter without editing the stored copy", () => {
    page.state.saved = [{name: "Six", pattern: emptyPattern(2, "6/8")}]
    page.loadSaved("Six")
    expect(page.state.selectedName).toBe("Six")
    expect(page.state.pattern.timeSignature).toBe("6/8")
    expect(page.state.pattern.bars).toBe(2)
    page.state.pattern.tracks.kick[0] = true
    expect(page.state.saved[0].pattern.tracks.kick[0]).toBeFalse()
  })
  it("names a new copy in a dialog without clearing the current beat", () => {
    page.state.saved = [{name: "My beat", pattern: emptyPattern()}]
    page.state.selectedName = "My beat"
    const pattern = emptyPattern(2, "3/4")
    pattern.bpm = 135
    pattern.swing = 0.2
    pattern.tracks.snare[0] = true
    page.changePattern(pattern)
    page.newPattern()
    expect(page.state.dialogAction).toBe("new")
    expect(page.state.dialogName).toBe("My beat 2")
    expect(page.state.pattern).toBe(pattern)
    expect(page.state.selectedName).toBe("My beat")
    expect(storage.setItem).not.toHaveBeenCalled()
    page.submitPatternName()
    expect(page.state.selectedName).toBe("My beat 2")
    expect(page.state.dialogAction).toBeNull()
    expect(page.state.pattern).toBe(pattern)
    expect(page.state.saved[1].pattern).toEqual(pattern)
    expect(page.state.saved[1].pattern.tracks.snare[0]).toBeTrue()
    expect(page.state.saved.length).toBe(2)
  })
  it("deletes only the selected save and preserves the editable beat", () => {
    page.state.saved = [{name: "A", pattern: emptyPattern()}, {name: "B", pattern: emptyPattern(1, "6/8")}]
    page.loadSaved("B")
    const pattern = page.state.pattern
    page.deleteSelected()
    expect(page.state.saved.map(item => item.name)).toEqual(["A"])
    expect(page.state.selectedName).toBe("")
    expect(page.state.pattern).toBe(pattern)
    expect(JSON.parse(storage.setItem.calls.mostRecent().args[1]).length).toBe(1)
  })
  it("keeps selection and saved data unchanged if saving or deleting fails", () => {
    page.state.saved = [{name: "A", pattern: emptyPattern()}]
    page.loadSaved("A")
    const saved = page.state.saved
    storage.setItem.and.throwError("Storage full")
    page.deleteSelected()
    expect(page.state.selectedName).toBe("A")
    expect(page.state.saved).toBe(saved)
    expect(page.state.message).toContain("Could not save")
    page.newPattern()
    page.submitPatternName()
    expect(page.state.dialogAction).toBe("new")
    expect(page.state.dialogError).toContain("Could not save")
    expect(page.state.selectedName).toBe("A")
    expect(page.state.saved).toBe(saved)
  })
  it("prefills the save dialog and saves a renamed copy as the current selection", () => {
    page.state.name = "Original"
    page.save()
    const pattern = page.state.pattern
    page.openSaveDialog()
    expect(page.state.dialogAction).toBe("save")
    expect(page.state.dialogName).toBe("Original")
    page.state.dialogName = "  Copy  "
    page.submitPatternName()
    expect(page.state.selectedName).toBe("Copy")
    expect(page.state.dialogAction).toBeNull()
    expect(page.state.saved.length).toBe(2)
    expect(page.state.pattern).toBe(pattern)
  })
  it("keeps the naming dialog open for blank names and prevents New from overwriting a save", () => {
    page.state.name = "Existing"
    page.save()
    storage.setItem.calls.reset()
    page.newPattern()
    page.state.dialogName = "   "
    page.submitPatternName()
    expect(page.state.dialogError).toContain("Enter a name")
    expect(page.state.dialogAction).toBe("new")
    page.state.dialogName = "Existing"
    page.submitPatternName()
    expect(page.state.dialogError).toContain("already exists")
    expect(storage.setItem).not.toHaveBeenCalled()
    expect(page.state.saved.length).toBe(1)
  })

  it("preserves edited hits and playback when saving through either naming dialog", () => {
    for (const action of ["save", "new"]) {
      for (const signature of ["4/4", "3/4", "5/4", "6/8"]) {
        const pattern = emptyPattern(2, signature)
        pattern.tracks.kick[0] = true
        pattern.tracks.snare[pattern.tracks.snare.length - 1] = true
        pattern.bpm = 123
        pattern.swing = 0.2
        page.changePattern(pattern)
        page.state.playing = true
        page.state.currentStep = 5
        const stop = spyOn(page.audio, "stop")
        if (action === "new") page.newPattern()
        else page.openSaveDialog()
        expect(page.state.pattern).toBe(pattern)
        page.state.dialogName = `${action} ${signature}`
        page.submitPatternName()
        expect(page.state.pattern).toBe(pattern)
        expect(page.state.playing).toBeTrue()
        expect(page.state.currentStep).toBe(5)
        expect(stop).not.toHaveBeenCalled()
        expect(page.state.saved.find(item => item.name === `${action} ${signature}`).pattern).toEqual(pattern)
        const stored = JSON.parse(storage.setItem.calls.mostRecent().args[1])
        expect(stored.find(item => item.name === `${action} ${signature}`).pattern).toEqual(pattern)
        page.audio.stop = stop.and.originalFn
        page.state.playing = false
      }
    }
  })

})


describe("Temporary status toasts", () => {
  let toast, dismiss
  beforeEach(() => {
    jasmine.clock().install()
    dismiss = jasmine.createSpy("dismiss")
    toast = new Toast({message: "Saved", notificationId: 1, onDismiss: dismiss})
    toast.componentDidMount()
  })
  afterEach(() => { toast.componentWillUnmount(); jasmine.clock().uninstall() })
  it("dismisses automatically after five seconds", () => {
    jasmine.clock().tick(4999)
    expect(dismiss).not.toHaveBeenCalled()
    jasmine.clock().tick(1)
    expect(dismiss).toHaveBeenCalledTimes(1)
  })
  it("gives a repeated notification a fresh timer without extending it on unrelated renders", () => {
    jasmine.clock().tick(4000)
    const oldProps = toast.props
    toast.props = {...oldProps, notificationId: 2}
    toast.componentDidUpdate(oldProps)
    jasmine.clock().tick(4000)
    expect(dismiss).not.toHaveBeenCalled()
    toast.componentDidUpdate({...toast.props})
    jasmine.clock().tick(1000)
    expect(dismiss).toHaveBeenCalledTimes(1)
  })
  it("cancels its dismissal timer when removed", () => {
    toast.componentWillUnmount()
    jasmine.clock().tick(6000)
    expect(dismiss).not.toHaveBeenCalled()
  })
})


describe("Drum sets", () => {
  it("keeps Classic as the legacy default and round trips each selected kit", () => {
    const legacy = emptyPattern()
    delete legacy.kit
    expect(validatePattern(legacy).kit).toBe("classic")
    for (const {id} of DRUM_KITS) {
      const pattern = {...emptyPattern(), kit: id}
      expect(validatePattern(pattern).kit).toBe(id)
      expect(readSavedPatterns({getItem: () => JSON.stringify([{name: "Kit", pattern}])})[0].pattern.kit).toBe(id)
      expect(resizePattern(pattern, 2).kit).toBe(id)
      expect(changeTimeSignature(pattern, "6/8").kit).toBe(id)
    }
    expect(() => validatePattern({...emptyPattern(), kit: "unknown"})).toThrow()
  })
  it("provides distinct voices for all eight tracks in each new kit", () => {
    expect(DRUM_KITS.map(kit => kit.id)).toEqual(["classic", "rock", "wood", "jazz", "808", "909", "industrial", "latin", "lofi", "taiko"])
    for (const kit of Object.values(KIT_VOICES)) for (const [id] of TRACKS) {
      expect(kit[id].length).toBeGreaterThan(0)
      for (const voice of kit[id]) {
        expect(voice.decay).toBeGreaterThan(voice.attack || 0)
        expect(voice.gain).toBeGreaterThan(0)
        if (voice.type !== "noise") expect(voice.frequency).toBeGreaterThan(0)
      }
    }
    expect(KIT_VOICES.rock.kick).not.toEqual(KIT_VOICES.jazz.kick)
    expect(Object.values(KIT_VOICES.wood).flat().some(voice => voice.type === "noise")).toBeFalse()
  })
  it("schedules and cleans up every synthesized voice", () => {
    const audio = new DrumAudio(() => {})
    const sources = []
    const node = () => ({connect(next) {return next}, disconnect: jasmine.createSpy("disconnect")})
    const source = () => {
      const value = {...node(), frequency: {setValueAtTime() {}, exponentialRampToValueAtTime() {}}, start: jasmine.createSpy("start"), stop: jasmine.createSpy("stop")}
      sources.push(value)
      return value
    }
    audio.context = {
      createOscillator: source, createBufferSource: source,
      createGain: () => ({...node(), gain: {setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}}}),
      createBiquadFilter: () => ({...node(), frequency: {}, Q: {}}),
      createWaveShaper: () => node()
    }
    audio.master = node()
    audio.noise = {}
    for (const kit of DRUM_KITS) for (const [id] of TRACKS) audio.hit(id, 2, kit.id)
    expect(sources.length).toBeGreaterThan(32)
    for (const voice of sources) {
      expect(voice.start).toHaveBeenCalledWith(2)
      expect(voice.stop.calls.mostRecent().args[0]).toBeGreaterThan(2)
      voice.onended()
      expect(voice.disconnect).toHaveBeenCalled()
    }
  })
  it("uses kit changes for upcoming hits without restarting the clock", async () => {
    jasmine.clock().install()
    spyOn(window, "requestAnimationFrame").and.returnValue(1)
    spyOn(window, "cancelAnimationFrame")
    const audio = new DrumAudio(() => {})
    audio.context = {
      currentTime: 0, sampleRate: 1, resume: async () => {},
      createGain: () => ({gain: {}, connect() {}, disconnect() {}}),
      createBuffer: () => ({getChannelData: () => new Float32Array(1)})
    }
    spyOn(audio, "hit")
    const pattern = {...emptyPattern(), kit: "rock"}
    pattern.tracks.kick.fill(true)
    try {
      await audio.start(() => pattern, () => ({}), 0.7)
      expect(audio.hit.calls.mostRecent().args[2]).toBe("rock")
      pattern.kit = "wood"
      audio.context.currentTime = 0.1
      jasmine.clock().tick(25)
      expect(audio.hit.calls.mostRecent().args[2]).toBe("wood")
      expect(audio.hit.calls.mostRecent().args[1]).toBeCloseTo(0.19, 8)
    } finally { audio.stop(); jasmine.clock().uninstall() }
  })
})


describe("Drum playback keyboard shortcut", () => {
  let page, event
  beforeEach(() => {
    page = new DrumMachinePage({})
    spyOn(page, "togglePlayback")
    event = {code: "Space", key: " ", preventDefault: jasmine.createSpy("preventDefault"), target: {closest: () => null}}
  })
  it("toggles playback and prevents page scrolling on Space", () => {
    page.handlePlaybackKey(event)
    expect(page.togglePlayback).toHaveBeenCalledTimes(1)
    expect(event.preventDefault).toHaveBeenCalled()
  })
  it("leaves focused controls, editable text, dialogs, and repeated/modified keys alone", () => {
    for (const patch of [{ctrlKey: true}, {shiftKey: true}, {metaKey: true}, {altKey: true}, {defaultPrevented: true}, {code: "Enter", key: "Enter"}, {target: {isContentEditable: true}}, {target: {closest: () => ({})}}]) {
      page.handlePlaybackKey({...event, ...patch})
    }
    page.state.dialogAction = "save"
    page.handlePlaybackKey(event)
    expect(page.togglePlayback).not.toHaveBeenCalled()
    expect(event.preventDefault).not.toHaveBeenCalled()
  })
  it("prevents scrolling without repeatedly toggling when Space is held", () => {
    page.handlePlaybackKey({...event, repeat: true})
    expect(page.togglePlayback).not.toHaveBeenCalled()
    expect(event.preventDefault).toHaveBeenCalled()
  })
  it("unregisters its shortcut when leaving the page", () => {
    spyOn(window, "removeEventListener")
    spyOn(page.audio, "dispose")
    page.componentWillUnmount()
    expect(window.removeEventListener).toHaveBeenCalledWith("keydown", page.handlePlaybackKey)
    expect(page.audio.dispose).toHaveBeenCalled()
  })
})

describe("Drum triplet subdivisions", () => {
  it("preserves beat starts in both bars and round trips the triplet grid", () => {
    const straight = emptyPattern(2)
    straight.tracks.kick[4] = true
    straight.tracks.kick[20] = true
    const triplets = changeSubdivision(straight, "triplet")
    expect(triplets.tracks.kick.length).toBe(24)
    expect(triplets.tracks.kick[3]).toBeTrue()
    expect(triplets.tracks.kick[15]).toBeTrue()
    expect(stepMarker(triplets, 13).label).toBe("trip")
    expect(validatePattern(triplets)).toEqual(triplets)
    expect(changeSubdivision(triplets, "straight")).toEqual(straight)
    delete straight.subdivision
    expect(validatePattern(straight).subdivision).toBe("straight")
  })

  it("plays even triplets without changing the bar duration in any meter", () => {
    for (const signature of Object.keys(TIME_SIGNATURES)) {
      const meter = meterFor(emptyPattern(1, signature, "triplet"))
      const durations = Array.from({length: meter.steps}, (_, i) => stepDuration(120, 0.5, i, signature, "triplet"))
      expect(new Set(durations).size).toBe(1)
      expect(durations.reduce((total, duration) => total + duration)).toBeCloseTo(
        TIME_SIGNATURES[signature].steps * stepDuration(120, 0, 0, signature), 8)
    }
  })
})

describe("Drum Machine session", () => {
  it("restores the working beat, mutes, and volume on return with playback stopped", () => {
    const data = new Map()
    spyOnProperty(window, "localStorage", "get").and.returnValue({
      getItem: key => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value)
    })
    const page = new DrumMachinePage({})
    const previous = page.state
    const pattern = emptyPattern(2, "3/4", "triplet")
    pattern.bpm = 137
    pattern.tracks.kick[10] = true
    page.state = {...previous, pattern, volume: 0.35, muted: {snare: true}, playing: true}
    page.componentDidUpdate({}, previous)

    const restored = new DrumMachinePage({}).state
    expect(restored.pattern).toEqual(pattern)
    expect(restored.tempoInput).toBe("137")
    expect(restored.muted.snare).toBeTrue()
    expect(restored.volume).toBe(0.35)
    expect(restored.playing).toBeFalse()
    expect(restored.currentStep).toBe(-1)
  })
})
