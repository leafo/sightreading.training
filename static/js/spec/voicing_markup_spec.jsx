import * as React from "react"
import {renderToStaticMarkup} from "react-dom/server"
import {MemoryRouter} from "react-router-dom"
import {parseChordSheet, exportChordSheet, exportSongbook, importSongbook, importChordSheet, writeEditorDraft, readEditorDraft} from "st/chord_sheet"
import {parseFrets, voicingToken, readDefinitions, putDefinition, addDefinition} from "st/voicing_markup"
import {createLabHandoff, readLabHandoff, incomingVoicing} from "st/voicing_handoff"
import {sheetChordDiagrams} from "st/sheet_chord_diagrams"
import SheetVoicings from "st/components/sheet_voicings"
import ChordSheetPage from "st/components/pages/chord_sheet_page"
import ChordLabPage from "st/components/pages/chord_lab_page"
import GuitarFretboard from "st/components/guitar_fretboard"
import {labState} from "st/tool_preferences"

const open = [null, 3, 2, 3, 1, null], high = [8, 10, 8, 9, 8, 8]
const definition = "{voicing: C7:verse = x-3-2-3-1-x}"
const sheet = `${definition}\n[C7:verse]Hello [F]world [C7@8-10-8-9-8-8]again`
const store = () => { const data = new Map(); return {getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k)} }

describe("Portable voicing markup", () => {
  it("copies exact frets including muted strings, open strings and frets above 12", () => {
    expect(voicingToken("C7", open)).toBe("[C7@x-3-2-3-1-x]")
    expect(parseFrets("X-0-12-15-24-x")).toEqual([null,0,12,15,24,null])
    expect(voicingToken("C7/E", open)).toBe("[C7/E@x-3-2-3-1-x]")
  })
  it("rejects malformed, negative, fractional, all-muted and out-of-range shapes", () => {
    for (const value of ["x-3-2", "x-3-2-3-1-x-0", "x--1-2-3-4-5", "x-3.2-2-3-1-x", "x-25-2-3-1-x", "x-x-x-x-x-x"]) expect(() => parseFrets(value)).toThrow()
    expect(() => voicingToken("Unknown chord", open)).toThrow()
  })
  it("resolves aliases, hides definitions and preserves ordinary chord parsing", () => {
    const lines = parseChordSheet(sheet)
    expect(lines.length).toBe(1)
    expect(lines[0][0].chord).toBe("C7")
    expect(lines[0][0].voicing.frets).toEqual(open)
    expect(lines[0][1]).toEqual({chord: "F", lyric: "world "})
    expect(lines[0][2].voicing.frets).toEqual(high)
    expect(parseChordSheet("[Am]one [G/B]two")[0]).toEqual([{chord:"Am",lyric:"one "},{chord:"G/B",lyric:"two"}])
  })
  it("reports undefined labels and invalid exact shapes without substituting another shape", () => {
    expect(parseChordSheet("[C7:missing]word")[0][0].voicing.error).toContain("Undefined")
    expect(parseChordSheet("[C7@x-99-2-3-1-x]word")[0][0].voicing.error).toBeTruthy()
    expect(sheetChordDiagrams("[C7:missing]word")[0].voicing).toBeUndefined()
  })
  it("validates definitions, duplicate aliases and labels", () => {
    expect(readDefinitions(`${definition}\n${definition}`).errors[0].message).toContain("Duplicate")
    expect(readDefinitions("{voicing: C7:bad label = x-3-2-3-1-x}").errors.length).toBe(1)
    expect(() => putDefinition("", "C7", "bad label", open)).toThrow()
    expect(readDefinitions("{voicing: C7:verse = x-x-x-x-x-x}").errors.length).toBe(1)
  })
  it("deduplicates Add variation retries and keeps independently named shapes", () => {
    const first = addDefinition("[C7]word", "C7", open)
    expect(addDefinition(first.source, "C7", open)).toEqual(first)
    const second = addDefinition(first.source, "C7", high)
    expect(readDefinitions(second.source).definitions.length).toBe(2)
    expect(second.alias).not.toBe(first.alias)
  })
  it("includes named selections not yet inserted, in definition order", () => {
    const source = `{voicing: C7:high = 8-10-8-9-8-8}\n${definition}\n[C7]word`
    expect(sheetChordDiagrams(source).map(d => d.alias)).toEqual(["high", "verse"])
    expect(sheetChordDiagrams(`${definition}\n[F]word`).map(d => d.name)).toEqual(["F","C7"])
  })
  it("deduplicates a named and exact reference to the same shape", () => {
    expect(sheetChordDiagrams(`${definition}\n[C7:verse]a [C7@x-3-2-3-1-x]b`).length).toBe(1)
  })
  it("transposes exact pitches and preserves aliases, slash bass and export round trips", () => {
    const result = exportChordSheet(sheet, 2)
    expect(result).toContain("{voicing: D7:verse = x-5-4-5-3-x}")
    expect(result).toContain("[D7:verse]Hello [G]world [D7@10-12-10-11-10-10]again")
    const musical = lines => lines.map(line => line.map(({chord, lyric, voicing}) => ({chord, lyric, frets: voicing?.frets, alias: voicing?.alias})))
    expect(musical(parseChordSheet(result))).toEqual(musical(parseChordSheet(sheet, 2)))
    expect(exportChordSheet("[C7/E@x-3-2-3-1-x]",1,true)).toBe("[Db7/F@x-4-3-4-2-x]")
    expect(parseChordSheet("[E@0-2-2-1-0-0]",2)[0][0].voicing.frets).toEqual([2,4,4,3,2,2])
  })
  it("blocks impossible transposed shapes rather than printing incorrect frets", () => {
    expect(parseChordSheet("[E@0-2-2-1-0-0]",-1)[0][0].voicing.error).toContain("cannot transpose")
    expect(() => exportChordSheet("[E@0-2-2-1-0-0]",-1)).toThrow()
    expect(() => exportChordSheet("{voicing: E:high = 24-24-24-24-24-24}",1)).toThrow()
  })
  it("preserves voicings through ChordPro import, JSON backup and draft recovery", () => {
    expect(importChordSheet(sheet).source).toBe(sheet)
    const entry = {id:"saved",title:"Test",source:sheet,shift:2,flats:false}
    expect(importSongbook(exportSongbook([entry]), [], () => "new")).toEqual([entry])
    const storage = store()
    writeEditorDraft(storage,{...entry,activeId:"saved"})
    expect(readEditorDraft(storage,[entry]).source).toBe(sheet)
  })
})

describe("Sheet voicing workspace and Lab round trip", () => {
  let page, oldStorage, oldSession, oldLocation, oldHistory, oldCancel, storage
  beforeEach(() => {
    oldStorage=globalThis.localStorage; oldSession=globalThis.sessionStorage; oldLocation=globalThis.location; oldHistory=globalThis.history; oldCancel=globalThis.cancelAnimationFrame
    storage=store(); globalThis.localStorage=storage; globalThis.sessionStorage=store(); globalThis.cancelAnimationFrame=()=>{}
    globalThis.location={href:"https://example.test/chord-sheet?voicing=test",search:"?voicing=test"}
    globalThis.history={replaceState:jasmine.createSpy("replaceState")}
    page=new ChordSheetPage({})
    page.setState=(update,callback)=>{Object.assign(page.state,typeof update === "function"?update(page.state):update);callback?.()}
    Object.assign(page.state,{source:sheet,title:"Song",activeId:"saved",shift:0,flats:false})
  })
  afterEach(()=>{globalThis.localStorage=oldStorage;globalThis.sessionStorage=oldSession;globalThis.location=oldLocation;globalThis.history=oldHistory;globalThis.cancelAnimationFrame=oldCancel})
  it("renders selectable shapes, custom inputs, ordering and insert controls",()=>{
    const html=renderToStaticMarkup(<SheetVoicings source={sheet} shift={0} flats={false} onClose={()=>{}} />)
    expect(html).toContain('aria-label="Remove C7 voicing x-3-2-3-1-x"')
    expect(html).toContain('title="Remove C7 voicing x-3-2-3-1-x" aria-pressed="true"')
    expect(html).toContain("Insert into lyrics")
    expect(html).toContain("Move verse up")
    expect(html).toContain("Used in lyrics")
    expect(html).toContain("Six frets")
  })
  it("retains the lyric cursor when prepending a definition and inserts at that position",()=>{
    page.state.source="[C7]Hello"
    page.insertPosition=4
    page.changeVoicingSource(`${definition}\n[C7]Hello`)
    expect(page.insertPosition).toBe(definition.length+1+4)
    page.insertVoicing("[C7:verse]",page.state.source)
    expect(page.state.source).toBe(`${definition}\n[C7][C7:verse]Hello`)
    expect(page.state.tab).toBe("create")
  })
  it("stores and validates Lab handoff context without exposing source in URLs",()=>{
    const id=createLabHandoff({source:sheet,name:"C7",alias:"verse"})
    expect(readLabHandoff(id).source).toBe(sheet)
    expect(readLabHandoff("../invalid")).toBeNull()
    expect(readLabHandoff("missing")).toBeNull()
  })
  it("accepts a valid exact token and rejects malformed transfer URLs",()=>{
    expect(incomingVoicing(new URLSearchParams({voicing:voicingToken("C7",open)})).frets).toEqual(open)
    expect(()=>incomingVoicing(new URLSearchParams({voicing:"[C7@x-99-2-3-1-x]"}))).toThrow()
    expect(incomingVoicing(new URLSearchParams({voicing:"C7"}))).toBeNull()
  })
  it("replaces the original definition and preserves named references",()=>{
    page.state.incoming={name:"C7",frets:high}
    page.state.incomingContext={source:sheet,title:"Song",activeId:"saved",shift:0,flats:false,name:"C7",alias:"verse"}
    page.acceptIncomingVoicing(true)
    expect(page.state.source).toContain("{voicing: C7:verse = 8-10-8-9-8-8}")
    expect(page.state.source).toContain("[C7:verse]Hello")
    expect(page.state.incoming).toBeNull()
    expect(globalThis.history.replaceState).toHaveBeenCalled()
  })
  it("rejects a stale replacement and allows adding it as a variation",()=>{
    page.state.incoming={name:"C7",frets:high}
    page.state.incomingContext={source:"older draft",title:"Song",activeId:"saved",shift:0,flats:false,name:"C7",alias:"verse"}
    page.acceptIncomingVoicing(true)
    expect(page.state.voicingError).toContain("changed")
    expect(page.state.source).toBe(sheet)
    page.acceptIncomingVoicing(false)
    expect(readDefinitions(page.state.source).definitions.length).toBe(2)
  })
  it("rejects renaming the underlying chord on replacement",()=>{
    page.state.incoming={name:"D7",frets:high}
    page.state.incomingContext={source:sheet,title:"Song",activeId:"saved",shift:0,flats:false,name:"C7",alias:"verse"}
    page.acceptIncomingVoicing(true)
    expect(page.state.voicingError).toContain("chord name changed")
    expect(page.state.source).toBe(sheet)
  })
  it("adds an incoming shape in the displayed key, baking transposition into source",()=>{
    page.state.shift=2
    page.state.incoming={name:"D7",frets:[null,5,4,5,3,null]}
    page.acceptIncomingVoicing(false)
    expect(page.state.shift).toBe(0)
    expect(page.state.source).toContain("[D7:verse]")
    expect(sheetChordDiagrams(page.state.source)[0].voicing.frets).toEqual([null,5,4,5,3,null])
  })
  it("keeps incoming shapes pending when they would exceed the sheet limit",()=>{
    page.state.source="a".repeat(16000)
    page.state.incoming={name:"C7",frets:open}
    page.acceptIncomingVoicing(false)
    expect(page.state.voicingError).toContain("full")
    expect(page.state.incoming).toBeTruthy()
    expect(page.state.source.length).toBe(16000)
  })
  it("keeps 24-fret Lab shapes on reload and renders the high-fret cells",()=>{
    const frets=[null,15,14,15,13,null]
    expect(labState({frets}).frets).toEqual(frets)
    const html=renderToStaticMarkup(<GuitarFretboard frets={frets} onChange={()=>{}} />)
    expect(html).toContain("Low E fret 24")
    expect(html).toContain("repeat(24,")
  })
  it("renders Lab return controls next to analysis before the alternative voicings",()=>{
    const lab=new ChordLabPage({})
    Object.assign(lab.state,{instrument:"guitar",frets:open,selectedMatch:"C7",sheetReturn:"test",sheetContext:{title:"Song",alias:"verse"}})
    const html=renderToStaticMarkup(<MemoryRouter>{lab.render()}</MemoryRouter>)
    expect(html).toContain("Replace this voicing and return")
    expect(html.indexOf("Add variation and return")).toBeLessThan(html.indexOf('id="match-voicings"'))
  })
})
