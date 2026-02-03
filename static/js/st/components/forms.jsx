
import * as React from "react"
import {csrfToken} from "st/globals"
import * as types from "prop-types"

import classNames from "classnames"

import formStyles from "st/components/form.module.css"

const {FormData, XMLHttpRequest} = window

export class TextInputRow extends React.Component {
  static propTypes = {
    name: types.string.isRequired,
  }

  render() {
    let inputProps = {
      type: this.props.type || "text",
      name: this.props.name,
    };

    (["onChange", "value", "required", "disabled"]).forEach((k) => {
      if (k in this.props) {
        inputProps[k] = this.props[k]
      }
    })

    return <div className={classNames(formStyles.input_row, this.props.className)}>
      <label>
        <div className={formStyles.label}>{this.props.children}</div>
        <input {...inputProps} />
      </label>
    </div>
  }
}

export class JsonForm extends React.Component {
  static defaultProps = {
    method: "POST"
  }

  static propTypes = {
    action: types.string.isRequired,
    validate: types.func,
    beforeSubmit: types.func,
    afterSubmit: types.func,
    method: types.string
  }

  constructor() {
    super()
    this.state = { loading: false }
  }

  submitHandler(e) {
    e.preventDefault()

    if (this.state.loading) { return }

    if (this.props.beforeSubmit) {
      this.props.beforeSubmit()
    }

    let formData = new FormData(this.refs.form)
    formData.append("csrf_token", csrfToken())

    if (this.props.validate && !this.props.validate(formData)) {
      return
    }

    let url = this.refs.form.getAttribute("action")

    let request = new XMLHttpRequest()
    request.open(this.props.method, url)
    request.send(formData)

    request.onload = (e) => {
      this.setState({loading: false})
      try {
        let res = JSON.parse(request.responseText)

        if (this.props.afterSubmit) {
          this.props.afterSubmit(res)
        }
      } catch (e) {
        console.error(e)
        if (this.props.afterSubmit) {
          this.props.afterSubmit({
            errors: ["Server error, please try again later"]
          })
        }
      }
    }

    this.setState({loading: true})
  }

  render() {
    return <form ref="form" className={this.props.className} action={this.props.action} method={this.props.method} onSubmit={this.submitHandler.bind(this)}>
      {this.props.children}
    </form>
  }
}
