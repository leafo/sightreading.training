
let {Link} = ReactRouter

class AboutPage extends React.Component {
  render() {
    return <div className="about_page page_container">
      <h2>About Sight Reading Trainer</h2>
      <p>Blah blah blah this is the sight reading trainer where you will learn many things about sight reading. There is one thing that we love to sight read the most and that is the things that we don't really get to do normally. Reading Sights</p>
      <h3>This page should probably be async right?</h3>
      <p>Dynamic pages can preload assets when requested directly by their urls so there is no extra request necessary. That could be pretty cool.</p>
      <p>
      <Link to="/">Return to sight reading trainer »</Link>
      </p>
    </div>
  }
}
