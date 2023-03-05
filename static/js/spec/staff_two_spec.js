import NoteList from "st/note_list"
import {StaffTwo} from "st/components/staff_two"
import {render} from "spec/helpers"

import {GStaff, FStaff, GrandStaff, ChordStaff} from "st/components/staves"

// Example for rendering with old staff:
// import {GStaff, FStaff, GrandStaff} from "st/components/staves"
// React.createElement(GStaff, {
//   heldNotes: {},
//   keySignature: new KeySignature(0),
//   pixelsPerBeat: 100,
//   noteWidth: 100,
//   notes
// })

import {KeySignature} from "st/music"


import * as React from "react"

describe("staff two", function() {
  it("renders empty staves", function() {
    render(
      // treble
      React.createElement(StaffTwo, {
        type: "treble",
        keySignature: new KeySignature(0),
        height: 150
      }),

      // bass
      React.createElement(StaffTwo, {
        type: "bass",
        keySignature: new KeySignature(0),
        height: 150
      }),

      // alto
      React.createElement(StaffTwo, {
        type: "alto",
        keySignature: new KeySignature(0),
        height: 150,
      })
    )

    expect(true).toBe(true)
  })

  it("renders empty grand staff", function() {
    render(React.createElement(StaffTwo, {
      type: "grand",
      keySignature: new KeySignature(0)
    }))

    expect(true).toBe(true)
  })

  // this spec is concerned with assigning notes to the correct staff based on
  // minimizing staff jumps by using ledger lines
  it("renders full grand staff", function() {
    render(
      React.createElement(StaffTwo, {
        height: 200,
        type: "grand",
        keySignature: new KeySignature(0),
        notes: new NoteList([
          ["C5"],
          ["B4"],
          ["A4"],
          ["G4"],
          ["F4"],
          ["E4"],
          ["D4"],
          ["E4"],
          ["F4"],
          ["G4"],
          ["A4"],
          ["B4"],
          ["C5"],
          ["D5"],
          ["E5"],
          ["F5"],
          ["G5"],
          ["A5"],
          ["B5"],
        ])
      }),

      React.createElement(StaffTwo, {
        height: 200,
        type: "grand",
        keySignature: new KeySignature(0),
        notes: new NoteList([
          ["C5"],
          ["B4"],
          ["C6"],
          ["B4"],
        ])
      }),

      React.createElement(StaffTwo, {
        type: "grand",
        keySignature: new KeySignature(0),
        notes: new NoteList([
          ["F4", "A4", "D5"],
          ["A4", "D5", "F5"]
        ])
      })
    )

    expect(true).toBe(true)
  })

  it("grand staff with held notes", function() {
    render(
      React.createElement(StaffTwo, {
        type: "grand",
        keySignature: new KeySignature(0),
        heldNotes: {
          "C5": true
        },
        notes: new NoteList([
          ["A4", "C5", "F5"],
          ["C5"]
        ])
      })
    )

    expect(true).toBe(true)
  })

  it("renders held notes", function() {
    const heldNotes = {
      "F5": true,
      "A4": true,
      "F4": true
    }

    const notes = new NoteList([
      ["A4","G5"],
      ["F5"]
    ])

    render(
      React.createElement(StaffTwo, {
        type: "treble",
        keySignature: new KeySignature(2),
        heldNotes,
        notes
      }),

      // React.createElement(GStaff, {
      //   keySignature: new KeySignature(2),
      //   pixelsPerBeat: 100,
      //   noteWidth: 100,
      //   heldNotes,
      //   notes,
      // })
    )

    expect(true).toBe(true)
  })


  it("renders full treble staff", function() {
    render(React.createElement(StaffTwo, {
      type: "treble",
      keySignature: new KeySignature(0),
      notes: new NoteList([
        ["G5"],
        ["F6", "E5"], // the extend of the cleff
        ["G6", "D5"],
        ["A6", "C5"],
        ["B6", "B4"],
        ["C7", "A4"],
      ]),
      heldNotes: {
        "C7": true,
        "A3": true
      }
    }))

    expect(true).toBe(true)
  })

  it("renders full alto staff", function() {
    const notes = new NoteList([
      ["F6"], // key signature root
      ["C6"],
      ["E6", "A5"],
      ["G6", "F5"],
      ["B6", "D5"],
      ["D7", "B4"],
    ])


    render(
      React.createElement(StaffTwo, {
        type: "alto",
        height: 150,
        keySignature: new KeySignature(0),
        notes
      }),

      React.createElement(StaffTwo, {
        type: "alto",
        height: 150,
        keySignature: new KeySignature(7),
        notes
      }),

      React.createElement(StaffTwo, {
        type: "alto",
        height: 150,
        keySignature: new KeySignature(-7),
        notes
      })
    )

    expect(true).toBe(true)
  })


  it("renders key signatures", function() {
    const notes = new NoteList([
      ["G5"],
      ["A5"],
      ["B5"],
      ["C6"],
      ["D6"],
      ["E6"],
      ["F6"],
      ["G6"],
    ])

    render(
      React.createElement(StaffTwo, {
        height: 150,
        type: "treble",
        keySignature: new KeySignature(7),
        notes
      }),

      React.createElement(StaffTwo, {
        height: 150,
        type: "treble",
        keySignature: new KeySignature(-7),
        notes
      }),

      React.createElement(StaffTwo, {
        height: 150,
        type: "bass",
        keySignature: new KeySignature(7),
        notes
      }),

      React.createElement(StaffTwo, {
        height: 150,
        type: "bass",
        keySignature: new KeySignature(-7),
        notes
      }),
    )

    expect(true).toBe(true)
  })


  it("renders stacked notes", function() {
    const notes = new NoteList([
      ["C5", "D5", "E5", "F5"],
      ["G5", "A5", "C6"],
      ["F5", "A5", "B5"],
    ])

    render(
      React.createElement(StaffTwo, {
        height: 150,
        type: "treble",
        keySignature: new KeySignature(0),
        notes
      }),

      // React.createElement(GStaff, {
      //   heldNotes: {},
      //   keySignature: new KeySignature(0),
      //   pixelsPerBeat: 100,
      //   noteWidth: 100,
      //   notes
      // })
    )

    expect(true).toBe(true)
  })

  it("renders accidentals", function() {
    const notes = new NoteList([
      ["G5", "C5"],
      ["E#5", "G#5", "B#5"],
      ["E#5", "F#5", "G#5"],

      ["G#5", "C#5"],
      ["Gb5", "Cb5"],
    ])

    render(
      React.createElement(StaffTwo, {
        height: 150,
        type: "treble",
        keySignature: new KeySignature(0),
        notes
      }),

      React.createElement(StaffTwo, {
        height: 150,
        type: "treble",
        keySignature: new KeySignature(3),
        notes
      }),

      React.createElement(StaffTwo, {
        height: 150,
        type: "treble",
        keySignature: new KeySignature(-3),
        notes
      }),

      // React.createElement(GStaff, {
      //   heldNotes: {},
      //   keySignature: new KeySignature(0),
      //   pixelsPerBeat: 100,
      //   noteWidth: 100,
      //   notes
      // }),
      // React.createElement(GStaff, {
      //   heldNotes: {},
      //   keySignature: new KeySignature(3),
      //   pixelsPerBeat: 100,
      //   noteWidth: 100,
      //   notes
      // }),
      // // NOTE: there is a discrepancy here, the old staff would transform notes
      // // in a strange way. With refactoring to how note lists work, we should
      // // be not be concerned about re-implementing this in the new staff
      // React.createElement(GStaff, {
      //   heldNotes: {},
      //   keySignature: new KeySignature(-3),
      //   pixelsPerBeat: 100,
      //   noteWidth: 100,
      //   notes
      // }),
    )

    expect(true).toBe(true)
  })


})
