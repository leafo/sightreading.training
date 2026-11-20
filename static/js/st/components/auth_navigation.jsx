import * as React from "react"
import {NavLink, Navigate, useLocation} from "react-router-dom"
import {authReturnTo, authUrl} from "st/auth"

// The URL carries its destination through reloads, new tabs and switching forms.
export function AuthLink({to, ...props}) {
  const location = useLocation()
  return <NavLink {...props} to={authUrl(to, location)} />
}

export function LoginRedirect() {
  const location = useLocation()
  return <Navigate replace to={authUrl("/login", location)} />
}

export function withAuthReturnTo(Page) {
  return function AuthPage(props) {
    const location = useLocation()
    return <Page {...props} returnTo={authReturnTo(location)} />
  }
}
