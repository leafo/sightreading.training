
let {Router, Route, IndexRoute, browserHistory} = ReactRouter

class Layout extends React.Component {
  render() {
    return <div className="page_layout">
      {this.props.children}
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
