import * as React from "react"
import * as types from "prop-types"
import Lightbox from "st/components/lightbox"
import {parseMidiMessage} from "st/midi"

export default class MidiDebugLightbox extends Lightbox {
  static className = "midi_debug_lightbox"

  static propTypes = {
    midiInput: types.object,
  }

  constructor(props) {
    super(props)
    this.state = {
      events: [],
      maxEvents: 100,
      filters: {
        noteOn: true,
        noteOff: true,
        dataEntry: true,
        other: true
      },
      autoScroll: true
    }
    this.eventCount = 0
    this.tableRef = React.createRef()
  }

  componentDidMount() {
    super.componentDidMount()
    // Subscribe to MIDI events from parent
    if (this.props.onMidiDebugEvent) {
      this.props.onMidiDebugEvent(this.handleMidiEvent.bind(this))
    }
  }

  handleMidiEvent(message) {
    const timestamp = performance.now()
    const parsed = parseMidiMessage(message)
    
    if (!parsed) return

    const [eventType, note, channel, velocity] = parsed
    const [raw, pitch, velocityVal] = message.data

    const event = {
      id: this.eventCount++,
      timestamp: timestamp,
      timeDelta: this.state.events.length > 0 ? 
        timestamp - this.state.events[this.state.events.length - 1].timestamp : 0,
      source: this.props.midiInput ? this.props.midiInput.name : "Unknown",
      raw: Array.from(message.data),
      eventType: eventType,
      note: note,
      channel: channel,
      velocity: velocity || velocityVal,
      pitch: pitch
    }

    this.setState(prevState => {
      const newEvents = [...prevState.events, event]
      if (newEvents.length > prevState.maxEvents) {
        newEvents.shift()
      }
      return { events: newEvents }
    }, () => {
      if (this.state.autoScroll && this.tableRef.current) {
        const container = this.tableRef.current.parentElement
        container.scrollTop = container.scrollHeight
      }
    })
  }

  clearEvents() {
    this.setState({ events: [] })
    this.eventCount = 0
  }

  toggleFilter(filterType) {
    this.setState(prevState => ({
      filters: {
        ...prevState.filters,
        [filterType]: !prevState.filters[filterType]
      }
    }))
  }

  shouldShowEvent(event) {
    switch (event.eventType) {
      case 'noteOn':
        return this.state.filters.noteOn
      case 'noteOff':
        return this.state.filters.noteOff
      case 'dataEntry':
        return this.state.filters.dataEntry
      default:
        return this.state.filters.other
    }
  }

  formatTimeDelta(delta) {
    return delta.toFixed(2) + "ms"
  }

  formatHex(data) {
    return data.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ')
  }

  formatDecimal(data) {
    return data.join(' ')
  }

  getMidiMessageType(eventType, pitch) {
    switch (eventType) {
      case 'noteOn':
        return 'Note ON'
      case 'noteOff':
        return 'Note OFF'
      case 'dataEntry':
        if (pitch === 64) return 'Sustain'
        return 'Controller'
      default:
        return 'Unknown'
    }
  }

  renderFilters() {
    return (
      <div className="filter_controls">
        <span className="filter_label">Show:</span>
        {Object.entries(this.state.filters).map(([key, value]) => (
          <label key={key} className="filter_checkbox">
            <input
              type="checkbox"
              checked={value}
              onChange={() => this.toggleFilter(key)}
            />
            <span className="filter_name">
              {key === 'noteOn' ? 'Note On' : 
               key === 'noteOff' ? 'Note Off' : 
               key === 'dataEntry' ? 'Controllers' : 
               'Other'}
            </span>
          </label>
        ))}
      </div>
    )
  }

  renderControls() {
    return (
      <div className="debug_controls">
        {this.renderFilters()}
        <div className="control_buttons">
          <label className="auto_scroll_checkbox">
            <input
              type="checkbox"
              checked={this.state.autoScroll}
              onChange={(e) => this.setState({ autoScroll: e.target.checked })}
            />
            <span>Auto-scroll</span>
          </label>
          <button onClick={() => this.clearEvents()}>
            Clear Events ({this.state.events.length})
          </button>
        </div>
      </div>
    )
  }

  renderContent() {
    const filteredEvents = this.state.events.filter(event => this.shouldShowEvent(event))

    return (
      <div className="midi_debug_content">
        <h2>MIDI Monitor</h2>
        {this.renderControls()}
        
        <div className="events_table_container">
          <table ref={this.tableRef} className="events_table">
            <thead>
              <tr>
                <th>Time Δ (ms)</th>
                <th>Source</th>
                <th>Data (hex)</th>
                <th>Data (dec)</th>
                <th>Ch</th>
                <th>Message</th>
                <th>Note</th>
                <th>Velocity</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map(event => (
                <tr key={event.id} className={`event_row event_${event.eventType}`}>
                  <td className="time_delta">{this.formatTimeDelta(event.timeDelta)}</td>
                  <td className="source">{event.source}</td>
                  <td className="data_hex">{this.formatHex(event.raw)}</td>
                  <td className="data_dec">{this.formatDecimal(event.raw)}</td>
                  <td className="channel">{event.channel !== undefined ? event.channel + 1 : '-'}</td>
                  <td className="message_type">{this.getMidiMessageType(event.eventType, event.pitch)}</td>
                  <td className="note">{event.note || event.pitch || '-'}</td>
                  <td className="velocity">{event.velocity || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEvents.length === 0 && (
          <div className="no_events">
            {this.state.events.length === 0 ? 
              "No MIDI events received yet. Play some notes on your MIDI device." :
              "No events match the current filters."
            }
          </div>
        )}
      </div>
    )
  }
}