import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";

import { verifySlackSignature } from "../src/http.js";

describe("verifySlackSignature", () => {
  const signingSecret = "test_secret";
  const body = "token=abc&team_id=T123&user_id=U123";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const basestring = `v0:${timestamp}:${body}`;
  const tag = createHmac("sha256", signingSecret)
    .update(basestring)
    .digest("hex");
  const signature = `v0=${tag}`;

  it("returns true for valid signature", () => {
    expect(
      verifySlackSignature({
        signingSecret,
        timestamp,
        body,
        signature,
      })
    ).toBe(true);
  });

  it("returns false for invalid signature", () => {
    expect(
      verifySlackSignature({
        signingSecret,
        timestamp,
        body,
        signature: "v0=invalidsignature",
      })
    ).toBe(false);
  });

  it("returns false for old timestamp", () => {
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 60 * 10).toString();
    const oldBasestring = `v0:${oldTimestamp}:${body}`;
    const oldTag = createHmac("sha256", signingSecret)
      .update(oldBasestring)
      .digest("hex");
    const oldSignature = `v0=${oldTag}`;
    expect(
      verifySlackSignature({
        signingSecret,
        timestamp: oldTimestamp,
        body,
        signature: oldSignature,
      })
    ).toBe(false);
  });

  it("returns false for invalid timestamp", () => {
    expect(
      verifySlackSignature({
        signingSecret,
        timestamp: "not_a_number",
        body,
        signature,
      })
    ).toBe(false);
  });
});
