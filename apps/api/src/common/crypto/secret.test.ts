// Direct import of the pure crypto primitives - `secret.ts` only uses `node:crypto`, so no `@/env`
// (which holds the master key) and no Prisma are pulled in. The keys here are test-local.
import { randomBytes } from "node:crypto";
import { decrypt, encrypt, generateDek, unwrapDek, wrapDek } from "./secret";
import { describe, expect, it } from "bun:test";

const key = () => randomBytes(32);

describe("encrypt/decrypt envelope", () => {
  it("round-trips plaintext under the same key and context", () => {
    const k = key();
    const blob = encrypt(k, "credential:password", "hunter2");
    expect(blob).not.toContain("hunter2");
    expect(decrypt(k, "credential:password", blob)).toBe("hunter2");
  });

  it("produces a fresh IV per write, so equal plaintext yields distinct ciphertext", () => {
    const k = key();
    expect(encrypt(k, "ctx", "same")).not.toBe(encrypt(k, "ctx", "same"));
  });

  it("rejects decryption under a different context (AAD binding)", () => {
    const k = key();
    const blob = encrypt(k, "credential:password", "secret");
    // A ciphertext moved to another column must not verify, even with the right key.
    expect(() => decrypt(k, "board:password", blob)).toThrow();
  });

  it("rejects decryption under a different key", () => {
    const blob = encrypt(key(), "ctx", "secret");
    expect(() => decrypt(key(), "ctx", blob)).toThrow();
  });

  it("throws on a malformed envelope", () => {
    expect(() => decrypt(key(), "ctx", "not-an-envelope")).toThrow("Malformed secret envelope");
    expect(() => decrypt(key(), "ctx", "onlyone.two")).toThrow("Malformed secret envelope");
  });
});

describe("DEK generation and wrapping", () => {
  it("generates a 32-byte key", () => {
    expect(generateDek()).toHaveLength(32);
  });

  it("generates a random key each call", () => {
    expect(generateDek().equals(generateDek())).toBe(false);
  });

  it("wraps and unwraps a DEK under the master key", () => {
    const master = key();
    const dek = generateDek();
    const unwrapped = unwrapDek(master, wrapDek(master, dek));
    expect(unwrapped.equals(dek)).toBe(true);
  });

  it("cannot unwrap under a rotated/lost master key (crypto-shredding)", () => {
    const dek = generateDek();
    const wrapped = wrapDek(key(), dek);
    // Losing the wrapping key makes the DEK - and every secret it protects - unrecoverable.
    expect(() => unwrapDek(key(), wrapped)).toThrow();
  });
});
