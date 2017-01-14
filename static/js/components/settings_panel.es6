
let {PropTypes: types} = React;

export class SettingsPanel extends React.Component {
  static propTypes = {
    close: types.func.isRequired,
    staves: types.array.isRequired,
    generators: types.array.isRequired,
    setStaff: types.func.isRequired,
    setGenerator: types.func.isRequired,
  }

  constructor(props) {
    super(props)
    this.state = {}
  }

  componentDidMount() {
    if (N.enable_presets) {
      this.loadPresets()
    }
  }

  render() {
    return <div className="settings_panel">
      <div className="settings_header">
        <button onClick={this.props.close}>Close</button>
        <h3>Settings</h3>
      </div>

      {this.renderPresets()}

      <div className="settings_group">
        <h4>Staff</h4>
        {this.renderStaves()}
      </div>

      <div className="settings_group">
        <h4>Generator</h4>
        {this.renderGenerators()}
      </div>

      {this.renderGeneratorInputs()}

      <div className="settings_group">
        <h4>Key</h4>
        {this.renderKeys()}
      </div>
    </div>
  }

  savePreset(e) {
    e.preventDefault()
    N.trigger(this, "saveGeneratorPreset", this.refs.presetForm)
  }

  loadPresets() {
    if (!N.session.currentUser) { return }

    this.setState({
      loadingPresets: true
    })

    let request = new XMLHttpRequest()
    request.open("GET", "/presets.json")
    request.send()
    request.onload = (e) => {
      try {
        let res = JSON.parse(request.responseText)
        this.setState({
          loadingPresets: false,
          presets: res.presets
        })
      } catch (e) {
        this.setState({loadingPresets: false})
      }
    }

  }

  renderPresets() {
    if (!N.enable_presets) { return }
    if (!N.session.currentUser) { return }

    var presetsPicker

    if (this.state.presets && this.state.presets.length) {
      console.log(this.state.presets)
      presetsPicker = <div className="presetsPicker">
        <Select
          name="preset"
          options={this.state.presets.map(p => ({
              name: p.name,
              value: p.name
            }))
          }
        />
      </div>
    }

    return <div className="settings_group">
      {presetsPicker}
      <form onSubmit={this.savePreset.bind(this)} ref="presetForm">
        <label>
          Name
          <input type="text" name="name" />
        </label>
        <button disabled={this.props.savePreset || false}>Save preset</button>
      </form>
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
        return
      }

      if (generator.mode != this.props.currentStaff.mode) {
        return
      }

      return <div
        key={generator.name}
        onClick={(e) => {
          e.preventDefault();
          this.props.setGenerator(generator, GeneratorSettings.inputDefaults(generator));
        }}

        className={classNames("toggle_option", {
          active: this.props.currentGenerator == generator
        })}>
        {generator.name}</div>;
    })
  }

  renderGeneratorInputs() {
    let g = this.props.currentGenerator
    if (!g.inputs || !g.inputs.length) return
    return <div className="settings_group">
      <GeneratorSettings
        key={`${g.name}-${g.mode}`}
        generator={g}
        currentSettings={this.props.currentGeneratorSettings}
        setGenerator={this.props.setGenerator} />
    </div>
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

export class GeneratorSettings extends React.Component {
  static propTypes = {
    generator: types.object.isRequired,
    setGenerator: types.func.isRequired,
  }

  static inputDefaults(generator) {
    let out = {}

    if (!generator.inputs) {
      return out
    }

    let defaultValue = input => {
      if ("default" in input) {
        return input.default
      }

      switch (input.type) {
        case "select":
          return input.values[0].name
        case "range":
          return input.min
      }
    }

    for (let input of generator.inputs) {
      out[input.name] = defaultValue(input)
    }

    return out
  }

  constructor(props) {
    super(props)

    this.state = {
      inputValues: Object.assign({},
        GeneratorSettings.inputDefaults(this.props.generator),
        this.props.currentSettings || {})
    }
  }

  render() {
    let inputs = this.props.generator.inputs

    return <div className="generator_inputs">{
      inputs.map((input, idx) => {
        let fn
        switch (input.type) {
          case "select":
            fn = this.renderSelect
            break
          case "range":
            fn = this.renderRange
            break
          case "bool":
            fn = this.renderBool
            break
          default:
            console.error(`No input renderer for ${input.type}`)
            return
        }

        return <div key={input.name} className="generator_input">
          <label>
            <div className="input_label">{input.label || input.name}</div>
            {fn.call(this, input, idx)}
          </label>
        </div>
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
    let options = input.values.map((input_val, input_val_idx) => {
      return {
        name: input_val.name,
        value: input_val.name,
      }
    })

    return <Select
      onChange={ value => this.updateInputValue(input, value) }
      value={currentValue}
      options={options} />
  }

  renderRange(input, idx) {
    let currentValue = this.state.inputValues[input.name]

    return <div className="slider_row">
      <Slider
        min={input.min}
        max={input.max}
        onChange={(value) => this.updateInputValue(input, value)}
        value={currentValue} />
      <span className="current_value">{currentValue}</span>
    </div>
  }

  renderBool(input, idx) {
    let currentValue = !!this.state.inputValues[input.name]

    return <div className="bool_row">
      <input
        type="checkbox"
        checked={currentValue}
        onChange={e => this.updateInputValue(input, e.target.checked)} />
      {input.hint}
    </div>
  }
}


