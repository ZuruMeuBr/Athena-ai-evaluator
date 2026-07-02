import { ProviderError } from "../src/utils/providerError";
import { retryWithBackoff } from "../src/utils/retry";

describe("retryWithBackoff", () => {
  it("retries retryable errors with exponential backoff", async () => {
    const sleepCalls: number[] = [];
    let attempts = 0;

    const result = await retryWithBackoff(
      async () => {
        attempts += 1;

        if (attempts < 3) {
          throw new ProviderError("Temporary timeout", "TIMEOUT");
        }

        return "ok";
      },
      {
        maxAttempts: 3,
        baseDelayMs: 100,
        sleep: async (delayMs) => {
          sleepCalls.push(delayMs);
        }
      }
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
    expect(sleepCalls).toEqual([100, 200]);
  });

  it("does not retry non-retryable errors", async () => {
    let attempts = 0;

    await expect(
      retryWithBackoff(
        async () => {
          attempts += 1;
          throw new ProviderError("Invalid key", "INVALID_API_KEY");
        },
        {
          maxAttempts: 3,
          baseDelayMs: 100,
          shouldRetry: (error) => error.code !== "INVALID_API_KEY",
          sleep: async () => undefined
        }
      )
    ).rejects.toThrow("Invalid key");

    expect(attempts).toBe(1);
  });
});
