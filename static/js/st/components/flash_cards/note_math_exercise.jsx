import {keyCodeToChar} from "st/keyboard_input"
import {
  NATURAL_NOTES,
  SHARP_NAMES,
  FLAT_NAMES,
  ACCIDENTAL_PITCHES,
  ROOT_LABELS,
  STANDARD_INTERVALS,
  ACCIDENTAL_INTERVALS,
  pitchClass,
  enabledRootPreset,
} from "st/note_math_helpers.mjs"

export {
  NATURAL_NOTES,
  SHARP_NAMES,
  FLAT_NAMES,
  STANDARD_INTERVALS,
  pitchClass,
  intervalAnswerPitch,
  enabledRootPreset,
} from "st/note_math_helpers.mjs"

import {CardHolder} from "st/components/flash_cards/common"
import Keyboard from "st/components/keyboard"

import * as React from "react"
import classNames from "classnames"
import MersenneTwister from "mersennetwister"
import {shuffled} from "st/util"
import settingsPanelStyles from "st/components/settings_panel.module.css"
import flashCardStyles from "st/components/flash_cards/flash_cards.module.css"
import staffStyles from "st/components/staff.module.css"

import * as types from "prop-types"

export default class NoteMathExercise extends React.PureComponent {
  static exerciseName = "Note Math"
  static exerciseId = "note_math"

  static propTypes = {
    settings: types.object.isRequired,
  }

  static defaultSettings() {
    return {
      enabledRoots: {"D": true},
      randomizeAccidentals: false,
      virtualMidiKeyboard: false,
      intervalAccidentals: false,
    }
  }

  static ExerciseOptions = class extends React.PureComponent {
    static propTypes = {
      updateSettings: types.func.isRequired,
      currentSettings: types.object.isRequired,
    }

    updateToggle(name) {
      let settings = this.props.currentSettings
      let update = {[name]: !settings[name]}

      this.props.updateSettings({...settings, ...update})
    }

    renderToggle(name, label, disabled=false) {
      let settings = this.props.currentSettings
      return <label className={classNames(flashCardStyles.test_group, {
        [flashCardStyles.selected]: settings[name],
        [flashCardStyles.disabled]: disabled,
      })}>
        <input
          type="checkbox"
          checked={settings[name] || false}
          disabled={disabled}
          onChange={() => this.updateToggle(name)} />
        {label}
      </label>
    }

    render() {
      let settings = this.props.currentSettings
      let notes = SHARP_NAMES
      let allRootsEnabled = notes.every(note => settings.enabledRoots[note])
      let naturalsEnabled = NATURAL_NOTES.every(note => settings.enabledRoots[note]) &&
        ACCIDENTAL_PITCHES.every(pitch => !settings.enabledRoots[SHARP_NAMES[pitch]])

      return <>
        <section className={settingsPanelStyles.settings_group}>
          <h4>Options</h4>
          <div className={flashCardStyles.option_list}>
            {this.renderToggle("randomizeAccidentals", "Randomize b/#")}
            {this.renderToggle("intervalAccidentals", "Interval Accidentals")}
            {this.renderToggle("virtualMidiKeyboard", "Virtual MIDI Keyboard")}
          </div>
        </section>
        <section className={settingsPanelStyles.settings_group}>
          <h4>Root notes</h4>
          <div className={settingsPanelStyles.button_group}>
            <label className={classNames(flashCardStyles.test_group, {
              [flashCardStyles.selected]: allRootsEnabled,
            })}>
              <input
                type="checkbox"
                checked={allRootsEnabled}
                onChange={() => this.props.updateSettings({
                  ...settings,
                  enabledRoots: allRootsEnabled
                    ? {"C": true}
                    : enabledRootPreset(notes),
                })} />
              All
            </label>
            <label className={classNames(flashCardStyles.test_group, {
              [flashCardStyles.selected]: naturalsEnabled,
            })}>
              <input
                type="checkbox"
                checked={naturalsEnabled}
                onChange={() => this.props.updateSettings({
                  ...settings,
                  enabledRoots: naturalsEnabled
                    ? {"C": true}
                    : enabledRootPreset(NATURAL_NOTES),
                })} />
              Naturals
            </label>
            {notes.map((note) =>
              <label
                key={note}
                className={classNames(flashCardStyles.test_group, {
                  [flashCardStyles.selected]: settings.enabledRoots[note]
                })}>
                <input
                  type="checkbox"
                  checked={settings.enabledRoots[note] || false}
                  onChange={() => this.props.updateSettings({
                    ...settings,
                    enabledRoots: {
                      ...settings.enabledRoots,
                      [note]: !settings.enabledRoots[note]
                    }
                  })} />
                {ROOT_LABELS[note] || note}
              </label>
            )}
          </div>
        </section>
      </>
    }
  }

  constructor(props) {
    super(props)
    this.state = {cardNumber: 0}
    this.rand = new MersenneTwister()
    this.pressKeyboardNote = this.pressKeyboardNote.bind(this)
  }

  componentDidMount() {
    this.showNext(this.refreshCards())

    this.upListener = event => {
      if (this.props.settings.virtualMidiKeyboard) {
        return
      }

      let key = keyCodeToChar(event.keyCode)
      if (key == null || !this.refs.cardOptions) {
        return
      }

      if (key.match(/^\d$/)) {
        let button = this.refs.cardOptions.children[(+key) - 1]
        if (button) button.click()
      } else {
        for (let button of this.refs.cardOptions.children) {
          if (button.textContent == key.toUpperCase()) button.click()
        }
      }
    }
    window.addEventListener("keyup", this.upListener)
  }

  componentWillUnmount() {
    window.removeEventListener("keyup", this.upListener)
  }

  componentDidUpdate(prevProps) {
    if (prevProps.settings != this.props.settings) {
      this.refreshCards(() => this.showNext())
    }
  }

  render() {
    let card = this.state.currentCard
    let errorMessage = card ? null : <strong className={flashCardStyles.no_cards_error}>Please enable some cards from settings</strong>

    return <div className={classNames("note_math_exercise flash_card_exercise", {
      [flashCardStyles.with_keyboard]: this.props.settings.virtualMidiKeyboard,
    })}>
      {errorMessage}
      <CardHolder>{this.renderCurrentCard()}</CardHolder>
      {this.props.settings.virtualMidiKeyboard ? this.renderKeyboard() : this.renderCardOptions()}
    </div>
  }

  renderCurrentCard() {
    let card = this.state.currentCard
    if (!card) return

    return <div key={this.state.cardNumber} className={flashCardStyles.card_row}>
      <div className={classNames(flashCardStyles.flash_card, {
        [staffStyles.errorshake]: this.state.cardError,
      })}>
        {card.label}
      </div>
    </div>
  }

  renderCardOptions() {
    let card = this.state.currentCard
    if (!card) return

    return <div className={flashCardStyles.card_options} ref="cardOptions">
      {card.options.map(option =>
        <button
          key={option.pitch}
          disabled={this.state.cardMistakes && this.state.cardMistakes[option.pitch]}
          onClick={e => {
            e.preventDefault()
            this.checkAnswer(option.pitch)
          }}>
          {option.label}
        </button>
      )}
    </div>
  }

  renderKeyboard() {
    if (!this.state.currentCard) return

    return <Keyboard
      className={flashCardStyles.note_math_keyboard}
      lower="C4"
      upper="B5"
      onKeyDown={this.pressKeyboardNote} />
  }

  pressKeyboardNote(note) {
    this.checkAnswer(pitchClass(note.replace(/\d+$/, "")))
  }

  normalizeScores() {
    let minScore = Math.min(...this.state.cards.map(card => card.score)) - 1
    if (minScore == 0) return
    for (let card of this.state.cards) card.score -= minScore
  }

  refreshCards(fn) {
    let settings = this.props.settings
    let enabledRoots = settings.enabledRoots
    let rootNames = SHARP_NAMES
    let rootPitches = SHARP_NAMES.map(pitchClass)
    let intervals = settings.intervalAccidentals
      ? STANDARD_INTERVALS.concat(ACCIDENTAL_INTERVALS)
      : STANDARD_INTERVALS
    let cards = []

    rootNames.forEach((rootName, rootIndex) => {
      if (!enabledRoots[rootName]) return

      intervals.forEach(interval => {
        let answerPitch = (rootPitches[rootIndex] + interval.halfSteps) % 12
        cards.push({
          score: 1,
          intervalLabel: interval.label,
          rootPitch: rootPitches[rootIndex],
          answerPitch,
          halfSteps: interval.halfSteps,
        })
      })
    })

    this.setState({cardOrder: null, cards}, fn)
    return cards
  }

  noteNamesForTurn() {
    if (!this.props.settings.randomizeAccidentals) return SHARP_NAMES

    let useSharps = ACCIDENTAL_PITCHES.map(() => this.rand.random() < 0.5)
    // "Randomize" should visibly mix both spellings instead of occasionally
    // producing an all-sharp or all-flat row by chance.
    if (useSharps.every(Boolean)) useSharps[useSharps.length - 1] = false
    if (useSharps.every(value => !value)) useSharps[useSharps.length - 1] = true

    return SHARP_NAMES.map((name, pitch) => {
      if (!ACCIDENTAL_PITCHES.includes(pitch)) return name
      let accidentalIndex = ACCIDENTAL_PITCHES.indexOf(pitch)
      return useSharps[accidentalIndex] ? SHARP_NAMES[pitch] : FLAT_NAMES[pitch]
    })
  }

  showNext(cards=this.state.cards) {
    if (!cards || cards.length == 0) {
      this.setState({currentCard: null})
      return
    }

    let cardOrder = this.state.cardOrder ? [...this.state.cardOrder] : []
    if (cardOrder.length <= 1) {
      let moreCards = shuffled(cards.map((_, idx) => idx))
      if (moreCards[0] == cardOrder[cardOrder.length - 1]) moreCards.reverse()
      cardOrder = cardOrder.concat(moreCards)
    }

    let card = cards[cardOrder.shift()]
    let noteNames = this.noteNamesForTurn()
    let rootLabel = noteNames[card.rootPitch]
    let options = noteNames.map(label => ({label, pitch: pitchClass(label)}))

    this.setState({
      cardMistakes: null,
      cardError: false,
      cardNumber: this.state.cardNumber + 1,
      currentCard: {
        ...card,
        sourceCard: card,
        answerPitch: card.answerPitch,
        label: `${card.intervalLabel} of ${rootLabel} is`,
        options,
      },
      cardOrder,
    })
  }

  checkAnswer(answerPitch) {
    if (!this.state.currentCard) return

    if (answerPitch == this.state.currentCard.answerPitch) {
      if (!this.state.cardMistakes) {
        this.state.currentCard.sourceCard.score += 1
        this.normalizeScores()
      }
      this.showNext()
      return
    }

    let card = this.state.currentCard
    let cardNumber = this.state.cardNumber
    if (!this.state.cardMistakes) {
      card.sourceCard.score -= 1
      this.normalizeScores()
    }

    this.setState({
      cardMistakes: {...this.state.cardMistakes, [answerPitch]: true},
      cardError: true,
    })

    window.setTimeout(() => {
      if (this.state.cardNumber == cardNumber) this.setState({cardError: false})
    }, 600)
  }
}
