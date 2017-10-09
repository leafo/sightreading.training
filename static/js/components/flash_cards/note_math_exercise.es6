import {keyCodeToChar} from "st/keyboard_input"

import {CardHolder} from "st/components/flash_cards/common"

import * as React from "react"
import {classNames, MersenneTwister} from "lib"

let {PropTypes: types} = React

export default class NoteMathExercise extends React.PureComponent {
  static exerciseName = "Note Math"
  static exerciseId = "note_math"
  static notes = ["C", "D", "E", "F", "G", "A", "B"]

  static propTypes = {
    settings: types.object.isRequired,
  }

  static defaultSettings() {
    return { enabledRoots: { "D": true } }
  }

  static ExerciseOptions = class extends React.PureComponent {
    static propTypes = {
      updateSettings: types.func.isRequired,
    }

    render() {
      let notes = NoteMathExercise.notes
      let settings = this.props.currentSettings

      return <section className="settings_group">
        <h4>Root notes</h4>
        {notes.map((note) =>
          <label
            key={note}
            className={classNames("test_group", {
              selected: settings.enabledRoots[note]
            })}>
            <input
              type="checkbox"
              checked={settings.enabledRoots[note] || false}
              onChange={(e) => {
                this.props.updateSettings({
                  ...settings,
                  enabledRoots: {
                    ...settings.enabledRoots,
                    [note]: !settings.enabledRoots[note]
                  }
                })
              }}
              />
            {note}
          </label>
        )}

      </section>
    }
  }

  constructor(props) {
    super(props)
    this.state = {
      cardNumber: 0,
    }
    this.rand = new MersenneTwister()
  }

  componentWillMount() {
    this.setupNext(this.refreshCards())
  }

  componentDidMount() {
    this.upListener = event => {
      let key = keyCodeToChar(event.keyCode)
      if (key == null) {
        return
      }

      if (!this.refs.cardOptions) {
        return
      }

      if (key.match(/^\d$/)) {
        let option = (+key) - 1
        let button = this.refs.cardOptions.children[option]
        if (button) {
          button.click()
        }
      } else {
        for (let button of this.refs.cardOptions.children) {
          if (button.textContent == key.toUpperCase()) {
            button.click()
          }
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
      this.refreshCards(() => {
        this.setupNext()
      })
    }
  }

  render() {
    let card = this.state.currentCard
    let errorMessage = card ? null : <strong className="no_cards_error">Please enable some cards from settings</strong>

    return <div className="note_math_exercise flash_card_exercise">
      {errorMessage}
      <CardHolder>{this.renderCurrentCard()}</CardHolder>
      {this.renderCardOptions()}
    </div>
  }

  renderCurrentCard() {
    let card = this.state.currentCard

    if (!card) {
      return
    }

    return <div key={this.state.cardNumber} className="card_row">
      <div className={classNames("flash_card", {errorshake: this.state.cardError})}>
        {card.label}
      </div>
    </div>
  }

  renderCardOptions() {
    let card = this.state.currentCard

    if (!card) {
      return
    }

    let options = card.options.map(a =>
      <button
        key={a}
        disabled={this.state.cardMistakes && this.state.cardMistakes[a]}
        onClick={(e) => {
          e.preventDefault()
          this.checkAnswer(a)
        }}
      >{a}</button>
    )

    return <div className="card_options" ref="cardOptions">
      {options}
    </div>
  }

  normalizeScores() {
    let minScore = Math.min(...this.state.cards.map((c) => c.score))
    minScore -= 1
    if (minScore == 0) {
      return
    }

    for (let card of this.state.cards) {
      card.score -= minScore
    }
  }

  refreshCards(fn) {
    let enabledRoots = this.props.settings.enabledRoots
    let cards = []

    let notes = this.constructor.notes
    let offsets = [1,2,3,4,5,6]

    let roots = []
    for (let key in enabledRoots) {
      if (enabledRoots[key]) {
        let idx = notes.indexOf(key)
        if (idx >= 0) {
          roots.push(idx)
        }
      }
    }

    for (let rootIdx of roots) {
      let note = notes[rootIdx]
      for (let offset of offsets) {
        let answer = notes[(rootIdx + offset) % notes.length]

        cards.push({
          score: 1,
          label: `${offset + 1} of ${note} is`,
          answer: answer,
          options: notes,
        })

      }
    }

    this.setState({ cards }, fn)
    return cards
  }

  setupNext(cards=this.state.cards) {
    if (!cards) {
      this.setState({ currentCard: null })
      return
    }

    // card weights
    let divScore = 0

    let cardsWithWeights = cards.filter((card) => {
      return card != this.state.currentCard
    }).map((card) => {
      let score = 1 / Math.pow(card.score, 2)
      divScore += score
      return [score, card]
    })

    let incr = 0
    let r = this.rand.random() * divScore

    let chosenCard = null
    for (let [weight, card] of cardsWithWeights) {
      incr += weight

      if (r < incr) {
        chosenCard = card
        break
      }
    }

    // no cards to pick, use first
    if (!chosenCard) {
      chosenCard = cards[0]
    }

    this.setState({
      cardMistakes: null,
      cardError: false,
      cardNumber: this.state.cardNumber + 1,
      currentCard: chosenCard
    })
  }

  checkAnswer(answer) {
    if (!this.state.currentCard) {
      return
    }

    if (answer == this.state.currentCard.answer) {
      if (!this.state.cardMistakes) {
        this.state.currentCard.score += 1
        this.normalizeScores()
      }

      this.setupNext()
    } else {

      let card = this.state.currentCard
      let cardNumber = this.state.cardNumber

      if (!this.state.cardMistakes) {
        card.score -= 1
        this.normalizeScores()
      }

      let mistakes = this.state.cardMistakes || {}
      mistakes[answer] = true

      this.setState({
        cardMistakes: mistakes,
        cardError: true
      })

      window.setTimeout(() => {
        if (this.state.cardNumber == cardNumber) {
          this.setState({ cardError: false })
        }
      }, 600)
    }
  }

}
