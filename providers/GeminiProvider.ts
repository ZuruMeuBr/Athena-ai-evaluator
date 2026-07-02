import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ProviderResponse } from "../src/types";
import { classifyProviderError, ProviderError } from "../src/utils/providerError";
import { retryWithBackoff } from "../src/utils/retry";
import { estimateTokens } from "../src/utils/tokenEstimator";
import { withTimeout } from "../src/utils/timeout";
import type { LLMProvider } from "./LLMProvider";

interface GeminiProviderOptions {
  apiKey: string;
  modelName: string;
  timeoutMs: number;
  maxAttempts?: number;
  baseDelayMs?: number;
  client?: GoogleGenerativeAI;
  sleep?: (delayMs: number) => Promise<void>;
}

export class GeminiProvider implements LLMProvider {
  private readonly modelName: string;
  private readonly client: GoogleGenerativeAI;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly sleep?: (delayMs: number) => Promise<void>;

  constructor(options: GeminiProviderOptions) {
    const { apiKey, modelName, timeoutMs } = options;

    if (apiKey.trim() === "") {
      throw new Error("GEMINI_API_KEY is required when PROVIDER=gemini.");
    }

    if (timeoutMs <= 0) {
      throw new Error("GEMINI_TIMEOUT_MS must be greater than 0.");
    }

    this.client = options.client ?? new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
    this.timeoutMs = timeoutMs;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 500;
    this.sleep = options.sleep;
  }

  async generateResponse(prompt: string): Promise<ProviderResponse> {
    const startedAt = Date.now();

    try {
      const response = await retryWithBackoff(
        async () => {
          const model = this.client.getGenerativeModel({ model: this.modelName });
          const result = await withTimeout(model.generateContent(prompt), this.timeoutMs);
          const text = result.response.text();

          if (text.trim() === "") {
            throw new ProviderError("Gemini returned an empty response.", "UNKNOWN");
          }

          return text;
        },
        {
          maxAttempts: this.maxAttempts,
          baseDelayMs: this.baseDelayMs,
          sleep: this.sleep,
          shouldRetry: (error) => error.code !== "INVALID_API_KEY"
        }
      );

      return {
        text: response,
        metrics: {
          provider: "gemini",
          model: this.modelName,
          responseTimeMs: Date.now() - startedAt,
          inputTokensApprox: estimateTokens(prompt),
          outputTokensApprox: estimateTokens(response)
        }
      };
    } catch (error: unknown) {
      const providerError = classifyProviderError(error);

      throw new ProviderError(`Gemini request failed: ${providerError.message}`, providerError.code, error);
    }
  }
}
