
import {CardHolder} from "st/components/flash_cards/common"

import * as React from "react"
import classNames from "classnames"
import MersenneTwister from "mersennetwister"

import * as types from "prop-types"

import NoteList from "st/note_list"

import {KeySignature} from "st/music"
import {ChordGenerator, MultiKeyChordGenerator} from "st/chord_generators"

import {GStaff, FStaff, GrandStaff, ChordStaff} from "st/components/staves"

export default class ChordIdentificationExercise extends React.PureComponent {
  static exerciseName = "Chord Identification"
  static exerciseId = "chord_identification"

  static notes = ["C", "D", "E", "F", "G", "A", "B"]
  static chordTypes = ["M", "m", "dim"]

  static propTypes = {
    settings: types.object.isRequired,
  }

  static defaultSettings() {
    return {
      keySignatures: { "0": true }
    }
  }

  static ExerciseOptions = class extends React.PureComponent {
    static propTypes = {
      updateSettings: types.func.isRequired,
    }

    render() {
      let settings = this.props.currentSettings

      return <div>
        <section className="settings_group">
          <h4>Key signature</h4>
          {KeySignature.allKeySignatures().map(ks => {
            let count = "" + ks.count
            return <label key={ks.name()}>
              <input
                checked={settings.keySignatures[count] || false}
                onChange={e =>
                  this.props.updateSettings({
                    ...settings,
                    keySignatures: {
                      ...settings.keySignatures,
                      [count]: !settings.keySignatures[count]
                    }
                  })
                }
                type="checkbox" />
              {" "}
              {ks.name()}
            </label>
          })}
        </section>
        <section className="settings_group">
          <h4>Inversions</h4>
          <label>
            <input
              checked={settings.inversions || false}
              onChange={e =>
                this.props.updateSettings({
                  ...settings,
                  inversions: !settings.inversions
                })
              }
              type="checkbox" />
            {" "}
            Enabled
          </label>
        </section>
      </div>
    }
  }

  constructor(props) {
    super(props)
    this.rand = new MersenneTwister()

    this.state = {
      cardNumber: 1,
    }
  }

  componentWillMount() {
    this.setupNext()
  }

  componentDidUpdate(prevProps) {
    if (prevProps.settings != this.props.settings) {
      this.setupNext()
    }
  }

  render() {
    let card = this.state.currentCard
    let errorMessage = card ? null : <strong className="no_cards_error">Please enable some cards from settings</strong>

    return <div className="chord_identification_exercise flash_card_exercise">
      {errorMessage}
      <CardHolder>{this.renderCurrentCard()}</CardHolder>
      {this.renderCardOptions()}
    </div>
  }

  setupNext() {
    let sigs = KeySignature.allKeySignatures().filter(ks =>
      this.props.settings.keySignatures["" + ks.count]
    )

    let notes = 3
    let keySignature = sigs[this.rand.int() % sigs.length]

    if (!keySignature) {
      this.setState({
        currentCard: null
      })

      return
    }

    if (!this.generators) {
      this.generators = {}
    }

    let generatorKey = `${keySignature.count}-${notes}`
    if (!this.generators[generatorKey]) {
      this.generators[generatorKey] = new ChordGenerator(keySignature, { notes })
    }

    let chord = this.generators[generatorKey].nextChord()

    let inversion = this.props.settings.inversions ? this.rand.int() % 3 : 0

    this.setState({
      cardNumber: this.state.cardNumber + 1,
      cardError: false,
      cardMistakes: null,
      partialAnswer: null,

      currentCard: {
        notes,
        octave: 5,
        keySignature,
        chord,
        inversion
      }
    })
  }

  renderCurrentCard() {
    let card = this.state.currentCard

    if (!card) {
      return
    }

    let notes = card.chord.getRange(card.octave, card.notes, card.inversion)

    return <div key={this.state.cardNumber} className="card_row">
      <div className={classNames("flash_card", {errorshake: this.state.cardError})}>
        <GStaff
          heldNotes={{}}
          notes={new NoteList([notes])}
          keySignature={card.keySignature}
          noteWidth={100}
          noteShaking={false}
          scale={0.8}
        />
      </div>
    </div>
  }

  renderCardOptions() {
    if (!this.state.currentCard) {
      return
    }

    let levels = [
      this.constructor.notes,
      [
        ...this.constructor.chordTypes,
        {value: "b", label: <span style={{ transform: "scale(1.5, 1.5)", display: "inline-block"}}>♭</span>},
        {value: "#", label: <span style={{ transform: "scale(1.5, 1.5)", display: "inline-block"}}>♯</span>},
      ],
      this.constructor.chordTypes,
    ]

    let partialAnswer = this.state.partialAnswer || []

    let isCompleteAnswer = v => this.constructor.chordTypes.some(t => v.endsWith(t))

    let options = levels[partialAnswer.length].map(value => {
      let displayLabel = typeof value == "string" ? value : value.label
      let pushValue = typeof value == "string" ? value : value.value

      let newAnswer = [...partialAnswer, pushValue]
      let newAnswerStr = newAnswer.join("")

      return <button
        key={`${partialAnswer.length}-${pushValue}`}
        type="button"
        disabled={this.state.cardMistakes && this.state.cardMistakes[newAnswerStr]}
        onClick={e => {
          if (isCompleteAnswer(newAnswerStr)) {
            this.checkAnswer(newAnswerStr)
          } else {
            this.setState({ partialAnswer: newAnswer })
          }
        }}
      >{displayLabel}</button>
    })

    if (partialAnswer.length) {
      options.push(
        <button
          key={`${partialAnswer.length} back`}
          className="outline back_btn"
          onClick={e => {
            let newAnswer = [...partialAnswer]
            newAnswer.pop()
            this.setState({
              partialAnswer: newAnswer
            })
          }}
        >◀ Back</button>
      )
    }

    return <div className="card_options" ref="cardOptions">
      {options}
    </div>
  }

  checkAnswer(answer) {
    if (!this.state.currentCard) {
      return
    }

    let card = this.state.currentCard

    let cardAnswer = `${card.chord.root}${card.chord.chordShapeName()}`
    console.log("checking answer", answer, "expected", cardAnswer)

    if (cardAnswer == answer) {
      this.setupNext()
    } else {
      let mistakes = this.state.cardMistakes || {}
      mistakes[answer] = true

      this.setState({
        cardMistakes: mistakes,
        cardError: true,
        partialAnswer: null,
      })

      let cardNumber = this.state.cardNumber

      window.setTimeout(() => {
        if (this.state.cardNumber == cardNumber) {
          this.setState({ cardError: false })
        }
      }, 600)
    }

  }
}
