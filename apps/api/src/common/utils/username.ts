// Aviation/pilot-themed word pairs so an auto-assigned handle still reads like a name, not a hash.
const ADJECTIVES = [
  "swift",
  "bold",
  "brave",
  "calm",
  "clever",
  "eager",
  "keen",
  "bright",
  "nimble",
  "steady",
  "sharp",
  "sunny",
  "lunar",
  "solar",
  "cosmic",
  "rapid",
  "stellar",
  "atomic",
  "turbo",
  "ace",
];
const NOUNS = [
  "falcon",
  "pilot",
  "comet",
  "vector",
  "jet",
  "nova",
  "orbit",
  "glider",
  "rocket",
  "hawk",
  "eagle",
  "drift",
  "summit",
  "zephyr",
  "raptor",
  "cirrus",
  "aviator",
  "meteor",
  "quasar",
  "ranger",
];

const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

/** A readable random username like "swift-falcon-2847". Always valid against `usernameSchema`. */
export function randomUsername(): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${1000 + Math.floor(Math.random() * 9000)}`;
}
