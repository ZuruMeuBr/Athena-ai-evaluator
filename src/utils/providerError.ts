export type ProviderErrorCode =
  | "INVALID_API_KEY"
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "CONNECTION"
  | "PROVIDER_ERROR"
  | "MISSING_RESPONSE"
  | "UNKNOWN";

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code: ProviderErrorCode,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export function classifyProviderError(error: unknown): ProviderError {
  if (error instanceof ProviderError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("401") ||
    normalizedMessage.includes("api key") ||
    normalizedMessage.includes("permission") ||
    normalizedMessage.includes("unauthorized")
  ) {
    return new ProviderError(message, "INVALID_API_KEY", error);
  }

  if (normalizedMessage.includes("408") || normalizedMessage.includes("timeout") || normalizedMessage.includes("timed out")) {
    return new ProviderError(message, "TIMEOUT", error);
  }

  if (
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("quota") ||
    normalizedMessage.includes("429")
  ) {
    return new ProviderError(message, "RATE_LIMIT", error);
  }

  if (normalizedMessage.includes("500") || normalizedMessage.includes("internal server")) {
    return new ProviderError(message, "PROVIDER_ERROR", error);
  }

  if (
    normalizedMessage.includes("fetch") ||
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("econn") ||
    normalizedMessage.includes("connection")
  ) {
    return new ProviderError(message, "CONNECTION", error);
  }

  return new ProviderError(message, "UNKNOWN", error);
}
