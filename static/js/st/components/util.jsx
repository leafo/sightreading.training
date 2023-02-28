
// props mixin for NavLink to toggle the active class
export const toggleActive = {
  className: ({isActive}) => (isActive? "active" : "")
}
