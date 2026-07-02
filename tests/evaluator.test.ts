import { evaluateScenario, evaluateScenarios } from "../src/evaluator";
import { MockProvider } from "../providers/MockProvider";

describe("evaluator", () => {
  it("returns PASS when response matches the expected regex", async () => {
    const scenario = {
      id: "pass-case",
      categoria: "Consulta",
      prompt: "Return yes",
      response: "yes",
      expected: "^yes$",
      intent: "yes",
      entity: "yes"
    };
    const result = await evaluateScenario(scenario, new MockProvider([scenario]), "mock");

    expect(result).toEqual({
      id: "pass-case",
      categoria: "Consulta",
      prompt: "Return yes",
      actualResponse: "yes",
      expected: "^yes$",
      intent: "yes",
      entity: "yes",
      provider: "mock",
      model: "mock",
      responseTimeMs: expect.any(Number),
      inputTokensApprox: expect.any(Number),
      outputTokensApprox: expect.any(Number),
      regexStatus: "PASS",
      intentStatus: "PASS",
      entityStatus: "PASS",
      overallStatus: "PASS",
      score: 3,
      scorePercent: 100,
      errorType: null,
      errorMessage: null
    });
  });

  it("returns FAIL when response does not match the expected regex", async () => {
    const scenario = {
      id: "fail-case",
      categoria: "Consulta",
      prompt: "Return a number",
      response: "not a number",
      expected: "^\\d+$",
      intent: "number",
      entity: "number"
    };
    const result = await evaluateScenario(scenario, new MockProvider([scenario]), "mock");

    expect(result.regexStatus).toBe("FAIL");
    expect(result.overallStatus).toBe("FAIL");
    expect(result.score).toBe(2);
    expect(result.scorePercent).toBe(66);
  });

  it("evaluates multiple scenarios", async () => {
    const scenarios = [
      {
        id: "one",
        categoria: "Consulta",
        prompt: "Return ok",
        response: "ok",
        expected: "^ok$",
        intent: "ok",
        entity: "ok"
      },
      {
        id: "two",
        categoria: "Consulta",
        prompt: "Return ok",
        response: "no",
        expected: "^ok$",
        intent: "no",
        entity: "no"
      }
    ];
    const results = await evaluateScenarios(scenarios, new MockProvider(scenarios), "mock");

    expect(results.map((result) => result.overallStatus)).toEqual(["PASS", "FAIL"]);
  });

  it("preserves optional scenario metadata in the evaluation result", async () => {
    const scenario = {
      id: "compra-001",
      title: "Compra de veiculo PCD",
      description: "Validar jornada de compra.",
      categoria: "Compra",
      priority: "Critical" as const,
      severity: "Major" as const,
      type: "Regression" as const,
      tags: ["PCD", "Compra"],
      feature: "Jornada de Compra",
      requirementId: "REQ-001",
      author: "Caio Santos",
      version: "1.0",
      prompt: "quero comprar carro pcd",
      response: "Posso iniciar sua jornada de Compra para carro PCD.",
      expected: "(compra|jornada)",
      intent: "Compra",
      entity: "PCD"
    };

    const result = await evaluateScenario(scenario, new MockProvider([scenario]), "mock");

    expect(result).toMatchObject({
      title: "Compra de veiculo PCD",
      description: "Validar jornada de compra.",
      priority: "Critical",
      severity: "Major",
      type: "Regression",
      tags: ["PCD", "Compra"],
      feature: "Jornada de Compra",
      requirementId: "REQ-001",
      author: "Caio Santos",
      version: "1.0"
    });
  });

  it("returns FAIL overall when intent or entity is missing from the response", async () => {
    const scenario = {
      id: "missing-intent-entity",
      categoria: "AtendimentoHumano",
      prompt: "quero atendimento humano",
      response: "Vou transferir você para um especialista.",
      expected: "(especialista|atendente)",
      intent: "Atendimento Humano",
      entity: "Atendente"
    };
    const result = await evaluateScenario(scenario, new MockProvider([scenario]), "mock");

    expect(result).toEqual({
      id: "missing-intent-entity",
      categoria: "AtendimentoHumano",
      prompt: "quero atendimento humano",
      actualResponse: "Vou transferir você para um especialista.",
      expected: "(especialista|atendente)",
      intent: "Atendimento Humano",
      entity: "Atendente",
      provider: "mock",
      model: "mock",
      responseTimeMs: expect.any(Number),
      inputTokensApprox: expect.any(Number),
      outputTokensApprox: expect.any(Number),
      regexStatus: "PASS",
      intentStatus: "FAIL",
      entityStatus: "FAIL",
      overallStatus: "FAIL",
      score: 1,
      scorePercent: 33,
      errorType: null,
      errorMessage: null
    });
  });

  it("returns FAIL with error details when the provider fails", async () => {
    const scenario = {
      id: "provider-error",
      categoria: "Consulta",
      prompt: "Prompt without mock",
      response: "unused",
      expected: "unused",
      intent: "unused",
      entity: "unused"
    };
    const provider = new MockProvider([]);

    const result = await evaluateScenario(scenario, provider, "mock");

    expect(result.overallStatus).toBe("ERROR");
    expect(result.score).toBe(0);
    expect(result.scorePercent).toBe(0);
    expect(result.actualResponse).toBe("");
    expect(result.errorType).toBe("UNKNOWN");
    expect(result.errorMessage).toContain("No mock response found");
  });

  it("returns ERROR with MISSING_RESPONSE when mock scenario has no response field", async () => {
    const scenario = {
      id: "missing-response",
      categoria: "Consulta",
      prompt: "sem response",
      expected: "ok",
      intent: "ok",
      entity: "ok"
    };

    const result = await evaluateScenario(scenario, new MockProvider([scenario]), "mock");

    expect(result.overallStatus).toBe("ERROR");
    expect(result.errorType).toBe("MISSING_RESPONSE");
    expect(result.errorMessage).toBe("Scenario executed with MockProvider but response field is missing.");
    expect(result.score).toBe(0);
  });
});
