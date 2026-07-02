import type { PromptScenario } from "../types";

export type ScenarioFilterKey =
  | "category"
  | "priority"
  | "severity"
  | "type"
  | "tag"
  | "feature"
  | "requirementId"
  | "author"
  | "version";

export type ScenarioFilters = Partial<Record<ScenarioFilterKey, string[]>>;

const flagToFilterKey: Record<string, ScenarioFilterKey> = {
  "--category": "category",
  "--priority": "priority",
  "--severity": "severity",
  "--type": "type",
  "--tag": "tag",
  "--feature": "feature",
  "--requirementId": "requirementId",
  "--author": "author",
  "--version": "version"
};

const filterOrder: ScenarioFilterKey[] = [
  "category",
  "priority",
  "severity",
  "type",
  "tag",
  "feature",
  "requirementId",
  "author",
  "version"
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function addFilter(filters: ScenarioFilters, key: ScenarioFilterKey, value: string): void {
  const normalizedValue = value.trim();

  if (normalizedValue === "") {
    throw new Error(`Missing value for --${key}.`);
  }

  filters[key] = [...(filters[key] ?? []), normalizedValue];
}

function getScenarioValue(scenario: PromptScenario, key: Exclude<ScenarioFilterKey, "category" | "tag">): string | undefined {
  return scenario[key];
}

function matchesTextFilter(actual: string | undefined, expectedValues: string[] | undefined): boolean {
  if (expectedValues === undefined || expectedValues.length === 0) {
    return true;
  }

  if (actual === undefined) {
    return false;
  }

  const normalizedActual = normalize(actual);

  return expectedValues.some((expected) => normalizedActual === normalize(expected));
}

function matchesPartialTextFilter(actual: string | undefined, expectedValues: string[] | undefined): boolean {
  if (expectedValues === undefined || expectedValues.length === 0) {
    return true;
  }

  if (actual === undefined) {
    return false;
  }

  const normalizedActual = normalize(actual);

  return expectedValues.some((expected) => normalizedActual.includes(normalize(expected)));
}

function parseTagValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(parseTagValues);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[;,]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");
}

function matchesTagFilter(tags: unknown, expectedTags: string[] | undefined): boolean {
  if (expectedTags === undefined || expectedTags.length === 0) {
    return true;
  }

  const normalizedTags = parseTagValues(tags).map(normalize);
  const normalizedExpectedTags = expectedTags.flatMap(parseTagValues).map(normalize);

  if (normalizedTags.length === 0) {
    return false;
  }

  return normalizedExpectedTags.every((expectedTag) => normalizedTags.includes(expectedTag));
}

export function parseScenarioFilters(args: string[]): ScenarioFilters {
  const filters: ScenarioFilters = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === undefined || arg.trim() === "") {
      continue;
    }

    if (!arg.startsWith("--")) {
      addFilter(filters, "category", arg);
      continue;
    }

    const [rawFlag, inlineValue] = arg.split("=", 2);
    const key = flagToFilterKey[rawFlag];

    if (key === undefined) {
      throw new Error(`Unknown filter "${rawFlag}".`);
    }

    const value = inlineValue ?? args[index + 1];

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${rawFlag}.`);
    }

    addFilter(filters, key, value);

    if (inlineValue === undefined) {
      index += 1;
    }
  }

  return filters;
}

export function hasScenarioFilters(filters: ScenarioFilters): boolean {
  return filterOrder.some((key) => (filters[key] ?? []).length > 0);
}

export function formatScenarioFilters(filters: ScenarioFilters): string {
  return filterOrder
    .flatMap((key) => (filters[key] ?? []).map((value) => `${key}=${value}`))
    .join(", ");
}

export function formatScenarioFiltersForConsole(filters: ScenarioFilters): string {
  return filterOrder
    .flatMap((key) => (filters[key] ?? []).map((value) => `${key}=${value}`))
    .join("\n");
}

export function filterScenariosByMetadata(scenarios: PromptScenario[], filters: ScenarioFilters): PromptScenario[] {
  return scenarios.filter(
    (scenario) =>
      matchesTextFilter(scenario.categoria, filters.category) &&
      matchesTextFilter(getScenarioValue(scenario, "priority"), filters.priority) &&
      matchesTextFilter(getScenarioValue(scenario, "severity"), filters.severity) &&
      matchesTextFilter(getScenarioValue(scenario, "type"), filters.type) &&
      matchesTagFilter(scenario.tags, filters.tag) &&
      matchesPartialTextFilter(getScenarioValue(scenario, "feature"), filters.feature) &&
      matchesTextFilter(getScenarioValue(scenario, "requirementId"), filters.requirementId) &&
      matchesTextFilter(getScenarioValue(scenario, "author"), filters.author) &&
      matchesTextFilter(getScenarioValue(scenario, "version"), filters.version)
  );
}
