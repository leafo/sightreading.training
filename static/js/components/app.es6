
let {Router, Route, IndexRoute, Link, browserHistory} = ReactRouter

class Layout extends React.Component {
  render() {
    return <div className="page_layout">
      <div className="header_spacer">
        {this.renderHeader()}
      </div>
      {this.props.children}
    </div>
  }

  doLogout() {
    let request = new XMLHttpRequest()
    request.open("POST", "/logout.json")
    request.send(new FormData())

    request.onload = (e) => {
      let res = JSON.parse(request.responseText)
      N.init(res)
    }
  }

  renderHeader() {
    let session = this.props.route.session

    if (session.currentUser) {
      var userPanel = <div className="right_section">
        {session.currentUser.username}
        {" " }
        <a href="#" onClick={this.doLogout.bind(this)}>Log out</a>
      </div>
    } else {
      var userPanel = <div className="right_section">
        <Link to="/login" className="button">Log in</Link>
        {" or "}
        <Link to="/register" className="button">Register</Link>
      </div>
    }

    return <div className="header">
      <img className="logo" src="/static/img/logo.svg" height="40" alt="" />

      <h1>
        <Link to="/">Sight reading trainer</Link>
      </h1>

      {userPanel}
    </div>
  }
}

class App extends React.Component {
  render() {
    return <Router history={browserHistory}>
      <Route path="/" component={Layout} {...this.props}>
        <IndexRoute component={SightReadingPage}></IndexRoute>
        <Route path="login" component={LoginPage} {...this.props}></Route>
        <Route path="register" component={RegisterPage}></Route>
        <Route path="about" component={AboutPage}></Route>
      </Route>
    </Router>
  }
}
