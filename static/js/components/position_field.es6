import * as React from "react"
import * as types from "prop-types"

export default class PositionField extends React.PureComponent {
  static propTypes = {
    min: types.number,
    max: types.number,
    value: types.number
  }

  constructor(props) {
    super(props)
    this.state = {
      value: null,
      editValue: null,
    }
  }

  formattedValue() {
    let value = 0

    if (this.props.value != null) {
      value = this.props.value
    }

    if (this.state.value != null) {
      value = this.state.value
    }

    return value.toFixed(1)
  }

  confirmEdit() {
    if (!this.state.editValue) {
      return
    }

    if (this.state.editValue.match(/[^0-9.]/)) {
      this.cancelEdit()
    }

    let value = +this.state.editValue

    if (this.props.min != null) {
      value = Math.max(this.props.min, value)
    }

    if (this.props.max != null) {
      value = Math.min(this.props.max, value)
    }

    this.setValue(value)
  }

  setValue(value) {
    this.setState({
      value: value,
      editValue: null
    })

    if (this.props.onUpdate) {
      this.props.onUpdate(value)
    }
  }

  cancelEdit() {
    this.setState({ editValue: null })
  }

  render() {
    let displayValue = this.state.editValue
    if (displayValue == null) {
      displayValue = this.formattedValue()
    }

    return <input
      className="position_field_input"
      type="text"
      title={this.props.title}
      readOnly={this.props.readOnly}
      value={displayValue}
      onKeyDown={e => {
        if (e.keyCode == 27)  {
          if (!this.state.editValue && this.props.resetValue != null) {
            this.setValue(this.props.resetValue)
          } else {
            this.cancelEdit()
          }
          e.stopPropagation()
          return
        }

        if (e.keyCode == 13)  {
          this.confirmEdit()
          e.stopPropagation()
          return
        }

        // todo: allow up/down keys
      }}
      onFocus={e => e.target.select()}
      onChange={e => {
        this.setState({
          editValue: e.target.value
        })
      }}
      onBlur={e => this.confirmEdit()}
      />
  }
}


