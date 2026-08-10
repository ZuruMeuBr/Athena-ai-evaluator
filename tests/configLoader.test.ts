import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadAppConfig } from "../src/config/env";

const configEnvironmentVariables = [
  "PROVIDER",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "GEMINI_TIMEOUT_MS",
  "STRICT_MOCK_RESPONSE_VALIDATION"
] as const;

let originalEnv: NodeJS.ProcessEnv;

describe("loadAppConfig", () => {
  beforeEach(() => {
    originalEnv = { ...process.env };

    for (const variableName of configEnvironmentVariables) {
      delete process.env[variableName];
    }
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("loads provider settings from .env", () => {
    const dir = mkdtempSync(join(tmpdir(), "llm-evaluator-"));

    try {
      writeFileSync(
        join(dir, ".env"),
        "PROVIDER=gemini\nGEMINI_API_KEY=test-key\nGEMINI_MODEL=gemini-2.5-flash\nGEMINI_TIMEOUT_MS=12345\n",
        "utf8"
      );

      const config = loadAppConfig(dir);

      expect(config).toEqual({
        provider: "gemini",
        geminiApiKey: "test-key",
        geminiModel: "gemini-2.5-flash",
        geminiTimeoutMs: 12345,
        strictMockResponseValidation: false
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("defaults to mock provider and Gemini 2.5 Flash", () => {
    const dir = mkdtempSync(join(tmpdir(), "llm-evaluator-"));

    try {
      const config = loadAppConfig(dir);

      expect(config.provider).toBe("mock");
      expect(config.geminiModel).toBe("gemini-2.5-flash");
      expect(config.geminiTimeoutMs).toBe(30000);
      expect(config.strictMockResponseValidation).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects invalid timeout values", () => {
    const dir = mkdtempSync(join(tmpdir(), "llm-evaluator-"));

    try {
      writeFileSync(join(dir, ".env"), "GEMINI_TIMEOUT_MS=0\n", "utf8");

      expect(() => loadAppConfig(dir)).toThrow("GEMINI_TIMEOUT_MS must be a positive integer.");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("loads strict mock response validation from .env", () => {
    const dir = mkdtempSync(join(tmpdir(), "llm-evaluator-"));

    try {
      writeFileSync(join(dir, ".env"), "STRICT_MOCK_RESPONSE_VALIDATION=true\n", "utf8");

      expect(loadAppConfig(dir).strictMockResponseValidation).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
