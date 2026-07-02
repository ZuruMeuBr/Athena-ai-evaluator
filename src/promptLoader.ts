import { readFile } from "node:fs/promises";
import {
  ScenarioSchemaValidationException,
  type ScenarioSchemaValidationOptions,
  validateScenarioSchema
} from "./scenarioSchemaValidator";
import type { PromptScenario } from "./types";

export async function loadPromptScenarios(
  filePath: string,
  options: ScenarioSchemaValidationOptions = {}
): Promise<PromptScenario[]> {
  const rawContent = await readFile(filePath, "utf8");
  const parsedContent: unknown = JSON.parse(rawContent.replace(/^\uFEFF/, ""));
  const validation = validateScenarioSchema(parsedContent, options);

  if (!validation.valid) {
    throw new ScenarioSchemaValidationException(validation.errors);
  }

  return validation.scenarios;
}
