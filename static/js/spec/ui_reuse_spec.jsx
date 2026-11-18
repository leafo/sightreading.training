import * as React from "react"
import {tabNavigationIndex} from "st/tab_navigation"
import {downloadFile} from "st/browser_download"
import Select from "st/components/select"
import Tabs from "st/components/tabs"

describe("Shared UI behavior", () => {
  it("wraps tab navigation, supports endpoints and ignores unrelated keys", () => {
    expect(tabNavigationIndex("ArrowLeft", 0, 3)).toBe(2)
    expect(tabNavigationIndex("ArrowRight", 2, 3)).toBe(0)
    expect(tabNavigationIndex("Home", 2, 3)).toBe(0)
    expect(tabNavigationIndex("End", 0, 3)).toBe(2)
    expect(tabNavigationIndex("Enter", 0, 3)).toBeNull()
    expect(tabNavigationIndex("Home", 0, 0)).toBeNull()
  })
  it("uses the same keyboard behavior in legacy tool tabs", () => {
    const options = [{name: "One"}, {name: "Two"}]
    const onChangeTab = jasmine.createSpy("change")
    const tabs = new Tabs({tabs: options, currentTab: "One", onChangeTab})
    const first = tabs.render().props.children[0].props.children
    const focus = jasmine.createSpy("focus"), preventDefault = jasmine.createSpy("prevent")
    first.props.onKeyDown({key: "ArrowLeft", preventDefault, currentTarget: {closest: () => ({querySelectorAll: () => [{}, {focus}]})}})
    expect(onChangeTab).toHaveBeenCalledWith(options[1])
    expect(preventDefault).toHaveBeenCalled()
    expect(focus).toHaveBeenCalled()
  })
  it("preserves zero and empty-string values in the shared dropdown", () => {
    const options = [{name: "Other", value: 1}, {name: "Zero", value: 0}, {name: "Empty", value: ""}]
    const select = new Select({options, value: 0})
    select.state.value = 1
    expect(select.currentOption().name).toBe("Zero")
    select.props = {options, value: ""}
    expect(select.currentOption().name).toBe("Empty")
  })
  it("releases download URLs even when the browser rejects the download", () => {
    const previousDocument = globalThis.document, previousTimeout = globalThis.setTimeout
    const previousURL = globalThis.URL
    const cleanup = jasmine.createSpy("revoke"), callbacks = []
    globalThis.URL = {createObjectURL: () => "blob:test", revokeObjectURL: cleanup}
    globalThis.setTimeout = callback => callbacks.push(callback)
    globalThis.document = {createElement: () => ({click: () => {throw new Error("blocked")}})}
    try {
      expect(() => downloadFile("content", "sheet.txt", "text/plain")).toThrowError("blocked")
      expect(callbacks.length).toBe(1)
      callbacks[0]()
      expect(cleanup).toHaveBeenCalledWith("blob:test")
    } finally {
      globalThis.document = previousDocument
      globalThis.setTimeout = previousTimeout
      globalThis.URL = previousURL
    }
  })
})
