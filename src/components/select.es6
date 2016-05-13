let {PropTypes: types} = React;

class Select extends React.Component {
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

    return <div className="select_component">
      <div className="selected_option">{current.name}</div>
      <select value={current.value} name={this.props.name} onChange={e => this.onChange(e)}>
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
    console.warn("search value", searchValue)

    if (searchValue != undefined) {
      return this.findOption(searchValue)
    } else {
      return this.props.options[0]
    }
  }
}
