import { GeminiProvider } from "../providers/GeminiProvider";

function createFakeClient(generateContent: jest.Mock) {
  return {
    getGenerativeModel: jest.fn((options: { model: string }) => ({
      modelName: options.model,
      generateContent
    }))
  };
}

describe("GeminiProvider", () => {
  it("uses the configured model and returns metrics", async () => {
    const generateContent = jest.fn().mockResolvedValue({
      response: {
        text: () => "Resposta do Gemini"
      }
    });
    const client = createFakeClient(generateContent);
    const provider = new GeminiProvider({
      apiKey: "test-key",
      modelName: "gemini-2.5-flash",
      timeoutMs: 30000,
      client: client as never
    });

    const response = await provider.generateResponse("Prompt de teste");

    expect(client.getGenerativeModel).toHaveBeenCalledWith({ model: "gemini-2.5-flash" });
    expect(generateContent).toHaveBeenCalledWith("Prompt de teste");
    expect(response.text).toBe("Resposta do Gemini");
    expect(response.metrics.provider).toBe("gemini");
    expect(response.metrics.model).toBe("gemini-2.5-flash");
    expect(response.metrics.responseTimeMs).toEqual(expect.any(Number));
    expect(response.metrics.inputTokensApprox).toBeGreaterThan(0);
    expect(response.metrics.outputTokensApprox).toBeGreaterThan(0);
  });

  it("retries transient failures", async () => {
    const generateContent = jest
      .fn()
      .mockRejectedValueOnce(new Error("429 rate limit"))
      .mockRejectedValueOnce(new Error("network connection failed"))
      .mockResolvedValue({
        response: {
          text: () => "ok"
        }
      });
    const provider = new GeminiProvider({
      apiKey: "test-key",
      modelName: "gemini-2.5-flash",
      timeoutMs: 30000,
      client: createFakeClient(generateContent) as never,
      sleep: async () => undefined
    });

    await expect(provider.generateResponse("Prompt")).resolves.toMatchObject({
      text: "ok"
    });
    expect(generateContent).toHaveBeenCalledTimes(3);
  });

  it("does not retry invalid API key errors", async () => {
    const generateContent = jest.fn().mockRejectedValue(new Error("API key not valid"));
    const provider = new GeminiProvider({
      apiKey: "test-key",
      modelName: "gemini-2.5-flash",
      timeoutMs: 30000,
      client: createFakeClient(generateContent) as never,
      sleep: async () => undefined
    });

    await expect(provider.generateResponse("Prompt")).rejects.toMatchObject({
      code: "INVALID_API_KEY"
    });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });
});
