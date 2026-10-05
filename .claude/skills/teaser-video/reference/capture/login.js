// One-time headed login. The user types their credentials once; every later
// take replays the saved session. Run with TEASER_BASE_URL set.
//
//   node login.js [/login]
//
// Sessions expire (often ~1 day) - re-run when takes start bouncing to /login.
import { chromium } from "playwright";
import { AUTH_PATHS, BASE } from "./cam.js";

const STATE = "storageState.json";

async function main() {
  const loginPath = process.argv[2] || "/login";
  const browser = await chromium.launch({ channel: "chrome", headless: false });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();
  await page.goto(BASE + loginPath);

  console.log("Sign in in the browser window. Waiting up to 10 minutes...");
  await page.waitForURL(
    (url) => url.origin === new URL(BASE).origin && !AUTH_PATHS.test(url.pathname),
    { timeout: 10 * 60 * 1000 },
  );
  await page.waitForLoadState("networkidle").catch(() => {});

  await context.storageState({ path: STATE });
  console.log("saved:", STATE, "| landed on:", page.url());
  await browser.close();
}

main().catch((err) => {
  console.error("login failed:", err.message);
  process.exit(1);
});
