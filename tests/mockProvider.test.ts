import { MockProvider } from "../providers/MockProvider";

describe("MockProvider", () => {
  it("returns the configured response for a prompt", async () => {
    const provider = new MockProvider([
      {
        id: "mock-001",
        categoria: "AtendimentoHumano",
        prompt: "quero atendimento humano",
        response: "Vou transferir voce para um atendente.",
        expected: "atendente",
        intent: "AtendimentoHumano",
        entity: "atendente"
      }
    ]);

    const response = await provider.generateResponse("quero atendimento humano");

    expect(response.text).toBe("Vou transferir voce para um atendente.");
    expect(response.metrics.provider).toBe("mock");
    expect(response.metrics.model).toBe("mock");
    expect(response.metrics.inputTokensApprox).toBeGreaterThan(0);
    expect(response.metrics.outputTokensApprox).toBeGreaterThan(0);
  });

  it("throws when no response is configured for the prompt", async () => {
    const provider = new MockProvider([]);

    await expect(provider.generateResponse("prompt desconhecido")).rejects.toThrow(
      "No mock response found for prompt: prompt desconhecido"
    );
  });

  it("throws MISSING_RESPONSE when scenario response is absent", async () => {
    const provider = new MockProvider([
      {
        id: "missing-response",
        categoria: "Consulta",
        prompt: "sem response",
        expected: "ok",
        intent: "Consulta",
        entity: "ok"
      }
    ]);

    await expect(provider.generateResponse("sem response")).rejects.toMatchObject({
      code: "MISSING_RESPONSE",
      message: "Scenario executed with MockProvider but response field is missing."
    });
  });
});
