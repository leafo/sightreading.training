
import {CardHolder} from "st/components/flash_cards/common"

import * as React from "react"
import {classNames, MersenneTwister} from "lib"

let {PropTypes: types} = React

import NoteList from "st/note_list"

import {KeySignature} from "st/music"
import {ChordGenerator, MultiKeyChordGenerator} from "st/chord_generators"

import {GStaff, FStaff, GrandStaff, ChordStaff} from "st/components/staves"

export default class ChordIdentificationExercise extends React.PureComponent {
  static exerciseName = "Chord Identification"
  static exerciseId = "chord_identification"

  static propTypes = {
    settings: types.object.isRequired,
  }

  static defaultSettings() {
    return {}
  }

  static ExerciseOptions = class extends React.PureComponent {
    static propTypes = {
      updateSettings: types.func.isRequired,
    }

    render() {
      return <section className="settings_group">
        <h4>Chords</h4>
      </section>
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
    let sigs = KeySignature.allKeySignatures()
    let keySignature = sigs[this.rand.int() % sigs.length]

    let chord = new ChordGenerator(keySignature, {
      notes: 3,
    }).nextChord()

    let inversion = this.rand.int() % 3

    this.setState({
      cardNumber: this.state.cardNumber + 1,
      currentCard: {
        notes: 3,
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
    return <div className="card_options" ref="cardOptions">
      <button
        type="button"
        onClick={e => this.setupNext()}
      >Next</button>
    </div>

  }
}
