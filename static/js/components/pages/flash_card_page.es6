
let {PropTypes: types} = React
let {Link} = ReactRouter

class FlashCardPage extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      cardNumber: 0,
    }
    this.rand = new MersenneTwister()
  }

  componentWillMount() {
    this.setupNext()
  }

  componentDidMount() {
    this.upListener = event => {
      let key = keyCodeToChar(event.keyCode)
      if (key && key.match(/^\d$/)) {
        let option = (+key) - 1
        let button = this.refs.cardOptions.children[option]
        if (button) {
          button.click()
        }
      }

    }
    window.addEventListener("keyup", this.upListener)
  }

  componentWillUnmount() {
    window.removeEventListener("keyup", this.upListener)
  }

  setupNext() {
    let notes = ["C", "D", "E", "F", "G", "A", "B"]
    let offsets = [1,2,3,4,5,6]

    let note = notes[0] // hard code to C for now
    let offset = offsets[this.rand.int() % offsets.length]

    this.setState({
      cardNumber: this.state.cardNumber + 1,
      currentCard: {
        type: "midi",
        label: `${note} + ${offset} =`,
        answer: notes[offset % notes.length],
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

      card.chosen = {}
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
    return <div className="flash_card_page">{this.renderCurrentCard()}</div>
  }

  renderCurrentCard() {
    if (!this.state.currentCard) {
      return;
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
      <div className={classNames("flash_card", {errorshake: this.state.cardError})}>
        {card.label}
      </div>
      <div className="card_options" ref="cardOptions">{options}</div>
    </div>
  }
}
