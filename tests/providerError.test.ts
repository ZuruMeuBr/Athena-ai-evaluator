import { classifyProviderError } from "../src/utils/providerError";

describe("classifyProviderError", () => {
  it.each([
    ["401 unauthorized", "INVALID_API_KEY"],
    ["408 request timeout", "TIMEOUT"],
    ["429 too many requests", "RATE_LIMIT"],
    ["500 internal server error", "PROVIDER_ERROR"]
  ])("maps %s to %s", (message, code) => {
    expect(classifyProviderError(new Error(message)).code).toBe(code);
  });
});
