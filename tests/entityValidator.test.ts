import { containsExpectedEntity } from "../validators/entityValidator";

describe("containsExpectedEntity", () => {
  it("returns true when the expected entity is present in the response", () => {
    expect(containsExpectedEntity("O Atendente vai continuar o atendimento.", "Atendente")).toBe(true);
  });

  it("returns false when the expected entity is not present in the response", () => {
    expect(containsExpectedEntity("Vou transferir você para um especialista.", "Atendente")).toBe(false);
  });

  it("returns true when no entity expectation is provided", () => {
    expect(containsExpectedEntity("Resposta antiga sem entidade configurada.")).toBe(true);
  });
});
