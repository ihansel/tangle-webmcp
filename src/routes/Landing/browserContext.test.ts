import { describe, expect, it } from "vitest";

import { resolveRootExperience } from "./browserContext";

describe("resolveRootExperience", () => {
  it("uses the overview for a regular browser", () => {
    expect(
      resolveRootExperience({
        search: "",
        userAgent: "Mozilla/5.0 Chrome/140 Safari/537.36",
        hasModelContext: false,
      }),
    ).toBe("overview");
  });

  it("opens the app when WebMCP is available", () => {
    expect(
      resolveRootExperience({
        search: "",
        userAgent: "Mozilla/5.0",
        hasModelContext: true,
      }),
    ).toBe("app");
  });

  it("recognises the Codex desktop browser", () => {
    expect(
      resolveRootExperience({
        search: "",
        userAgent: "Mozilla/5.0 Electron/39 Codex",
        hasModelContext: false,
      }),
    ).toBe("app");
  });

  it("allows either experience to be forced for testing and deep links", () => {
    expect(
      resolveRootExperience({
        search: "?view=overview",
        userAgent: "Codex",
        hasModelContext: true,
      }),
    ).toBe("overview");
    expect(
      resolveRootExperience({
        search: "?view=app",
        userAgent: "Mozilla/5.0 Chrome/140",
        hasModelContext: false,
      }),
    ).toBe("app");
  });
});
