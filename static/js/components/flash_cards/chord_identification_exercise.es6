
import {CardHolder} from "st/components/flash_cards/common"

import * as React from "react"
import {classNames, MersenneTwister} from "lib"

let {PropTypes: types} = React

import ChordList from "st/chord_list"
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

    let generator = new ChordGenerator(new KeySignature(0), {
      notes: 3,
    })

    this.state = {
      cardNumber: 1,
      chordList: new ChordList([], { generator })
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
    this.state.chordList.pushRandom()
    this.setState({
      currentCard: {
        chord: this.state.chordList[0]
      }
    })
  }

  renderCurrentCard() {
    let card = this.state.currentCard

    if (!card) {
      return
    }

    return <div key={this.state.cardNumber} className="card_row">
      <div className={classNames("flash_card", {errorshake: this.state.cardError})}>
        <GStaff
          heldNotes={{}}
          notes={new NoteList([["C6", "G6"]])}
          keySignature={new KeySignature(0)}
          noteWidth={100}
          noteShaking={false}
          scale={0.8}
        />
      </div>
    </div>
  }

  renderCardOptions() {
  }
}
