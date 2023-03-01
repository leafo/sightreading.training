import NoteList from "st/note_list"
import {StaffTwo} from "st/components/staff_two"
import {getRoot} from "spec/helpers"

import {KeySignature} from "st/music"

import * as React from "react"

describe("staff two", function() {
  it("renders empty treble staff", function() {
    getRoot().render(React.createElement(StaffTwo, {
      type: "treble",
      keySignature: new KeySignature(0)
    }))

    expect(true).toBe(true)
  })

  it("renders empty bass staff", function() {
    getRoot().render(React.createElement(StaffTwo, {
      type: "bass",
      keySignature: new KeySignature(0)
    }))

    expect(true).toBe(true)
  })

  it("renders empty grand staff", function() {
    getRoot().render(React.createElement(StaffTwo, {
      type: "grand",
      keySignature: new KeySignature(0)
    }))

    expect(true).toBe(true)
  })

  it("renders full treble staff", function() {
    getRoot().render(React.createElement(StaffTwo, {
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
})
