# `board.diagnose`

Payload `{board, consecutiveFailures, recentFailReasons, testJob}`: the board keeps failing. Run one careful test. Log in per `../../_shared/auth.md`; that alone often shows the cause (expired login, changed flow, bot wall). When `testJob` is set, apply to it as `./job.apply.md` does.

A clean test resets the server's failure streak. Ask nothing: the user fixes credentials or drops the board after reading the summary.

Summary: "Board <board> healthy again - logged in and applied cleanly." / "Board <board> still failing - login page returns a bot wall."
