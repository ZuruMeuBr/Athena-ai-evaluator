import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { loadAppConfig } from "./config/env";
import {
  formatScenarioSchemaValidationError,
  validateScenarioSchema,
  type ScenarioSchemaValidationOptions
} from "./scenarioSchemaValidator";

interface Logger {
  log(message: string): void;
  error(message: string): void;
}

export interface ValidateScenariosCommandOptions {
  cwd?: string;
  logger?: Logger;
  validationOptions?: ScenarioSchemaValidationOptions;
}

interface LoadedScenarioSource {
  scenarios: unknown;
  source: string;
}

async function readJsonFile(filePath: string): Promise<unknown> {
  const content = await readFile(filePath, "utf8");

  return JSON.parse(content.replace(/^\uFEFF/, ""));
}

async function loadScenariosFromDirectory(scenariosDir: string): Promise<LoadedScenarioSource | null> {
  if (!existsSync(scenariosDir)) {
    return null;
  }

  const fileNames = (await readdir(scenariosDir))
    .filter((fileName) => fileName.toLowerCase().endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  if (fileNames.length === 0) {
    return null;
  }

  const scenarios: unknown[] = [];

  for (const fileName of fileNames) {
    const filePath = join(scenariosDir, fileName);
    const parsedContent = await readJsonFile(filePath);

    if (!Array.isArray(parsedContent)) {
      scenarios.push(parsedContent);
      continue;
    }

    scenarios.push(...parsedContent);
  }

  return {
    scenarios,
    source: scenariosDir
  };
}

async function loadScenarioSources(cwd: string): Promise<LoadedScenarioSource | null> {
  const promptsPath = resolve(cwd, "prompts.json");

  if (existsSync(promptsPath)) {
    const parsedContent = await readJsonFile(promptsPath);

    return {
      scenarios: parsedContent,
      source: promptsPath
    };
  }

  return loadScenariosFromDirectory(resolve(cwd, "scenarios"));
}

export async function runScenarioValidationCommand(options: ValidateScenariosCommandOptions = {}): Promise<number> {
  const cwd = options.cwd ?? process.cwd();
  const logger = options.logger ?? console;
  const loadedSource = await loadScenarioSources(cwd);

  if (loadedSource === null) {
    logger.error("No scenario files found. Create prompts.json or scenarios/*.json.");
    return 1;
  }

  const config = loadAppConfig(cwd);
  const validationOptions = options.validationOptions ?? {
    provider: config.provider,
    strictMockResponseValidation: config.strictMockResponseValidation
  };
  const validation = validateScenarioSchema(loadedSource.scenarios, validationOptions);

  if (!validation.valid) {
    logger.error("Scenario schema validation failed.");
    logger.error(`Source: ${loadedSource.source}`);

    for (const error of validation.errors) {
      logger.error(formatScenarioSchemaValidationError(error));
    }

    return 1;
  }

  logger.log(`Scenario schema validation passed. Total scenarios: ${validation.scenarios.length}`);
  return 0;
}

async function main(): Promise<void> {
  const exitCode = await runScenarioValidationCommand();

  process.exitCode = exitCode;
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown scenario validation error";

    console.error(`Scenario validation failed: ${message}`);
    process.exitCode = 1;
  });
}
