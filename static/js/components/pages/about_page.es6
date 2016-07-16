
let {Link} = ReactRouter

class AboutPage extends React.Component {
  render() {
    return <div className="about_page page_container">
      <h2>About Sight Reading Trainer</h2>

      <p>This site is a way for you to practice <a
      href="https://en.wikipedia.org/wiki/Sight-reading">sight reading</a> by
      playing randomly generated sheet music. It's not designed for learning
      existing songs, there are already many tools for that. You should have
      some basic knowldge of reading sheet music to begind with, but even if
      you don't you will be able to figure things out by clicking along.</p>

      <h3>How this site works</h3>
      <p>This website randomly generates notes for you to sight read and play.
      This will ensure that you're always reading and never playing from
      memory. On the flipside, the music generated is not composed, so it won't
      sound good. A goal of this project is to generate music that resembles a
      genre or style, but in the meantime we recommend you supplement practice
      with real music as well.</p>

      <p>When using the app you'll be preseneted with a sheet music view where
      notes will scroll in from the right as you play each one. In the initial
      configuration you'll play one note at a time, but you can increase
      complexity by configuring the app to generate multiple notes in a single
      column. Additionally you can control key signature, and the staves that
      are shown.</p>

      <p>There are many different configuration options to control the random
      music generator. You can click the <b>Configure</b> button above the staff
      to chnage these setings. There's a glossary below with descriptions of
      each parameter.</p>

      <h3>Using a MIDI keyboard</h3>

      <p>Although it's possible to play using your mouse or computer keyboard,
      we recommend connecting your digital piano or MIDI keyboard to your
      computer so you can play directly into the software.</p>
      
      <p>In addition to making it easy to finger chords, it's crucial for
      developing your spacial awareness of where notes are on the keyboard.</p>

      <p>MIDI support is only available in Chrome at this time.</p>

      <h3>Shotcomings</h3>

      <p>This app is far from complete. Here are some planned improvements:</p>

      <ul>
        <li>Various rhythm modes, different time signatures</li>
        <li>Note generators that generate particular styles of music (Waltz, Four part harmony, Pop, etc.)</li>
        <li>A built in piano tone for those without audio set up</li>
      </ul>

      <p>If you'd like to contribute to this app, you can find the source code
      on GitHub: <a
      href="https://github.com/leafo/mursicjs">https://github.com/leafo/mursicjs</a></p>

      <h3>Tips for successful sight reading</h3>

      <blockquote><p>The creator of this website is not a professional musician
      and is a student of sight reading just like you. These tips are just
      observations from his own learnings. If you have any suggestions based on
      your experience please get in touch.</p></blockquote>

      <h4>Practice daily</h4>

      <p>Sight reading takes a long time to learn. Practice frequently to make
      reading notes second nature. You goal should be able to see notes and
      instantly know where to move your hands.</p>

      <p>You'll find that as you get quicker, it's easier to play a note than
      it is to think about what the name of it is. Competant sight readers are ab
      le </p>

      <p>
        <Link className="return_link" to="/">Return to sight reading trainer</Link>
      </p>
    </div>
  }
}
