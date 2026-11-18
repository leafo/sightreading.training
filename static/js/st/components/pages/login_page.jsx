import * as React from "react"
import {Link, Navigate} from "react-router-dom"

import {setTitle} from "st/globals"
import {JsonForm, TextInputRow} from "st/components/forms"

import {getSession} from "st/app"
import {completeAuth} from "st/auth"

import pageContainerStyles from "../page_container.module.css"
import formStyles from "st/components/form.module.css"

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

    if (!completeAuth(res)) this.setState({errorMessage: "Could not log in. Please try again."})
  }

  constructor() {
    super()
    this.state = {}
  }

  render() {
    if (getSession().currentUser) {
      return <Navigate replace to="/" />
    }

    return <div className={`login_page ${pageContainerStyles.page_container}`}>
      <h2>Log in</h2>
      <JsonForm authenticate action="/login.json" afterSubmit={this.afterSubmit.bind(this)}>
        {this.state.errorMessage ? <div className={formStyles.form_error}>{this.state.errorMessage}</div> : null}

        <TextInputRow name="username" required={true}>Username</TextInputRow>
        <TextInputRow name="password" type="password" required={true}>Password</TextInputRow>
        <div className={formStyles.form_buttons}>
          <button className="big_button">Submit</button>
          {" or "}
          <Link to="/register">Register</Link>
        </div>
      </JsonForm>
    </div>
  }
}
