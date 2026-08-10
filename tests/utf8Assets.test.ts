import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

describe("versioned UTF-8 scenario assets", () => {
  it("keeps prompts.json and scenarios/*.json free from mojibake", () => {
    const projectRoot = resolve(__dirname, "..");
    const scenarioDirectory = join(projectRoot, "scenarios");
    const files = [
      join(projectRoot, "prompts.json"),
      ...readdirSync(scenarioDirectory)
        .filter((fileName) => fileName.endsWith(".json"))
        .map((fileName) => join(scenarioDirectory, fileName))
    ];

    for (const filePath of files) {
      const content = readFileSync(filePath, "utf8").replace(/^\uFEFF/u, "");

      expect(() => JSON.parse(content)).not.toThrow();
      expect(content).not.toContain("\u00C2");
      expect(content).not.toContain("\u00C3");
      expect(content).not.toContain("\uFFFD");
      expect(content).toContain("cenário");
    }

    const prompts = readFileSync(join(projectRoot, "prompts.json"), "utf8");

    expect(prompts).toContain("Agendamento - cenário positivo 1");
    expect(prompts).toContain("veículo");
    expect(prompts).toContain("revisão");
    expect(prompts).toContain("Não");
  });
});
