import * as React from "react"
import * as types from "prop-types"
import classNames from "classnames"
import {IconDownArrow} from "st/components/icons"
import styles from "./select.module.css"

export default class Select extends React.Component {
  static propTypes = {
    options: types.array.isRequired,
    name: types.string,
  }

  constructor(props) {
    super(props)
    this.state = {}
  }

  onChange(e) {
    let value = e.target.value
    if (this.props.onChange) {
      if (value == this.props.value) {
        return
      }

      this.props.onChange(value)
    } else {
      if (value == this.state.value) {
        return
      }

      this.setState({ value })
    }
  }

  render() {
    let current = this.currentOption()

    return <div className={classNames(styles.select_component, this.props.className, {
      [styles.focused]: this.state.focused
    })}>
      <div className={styles.selected_option}>
        <span className={styles.selected_option_name}>{current.name}</span>
        <IconDownArrow width={12} />
      </div>
      <select
        value={current.value}
        name={this.props.name}
        onFocus={e => this.setState({ focused: true })}
        onBlur={e => this.setState({ focused: false })}
        onChange={e => this.onChange(e)}>
      {
        this.props.options.map((o, idx) => {
          return <option key={idx} value={o.value}>{o.name}</option>
        })
      }
      </select>
    </div>
  }

  findOption(optionValue) {
    for (let o of this.props.options) {
      if (o.value == optionValue) {
        return o
      }
    }
  }

  // name of what's currently selected
  currentOption() {
    let searchValue = this.props.value || this.state.value

    if (searchValue != undefined) {
      return this.findOption(searchValue)
    } else {
      return this.props.options[0]
    }
  }
}
