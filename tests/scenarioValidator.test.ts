import { assertPromptScenarios } from "../validators/scenarioValidator";

const validScenario = {
  id: "consulta-001",
  categoria: "Consulta",
  prompt: "qual o status do pedido?",
  response: "Seu pedido esta em andamento.",
  expected: "pedido",
  intent: "Consulta",
  entity: "pedido"
};

describe("assertPromptScenarios", () => {
  it("accepts valid scenarios through the compatibility validator", () => {
    expect(() => assertPromptScenarios([validScenario])).not.toThrow();
  });

  it("throws detailed schema errors", () => {
    expect(() => assertPromptScenarios([{ id: "invalid" }])).toThrow(
      'Required field "categoria" must be a non-empty string.'
    );
  });
});
