
let {PropTypes: types} = React;

class SettingsPanel extends React.Component {
  static propTypes = {
    close: types.func.isRequired,
    staves: types.array.isRequired,
    generators: types.array.isRequired,
    setStaff: types.func.isRequired,
    setGenerator: types.func.isRequired,
  }

  render() {
    return <div className="settings_panel">
      <div className="settings_header">
        <button onClick={this.props.close}>Close</button>
        <h3>Settings</h3>
      </div>

      <div className="settings_group">
        <h4>Staff</h4>
        {this.renderStaves()}
      </div>

      <div className="settings_group">
        <h4>Generator</h4>
        {this.renderGenerators()}
      </div>

      <div className="settings_group">
        {this.renderGeneratorInputs()}
      </div>

      <div className="settings_group">
        <h4>Key</h4>
        {this.renderKeys()}
      </div>
    </div>
  }

  renderStaves() {
    return this.props.staves.map((staff, i) => {
      return <div
        key={staff.name}
        onClick={(e) => {
          e.preventDefault();
          this.props.setStaff(staff);
        }}
        className={classNames("toggle_option", {
          active: this.props.currentStaff == staff
        })}>
        {staff.name}</div>;
    })
  }

  renderGenerators() {
    return this.props.generators.map((generator, i) => {
      if (generator.debug) {
        return;
      }

      return <div
        key={generator.name}
        onClick={(e) => {
          e.preventDefault();
          this.props.setGenerator(generator, {});
        }}

        className={classNames("toggle_option", {
          active: this.props.currentGenerator == generator
        })}>
        {generator.name}</div>;
    })
  }

  renderGeneratorInputs() {
    let g = this.props.currentGenerator
    if (!g.inputs) return
    return <GeneratorSettings
      generator={g}
      setGenerator={this.props.setGenerator} />
  }

  renderKeys() {
    return [0, 1, 2, 3, 4, 5, -1, -2, -3, -4, -5, -6].map((key) => {
      var key = new KeySignature(key)

      return <div
        onClick={(e) => {
          this.props.setKeySignature(key)
        }}
        className={classNames("toggle_option", {
          active: this.props.currentKey.name() == key.name()
        })}
        key={key.name()}>
          {key.name()}
        </div>
    })
  }
}


class GeneratorSettings extends React.Component {
  static propTypes = {
    generator: types.object.isRequired,
    setGenerator: types.func.isRequired,
  }

  constructor(props) {
    super(props)
    this.state = {
      inputValues: this.getDefaultValues(),
    }
  }

  getDefaultValues() {
    let out = {}
    let defaultValue = input => {
      switch (input.type) {
        case "select":
          return input.values[0].name
        case "range":
          return input.min
      }
    }


    for (let input of this.props.generator.inputs) {
      out[input.name] = input.defaultValue || defaultValue(input)
    }

    return out
  }

  render() {
    let inputs = this.props.generator.inputs

    return <div className="generator_inputs">{
      inputs.map((input, idx) => {
        switch (input.type) {
          case "select":
            return this.renderSelect(input, idx)
          case "range":
            return this.renderRange(input, idx)
          default:
            console.error(`No input renderer for ${input.type}`)
        }
      })
    }</div>
  }

  updateInputValue(input, value) {
    let values = Object.assign({}, this.state.inputValues, {
      [input.name]: value
    })

    this.setState({ inputValues: values })
    this.props.setGenerator(this.props.generator, values)
  }

  renderSelect(input, idx) {
    let currentValue = this.state.inputValues[input.name]

    return <div key={input.name} className="generator_input">
      {input.name}
      <select
        onChange={e => this.updateInputValue(input, e.target.value)}
        value={currentValue}>
      {
        input.values.map((input_val, input_val_idx) => {
          return <option
            key={input_val_idx}
            value={input_val.name}>{input_val.name}</option>
        })
      }
      </select>
    </div>
  }

  renderRange(input, idx) {
    let currentValue = this.state.inputValues[input.name]
    console.warn("current value", currentValue, this.state.inputValues)

    return <div className="generator_input" key={input.name}>
      <span className="label">{input.name}</span>
      <Slider
        min={input.min}
        max={input.max}
        onChange={(value) => {
          console.log("setting to value", value)
          this.updateInputValue(input, value)
        }}
        value={currentValue} />
      <span className="current_value">{currentValue}</span>
    </div>
  }
}


