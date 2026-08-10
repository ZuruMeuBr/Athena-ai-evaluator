import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { EvaluationResult, EvaluationStatus } from "./types";
import type { ExecutionHistoryEntry, ExecutionReportPayload } from "./reportWriter";

export interface ScenarioComparisonItem {
  id: string;
  categoria?: string;
  title?: string;
  prompt: string;
  previousStatus?: EvaluationStatus;
  currentStatus?: EvaluationStatus;
  previousScorePercent?: number;
  currentScorePercent?: number;
  changeType: string;
}

export interface ComparisonSummary {
  currentSuccessRate: number;
  previousSuccessRate: number;
  successRateDelta: number;
  currentAvgScore: number;
  previousAvgScore: number;
  avgScoreDelta: number;
  currentErrorCount: number;
  previousErrorCount: number;
  errorCountDelta: number;
  currentFailCount: number;
  previousFailCount: number;
  failCountDelta: number;
  regressionsCount: number;
  improvementsCount: number;
  newScenariosCount: number;
  removedScenariosCount: number;
  scopeDifferencesCount: number;
}

export interface ScopeDifferences {
  currentOnlyScenarios: ScenarioComparisonItem[];
  previousOnlyScenarios: ScenarioComparisonItem[];
}

export interface ExecutionComparisonReport {
  currentExecutionId: string;
  previousExecutionId: string;
  sameScope: boolean;
  message?: string;
  summary: ComparisonSummary;
  regressions: ScenarioComparisonItem[];
  improvements: ScenarioComparisonItem[];
  unchanged: ScenarioComparisonItem[];
  newScenarios: ScenarioComparisonItem[];
  removedScenarios: ScenarioComparisonItem[];
  scopeDifferences: ScopeDifferences;
}

export interface CompareLatestWithPreviousResult {
  comparison: ExecutionComparisonReport | null;
  comparisonPath: string;
}

export const differentScopeComparisonMessage =
  "Executions have different scopes. New and removed scenarios may reflect filter differences, not actual scenario changes.";

type AppliedFilters = ExecutionReportPayload["appliedFilters"];

function normalizeAppliedFilters(filters: AppliedFilters | undefined): Record<string, string[]> {
  const normalizedEntries = Object.entries(filters ?? {})
    .map(([key, value]) => {
      const values = (Array.isArray(value) ? value : [value])
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0);

      return [key.trim().toLowerCase(), [...new Set(values)].sort()] as const;
    })
    .filter(([key, values]) => key.length > 0 && values.length > 0)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

  return Object.fromEntries(normalizedEntries);
}

export function haveSameExecutionScope(
  currentFilters: AppliedFilters | undefined,
  previousFilters: AppliedFilters | undefined
): boolean {
  return (
    JSON.stringify(normalizeAppliedFilters(currentFilters)) ===
    JSON.stringify(normalizeAppliedFilters(previousFilters))
  );
}

function statusRank(status: EvaluationStatus): number {
  const ranks: Record<EvaluationStatus, number> = {
    ERROR: 0,
    FAIL: 1,
    PASS: 2
  };

  return ranks[status];
}

function roundDelta(value: number): number {
  return Number(value.toFixed(2));
}

function scenarioLabel(result: EvaluationResult): Pick<ScenarioComparisonItem, "id" | "categoria" | "title" | "prompt"> {
  return {
    id: result.id,
    categoria: result.categoria,
    title: result.title,
    prompt: result.prompt
  };
}

function getChangeType(previous: EvaluationResult, current: EvaluationResult): string {
  if (previous.overallStatus !== current.overallStatus) {
    return `${previous.overallStatus}_TO_${current.overallStatus}`;
  }

  if (current.scorePercent < previous.scorePercent) {
    return "SCORE_DECREASED";
  }

  if (current.scorePercent > previous.scorePercent) {
    return "SCORE_INCREASED";
  }

  return `UNCHANGED_${current.overallStatus}`;
}

function isRegression(previous: EvaluationResult, current: EvaluationResult): boolean {
  return (
    statusRank(current.overallStatus) < statusRank(previous.overallStatus) ||
    current.scorePercent < previous.scorePercent
  );
}

function isImprovement(previous: EvaluationResult, current: EvaluationResult): boolean {
  return (
    statusRank(current.overallStatus) > statusRank(previous.overallStatus) ||
    current.scorePercent > previous.scorePercent
  );
}

function comparisonItem(previous: EvaluationResult, current: EvaluationResult): ScenarioComparisonItem {
  return {
    ...scenarioLabel(current),
    previousStatus: previous.overallStatus,
    currentStatus: current.overallStatus,
    previousScorePercent: previous.scorePercent,
    currentScorePercent: current.scorePercent,
    changeType: getChangeType(previous, current)
  };
}

function newScenarioItem(current: EvaluationResult): ScenarioComparisonItem {
  return {
    ...scenarioLabel(current),
    currentStatus: current.overallStatus,
    currentScorePercent: current.scorePercent,
    changeType: "NEW_SCENARIO"
  };
}

function removedScenarioItem(previous: EvaluationResult): ScenarioComparisonItem {
  return {
    ...scenarioLabel(previous),
    previousStatus: previous.overallStatus,
    previousScorePercent: previous.scorePercent,
    changeType: "REMOVED_SCENARIO"
  };
}

function currentScopeOnlyItem(current: EvaluationResult): ScenarioComparisonItem {
  return {
    ...scenarioLabel(current),
    currentStatus: current.overallStatus,
    currentScorePercent: current.scorePercent,
    changeType: "CURRENT_SCOPE_ONLY"
  };
}

function previousScopeOnlyItem(previous: EvaluationResult): ScenarioComparisonItem {
  return {
    ...scenarioLabel(previous),
    previousStatus: previous.overallStatus,
    previousScorePercent: previous.scorePercent,
    changeType: "PREVIOUS_SCOPE_ONLY"
  };
}

async function readJson<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");

  return JSON.parse(content) as T;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function compareExecutionReports(
  currentReport: ExecutionReportPayload,
  previousReport: ExecutionReportPayload
): ExecutionComparisonReport {
  const sameScope = haveSameExecutionScope(currentReport.appliedFilters, previousReport.appliedFilters);
  const previousById = new Map(previousReport.results.map((result) => [result.id, result]));
  const currentById = new Map(currentReport.results.map((result) => [result.id, result]));
  const regressions: ScenarioComparisonItem[] = [];
  const improvements: ScenarioComparisonItem[] = [];
  const unchanged: ScenarioComparisonItem[] = [];
  const newScenarios: ScenarioComparisonItem[] = [];
  const removedScenarios: ScenarioComparisonItem[] = [];
  const scopeDifferences: ScopeDifferences = {
    currentOnlyScenarios: [],
    previousOnlyScenarios: []
  };

  for (const current of currentReport.results) {
    const previous = previousById.get(current.id);

    if (previous === undefined) {
      if (sameScope) {
        newScenarios.push(newScenarioItem(current));
      } else {
        scopeDifferences.currentOnlyScenarios.push(currentScopeOnlyItem(current));
      }
      continue;
    }

    const item = comparisonItem(previous, current);

    if (isRegression(previous, current)) {
      regressions.push(item);
    } else if (isImprovement(previous, current)) {
      improvements.push(item);
    } else {
      unchanged.push(item);
    }
  }

  for (const previous of previousReport.results) {
    if (!currentById.has(previous.id)) {
      if (sameScope) {
        removedScenarios.push(removedScenarioItem(previous));
      } else {
        scopeDifferences.previousOnlyScenarios.push(previousScopeOnlyItem(previous));
      }
    }
  }

  return {
    currentExecutionId: currentReport.executionId,
    previousExecutionId: previousReport.executionId,
    sameScope,
    ...(sameScope ? {} : { message: differentScopeComparisonMessage }),
    summary: {
      currentSuccessRate: currentReport.summary.successRate,
      previousSuccessRate: previousReport.summary.successRate,
      successRateDelta: roundDelta(currentReport.summary.successRate - previousReport.summary.successRate),
      currentAvgScore: currentReport.summary.avgScore,
      previousAvgScore: previousReport.summary.avgScore,
      avgScoreDelta: roundDelta(currentReport.summary.avgScore - previousReport.summary.avgScore),
      currentErrorCount: currentReport.summary.errorCount,
      previousErrorCount: previousReport.summary.errorCount,
      errorCountDelta: currentReport.summary.errorCount - previousReport.summary.errorCount,
      currentFailCount: currentReport.summary.failCount,
      previousFailCount: previousReport.summary.failCount,
      failCountDelta: currentReport.summary.failCount - previousReport.summary.failCount,
      regressionsCount: regressions.length,
      improvementsCount: improvements.length,
      newScenariosCount: newScenarios.length,
      removedScenariosCount: removedScenarios.length,
      scopeDifferencesCount:
        scopeDifferences.currentOnlyScenarios.length + scopeDifferences.previousOnlyScenarios.length
    },
    regressions,
    improvements,
    unchanged,
    newScenarios,
    removedScenarios,
    scopeDifferences
  };
}

export async function compareLatestWithPrevious(reportsRootPath: string): Promise<CompareLatestWithPreviousResult> {
  const latestReportPath = resolve(reportsRootPath, "latest", "report.json");
  const historyPath = resolve(reportsRootPath, "history.json");
  const comparisonPath = resolve(reportsRootPath, "comparison.json");
  const currentReport = await readJson<ExecutionReportPayload>(latestReportPath);
  const history = await readJson<ExecutionHistoryEntry[]>(historyPath);
  const previousExecution = history.find((entry) => entry.executionId !== currentReport.executionId);

  if (previousExecution === undefined) {
    return {
      comparison: null,
      comparisonPath: "reports/comparison.json"
    };
  }

  const previousReportPath = resolve(reportsRootPath, "history", previousExecution.executionId, "report.json");
  const previousReport = await readJson<ExecutionReportPayload>(previousReportPath);
  const comparison = compareExecutionReports(currentReport, previousReport);

  await writeJson(comparisonPath, comparison);

  return {
    comparison,
    comparisonPath: "reports/comparison.json"
  };
}
