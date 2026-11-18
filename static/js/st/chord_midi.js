// Track each MIDI channel independently, including sustain and panic controls.
export default class ChordMidi {
  constructor() { this.reset() }

  reset() { this.channels = new Map() }

  get notes() {
    return [...new Set([...this.channels.values()].flatMap(channel => [...channel.sounding]))]
      .sort((a, b) => a - b)
  }

  receive(data) {
    if (!data || data.length < 3 || !Array.from(data).every(Number.isInteger)) return
    const [status, pitch, value] = data
    if (status < 128 || status > 239 || pitch < 0 || pitch > 127 || value < 0 || value > 127) return
    const type = status & 0xf0
    if (![0x80, 0x90, 0xb0].includes(type)) return
    const id = status & 0x0f
    if (!this.channels.has(id)) this.channels.set(id, {held: new Set(), sounding: new Set(), pedal: false})
    const channel = this.channels.get(id)
    if (type === 0x90 && value > 0) {
      channel.held.add(pitch)
      channel.sounding.add(pitch)
    } else if (type === 0x80 || type === 0x90) {
      channel.held.delete(pitch)
      if (!channel.pedal) channel.sounding.delete(pitch)
    } else if (pitch === 64) {
      channel.pedal = value >= 64
      if (!channel.pedal) channel.sounding = new Set(channel.held)
    } else if (pitch === 120) {
      channel.held.clear()
      channel.sounding.clear()
    } else if (pitch === 123) {
      channel.held.clear()
      if (!channel.pedal) channel.sounding.clear()
    } else if (pitch === 121) {
      channel.pedal = false
      channel.sounding = new Set(channel.held)
    }
  }
}
