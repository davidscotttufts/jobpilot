/** Landing-page FAQ - rendered by `Faq` and emitted as FAQPage JSON-LD from the landing page. */
export const FAQ_ITEMS = [
  {
    q: "What does it cost?",
    a: "Nothing. JobPilot is free and MIT-licensed - the whole project is one public repository on GitHub. Your only cost is the Claude or Codex subscription you already have.",
  },
  {
    q: "Do I need an API key?",
    a: "No. The agent runs inside Claude Code or Codex, so the AI work comes out of the subscription you already pay for. There's nothing to top up and no per-token bill from us.",
  },
  {
    q: "Where does the agent run?",
    a: "On your computer. Your dashboard lives on the web, but the AI session and the browser doing the actual applying run locally - you can watch it work and stop it at any point.",
  },
  {
    q: "Which job boards are supported?",
    a: "Eleven are built in, from LinkedIn and Indeed to HN Who's Hiring and Upwork. And since the agent drives a real browser, you can add any other board from the boards page - it isn't limited to a fixed list.",
  },
  {
    q: "Can it read and send email?",
    a: "Yes, if you connect Gmail through your own Google OAuth client - no shared app ever touches your mail. That's how it sorts recruiter replies, fetches verification codes, and sends networking messages.",
  },
  {
    q: "What about captchas?",
    a: "Checkbox and text captchas it solves on its own. For image puzzles it uses your 2Captcha or CapSolver key if you've added one - and if you haven't, it skips that job and tells you why.",
  },
] as const;
