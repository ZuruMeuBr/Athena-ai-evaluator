import type { PromptScenario, ProviderResponse } from "../src/types";
import { ProviderError } from "../src/utils/providerError";
import { estimateTokens } from "../src/utils/tokenEstimator";
import type { LLMProvider } from "./LLMProvider";

export class MockProvider implements LLMProvider {
  private readonly responsesByPrompt: Map<string, Array<string | undefined>>;

  constructor(scenarios: PromptScenario[]) {
    this.responsesByPrompt = new Map();

    for (const scenario of scenarios) {
      const responses = this.responsesByPrompt.get(scenario.prompt) ?? [];
      responses.push(scenario.response);
      this.responsesByPrompt.set(scenario.prompt, responses);
    }
  }

  async generateResponse(prompt: string): Promise<ProviderResponse> {
    const startedAt = Date.now();
    const responses = this.responsesByPrompt.get(prompt);
    const response = responses?.shift();

    if (response === undefined) {
      if (responses !== undefined) {
        throw new ProviderError(
          "Scenario executed with MockProvider but response field is missing.",
          "MISSING_RESPONSE"
        );
      }

      throw new Error(`No mock response found for prompt: ${prompt}`);
    }

    return {
      text: response,
      metrics: {
        provider: "mock",
        model: "mock",
        responseTimeMs: Date.now() - startedAt,
        inputTokensApprox: estimateTokens(prompt),
        outputTokensApprox: estimateTokens(response)
      }
    };
  }
}
