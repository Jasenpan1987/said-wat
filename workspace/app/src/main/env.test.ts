import { describe, it, expect, afterEach } from "vitest";
import { loadDotEnv, parseEnv } from "./env.js";

describe("parseEnv", () => {
  it("parses KEY=VALUE lines", () => {
    expect(parseEnv("A=1\nB=two words\n")).toEqual({ A: "1", B: "two words" });
  });

  it("skips comments and empty lines", () => {
    expect(parseEnv("# comment\n\nA=1\n  \nB=2")).toEqual({ A: "1", B: "2" });
  });

  it("strips surrounding double quotes", () => {
    expect(parseEnv('A="quoted value"')).toEqual({ A: "quoted value" });
  });

  it("allows an empty value", () => {
    expect(parseEnv("MOONSHOT_API_KEY=")).toEqual({ MOONSHOT_API_KEY: "" });
  });

  it("ignores lines without an equals sign", () => {
    expect(parseEnv("just-text\nA=1")).toEqual({ A: "1" });
  });
});

describe("loadDotEnv", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  it("does not override existing environment variables", () => {
    process.env.MOONSHOT_API_KEY = "real-key";
    loadDotEnv();
    expect(process.env.MOONSHOT_API_KEY).toBe("real-key");
  });
});
