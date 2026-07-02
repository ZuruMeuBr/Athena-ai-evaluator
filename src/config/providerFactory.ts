import { GeminiProvider } from "../../providers/GeminiProvider";
import type { LLMProvider } from "../../providers/LLMProvider";
import { MockProvider } from "../../providers/MockProvider";
import type { PromptScenario, ProviderName } from "../types";
import type { AppConfig } from "./env";

export interface ProviderConfig {
  name: ProviderName;
  provider: LLMProvider;
}

export function createProvider(config: AppConfig, scenarios: PromptScenario[]): ProviderConfig {
  if (config.provider === "gemini") {
    return {
      name: "gemini",
      provider: new GeminiProvider({
        apiKey: config.geminiApiKey,
        modelName: config.geminiModel,
        timeoutMs: config.geminiTimeoutMs
      })
    };
  }

  return {
    name: "mock",
    provider: new MockProvider(scenarios)
  };
}
