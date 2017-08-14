## Note Generators

In order to provide unique sheet music to read, Sight Reading Trainer uses a random music generator. You can customize the generator to control the difficulty, and the types of things you want to practice.

Access the generator settings by clicking the **Configure** button on the main screen.

### Choosing a staff

The staff you choose configures the range of notes that are available to be read. The on-screen keyboard will display only the valid notes that can be played. Any notes generated will fall within the range of the staff chosen.

You can choose from the following:

* <img src="/static/svg/clefs.G.svg" alt="G Cleff" width=25 height=25 /> Treble
* <img src="/static/svg/clefs.F_change.svg" alt="F Cleff" width=25 height=20 /> Bass
* Grand — A combination of treble and bass at the same time

### Choosing a generator type

Sight Reading Trainer tries to generate something musical based on the parameters you've provided. The **generator type** is the function that picks which notes to show next. Each generator type can be customized using a series of parameters.

The available generator types:

*   **Random** — Chooses 1 to 5 random notes within the chosen key to be played in each column
*   **Triads** — Chooses a [triad](https://en.wikipedia.org/wiki/Triad_(music)) of notes in a random inversion in close voicing within the key signature
*   **Sevens** — Chooses a random [seventh chord](https://en.wikipedia.org/wiki/Seventh_chord) with open voicing (this one sounds the most pleasant)
*   **Progression** — Chooses a random chord from a popular progression within the key signature
*   **Position** — Generates notes in a way that encourages you to use all of your fingers. See below for more information

### The smoothness parameter

Every generator has a **smoothness** setting. The smoothness setting makes the randomness less apparent by minimizing the movements of notes for each column of the generated notes. (It is never possible to get the sames notes repeated though).

If there are multiple notes, then it will minimize the average position of the notes in the column.

The higher you set the smoothnesss, the more iterations the generator will perform to find a next set of notes, the smoother the movements will be.

### The Random generator

The following parameters are available for the **Random** generator:

*   **Notes** — How many notes to generate at a time
*   **Hands** — How many hands should be used to play all the notes. For example, if you wanted to practice playing 5 chord notes in one hand, set notes to 5 and hands to 1
*   **Chord based** — The column of notes will be limited to notes that can be formed from stacked thirds

### The Position Generator

The **Position Generator** is designed to have you utilize all of your fingers while sight reading. You'll be given notes in sets of 5, the first note will contain a fingering. All subsequent notes should be played without moving your hand, and with using each of your fingers.
