import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { ScenarioFilters } from "./cli/scenarioFilters";
import type { QualityGateResult } from "./qualityGate";
import type { EvaluationResult } from "./types";
import { generateHtmlReport, type HtmlReportContext } from "./report/htmlReportGenerator";

export interface ReportSummary {
  totalScenarios: number;
  passCount: number;
  failCount: number;
  errorCount: number;
  successRate: number;
  avgScore: number;
  avgResponseTimeMs: number;
  durationMs: number;
}

export interface ExecutionReportPayload {
  executionId: string;
  executedAt: string;
  appliedFilters: Record<string, string | string[]>;
  summary: ReportSummary;
  results: EvaluationResult[];
  qualityGate?: QualityGateResult;
}

export interface ExecutionHistoryEntry extends ReportSummary {
  executionId: string;
  executedAt: string;
  provider: string;
  model: string;
  appliedFilters: Record<string, string | string[]>;
  reportJsonPath: string;
  reportHtmlPath: string;
}

export interface WriteExecutionReportsOptions {
  reportsRootPath: string;
  results: EvaluationResult[];
  appliedFilters: ScenarioFilters;
  executionDate?: Date;
  durationMs: number;
}

export interface GeneratedReportPaths {
  executionId: string;
  payload: ExecutionReportPayload;
  latestJsonPath: string;
  latestHtmlPath: string;
  historyJsonPath: string;
  historyHtmlPath: string;
  historyIndexPath: string;
  legacyJsonPath: string;
  legacyHtmlPath: string;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function pathForReport(value: string): string {
  return value.replaceAll("\\", "/");
}

function toAppliedFilters(filters: ScenarioFilters): Record<string, string | string[]> {
  const appliedFilters: Record<string, string | string[]> = {};

  for (const [key, values] of Object.entries(filters)) {
    if (values === undefined || values.length === 0) {
      continue;
    }

    appliedFilters[key] = values.length === 1 ? values[0] : values;
  }

  return appliedFilters;
}

function getSummary(results: EvaluationResult[], durationMs: number): ReportSummary {
  const passCount = results.filter((result) => result.overallStatus === "PASS").length;
  const errorCount = results.filter((result) => result.overallStatus === "ERROR").length;
  const failCount = results.length - passCount - errorCount;
  const successRate = results.length === 0 ? 0 : Math.round((passCount / results.length) * 100);
  const avgScore =
    results.length === 0
      ? 0
      : Number((results.reduce((total, result) => total + result.score, 0) / results.length).toFixed(2));
  const avgResponseTimeMs =
    results.length === 0
      ? 0
      : Math.round(results.reduce((total, result) => total + result.responseTimeMs, 0) / results.length);

  return {
    totalScenarios: results.length,
    passCount,
    failCount,
    errorCount,
    successRate,
    avgScore,
    avgResponseTimeMs,
    durationMs
  };
}

async function readHistory(historyIndexPath: string): Promise<ExecutionHistoryEntry[]> {
  try {
    const content = await readFile(historyIndexPath, "utf8");
    const parsedContent: unknown = JSON.parse(content);

    return Array.isArray(parsedContent) ? (parsedContent as ExecutionHistoryEntry[]) : [];
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeHtml(
  filePath: string,
  payload: ExecutionReportPayload,
  executionDate: Date,
  context: HtmlReportContext = {}
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, generateHtmlReport(payload, executionDate, context), "utf8");
}

export function createExecutionId(executionDate = new Date()): string {
  const year = executionDate.getFullYear();
  const month = pad(executionDate.getMonth() + 1);
  const day = pad(executionDate.getDate());
  const hours = pad(executionDate.getHours());
  const minutes = pad(executionDate.getMinutes());
  const seconds = pad(executionDate.getSeconds());

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

export function buildExecutionReportPayload(
  results: EvaluationResult[],
  options: {
    executionId: string;
    executionDate: Date;
    appliedFilters: ScenarioFilters;
    durationMs: number;
  }
): ExecutionReportPayload {
  return {
    executionId: options.executionId,
    executedAt: options.executionDate.toISOString(),
    appliedFilters: toAppliedFilters(options.appliedFilters),
    summary: getSummary(results, options.durationMs),
    results
  };
}

export async function writeReport(reportPath: string, payload: unknown): Promise<void> {
  await writeJson(reportPath, payload);
}

export async function writeHtmlReport(
  reportPath: string,
  results: EvaluationResult[],
  executionDate = new Date(),
  context: HtmlReportContext = {}
): Promise<void> {
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, generateHtmlReport(results, executionDate, context), "utf8");
}

export async function refreshExecutionHtmlReports(options: {
  reportsRootPath: string;
  executionId: string;
  comparison?: unknown;
}): Promise<void> {
  const reportsRootPath = options.reportsRootPath;
  const latestJsonPath = resolve(reportsRootPath, "latest", "report.json");
  const latestHtmlPath = resolve(reportsRootPath, "latest", "report.html");
  const legacyHtmlPath = resolve(reportsRootPath, "report.html");
  const historyHtmlPath = resolve(reportsRootPath, "history", options.executionId, "report.html");
  const historyIndexPath = resolve(reportsRootPath, "history.json");
  const payload = JSON.parse(await readFile(latestJsonPath, "utf8")) as ExecutionReportPayload;
  const executionDate = new Date(payload.executedAt);
  const renderedExecutionDate = Number.isNaN(executionDate.getTime()) ? new Date() : executionDate;
  const history = await readHistory(historyIndexPath);
  const context: HtmlReportContext = {
    history,
    comparison: options.comparison
  };

  await Promise.all([
    writeHtml(latestHtmlPath, payload, renderedExecutionDate, context),
    writeHtml(legacyHtmlPath, payload, renderedExecutionDate, context),
    writeHtml(historyHtmlPath, payload, renderedExecutionDate, context)
  ]);
}

export async function writeExecutionQualityGate(options: {
  reportsRootPath: string;
  executionId: string;
  qualityGate: QualityGateResult;
}): Promise<void> {
  const latestJsonPath = resolve(options.reportsRootPath, "latest", "report.json");
  const historyJsonPath = resolve(options.reportsRootPath, "history", options.executionId, "report.json");
  const legacyJsonPath = resolve(options.reportsRootPath, "report.json");
  const payload = JSON.parse(await readFile(latestJsonPath, "utf8")) as ExecutionReportPayload;

  payload.qualityGate = options.qualityGate;

  await Promise.all([
    writeJson(latestJsonPath, payload),
    writeJson(historyJsonPath, payload),
    writeJson(legacyJsonPath, payload)
  ]);
}

export async function writeExecutionReports(options: WriteExecutionReportsOptions): Promise<GeneratedReportPaths> {
  const executionDate = options.executionDate ?? new Date();
  const executionId = createExecutionId(executionDate);
  const reportsRootPath = options.reportsRootPath;
  const historyDirectoryPath = resolve(reportsRootPath, "history", executionId);
  const latestDirectoryPath = resolve(reportsRootPath, "latest");
  const historyJsonPath = resolve(historyDirectoryPath, "report.json");
  const historyHtmlPath = resolve(historyDirectoryPath, "report.html");
  const latestJsonPath = resolve(latestDirectoryPath, "report.json");
  const latestHtmlPath = resolve(latestDirectoryPath, "report.html");
  const legacyJsonPath = resolve(reportsRootPath, "report.json");
  const legacyHtmlPath = resolve(reportsRootPath, "report.html");
  const historyIndexPath = resolve(reportsRootPath, "history.json");
  const payload = buildExecutionReportPayload(options.results, {
    executionId,
    executionDate,
    appliedFilters: options.appliedFilters,
    durationMs: options.durationMs
  });
  const relativeHistoryJsonPath = pathForReport(`reports/history/${executionId}/report.json`);
  const relativeHistoryHtmlPath = pathForReport(`reports/history/${executionId}/report.html`);
  const historyEntry: ExecutionHistoryEntry = {
    executionId,
    executedAt: payload.executedAt,
    provider: options.results[0]?.provider ?? "unknown",
    model: options.results[0]?.model ?? "unknown",
    ...payload.summary,
    appliedFilters: payload.appliedFilters,
    reportJsonPath: relativeHistoryJsonPath,
    reportHtmlPath: relativeHistoryHtmlPath
  };
  const previousHistory = await readHistory(historyIndexPath);
  const nextHistory = [historyEntry, ...previousHistory];

  await Promise.all([
    writeJson(historyJsonPath, payload),
    writeJson(latestJsonPath, payload),
    writeJson(legacyJsonPath, payload),
    writeHtml(historyHtmlPath, payload, executionDate, { history: nextHistory }),
    writeHtml(latestHtmlPath, payload, executionDate, { history: nextHistory }),
    writeHtml(legacyHtmlPath, payload, executionDate, { history: nextHistory }),
    writeJson(historyIndexPath, nextHistory)
  ]);

  return {
    executionId,
    payload,
    latestJsonPath: "reports/latest/report.json",
    latestHtmlPath: "reports/latest/report.html",
    historyJsonPath: relativeHistoryJsonPath,
    historyHtmlPath: relativeHistoryHtmlPath,
    historyIndexPath: "reports/history.json",
    legacyJsonPath: "reports/report.json",
    legacyHtmlPath: "reports/report.html"
  };
}
