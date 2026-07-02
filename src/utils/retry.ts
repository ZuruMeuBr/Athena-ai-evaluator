import { classifyProviderError, type ProviderError } from "./providerError";

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  shouldRetry?: (error: ProviderError) => boolean;
  sleep?: (delayMs: number) => Promise<void>;
}

const defaultRetryableCodes = new Set(["TIMEOUT", "RATE_LIMIT", "CONNECTION", "UNKNOWN"]);

function defaultSleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function retryWithBackoff<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  const sleep = options.sleep ?? defaultSleep;
  const shouldRetry =
    options.shouldRetry ?? ((error: ProviderError) => defaultRetryableCodes.has(error.code));
  let lastError: ProviderError | undefined;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error: unknown) {
      const providerError = classifyProviderError(error);
      lastError = providerError;

      if (attempt === options.maxAttempts || !shouldRetry(providerError)) {
        throw providerError;
      }

      await sleep(options.baseDelayMs * 2 ** (attempt - 1));
    }
  }

  throw lastError ?? new Error("Retry failed without capturing an error.");
}
