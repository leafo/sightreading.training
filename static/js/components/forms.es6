
import * as React from "react"
import {csrfToken} from "st/globals"
import {FormData, XMLHttpRequest} from "window"
import {classNames} from "lib"

let {PropTypes: types} = React

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

    return <div className={classNames("input_row", this.props.className)}>
      <label>
        <div className="label">{this.props.children}</div>
        <input {...inputProps} />
      </label>
    </div>
  }
}

export class JsonForm extends React.Component {
  static propTypes = {
    action: types.string.isRequired,
    validate: types.func,
    beforeSubmit: types.func,
    afterSubmit: types.func
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
    request.open("POST", url)
    request.send(formData)

    request.onload = (e) => {
      this.setState({loading: false})
      try {
        let res = JSON.parse(request.responseText)

        if (this.props.afterSubmit) {
          this.props.afterSubmit(res)
        }
      } catch (e) {
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
    return <form ref="form" action={this.props.action} method="post" onSubmit={this.submitHandler.bind(this)}>
      {this.props.children}
    </form>
  }
}
