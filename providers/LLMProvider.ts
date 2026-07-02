import type { ProviderResponse } from "../src/types";

export interface LLMProvider {
  generateResponse(prompt: string): Promise<ProviderResponse>;
}
