import { matchesExpectedRegex } from "../validators/regexValidator";

describe("matchesExpectedRegex", () => {
  it("returns true when the actual response matches the expected regex", () => {
    expect(matchesExpectedRegex("Vou transferir para um especialista.", "(especialista|atendente)")).toBe(true);
  });

  it("returns false when the actual response does not match the expected regex", () => {
    expect(matchesExpectedRegex("Resposta sem match.", "(especialista|atendente)")).toBe(false);
  });
});
