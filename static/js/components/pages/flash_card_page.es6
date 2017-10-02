
import * as React from "react"
import {classNames, MersenneTwister} from "lib"

let {PropTypes: types} = React
let {CSSTransitionGroup} = React.addons || {}

import {setTitle} from "st/globals"
import {keyCodeToChar} from "st/keyboard_input"

class SettingsPanel extends React.Component {
  render() {
    return <section className="settings_panel">
      <div className="settings_header">
        <button onClick={this.props.close}>Close</button>
        <h3>Settings</h3>
      </div>

      <section className="settings_group">
      </section>
    </section>
  }
}

export default class FlashCardPage extends React.Component {
  static notes = ["C", "D", "E", "F", "G", "A", "B"]

  constructor(props) {
    super(props)

    this.state = {
      cardNumber: 0,
      enabledRoots: { "D": true },
      settingsPanelOpen: false,
    }
    this.rand = new MersenneTwister()
  }

  componentDidMount() {
    setTitle("Flash Cards")
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

  componentWillMount() {
    this.refreshCards(() => {
      this.setupNext()
    })
  }

  componentWillUnmount() {
    window.removeEventListener("keyup", this.upListener)
  }

  refreshCards(fn) {
    let cards = []

    let notes = this.constructor.notes
    let offsets = [1,2,3,4,5,6]

    let roots = []
    for (let key in this.state.enabledRoots) {
      if (this.state.enabledRoots[key]) {
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

  setupNext() {
    if (!this.state.cards) {
      this.setState({ currentCard: null })
      return
    }

    // card weights
    let divScore = 0

    let cardsWithWeights = this.state.cards.filter((card) => {
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
      chosenCard = this.cards[0]
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

  render() {
    return <div className="flash_card_page">
      <button onClick={e => this.setState({
        settingsPanelOpen: true
      })} type="button">Settings</button>

      {this.renderTestGroups()}
      {this.renderCurrentCard()}

      <CSSTransitionGroup transitionName="slide_right" transitionEnterTimeout={200} transitionLeaveTimeout={100}>
        {this.renderSettings()}
      </CSSTransitionGroup>
    </div>
  }

  renderSettings() {
    if (!this.state.settingsPanelOpen) {
      return
    }

    return <SettingsPanel
      close={() => this.setState({
        settingsPanelOpen: false
      })}
      />
  }

  renderTestGroups() {
    let notes = this.constructor.notes

    return <div className="test_groups">
      {notes.map((note) =>
        <div
          key={note}
          className={classNames("test_group", {
            selected: this.state.enabledRoots[note]
          })}>
          <label>
            <input
              type="checkbox"
              checked={this.state.enabledRoots[note] || false}
              onChange={(e) => {
                this.state.enabledRoots[note] = !this.state.enabledRoots[note]
                this.refreshCards(() => {
                  this.setupNext()
                })
              }}
              />
            {note}
          </label>
        </div>
      )}
    </div>
  }

  renderCurrentCard() {
    if (!this.state.currentCard) {
      return <div className="start_message">Select some roots to begin</div>
    }

    let card = this.state.currentCard

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

    return <div className="card_holder">
      <CSSTransitionGroup
        component="div"
        className="transition_group"
        transitionName="show_card"
        transitionEnterTimeout={400}
        transitionLeaveTimeout={400}>
          <div key={this.state.cardNumber} className="card_row">
            <div className={classNames("flash_card", {errorshake: this.state.cardError})}>
              {card.label}
            </div>
          </div>
      </CSSTransitionGroup>
      <div className="card_options" ref="cardOptions">{options}</div>
    </div>
  }
}
