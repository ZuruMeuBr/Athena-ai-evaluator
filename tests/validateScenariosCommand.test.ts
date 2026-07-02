import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runScenarioValidationCommand } from "../src/validateScenarios";

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), "llm-evaluator-validate-"));
}

function createLogger(): { logger: { log(message: string): void; error(message: string): void }; messages: string[] } {
  const messages: string[] = [];

  return {
    messages,
    logger: {
      log: (message: string) => messages.push(message),
      error: (message: string) => messages.push(message)
    }
  };
}

const validScenario = {
  id: "compra-001",
  categoria: "Compra",
  prompt: "quero comprar carro",
  expected: "compra",
  intent: "Compra",
  entity: "carro"
};

describe("runScenarioValidationCommand", () => {
  it("returns success for a valid prompts.json", async () => {
    const dir = createTempDir();
    const { logger, messages } = createLogger();

    try {
      writeFileSync(join(dir, "prompts.json"), JSON.stringify([validScenario]), "utf8");

      await expect(runScenarioValidationCommand({ cwd: dir, logger })).resolves.toBe(0);
      expect(messages).toContain("Scenario schema validation passed. Total scenarios: 1");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns error for invalid prompts.json", async () => {
    const dir = createTempDir();
    const { logger, messages } = createLogger();

    try {
      writeFileSync(
        join(dir, "prompts.json"),
        JSON.stringify([{ ...validScenario, priority: "Urgent" }]),
        "utf8"
      );

      await expect(runScenarioValidationCommand({ cwd: dir, logger })).resolves.toBe(1);
      expect(messages.join("\n")).toContain("Scenario schema validation failed.");
      expect(messages.join("\n")).toContain("[compra-001] priority");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("loads scenarios/*.json when prompts.json is absent", async () => {
    const dir = createTempDir();
    const { logger, messages } = createLogger();

    try {
      const scenariosDir = join(dir, "scenarios");
      require("node:fs").mkdirSync(scenariosDir);
      writeFileSync(join(scenariosDir, "compra.json"), JSON.stringify([validScenario]), "utf8");

      await expect(runScenarioValidationCommand({ cwd: dir, logger })).resolves.toBe(0);
      expect(messages).toContain("Scenario schema validation passed. Total scenarios: 1");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns error when no scenario files exist", async () => {
    const dir = createTempDir();
    const { logger, messages } = createLogger();

    try {
      await expect(runScenarioValidationCommand({ cwd: dir, logger })).resolves.toBe(1);
      expect(messages).toContain("No scenario files found. Create prompts.json or scenarios/*.json.");
      expect(existsSync(join(dir, "prompts.json"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
