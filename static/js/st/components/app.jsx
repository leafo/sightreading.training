import SightReadingPage from "st/components/pages/sight_reading_page"
import AccountPage from "st/components/pages/account_page"
import {getSession} from "st/app"
import LoginPage from "st/components/pages/login_page"
import RegisterPage from "st/components/pages/register_page"
import {guideRoutes} from "st/components/pages/guide_pages"
import StatsPage from "st/components/pages/stats"
import FlashCardPage from "st/components/pages/flash_card_page"
import EarTrainingPage from "st/components/pages/ear_training_page"
import {PlayAlongPageWithParams as PlayAlongPage} from "st/components/pages/play_along_page"
import LatencyPage from "st/components/pages/latency"
import FeedbackPage from "st/components/pages/feedback_page"
import MidiMonitorPage from "st/components/pages/midi_monitor"
import SongsPage from "st/components/pages/songs"
import NotFoundPage from "st/components/pages/not_found"
import DrumMachinePage from "st/components/pages/drum_machine_page"
import GuitarScalesPage from "st/components/pages/guitar_scales_page"
import ChordLabPage from "st/components/pages/chord_lab_page"
import ChordSheetPage from "st/components/pages/chord_sheet_page"
import ChordReferencePage from "st/components/pages/chord_reference_page"
import Header from "st/components/header"

import DevicePickerLightbox from "st/components/device_picker_lightbox"

import {dispatch, trigger} from "st/events"
import {readConfig, writeConfig} from "st/config"
import {postAuth, completeAuth} from "st/auth"
import Toast from "st/components/toast"
import PracticeTimer from "st/components/practice_timer"

import * as React from "react"
import {BrowserRouter, Route, Routes, Navigate} from "react-router-dom"

import {SampleOutput} from "st/sample_output"

class Layout extends React.Component {
  constructor(props) {
    super(props)
    let device = readConfig("defaults:outputDeviceType") || "none"
    let midiOutputChannel
    if (device == "internal") {
      midiOutputChannel = SampleOutput.getInstance()
    }

    this.state = {
      outputDeviceType: device,
      forwardMidi: readConfig("defaults:forwardMidi") == 1,
      midiOutputChannel
    }

    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(
        midi => {
          this.setState({midi}, () => {
            this.loadDefaultSettings()
          })
        },
        error => console.warn("failed to get MIDI")) // TODO: we shoudl show some kind of error lightbox possibly?
    }
  }

  loadDefaultSettings() {
    const defaultMidiInput = readConfig("defaults:midiIn")
    if (defaultMidiInput) {
      const inputs = this.midiInputs()
      if (inputs) {
        let idx = 0
        for (let input of this.midiInputs()) {
          if (input.name == defaultMidiInput) {
            this.setInput(idx)
          }
          idx++
        }
      }
    }
  }

  componentDidMount() {
    dispatch(this, {
      "lightboxClosed": e => this.setState({currentLightbox: null}),
      "closeLightbox": e => this.refs.currentLightbox.close(),
      "showLightbox": (e, lb) => {
        this.setState({
          currentLightbox: lb
        })
      },
      "pickMidi": (e) => {
        this.setState({
          currentLightbox: this.renderMidiLightbox()
        })
      }
    })
  }

  componentWillUnmount() {
    if (this.state.midiInput) {
      console.log(`Unbinding: ${this.state.midiInput.name}`)
      this.state.midiInput.onmidimessage = undefined
    }
  }

  midiProps() {
    return {
      midi: this.state.midi,
      midiInput: this.state.midiInput,
      midiOutput: this.state.midiOutputChannel,
    }
  }

  // these are mixed into all children's props (lightboxes included)
  pageProps() {
    return {
      ...this.midiProps(),
      ref: this.currentPageRef ||= React.createRef()
    }
  }

  render() {
    let pageProps = this.pageProps()

    return <div className="page_layout">
      <div className="header_spacer">
        {this.renderHeader()}
      </div>

      <Routes>
        <Route path="/" element={<SightReadingPage {...pageProps} />} />
        <Route path="/staff2" element={<SightReadingPage useStaffTwo={true} {...pageProps} />} />
        <Route path="/login" element={<LoginPage/>} />
        <Route path="/register" element={<RegisterPage/>} />
        <Route path="/account" element={<AccountPage onSave={displayName => {
          getSession().currentUser.displayName = displayName
          this.forceUpdate()
        }} />} />

        <Route path="/ear-training">
          <Route path="interval-melodies" element={<EarTrainingPage exercise="melody_recognition" {...pageProps} />} />
          <Route path="melody-playback" element={<EarTrainingPage exercise="melody_playback" {...pageProps} />} />
          <Route index element={<Navigate replace to="/ear-training/interval-melodies" />} />
        </Route>

        <Route path="/flash-cards">
          // The key hack here is to get the page to re-render when selecting a different type due to how settings and loaded and cached
          <Route path="note-math" element={<FlashCardPage key="note_math" exercise="note_math" {...pageProps} />} />
          <Route path="chord-identification" element={<FlashCardPage key="chord_identification" exercise="chord_identification" {...pageProps} />} />
          <Route index element={<Navigate replace to="/flash-cards/note-math" />} />
        </Route>

        <Route path="/play-along">
          <Route index element={<SongsPage {...pageProps} />} />
          <Route path="beginner/:preset_id" element={<PlayAlongPage {...pageProps} />} />
          <Route path="recent" element={<SongsPage filter="recent" {...pageProps} />} />
          <Route path="*" element={<SongsPage filter="invalid" {...pageProps} />} />
        </Route>

        <Route path="/drum-machine" element={<DrumMachinePage {...pageProps} />} />
        <Route path="/scales" element={<GuitarScalesPage {...pageProps} />} />
        <Route path="/guitar-scales" element={<Navigate replace to="/scales" />} />
        <Route path="/chord-lab" element={<ChordLabPage {...pageProps} />} />
        <Route path="/chord-sheet" element={<ChordSheetPage {...pageProps} />} />
        <Route path="/chord-reference" element={<ChordReferencePage {...pageProps} />} />
        <Route path="/stats" element={<StatsPage {...pageProps} />} />
        <Route path="/latency" element={<LatencyPage {...pageProps} />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/midi-monitor" element={<MidiMonitorPage {...pageProps} />} />
        <Route path="/new-song" element={<PlayAlongPage newSong={true} editorOpen={true} {...pageProps} />} />

        <Route path="/song/:song_id/:song_slug" element={<PlayAlongPage {...pageProps} />} />

        {guideRoutes()}

        <Route path="*" element={<NotFoundPage/>} />
      </Routes>

      <PracticeTimer />
      {this.renderCurrentLightbox()}
      <Toast message={this.state.authError} notificationId={this.state.authErrorId}
        onDismiss={() => this.setState({authError: null})} />
    </div>
  }

  renderCurrentLightbox() {
    if (!this.state.currentLightbox) { return }

    let lb = React.cloneElement(this.state.currentLightbox, {
      ref: "currentLightbox",
      ...this.midiProps()
    })

    return lb
  }

  async doLogout(event) {
    event?.preventDefault()
    if (this.loggingOut) return
    this.loggingOut = true
    try {
      const result = await postAuth("/logout.json")
      if (!completeAuth(result)) throw new Error("Logout failed")
    } catch (error) {
      this.setState(state => ({
        authError: "Could not log out. Refresh the page and try again.",
        authErrorId: (state.authErrorId || 0) + 1,
      }))
    } finally {
      this.loggingOut = false
    }
  }

  renderHeader() {
    return <Header
      midiInput={this.state.midiInput}
      doLogout={this.doLogout.bind(this)}
      />
  }

  midiInputs() {
    if (!this.state.midi) return;
    return [...this.state.midi.inputs.values()];
  }

  setInput(idx) {
    if (idx === undefined) {
      return
    }

    let input = this.midiInputs()[idx]

    if (!input) {
      this.setState({
        midiInput: null,
        midiInputIdx: null,
      })
      return
    }

    if (this.state.midiInput) {
      console.log(`Unbinding: ${this.state.midiInput.name}`)
      this.state.midiInput.onmidimessage = undefined
    }

    console.log(`Binding to: ${input.name}`)
    input.onmidimessage = this.onMidiMessage.bind(this)

    this.setState({
      midiInput: input,
      midiInputIdx: idx,
    })

    return input
  }

  onMidiMessage(message) {
    // forward to output if necessary
    if (this.state.forwardMidi && this.state.midiOutputChannel) {
      this.state.midiOutputChannel.sendMessage(message.data)
    }

    const page = this.currentPageRef && this.currentPageRef.current

    // proxy message to the current page
    if (page && page.onMidiMessage) {
      page.onMidiMessage(message)
    }
  }

  renderMidiLightbox() {
    return <DevicePickerLightbox
      forwardMidi={this.state.forwardMidi}
      selectedInputIdx={this.state.midiInputIdx}
      selectedOutputChannel={this.state.midiOutputChannel}
      selectedOutputIdx={this.state.midiOutputIdx}
      selectedOutputDeviceType={this.state.outputDeviceType}

      onClose={lb => {
        let config = lb.midiConfiguration()
        let input = this.setInput(config.inputIdx)

        let output = config.outputChannel

        if (config.outputDeviceType == "internal") {
          output = SampleOutput.getInstance()
        }

        this.setState({
          forwardMidi: config.forwardMidi,
          midiOutputChannel: output,
          midiOutputIdx: config.outputIdx,
          outputDeviceType: config.outputDeviceType,
        })

        writeConfig("defaults:midiIn", input ? input.name : undefined)
        writeConfig("defaults:forwardMidi", config.forwardMidi ? "1" : undefined)
        writeConfig("defaults:outputDeviceType", config.outputDeviceType || undefined)
      }} />
  }
}

export default class App extends React.Component {
  static Layout = Layout

  render() {
    return <BrowserRouter>
      <Layout />
    </BrowserRouter>
  }
}
