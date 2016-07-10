import Flow from require "lapis.flow"

class FormatterFlow extends Flow
  session: =>
    out = { }
    if @current_user
      out.currentUser = @user @current_user

    out

  user: (user) =>
    {
      id: user.id
      username: user.username
    }


