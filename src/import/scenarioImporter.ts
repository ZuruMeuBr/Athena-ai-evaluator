import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import {
  formatScenarioSchemaValidationError,
  validateScenarioSchema
} from "../scenarioSchemaValidator";
import type { PromptScenario } from "../types";
import type { ImportError, ImportRow, ImportSummary } from "./types";

const requiredColumns = ["id", "categoria", "prompt", "expected", "intent", "entity"] as const;

function normalizeCell(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

function parseTags(value: string): string[] | undefined {
  if (value === "") {
    return undefined;
  }

  return value
    .split(/[;,]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");
}

function isEmptyRow(values: Record<string, string>): boolean {
  return Object.values(values).every((value) => value.trim() === "");
}

function normalizeHeader(header: string): string {
  return header.trim();
}

function rowsFromRecords(records: Record<string, unknown>[]): ImportRow[] {
  return records.map((record, index) => {
    const values: Record<string, string> = {};

    for (const [key, value] of Object.entries(record)) {
      values[normalizeHeader(key)] = normalizeCell(value);
    }

    return {
      rowNumber: index + 2,
      values
    };
  });
}

export async function readImportRows(filePath: string): Promise<ImportRow[]> {
  const extension = extname(filePath).toLowerCase();

  if (extension === ".csv") {
    const content = await readFile(filePath, "utf8");
    const records = parse(content, {
      columns: true,
      bom: true,
      skip_empty_lines: false,
      trim: true
    }) as Record<string, unknown>[];

    return rowsFromRecords(records);
  }

  if (extension === ".xlsx" || extension === ".xls") {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];

    if (sheetName === undefined) {
      return [];
    }

    const worksheet = workbook.Sheets[sheetName];
    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: "",
      raw: false
    });

    return rowsFromRecords(records);
  }

  throw new Error(`Unsupported import file extension "${extension}". Use .xlsx or .csv.`);
}

export function validateAndBuildScenarios(rows: ImportRow[]): ImportSummary {
  const errors: ImportError[] = [];
  const candidateScenarios: PromptScenario[] = [];
  const candidateRowNumbers: number[] = [];
  const seenIds = new Map<string, number>();
  let ignored = 0;

  for (const row of rows) {
    if (isEmptyRow(row.values)) {
      ignored += 1;
      continue;
    }

    const rowErrorsBefore = errors.length;

    for (const column of requiredColumns) {
      if (!(column in row.values)) {
        errors.push({
          rowNumber: row.rowNumber,
          message: `Missing required column "${column}".`
        });
      }
    }

    const id = normalizeCell(row.values.id);
    const categoria = normalizeCell(row.values.categoria);
    const prompt = normalizeCell(row.values.prompt);
    const expected = normalizeCell(row.values.expected);
    const intent = normalizeCell(row.values.intent);
    const entity = normalizeCell(row.values.entity);
    const response = normalizeCell(row.values.response);
    const title = normalizeCell(row.values.title);
    const description = normalizeCell(row.values.description);
    const priority = normalizeCell(row.values.priority);
    const severity = normalizeCell(row.values.severity);
    const type = normalizeCell(row.values.type);
    const tags = parseTags(normalizeCell(row.values.tags));
    const feature = normalizeCell(row.values.feature);
    const requirementId = normalizeCell(row.values.requirementId);
    const author = normalizeCell(row.values.author);
    const version = normalizeCell(row.values.version);

    if (id === "") {
      errors.push({ rowNumber: row.rowNumber, message: "id is required." });
    }

    if (categoria === "") {
      errors.push({ rowNumber: row.rowNumber, message: "categoria is required." });
    }

    if (prompt === "") {
      errors.push({ rowNumber: row.rowNumber, message: "prompt is required." });
    }

    if (expected === "") {
      errors.push({ rowNumber: row.rowNumber, message: "expected is required." });
    }

    if (intent === "") {
      errors.push({ rowNumber: row.rowNumber, message: "intent is required." });
    }

    if (entity === "") {
      errors.push({ rowNumber: row.rowNumber, message: "entity is required." });
    }

    if (id !== "") {
      const duplicateRow = seenIds.get(id);

      if (duplicateRow !== undefined) {
        errors.push({
          rowNumber: row.rowNumber,
          message: `Duplicate id "${id}" also found at row ${duplicateRow}.`
        });
      } else {
        seenIds.set(id, row.rowNumber);
      }
    }

    if (errors.length > rowErrorsBefore) {
      ignored += 1;
      continue;
    }

    const scenario: PromptScenario = {
      id,
      categoria,
      prompt,
      expected,
      intent,
      entity
    };

    if (response !== "") {
      scenario.response = response;
    }

    if (title !== "") scenario.title = title;
    if (description !== "") scenario.description = description;
    if (priority !== "") scenario.priority = priority as PromptScenario["priority"];
    if (severity !== "") scenario.severity = severity as PromptScenario["severity"];
    if (type !== "") scenario.type = type as PromptScenario["type"];
    if (tags !== undefined) scenario.tags = tags;
    if (feature !== "") scenario.feature = feature;
    if (requirementId !== "") scenario.requirementId = requirementId;
    if (author !== "") scenario.author = author;
    if (version !== "") scenario.version = version;

    candidateScenarios.push(scenario);
    candidateRowNumbers.push(row.rowNumber);
  }

  const schemaValidation = validateScenarioSchema(candidateScenarios);
  const invalidScenarioIndexes = new Set<number>();

  if (!schemaValidation.valid) {
    for (const error of schemaValidation.errors) {
      const rowNumber = candidateRowNumbers[error.scenarioIndex] ?? error.scenarioIndex + 2;

      errors.push({
        rowNumber,
        message: formatScenarioSchemaValidationError(error)
      });
      invalidScenarioIndexes.add(error.scenarioIndex);
    }
  }

  ignored += invalidScenarioIndexes.size;

  const scenarios = schemaValidation.scenarios.filter((_, index) => !invalidScenarioIndexes.has(index));

  return {
    totalRows: rows.length,
    imported: scenarios.length,
    ignored,
    errors,
    scenarios
  };
}

function toCategoryFileName(categoria: string): string {
  return `${categoria
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}.json`;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeImportedScenarios(
  cwd: string,
  scenarios: PromptScenario[],
  writeCategoryFiles = true
): Promise<void> {
  await writeJson(resolve(cwd, "prompts.json"), scenarios);

  if (!writeCategoryFiles) {
    return;
  }

  const scenariosDir = resolve(cwd, "scenarios");
  await mkdir(scenariosDir, { recursive: true });

  const scenariosByCategory = new Map<string, PromptScenario[]>();

  for (const scenario of scenarios) {
    const category = scenario.categoria ?? "SemCategoria";
    const categoryScenarios = scenariosByCategory.get(category) ?? [];
    categoryScenarios.push(scenario);
    scenariosByCategory.set(category, categoryScenarios);
  }

  for (const [category, categoryScenarios] of scenariosByCategory) {
    await writeJson(join(scenariosDir, toCategoryFileName(category)), categoryScenarios);
  }
}

export async function importScenarios(filePath: string, cwd = process.cwd()): Promise<ImportSummary> {
  const rows = await readImportRows(filePath);
  const summary = validateAndBuildScenarios(rows);

  if (summary.errors.length === 0) {
    await writeImportedScenarios(cwd, summary.scenarios);
  }

  return summary;
}
