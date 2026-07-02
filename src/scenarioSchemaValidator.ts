import type { PromptScenario, ProviderName, ScenarioPriority, ScenarioSeverity, ScenarioType } from "./types";

export interface ScenarioSchemaValidationError {
  scenarioId?: string;
  scenarioIndex: number;
  field: string;
  message: string;
  received?: unknown;
}

export interface ScenarioSchemaValidationOptions {
  provider?: ProviderName;
  strictMockResponseValidation?: boolean;
}

export interface ScenarioSchemaValidationResult {
  valid: boolean;
  errors: ScenarioSchemaValidationError[];
  scenarios: PromptScenario[];
}

const requiredStringFields = ["id", "categoria", "prompt", "expected", "intent", "entity"] as const;
const optionalStringFields = ["title", "description", "feature", "requirementId", "author", "version"] as const;
const priorityValues: ScenarioPriority[] = ["Critical", "High", "Medium", "Low"];
const severityValues: ScenarioSeverity[] = ["Blocker", "Major", "Minor", "Trivial"];
const typeValues: ScenarioType[] = ["Smoke", "Regression", "Functional", "Exploratory"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function getScenarioId(value: unknown): string | undefined {
  if (!isRecord(value) || !isNonEmptyString(value.id)) {
    return undefined;
  }

  return value.id.trim();
}

function parseTags(value: string): string[] {
  return value
    .split(/[;,]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");
}

function formatAllowedValues(values: readonly string[]): string {
  return values.map((value) => `"${value}"`).join(", ");
}

function validateEnumField(
  errors: ScenarioSchemaValidationError[],
  scenario: Record<string, unknown>,
  scenarioIndex: number,
  field: "priority" | "severity" | "type",
  allowedValues: readonly string[]
): void {
  const value = scenario[field];

  if (value === undefined) {
    return;
  }

  if (typeof value !== "string" || value.trim() === "" || !allowedValues.includes(value.trim())) {
    errors.push({
      scenarioId: getScenarioId(scenario),
      scenarioIndex,
      field,
      message: `Must be one of: ${formatAllowedValues(allowedValues)}.`,
      received: value
    });
  }
}

function normalizeTags(
  value: unknown,
  scenario: Record<string, unknown>,
  scenarioIndex: number,
  errors: ScenarioSchemaValidationError[]
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return parseTags(value);
  }

  if (!Array.isArray(value)) {
    errors.push({
      scenarioId: getScenarioId(scenario),
      scenarioIndex,
      field: "tags",
      message: "Must be an array of strings or a comma/semicolon separated string.",
      received: value
    });
    return undefined;
  }

  const normalizedTags: string[] = [];

  for (const tag of value) {
    if (typeof tag !== "string") {
      errors.push({
        scenarioId: getScenarioId(scenario),
        scenarioIndex,
        field: "tags",
        message: "Must contain only strings.",
        received: tag
      });
      continue;
    }

    const normalizedTag = tag.trim();

    if (normalizedTag !== "") {
      normalizedTags.push(normalizedTag);
    }
  }

  return normalizedTags;
}

function addFieldError(
  errors: ScenarioSchemaValidationError[],
  scenario: unknown,
  scenarioIndex: number,
  field: string,
  message: string,
  received: unknown
): void {
  errors.push({
    scenarioId: getScenarioId(scenario),
    scenarioIndex,
    field,
    message,
    received
  });
}

export function validateScenarioSchema(
  value: unknown,
  options: ScenarioSchemaValidationOptions = {}
): ScenarioSchemaValidationResult {
  const errors: ScenarioSchemaValidationError[] = [];

  if (!Array.isArray(value)) {
    return {
      valid: false,
      errors: [
        {
          scenarioIndex: -1,
          field: "root",
          message: "Scenario file must contain an array of scenarios.",
          received: value
        }
      ],
      scenarios: []
    };
  }

  const normalizedScenarios: PromptScenario[] = [];
  const seenIds = new Map<string, number>();

  value.forEach((scenario, scenarioIndex) => {
    if (!isRecord(scenario)) {
      errors.push({
        scenarioIndex,
        field: "scenario",
        message: "Scenario must be an object.",
        received: scenario
      });
      return;
    }

    const normalizedScenario: Record<string, unknown> = { ...scenario };

    for (const field of requiredStringFields) {
      const received = scenario[field];

      if (!isNonEmptyString(received)) {
        addFieldError(errors, scenario, scenarioIndex, field, `Required field "${field}" must be a non-empty string.`, received);
      }
    }

    if (isNonEmptyString(scenario.id)) {
      const normalizedId = scenario.id.trim();
      const duplicateIndex = seenIds.get(normalizedId);

      if (duplicateIndex !== undefined) {
        addFieldError(
          errors,
          scenario,
          scenarioIndex,
          "id",
          `Duplicate id "${normalizedId}" also found at scenario index ${duplicateIndex}.`,
          scenario.id
        );
      } else {
        seenIds.set(normalizedId, scenarioIndex);
      }
    }

    if (scenario.response !== undefined && typeof scenario.response !== "string") {
      addFieldError(errors, scenario, scenarioIndex, "response", 'Optional field "response" must be a string.', scenario.response);
    }

    if (
      options.provider === "mock" &&
      options.strictMockResponseValidation === true &&
      !isNonEmptyString(scenario.response)
    ) {
      addFieldError(
        errors,
        scenario,
        scenarioIndex,
        "response",
        'Field "response" is required when MockProvider strict response validation is enabled.',
        scenario.response
      );
    }

    for (const field of optionalStringFields) {
      if (scenario[field] !== undefined && typeof scenario[field] !== "string") {
        addFieldError(errors, scenario, scenarioIndex, field, `Optional field "${field}" must be a string.`, scenario[field]);
      }
    }

    validateEnumField(errors, scenario, scenarioIndex, "priority", priorityValues);
    validateEnumField(errors, scenario, scenarioIndex, "severity", severityValues);
    validateEnumField(errors, scenario, scenarioIndex, "type", typeValues);

    const normalizedTags = normalizeTags(scenario.tags, scenario, scenarioIndex, errors);

    if (normalizedTags !== undefined) {
      normalizedScenario.tags = normalizedTags;
    }

    normalizedScenarios.push(normalizedScenario as unknown as PromptScenario);
  });

  return {
    valid: errors.length === 0,
    errors,
    scenarios: normalizedScenarios
  };
}

function formatReceivedValue(value: unknown): string {
  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "string") {
    return `"${value}"`;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function formatScenarioSchemaValidationError(error: ScenarioSchemaValidationError): string {
  const location =
    error.scenarioId !== undefined
      ? `[${error.scenarioId}]`
      : error.scenarioIndex >= 0
        ? `[line ${error.scenarioIndex + 1}]`
        : "[schema]";
  const received =
    Object.prototype.hasOwnProperty.call(error, "received") && error.received !== undefined
      ? ` Received: ${formatReceivedValue(error.received)}.`
      : "";

  return `${location} ${error.field}: ${error.message}${received}`;
}

export function formatScenarioSchemaValidationErrors(errors: ScenarioSchemaValidationError[]): string {
  return errors.map(formatScenarioSchemaValidationError).join("\n");
}

export class ScenarioSchemaValidationException extends Error {
  constructor(readonly errors: ScenarioSchemaValidationError[]) {
    super(`Scenario schema validation failed.\n${formatScenarioSchemaValidationErrors(errors)}`);
    this.name = "ScenarioSchemaValidationException";
  }
}

export function assertValidScenarioSchema(
  value: unknown,
  options: ScenarioSchemaValidationOptions = {}
): asserts value is PromptScenario[] {
  const validation = validateScenarioSchema(value, options);

  if (!validation.valid) {
    throw new ScenarioSchemaValidationException(validation.errors);
  }
}
