import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPromptScenarios } from "../src/promptLoader";

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), "llm-evaluator-prompts-"));
}

describe("loadPromptScenarios", () => {
  it("preserves UTF-8 accented characters when reading JSON with BOM", async () => {
    const dir = createTempDir();
    const accentedText = "cenário veículo revisão não ação São Paulo João ç á é í ó ú";

    try {
      const promptsPath = join(dir, "prompts.json");
      writeFileSync(
        promptsPath,
        `\uFEFF${JSON.stringify([
          {
            id: "utf8-001",
            categoria: "Revisão",
            prompt: accentedText,
            response: accentedText,
            expected: "cenário",
            intent: "Revisão",
            entity: "São Paulo",
            title: `Teste UTF-8 - ${accentedText}`,
            author: "João"
          }
        ])}`,
        "utf8"
      );

      const scenarios = await loadPromptScenarios(promptsPath);

      expect(scenarios[0]).toMatchObject({
        categoria: "Revisão",
        prompt: accentedText,
        response: accentedText,
        expected: "cenário",
        intent: "Revisão",
        entity: "São Paulo",
        author: "João"
      });
      expect(JSON.stringify(scenarios)).not.toContain("cenÃ¡rio");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("normalizes comma-separated tags before validating scenarios", async () => {
    const dir = createTempDir();

    try {
      const promptsPath = join(dir, "prompts.json");
      writeFileSync(
        promptsPath,
        JSON.stringify([
          {
            id: "compra-001",
            categoria: "Compra",
            prompt: "quero comprar carro pcd",
            expected: "compra",
            intent: "Compra",
            entity: "PCD",
            tags: "PCD, Compra, Regression"
          }
        ]),
        "utf8"
      );

      await expect(loadPromptScenarios(promptsPath)).resolves.toMatchObject([
        {
          id: "compra-001",
          tags: ["PCD", "Compra", "Regression"]
        }
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("normalizes semicolon-separated tags before validating scenarios", async () => {
    const dir = createTempDir();

    try {
      const promptsPath = join(dir, "prompts.json");
      writeFileSync(
        promptsPath,
        JSON.stringify([
          {
            id: "ofertas-001",
            categoria: "Ofertas",
            prompt: "quero ofertas de SUV",
            expected: "ofertas",
            intent: "Ofertas",
            entity: "SUV",
            tags: "SUV;Ofertas;Smoke"
          }
        ]),
        "utf8"
      );

      await expect(loadPromptScenarios(promptsPath)).resolves.toMatchObject([
        {
          id: "ofertas-001",
          tags: ["SUV", "Ofertas", "Smoke"]
        }
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects invalid scenarios before execution", async () => {
    const dir = createTempDir();

    try {
      const promptsPath = join(dir, "prompts.json");
      writeFileSync(
        promptsPath,
        JSON.stringify([
          {
            id: "invalid",
            categoria: "Compra",
            prompt: "quero comprar carro",
            expected: "compra",
            intent: "Compra",
            entity: ""
          }
        ]),
        "utf8"
      );

      await expect(loadPromptScenarios(promptsPath)).rejects.toThrow(
        'Required field "entity" must be a non-empty string.'
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
