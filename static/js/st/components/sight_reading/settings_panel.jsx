import * as React from "react"
import classNames from "classnames"
import Slider from "st/components/slider"
import Select from "st/components/select"
import {trigger} from "st/events"
import {generatorDefaultSettings, fixGeneratorSettings} from "st/generators"

import {KeySignature, ChromaticKeySignature, noteName, parseNote} from "st/music"
import * as types from "prop-types"

import {ENABLE_PRESETS} from "st/globals"

import {getSession} from "st/app"

export class SettingsPanel extends React.PureComponent {
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
    if (ENABLE_PRESETS) {
      this.loadPresets()
    }
  }

  render() {
    return <section className="settings_panel">
      <div className="settings_header">
        <h3>Settings</h3>
        <button onClick={this.props.close}>Close</button>
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
    const session = getSession()
    if (!session.currentUser) { return }

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
    if (!ENABLE_PRESETS) { return }

    const session = getSession()

    if (!session.currentUser) { return }

    var presetsPicker

    if (this.state.presets && this.state.presets.length) {
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
    return <div className="button_group">
      {
        this.props.staves.map((staff, i) => {
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
    </div>
  }

  renderGenerators() {
    return <div className="button_group">
      {
        this.props.generators.map((generator, i) => {
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
    </div>
  }

  renderGeneratorInputs() {
    let g = this.props.currentGenerator
    if (!g.inputs || !g.inputs.length) return
    return <div className="settings_group">
      <GeneratorSettings
        key={`${g.name}-${g.mode}`}
        generator={g}
        currentKey={this.props.currentKey}
        currentStaff={this.props.currentStaff}
        currentSettings={this.props.currentGeneratorSettings}
        setGenerator={this.props.setGenerator} />
    </div>
  }

  renderKeys() {
    let keyButton = (key) =>
      <button
        onClick={(e) => {
          this.props.setKeySignature(key)
        }}
        className={classNames("toggle_option", {
          active: this.props.currentKey.name() == key.name()
        })}
        key={key.name()}>
          {key.name()}
        </button>

    return <div className="button_group">
      {
        KeySignature.allKeySignatures().concat([
          new ChromaticKeySignature()
        ]).map(key => keyButton(key))
      }
    </div>
  }
}

export class GeneratorSettings extends React.PureComponent {
  static propTypes = {
    generator: types.object.isRequired,
    currentSettings: types.object.isRequired,
    setGenerator: types.func.isRequired,
    currentKey: types.object.isRequired,
    currentStaff: types.object.isRequired,
  }

  render() {
    // calculate full settings with defaults
    this.cachedSettings = {
      ...generatorDefaultSettings(
        this.props.generator,
        this.props.currentStaff,
      ),
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
          case "noteRange":
            fn = this.renderNoteRange
            break
          case "note":
            fn = this.renderNote
            break
          case "bool":
            fn = this.renderBool
            break
          case "toggles":
            fn = this.renderToggles
            break
          default:
            console.error(`No input renderer for ${input.type}`)
            return
        }

        let el = input.type == "toggles" ? "div" : "label"

        let inside = React.createElement(el, null, ...[
          <div className="input_label">{input.label || input.name}</div>,
          fn.call(this, input, idx)
        ])

        return <div key={input.name} className="generator_input">
          {inside}
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

  renderNote(input, idx) {
    let currentValue = this.cachedSettings[input.name]

    let options = []

    for (let i=input.max; i >= input.min; i--) {
      options.push(noteName(i))
    }

    return <div className="note_range_row">
      <label>
        Note
        <Select
          onChange={value => {
            this.updateInputValue(input, parseNote(value))
          }}
          value={noteName(currentValue)}
          options={options.map(name => ({ value: name, name }))}
        />
      </label>
    </div>

  }

  renderNoteRange(input, idx) {
    let currentValue = this.cachedSettings[input.name]
    let [min, max] = currentValue

    let possibleMin = []
    let possibleMax = []

    let staffMin, staffMax

    if (this.props.currentStaff) {
      let staff = this.props.currentStaff
      staffMin = parseNote(staff.range[0])
      staffMax = parseNote(staff.range[1])
    }

    for (let i=input.max; i >= input.min; i--) {
      let iName = noteName(i)

      if (i < staffMin) { continue }
      if (i > staffMax) { continue }

      if (i >= min) {
        possibleMax.push(iName)
      }

      if (i <= max) {
        possibleMin.push(iName)
      }
    }

    return <div className="note_range_row">
      <label>
        Min
        <Select
          onChange={value => {
            this.updateInputValue(input, [
              parseNote(value),
              currentValue[1],
            ])
          }}
          value={noteName(currentValue[0])}
          options={possibleMin.map(name => ({ value: name, name }))}
        />
      </label>

      <label>
        Max
        <Select
          onChange={value => {
            this.updateInputValue(input, [
              currentValue[0],
              parseNote(value),
            ])
          }}
          value={noteName(currentValue[1])}
          options={possibleMax.map(name => ({ value: name, name }))}
        />
      </label>
    </div>
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

  renderToggles(input, idx) {
    let currentValue = this.cachedSettings[input.name] || {}

    return <div className="toggles">
      {input.options.map(subName =>
        <label className="toggle" key={subName}>
          <input
            onChange={e => 
              this.updateInputValue(input, {...currentValue, [subName]: e.target.checked})
            }
            checked={currentValue[subName] || false}
            type="checkbox" />
          {" "}
          {subName}
        </label>
      )}
    </div>
  }
}


