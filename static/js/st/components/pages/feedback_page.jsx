import * as React from "react"
import {AuthLink} from "st/components/auth_navigation"
import {getSession} from "st/app"
import {csrfToken, setTitle, FRONTEND_ONLY} from "st/globals"
import Toast from "st/components/toast"
import styles from "./feedback_page.module.css"

async function request(path, data, signal) {
  const options = {signal, credentials: "same-origin"}
  if (data) {
    options.method = "POST"
    options.body = new URLSearchParams({...data, csrf_token: csrfToken()})
  }
  const response = await fetch(path, options)
  let result
  try { result = await response.json() } catch {
    throw new Error("Feedback needs the full site backend. Please try again on the live site.")
  }
  if (!response.ok || result.errors) {
    throw new Error(result.errors?.[0] || "Feedback could not be loaded. Please try again.")
  }
  return result
}

export default function FeedbackPage() {
  const [query, setQuery] = React.useState("")
  const [issues, setIssues] = React.useState([])
  const [threshold, setThreshold] = React.useState(5)
  const [title, setTicketTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [searched, setSearched] = React.useState(null)
  const [reviewed, setReviewed] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [created, setCreated] = React.useState(null)
  const key = React.useRef(null)
  const controller = React.useRef(null)
  const signedIn = !!getSession()?.currentUser
  const preview = FRONTEND_ONLY

  async function load(searchQuery) {
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    setLoading(true)
    setSearched(null)
    setReviewed(false)
    setError("")
    try {
      const result = await request(`/feedback.json?q=${encodeURIComponent(searchQuery)}`, null, abort.signal)
      if (abort.signal.aborted) return
      setIssues(Array.isArray(result.issues) ? result.issues : [])
      setThreshold(result.threshold)
      setSearched(searchQuery.trim() ? searchQuery : null)
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message)
    } finally {
      if (controller.current === abort) setLoading(false)
    }
  }
  React.useEffect(() => {
    setTitle("Feedback")
    if (preview) setLoading(false)
    else load("")
    return () => controller.current?.abort()
  }, [])

  async function vote(issue) {
    setBusy(true)
    setError("")
    try {
      const result = await request(`/feedback/${issue.number}/vote.json`, {})
      setIssues(items => items.map(item => item.number === issue.number ? result.issue : item))
      setMessage(result.sync_pending ? "Vote saved. GitHub will update shortly." : "Your vote is saved on this issue.")
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError("")
    // Retain the same key after network errors to avoid duplicate GitHub issues.
    key.current ||= crypto.randomUUID()
    try {
      const result = await request("/feedback.json", {
        title, description, reviewed: "1", confirm_new: reviewed ? "1" : "0", request_key: key.current
      })
      if (result.review_required) {
        setError("Similar issues were found. Search using your ticket title and review the results.")
        setReviewed(false)
        setQuery(title)
        await load(title)
        return
      }
      setCreated(result.issue)
      setMessage(result.sync_pending ? "Ticket created and your vote saved. Your GitHub vote comment will appear shortly." : "Ticket created with your first upvote.")
      key.current = null
      setTicketTitle("")
      setDescription("")
      setReviewed(false)
      setSearched(null)
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  return <main className={styles.page}>
    <h1>Help shape the site</h1>
    <p>Report a problem or suggest a feature. Search open GitHub issues first, then upvote a match or create a new ticket.</p>
    <p>At {threshold} total votes from this site and GitHub thumbs-up reactions, the maintainer gets a GitHub mention. Each signed-in account gets one website vote per issue.</p>
    <p>Voting posts your site username publicly on GitHub: “username voted for this from the site”.</p>
    {preview ? <p role="status">Feedback is available on the full site. This frontend preview cannot search, create tickets, or save votes.</p> : <>
      {!signedIn && <p><AuthLink to="/login">Log in</AuthLink> or <AuthLink to="/register">register</AuthLink> to vote or submit. Anyone can search.</p>}
      <form className={styles.search} onSubmit={e => { e.preventDefault(); load(query) }}>
        <label htmlFor="feedback-search">Search open issues</label>
        <div><input id="feedback-search" maxLength={200} value={query} placeholder="For example: scroll speed" onChange={e => {
          controller.current?.abort()
          setLoading(false)
          setQuery(e.target.value)
          setSearched(null)
          setReviewed(false)
        }} /> <button disabled={loading || busy}>Search</button></div>
      </form>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <Toast message={message} onDismiss={() => setMessage("")} />
      {created && <p><a href={created.url} target="_blank" rel="noreferrer">View created issue #{created.number}</a></p>}
      <section aria-label="Open issues" aria-busy={loading}>
        <h2>{searched ? "Similar open issues" : "Recently updated issues"}</h2>
        {loading ? <p>Searching GitHub…</p> : <>
          {issues.length === 0 && <p>No open issues found{searched ? " for this search" : ""}. Try different keywords before creating a ticket.</p>}
          <ul className={styles.issues}>{issues.map(issue => <li key={issue.number}>
            <a href={issue.url} target="_blank" rel="noreferrer">#{issue.number} {issue.title}</a>
            <button type="button" disabled={busy || !signedIn || issue.voted} aria-label={`Upvote issue ${issue.number}`} onClick={() => vote(issue)}>
              {issue.voted ? "Voted" : "Upvote"} · {issue.votes} site votes
            </button>
          </li>)}</ul>
          <p>Showing up to {searched ? 20 : 30} issues. Refine your search if you don’t see a match.</p>
        </>}
      </section>
      <section>
        <h2>Create a new ticket</h2>
        <p>Your title and description will be public on GitHub. Please leave out passwords, email addresses, and other private information.</p>
        <form className={styles.ticket} onSubmit={submit}>
          <label htmlFor="feedback-title">Title</label>
          <input id="feedback-title" required minLength={8} maxLength={160} value={title} disabled={busy || !signedIn} onChange={e => {
            setTicketTitle(e.target.value); setReviewed(false); key.current = null
          }} />
          <button type="button" disabled={busy || loading || title.trim().length < 8} onClick={() => { setQuery(title); load(title) }}>Find similar issues for this title</button>
          <label htmlFor="feedback-description">Description</label>
          <textarea id="feedback-description" required minLength={20} maxLength={5000} rows={7} disabled={busy || !signedIn} value={description} onChange={e => {
            setDescription(e.target.value); key.current = null
          }} placeholder="What happened, or what would you like to do? Include steps to reproduce a problem and the result you expected." />
          <label className={styles.review}><input type="checkbox" checked={reviewed} disabled={!searched || searched !== title || loading || busy} onChange={e => setReviewed(e.target.checked)} /> I reviewed the results for this title and none describes my feedback.</label>
          <button disabled={!signedIn || !reviewed || busy || loading}>{busy ? "Saving…" : "Create GitHub issue + upvote"}</button>
          {!reviewed && <p>Enter a title and choose “Find similar issues for this title” before submitting.</p>}
        </form>
      </section>
    </>}
  </main>
}
