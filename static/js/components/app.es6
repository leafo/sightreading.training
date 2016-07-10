
let {Router, Route, IndexRoute, Link, browserHistory} = ReactRouter

// <button
//   onClick={this.toggleSettings.bind(this)}
//   className="settings_toggle">
//   Settings
// </button>

// <button onClick={() => this.setState({statsLightboxOpen: true})}>
//   Stats
// </button>


class Layout extends React.Component {
  render() {
    return <div className="page_layout">
      <div className="header_spacer">
        {this.renderHeader()}
      </div>
      {this.props.children}
    </div>
  }

  renderHeader() {
    return <div className="header">
      <img className="logo" src="/static/img/logo.svg" height="40" alt="" />

      <h1>
        <Link to="/">Sight reading trainer</Link>
      </h1>

      <div className="right_section">
        <a className="github_link" href="https://github.com/leafo/mursicjs">
          <img src="/static/img/github-icon.svg" alt="GitHub Repository" />
        </a>
      </div>
    </div>
  }
}

class App extends React.Component {
  render() {
    return <Router history={browserHistory}>
      <Route path="/" component={Layout}>
        <IndexRoute component={SightReadingPage}></IndexRoute>
        <Route path="login" component={LoginPage}></Route>
        <Route path="register" component={RegisterPage}></Route>
        <Route path="about" component={AboutPage}></Route>
      </Route>
    </Router>
  }
}
