import {
  formatScenarioSchemaValidationError,
  validateScenarioSchema
} from "../src/scenarioSchemaValidator";

const baseScenario = {
  id: "compra-001",
  categoria: "Compra",
  prompt: "quero comprar um carro PCD",
  response: "Vamos iniciar a jornada de Compra para carro PCD.",
  expected: "(compra|jornada)",
  intent: "Compra",
  entity: "PCD"
};

describe("validateScenarioSchema", () => {
  it("accepts a valid scenario", () => {
    const result = validateScenarioSchema([baseScenario]);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.scenarios).toHaveLength(1);
  });

  it("accepts an old scenario without metadata", () => {
    const result = validateScenarioSchema([
      {
        id: "consulta-001",
        categoria: "Consulta",
        prompt: "qual o status do pedido?",
        expected: "status",
        intent: "Consulta",
        entity: "pedido"
      }
    ]);

    expect(result.valid).toBe(true);
  });

  it("accepts full Quality Engineering metadata", () => {
    const result = validateScenarioSchema([
      {
        ...baseScenario,
        title: "Compra de veiculo PCD",
        description: "Validar se a IA inicia a jornada de compra.",
        priority: "Critical",
        severity: "Major",
        type: "Regression",
        tags: ["PCD", "Compra", "Regression"],
        feature: "Jornada de Compra",
        requirementId: "REQ-001",
        author: "Caio Santos",
        version: "1.0"
      }
    ]);

    expect(result.valid).toBe(true);
    expect(result.scenarios[0]).toMatchObject({
      priority: "Critical",
      severity: "Major",
      type: "Regression",
      tags: ["PCD", "Compra", "Regression"]
    });
  });

  it("rejects invalid priority, severity and type", () => {
    const result = validateScenarioSchema([
      {
        ...baseScenario,
        priority: "Urgent",
        severity: "Critical",
        type: "Performance"
      }
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.field)).toEqual(["priority", "severity", "type"]);
  });

  it("normalizes tags from array, CSV and semicolon strings", () => {
    const result = validateScenarioSchema([
      { ...baseScenario, id: "tags-array", tags: ["PCD", " ", "Compra"] },
      { ...baseScenario, id: "tags-csv", tags: "PCD, Compra, Regression" },
      { ...baseScenario, id: "tags-semicolon", tags: "PCD;Compra;Regression" }
    ]);

    expect(result.valid).toBe(true);
    expect(result.scenarios.map((scenario) => scenario.tags)).toEqual([
      ["PCD", "Compra"],
      ["PCD", "Compra", "Regression"],
      ["PCD", "Compra", "Regression"]
    ]);
  });

  it("rejects invalid tags", () => {
    const result = validateScenarioSchema([{ ...baseScenario, tags: ["PCD", 123] }]);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        field: "tags",
        message: "Must contain only strings.",
        received: 123
      })
    ]);
  });

  it("rejects duplicate ids", () => {
    const result = validateScenarioSchema([baseScenario, { ...baseScenario, prompt: "duplicado" }]);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatchObject({
      scenarioId: "compra-001",
      field: "id",
      message: 'Duplicate id "compra-001" also found at scenario index 0.'
    });
  });

  it("rejects missing and empty required fields", () => {
    const result = validateScenarioSchema([
      {
        id: "",
        categoria: "",
        prompt: "",
        expected: "",
        intent: "",
        entity: ""
      }
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.field)).toEqual([
      "id",
      "categoria",
      "prompt",
      "expected",
      "intent",
      "entity"
    ]);
  });

  it("allows missing mock responses by default", () => {
    const result = validateScenarioSchema([{ ...baseScenario, response: undefined }], {
      provider: "mock",
      strictMockResponseValidation: false
    });

    expect(result.valid).toBe(true);
  });

  it("blocks missing mock responses when strict validation is enabled", () => {
    const result = validateScenarioSchema([{ ...baseScenario, response: undefined }], {
      provider: "mock",
      strictMockResponseValidation: true
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatchObject({
      scenarioId: "compra-001",
      field: "response",
      message: 'Field "response" is required when MockProvider strict response validation is enabled.'
    });
  });

  it("formats errors with scenario id and received value", () => {
    const result = validateScenarioSchema([{ ...baseScenario, priority: "Urgent" }]);

    expect(formatScenarioSchemaValidationError(result.errors[0])).toContain(
      '[compra-001] priority: Must be one of: "Critical", "High", "Medium", "Low". Received: "Urgent".'
    );
  });
});
