import * as React from "react"
import {Link, Navigate} from "react-router-dom"

import {setTitle} from "st/globals"
import {JsonForm, TextInputRow} from "st/components/forms"

import {init as initApp, getSession} from "st/app"

export default class LoginPage extends React.Component {
  componentDidMount() {
    setTitle("Log In")
  }

  afterSubmit(res) {
    if (res.errors) {
      this.setState({
        errorMessage: res.errors[0]
      })
      return
    }

    initApp(res)
    this.setState({ redirectTo: "/" })
  }

  constructor() {
    super()
    this.state = {}
  }

  render() {
    if (this.state.redirectTo) {
      return <Navigate replace to={this.state.redirectTo} />
    }

    if (getSession().currentUser) {
      return <Navigate replace to="/" />
    }

    return <div className="login_page page_container">
      <h2>Log in</h2>
      <JsonForm action="/login.json" afterSubmit={this.afterSubmit.bind(this)}>
        {this.state.errorMessage ? <div className="form_error">{this.state.errorMessage}</div> : null}

        <TextInputRow name="username" required={true}>Username</TextInputRow>
        <TextInputRow name="password" type="password" required={true}>Password</TextInputRow>
        <div className="form_buttons">
          <button className="big_button">Submit</button>
          {" or "}
          <Link to="/register">Register</Link>
        </div>
      </JsonForm>
    </div>
  }
}
