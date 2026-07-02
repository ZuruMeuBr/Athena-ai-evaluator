import {
  assertValidScenarioSchema,
  type ScenarioSchemaValidationOptions
} from "../src/scenarioSchemaValidator";
import type { PromptScenario } from "../src/types";

export function assertPromptScenarios(
  value: unknown,
  options: ScenarioSchemaValidationOptions = {}
): asserts value is PromptScenario[] {
  assertValidScenarioSchema(value, options);
}
