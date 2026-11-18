import * as React from "react"

import {Link, Navigate} from "react-router-dom"
import {setTitle} from "st/globals"
import {JsonForm, TextInputRow} from "st/components/forms"

import {getSession} from "st/app"
import {completeAuth} from "st/auth"

import pageContainerStyles from "../page_container.module.css"
import formStyles from "st/components/form.module.css"

export default class RegisterPage extends React.Component {
  componentDidMount() {
    setTitle("Register Account")
  }

  afterSubmit(res) {
    if (res.errors) {
      this.setState({
        errorMessage: res.errors[0]
      })
      return
    }

    if (!completeAuth(res)) this.setState({errorMessage: "Could not register. Please try again."})
  }

  constructor() {
    super()
    this.state = {}
  }

  render() {
    if (getSession().currentUser) {
      return <Navigate replace to="/" />
    }

    return <div className={`register_page ${pageContainerStyles.page_container}`}>
      <h2>Register</h2>
      <p>Create an account to keep track of your progress over time.</p>

      <JsonForm authenticate action="/register.json" afterSubmit={this.afterSubmit.bind(this)}>
        {this.state.errorMessage ? <div className={formStyles.form_error}>{this.state.errorMessage}</div> : null}
        <TextInputRow name="username" required={true}>Username</TextInputRow>
        <TextInputRow name="email" type="email" required={true}>Email address</TextInputRow>
        <TextInputRow name="password" type="password" required={true}>Password</TextInputRow>
        <TextInputRow name="password_repeat" type="password" required={true}>Confirm password</TextInputRow>

        <div className={formStyles.form_buttons}>
          <button className="big_button">Submit</button>
          {" or "}
          <Link to="/login">Log in to existing account</Link>
        </div>
      </JsonForm>
    </div>
  }
}
