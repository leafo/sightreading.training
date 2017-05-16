/*global N*/

import * as React from "react"
import {classNames} from "lib"
import Slider from "st/components/slider"
import Select from "st/components/select"
import {trigger} from "st/events"
import {generatorDefaultSettings, fixGeneratorSettings} from "st/generators"

import {KeySignature} from "st/music"

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
    return <section className="settings_panel">
      <div className="settings_header">
        <button onClick={this.props.close}>Close</button>
        <h3>Settings</h3>
      </div>

      {this.renderPresets()}

      <section className="settings_group">
        <h4>Staff</h4>
        {this.renderStaves()}
      </section>

      <section className="settings_group">
        <h4>Generator</h4>
        {this.renderGenerators()}
      </section>

      {this.renderGeneratorInputs()}

      <section className="settings_group">
        <h4>Key</h4>
        {this.renderKeys()}
      </section>
    </section>
  }

  savePreset(e) {
    e.preventDefault()
    trigger(this, "saveGeneratorPreset", this.refs.presetForm)
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
      return <button
        type="button"
        key={staff.name}
        onClick={(e) => {
          e.preventDefault();
          this.props.setStaff(staff);
        }}
        className={classNames("toggle_option", {
          active: this.props.currentStaff == staff
        })}>
        {staff.name}</button>;
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

      return <button
        key={generator.name}
        onClick={(e) => {
          e.preventDefault();
          this.props.setGenerator(
            generator,
            fixGeneratorSettings(generator, this.props.currentGeneratorSettings)
          )
        }}

        className={classNames("toggle_option", {
          active: this.props.currentGenerator == generator
        })}>
        {generator.name}</button>;
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
      key = new KeySignature(key)

      return <button
        onClick={(e) => {
          this.props.setKeySignature(key)
        }}
        className={classNames("toggle_option", {
          active: this.props.currentKey.name() == key.name()
        })}
        key={key.name()}>
          {key.name()}
        </button>
    })
  }
}

export class GeneratorSettings extends React.PureComponent {
  static propTypes = {
    generator: types.object.isRequired,
    currentSettings: types.object.isRequired,
    setGenerator: types.func.isRequired,
  }

  render() {
    // calculate full settings with defaults
    this.cachedSettings = {
      ...generatorDefaultSettings(this.props.generator),
      ...this.props.currentSettings
    }

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
    this.props.setGenerator(this.props.generator, {
      ...this.props.currentSettings,
      [input.name]: value
    })
  }

  renderSelect(input, idx) {
    let currentValue = this.cachedSettings[input.name]
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
    let currentValue = this.cachedSettings[input.name]

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
    let currentValue = !!this.cachedSettings[input.name]

    return <div className="bool_row">
      <input
        type="checkbox"
        checked={currentValue}
        onChange={e => this.updateInputValue(input, e.target.checked)} />
      {input.hint}
    </div>
  }
}


