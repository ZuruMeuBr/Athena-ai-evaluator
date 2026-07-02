import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPromptScenarios } from "../src/promptLoader";

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), "llm-evaluator-prompts-"));
}

describe("loadPromptScenarios", () => {
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
