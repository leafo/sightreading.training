
let {Link} = ReactRouter

class LoginPage extends React.Component {
  afterSubmit(res) {
    console.warn("submitted", res)
  }

  render() {
    return <div className="login_page page_container">
      <h2>Log in</h2>

      <JsonForm action="/login.json" afterSubmit={this.afterSubmit.bind(this)}>
        <TextInputRow name="username" required={true}>Username</TextInputRow>
        <TextInputRow name="password" type="password" required={true}>Password</TextInputRow>
        <div className="form_buttons">
          <button>Submit</button>
          {" or "}
          <Link to="/register">Register</Link>
        </div>
      </JsonForm>
    </div>
  }
}
