import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ProviderName } from "../types";

export interface AppConfig {
  provider: ProviderName;
  geminiApiKey: string;
  geminiModel: string;
  geminiTimeoutMs: number;
  strictMockResponseValidation: boolean;
}

function loadDotEnvFile(envPath: string): void {
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === "" || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseProvider(value: string | undefined): ProviderName {
  const normalizedValue = value?.trim().toLowerCase() ?? "mock";

  if (normalizedValue === "mock" || normalizedValue === "gemini") {
    return normalizedValue;
  }

  throw new Error(`Unsupported PROVIDER "${value}". Use "mock" or "gemini".`);
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  const normalizedValue = value?.trim().toLowerCase();

  if (normalizedValue === undefined || normalizedValue === "") {
    return defaultValue;
  }

  if (["true", "1", "yes", "y"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "0", "no", "n"].includes(normalizedValue)) {
    return false;
  }

  throw new Error(`Invalid boolean value "${value}". Use true or false.`);
}

export function loadAppConfig(cwd = process.cwd()): AppConfig {
  loadDotEnvFile(resolve(cwd, ".env"));
  const geminiTimeoutMs = Number(process.env.GEMINI_TIMEOUT_MS ?? "30000");

  if (!Number.isInteger(geminiTimeoutMs) || geminiTimeoutMs <= 0) {
    throw new Error("GEMINI_TIMEOUT_MS must be a positive integer.");
  }

  return {
    provider: parseProvider(process.env.PROVIDER),
    geminiApiKey: process.env.GEMINI_API_KEY ?? "",
    geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    geminiTimeoutMs,
    strictMockResponseValidation: parseBoolean(process.env.STRICT_MOCK_RESPONSE_VALIDATION, false)
  };
}
