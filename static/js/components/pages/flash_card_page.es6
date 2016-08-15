
let {PropTypes: types} = React
let {Link} = ReactRouter
let {CSSTransitionGroup} = React.addons || {}

class FlashCardPage extends React.Component {
  static notes = ["C", "D", "E", "F", "G", "A", "B"]

  constructor(props) {
    super(props)

    this.state = {
      cardNumber: 0,
      enabledRoots: { "D": true },
    }
    this.rand = new MersenneTwister()
  }

  componentWillMount() {
    this.setupNext()
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

  setupNext() {
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

    if (!roots.length) {
      this.setState({
        currentCard: null
      })

      return
    }

    let rootIdx = roots[this.rand.int() % roots.length]
    let note = notes[rootIdx] // hard code to C for now
    let offset = offsets[this.rand.int() % offsets.length]
    let answer = notes[(rootIdx + offset) % notes.length]

    if (this.state.currentCard && answer == this.state.currentCard.answer) {
      // no repeats
      return this.setupNext()
    }

    this.setState({
      cardError: false,
      cardNumber: this.state.cardNumber + 1,
      currentCard: {
        type: "midi",
        label: `${offset + 1} of ${note} is`,
        answer: answer,
        options: notes,
      }
    })
  }

  checkAnswer(answer) {
    if (!this.state.currentCard) {
      return
    }

    if (answer == this.state.currentCard.answer) {
      this.setupNext()
    } else {
      let card = this.state.currentCard
      let cardNumber = this.state.cardNumber

      card.chosen = card.chosen || {}
      card.chosen[answer] = true

      this.setState({ cardError: true })

      window.setTimeout(() => {
        if (this.state.cardNumber == cardNumber) {
          this.setState({ cardError: false })
        }
      }, 600)
    }
  }

  render() {
    return <div className="flash_card_page">
      {this.renderTestGroups()}
      {this.renderCurrentCard()}
    </div>
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
                this.forceUpdate()
                this.setupNext()
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
        disabled={card.chosen && card.chosen[a]}
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
