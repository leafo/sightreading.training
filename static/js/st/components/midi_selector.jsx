import * as React from "react"
import * as types from "prop-types"
import classNames from "classnames"

import styles from "./midi_selector.module.css"

export default class MidiSelector extends React.PureComponent {
  static propTypes = {
    midiOptions: types.array.isRequired,
    onChange: types.func,
  }

  constructor(props) {
    super(props)

    this.state = {
      selected: this.props.defaultIdx
    }
  }

  handleKeyDown = (event, index) => {
    const { midiOptions } = this.props

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const nextIndex = (index + 1) % midiOptions.length
      const nextButton = event.currentTarget.parentElement.children[nextIndex]
      if (nextButton) {
        nextButton.focus()
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      const prevIndex = (index - 1 + midiOptions.length) % midiOptions.length
      const prevButton = event.currentTarget.parentElement.children[prevIndex]
      if (prevButton) {
        prevButton.focus()
      }
    } else if (event.key === 'Home') {
      event.preventDefault()
      const firstButton = event.currentTarget.parentElement.children[0]
      if (firstButton) {
        firstButton.focus()
      }
    } else if (event.key === 'End') {
      event.preventDefault()
      const lastButton = event.currentTarget.parentElement.children[midiOptions.length - 1]
      if (lastButton) {
        lastButton.focus()
      }
    }
  }

  handleSelect = (index) => {
    if (this.state.selected == index) {
      this.setState({selected: null})
      if (this.props.onChange) {
        this.props.onChange(null);
      }
    } else {
      this.setState({selected: index})
      if (this.props.onChange) {
        this.props.onChange(index);
      }
    }
  }

  render() {
    let midiOptions = this.props.midiOptions

    if (!midiOptions.length) {
      return <p>No MIDI devices connected</p>
    }

    return <div className={styles.midi_selector}>
      {
        midiOptions.map((option, i) => {
          return <button
            key={i}
            type="button"
            className={classNames(styles.midi_input_row, {
              [styles.selected]: this.state.selected == i
            })}
            aria-pressed={this.state.selected == i}
            onClick={() => this.handleSelect(i)}
            onKeyDown={(e) => this.handleKeyDown(e, i)}
            >
            <img className={styles.row_icon} src="/static/img/notes_icon.svg" alt="" />
            <div className={styles.input_name}>
              {option.name}
            </div>
          </button>
        })
      }
    </div>
  }

}
