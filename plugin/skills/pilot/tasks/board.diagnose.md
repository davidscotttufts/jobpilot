# `board.diagnose`

Payload `{board, consecutiveFailures, recentFailReasons, testJob}` - the board is failing repeatedly. Run ONE diagnostic test in careful mode: log in per `../../_shared/auth.md` (this alone often reveals the cause - expired login, changed flow, bot wall). If `testJob` is present, delegate ONE `job-worker` apply for it with full attention. Then:

- Test succeeds (login ok / job applied) → journal "Board <board> healthy again - test applied/logged in cleanly." Done; the server's streak resets via the successful result.
- Test fails → journal the diagnosis, naming what the test actually hit ("Board <board> still failing after the test - login page returns a bot wall."). Nothing to ask: the user reads it in the journal and fixes credentials or drops the board from their instructions themselves.
