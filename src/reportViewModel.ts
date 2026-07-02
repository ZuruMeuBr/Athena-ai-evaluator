import type { ExecutionComparisonReport } from "./reportComparison";
import type { ExecutionReportPayload } from "./reportWriter";
import type { EvaluationStatus } from "./types";
import { formatDateTime, formatDuration } from "./report/reportFormatters";
import { reportLabels } from "./report/reportLabels";

type ChartDataset = {
  label: string;
  values: number[];
  color: string;
};

export interface SafeScenarioViewModel {
  id: string;
  title: string;
  description: string;
  categoria: string;
  priority: string;
  severity: string;
  type: string;
  tags: string[];
  feature: string;
  requirementId: string;
  author: string;
  version: string;
  prompt: string;
  actualResponse: string;
  expected: string;
  intent: string;
  entity: string;
  provider: string;
  model: string;
  responseTimeMs: number;
  inputTokensApprox: number;
  outputTokensApprox: number;
  regexStatus: EvaluationStatus;
  intentStatus: EvaluationStatus;
  entityStatus: EvaluationStatus;
  overallStatus: EvaluationStatus;
  score: number;
  scorePercent: number;
  errorType: string;
  errorMessage: string;
  diagnosticMessage: string;
}

export interface DashboardSummaryViewModel {
  totalScenarios: number;
  passCount: number;
  failCount: number;
  errorCount: number;
  missingResponseCount: number;
  successRate: number;
  provider: string;
  model: string;
  averageResponseTimeMs: number;
  executionDurationMs: number;
  averageScore: number;
  maxScore: number;
  minScore: number;
  appliedFiltersLabel: string;
  emptyStateMessage: string | null;
}

export interface CategorySummaryViewModel {
  categoria: string;
  total: number;
  passCount: number;
  failCount: number;
  errorCount: number;
  averageScorePercent: number;
  successRate: number;
}

export interface InsightViewModel {
  label: string;
  value: string;
}

export interface ChartViewModel {
  labels: string[];
  values?: number[];
  datasets?: ChartDataset[];
  legendDisplay: boolean;
  message?: string;
}

export interface ExecutionInfoViewModel {
  executionId: string;
  executedAt: string;
  provider: string;
  model: string;
  appliedFiltersLabel: string;
  durationMs: number;
  durationLabel: string;
}

export interface ComparisonMetricViewModel {
  label: string;
  value: string;
}

export interface ComparisonViewModel {
  available: boolean;
  message: string;
  currentExecutionId: string;
  previousExecutionId: string;
  metrics: ComparisonMetricViewModel[];
}

export interface ExecutionHistoryViewModel {
  executionId: string;
  executedAt: string;
  totalScenarios: number;
  passCount: number;
  failCount: number;
  errorCount: number;
  successRate: number;
  avgScore: number;
  appliedFiltersLabel: string;
  reportJsonPath: string;
  reportHtmlPath: string;
}

export interface ReportDashboardViewModel {
  executionInfo: ExecutionInfoViewModel;
  summary: DashboardSummaryViewModel;
  scenarios: SafeScenarioViewModel[];
  categorySummaries: CategorySummaryViewModel[];
  insights: InsightViewModel[];
  chartData: {
    status: ChartViewModel;
    statusByCategory: ChartViewModel;
    scenariosByCategory: ChartViewModel;
    scoreDistribution: ChartViewModel;
  };
  comparison: ComparisonViewModel;
  history: ExecutionHistoryViewModel[];
  historyMessage: string;
  comparisonMessage: string;
}

export interface BuildReportViewModelInput {
  currentReport?: Partial<ExecutionReportPayload> | null;
  history?: unknown;
  comparison?: unknown;
}

const uncategorizedLabel = "Uncategorized";
const fallbackValue = "-";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown, fallback = fallbackValue): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function safeStatus(value: unknown): EvaluationStatus {
  return value === "PASS" || value === "FAIL" || value === "ERROR" ? value : "ERROR";
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(parseTags);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[;,]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");
}

function safeScenario(value: unknown, index: number): SafeScenarioViewModel {
  const scenario = isRecord(value) ? value : {};
  const id = safeString(scenario.id, `scenario-${index + 1}`);
  const errorType = safeString(scenario.errorType, fallbackValue);
  const errorMessage = safeString(scenario.errorMessage, fallbackValue);

  return {
    id,
    title: safeString(scenario.title, id),
    description: safeString(scenario.description),
    categoria: safeString(scenario.categoria, uncategorizedLabel),
    priority: safeString(scenario.priority),
    severity: safeString(scenario.severity),
    type: safeString(scenario.type),
    tags: parseTags(scenario.tags),
    feature: safeString(scenario.feature),
    requirementId: safeString(scenario.requirementId),
    author: safeString(scenario.author),
    version: safeString(scenario.version),
    prompt: safeString(scenario.prompt),
    actualResponse: safeString(scenario.actualResponse),
    expected: safeString(scenario.expected),
    intent: safeString(scenario.intent),
    entity: safeString(scenario.entity),
    provider: safeString(scenario.provider, "unknown"),
    model: safeString(scenario.model, "unknown"),
    responseTimeMs: Math.max(0, safeNumber(scenario.responseTimeMs)),
    inputTokensApprox: Math.max(0, safeNumber(scenario.inputTokensApprox)),
    outputTokensApprox: Math.max(0, safeNumber(scenario.outputTokensApprox)),
    regexStatus: safeStatus(scenario.regexStatus),
    intentStatus: safeStatus(scenario.intentStatus),
    entityStatus: safeStatus(scenario.entityStatus),
    overallStatus: safeStatus(scenario.overallStatus),
    score: Math.max(0, Math.min(3, safeNumber(scenario.score))),
    scorePercent: Math.max(0, Math.min(100, safeNumber(scenario.scorePercent))),
    errorType,
    errorMessage,
    diagnosticMessage:
      errorType === "MISSING_RESPONSE"
        ? "Scenario executed with MockProvider but response field is missing."
        : errorMessage
  };
}

function formatAppliedFilters(value: unknown): string {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    return "None";
  }

  return Object.entries(value)
    .map(([key, filterValue]) => `${key}=${Array.isArray(filterValue) ? filterValue.join(", ") : String(filterValue)}`)
    .join(", ");
}

function getCategorySummaries(scenarios: SafeScenarioViewModel[]): CategorySummaryViewModel[] {
  const summaries = new Map<string, CategorySummaryViewModel & { scorePercentTotal: number }>();

  for (const scenario of scenarios) {
    const current = summaries.get(scenario.categoria) ?? {
      categoria: scenario.categoria,
      total: 0,
      passCount: 0,
      failCount: 0,
      errorCount: 0,
      averageScorePercent: 0,
      successRate: 0,
      scorePercentTotal: 0
    };

    current.total += 1;
    current.scorePercentTotal += scenario.scorePercent;

    if (scenario.overallStatus === "PASS") {
      current.passCount += 1;
    } else if (scenario.overallStatus === "ERROR") {
      current.errorCount += 1;
    } else {
      current.failCount += 1;
    }

    summaries.set(scenario.categoria, current);
  }

  return [...summaries.values()]
    .map(({ scorePercentTotal, ...summary }) => ({
      ...summary,
      averageScorePercent: summary.total === 0 ? 0 : Math.round(scorePercentTotal / summary.total),
      successRate: summary.total === 0 ? 0 : Math.round((summary.passCount / summary.total) * 100)
    }))
    .sort((left, right) => left.categoria.localeCompare(right.categoria));
}

function getValidatorFailures(scenarios: SafeScenarioViewModel[]): Record<string, number> {
  return {
    Regex: scenarios.filter((scenario) => scenario.regexStatus === "FAIL").length,
    Intent: scenarios.filter((scenario) => scenario.intentStatus === "FAIL").length,
    Entity: scenarios.filter((scenario) => scenario.entityStatus === "FAIL").length
  };
}

function getErrorTypeCounts(scenarios: SafeScenarioViewModel[]): Array<[string, number]> {
  const counts = new Map<string, number>();

  for (const scenario of scenarios) {
    if (scenario.overallStatus !== "ERROR") {
      continue;
    }

    const errorType = scenario.errorType === fallbackValue ? "UNKNOWN" : scenario.errorType;
    counts.set(errorType, (counts.get(errorType) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function topCategoryBy(
  categories: CategorySummaryViewModel[],
  selector: (category: CategorySummaryViewModel) => number
): CategorySummaryViewModel | undefined {
  return [...categories].sort((left, right) => selector(right) - selector(left))[0];
}

function getInsights(
  scenarios: SafeScenarioViewModel[],
  summary: DashboardSummaryViewModel,
  categories: CategorySummaryViewModel[]
): InsightViewModel[] {
  if (summary.totalScenarios === 0) {
    return [{ label: "Execution", value: reportLabels.noScenariosForFilters }];
  }

  const insights: InsightViewModel[] = [];
  const validatorFailures = getValidatorFailures(scenarios);
  const totalValidatorFailures = Object.values(validatorFailures).reduce((total, value) => total + value, 0);
  const topValidator = Object.entries(validatorFailures).sort((left, right) => right[1] - left[1])[0];
  const errorTypes = getErrorTypeCounts(scenarios);
  const topErrorType = errorTypes[0];
  const topFailCategory = topCategoryBy(categories, (category) =>
    category.total === 0 ? 0 : category.failCount / category.total
  );
  const topErrorCategory = topCategoryBy(categories, (category) =>
    category.total === 0 ? 0 : category.errorCount / category.total
  );

  if (summary.passCount === summary.totalScenarios) {
    return [
      { label: reportLabels.quality, value: reportLabels.allScenariosPassed },
      { label: reportLabels.technicalErrors, value: reportLabels.noTechnicalErrors },
      { label: reportLabels.score, value: reportLabels.averageScoreMaximum }
    ];
  }

  if (summary.failCount === summary.totalScenarios) {
    insights.push({ label: reportLabels.quality, value: reportLabels.allScenariosFailed });
    if (topFailCategory !== undefined) {
      insights.push({
        label: reportLabels.mostAffectedCategory,
        value: `${topFailCategory.categoria} (${topFailCategory.failCount} FAIL)`
      });
    }
    if (totalValidatorFailures > 0 && topValidator !== undefined) {
      insights.push({ label: reportLabels.mostAffectedValidator, value: `${topValidator[0]} (${topValidator[1]} FAIL)` });
    }
    return insights;
  }

  if (summary.errorCount === summary.totalScenarios) {
    insights.push({
      label: reportLabels.technicalErrors,
      value: "All scenarios ended with technical/provider/configuration errors."
    });
    if (topErrorType !== undefined) {
      insights.push({ label: reportLabels.mostFrequentErrorType, value: `${topErrorType[0]} (${topErrorType[1]})` });
    }
    if (topErrorCategory !== undefined) {
      insights.push({
        label: reportLabels.mostAffectedCategory,
        value: `${topErrorCategory.categoria} (${topErrorCategory.errorCount} ERROR)`
      });
    }
    return insights;
  }

  insights.push({ label: reportLabels.qualityFailures, value: `${summary.failCount} scenario(s) failed quality validations.` });
  insights.push({
    label: reportLabels.technicalErrors,
    value:
      summary.errorCount === 0
        ? "No technical/provider/configuration errors detected."
        : `${summary.errorCount} scenario(s) ended with technical/provider/configuration errors.`
  });

  if (topFailCategory !== undefined && topFailCategory.failCount > 0) {
    insights.push({
      label: reportLabels.highestFailCategory,
      value: `${topFailCategory.categoria} (${topFailCategory.failCount} FAIL)`
    });
  }

  if (totalValidatorFailures > 0 && topValidator !== undefined) {
    insights.push({ label: reportLabels.mostAffectedValidator, value: `${topValidator[0]} (${topValidator[1]} FAIL)` });
  }

  if (topErrorType !== undefined) {
    insights.push({ label: reportLabels.mostFrequentErrorType, value: `${topErrorType[0]} (${topErrorType[1]})` });
  }

  if (summary.missingResponseCount > 0) {
    insights.push({
      label: reportLabels.missingResponses,
      value: `${summary.missingResponseCount} scenario(s) are missing response in MockProvider mode.`
    });
  }

  insights.push({ label: reportLabels.successRate, value: `${summary.successRate}% overall success rate.` });

  return insights;
}

function getScoreDistribution(scenarios: SafeScenarioViewModel[]): Array<{ score: string; total: number }> {
  return [0, 1, 2, 3]
    .map((score) => ({
      score: `${score}/3`,
      total: scenarios.filter((scenario) => scenario.score === score).length
    }))
    .filter((item) => item.total > 0);
}

function buildSummary(
  scenarios: SafeScenarioViewModel[],
  currentReport: Partial<ExecutionReportPayload>
): DashboardSummaryViewModel {
  const passCount = scenarios.filter((scenario) => scenario.overallStatus === "PASS").length;
  const errorCount = scenarios.filter((scenario) => scenario.overallStatus === "ERROR").length;
  const failCount = scenarios.length - passCount - errorCount;
  const totalScenarios = scenarios.length;
  const scores = scenarios.map((scenario) => scenario.score);
  const responseTimes = scenarios.map((scenario) => scenario.responseTimeMs);

  return {
    totalScenarios,
    passCount,
    failCount,
    errorCount,
    missingResponseCount: scenarios.filter((scenario) => scenario.errorType === "MISSING_RESPONSE").length,
    successRate: totalScenarios === 0 ? 0 : Math.round((passCount / totalScenarios) * 100),
    provider: scenarios[0]?.provider ?? "unknown",
    model: scenarios[0]?.model ?? "unknown",
    averageResponseTimeMs:
      totalScenarios === 0 ? 0 : Math.round(responseTimes.reduce((total, value) => total + value, 0) / totalScenarios),
    executionDurationMs: safeNumber(isRecord(currentReport.summary) ? currentReport.summary.durationMs : undefined),
    averageScore:
      totalScenarios === 0
        ? 0
        : Number((scores.reduce((total, value) => total + value, 0) / totalScenarios).toFixed(2)),
    maxScore: scores.length === 0 ? 0 : Math.max(...scores),
    minScore: scores.length === 0 ? 0 : Math.min(...scores),
    appliedFiltersLabel: formatAppliedFilters(currentReport.appliedFilters),
    emptyStateMessage: totalScenarios === 0 ? reportLabels.noScenariosForFilters : null
  };
}

function buildExecutionInfo(
  currentReport: Partial<ExecutionReportPayload>,
  summary: DashboardSummaryViewModel
): ExecutionInfoViewModel {
  return {
    executionId: safeString(currentReport.executionId),
    executedAt: formatDateTime(typeof currentReport.executedAt === "string" ? currentReport.executedAt : undefined),
    provider: summary.provider,
    model: summary.model,
    appliedFiltersLabel: summary.appliedFiltersLabel,
    durationMs: summary.executionDurationMs,
    durationLabel: formatDuration(summary.executionDurationMs)
  };
}

function buildChartData(
  summary: DashboardSummaryViewModel,
  scenarios: SafeScenarioViewModel[],
  categories: CategorySummaryViewModel[]
): ReportDashboardViewModel["chartData"] {
  const scoreDistribution = getScoreDistribution(scenarios);
  const statusByCategoryDatasets: ChartDataset[] = [
    {
      label: "PASS",
      values: categories.map((category) => category.passCount),
      color: "#16a34a"
    },
    {
      label: "FAIL",
      values: categories.map((category) => category.failCount),
      color: "#f59e0b"
    },
    {
      label: "ERROR",
      values: categories.map((category) => category.errorCount),
      color: "#dc2626"
    }
  ].filter((dataset) => dataset.values.some((value) => value > 0));

  return {
    status: {
      labels: ["PASS", "FAIL", "ERROR"],
      values: [summary.passCount, summary.failCount, summary.errorCount],
      legendDisplay: false,
      message:
        summary.totalScenarios === 0
          ? reportLabels.noScenariosForFilters
          : summary.passCount === summary.totalScenarios
            ? reportLabels.allScenariosPassedChart
            : undefined
    },
    statusByCategory: {
      labels: categories.map((category) => category.categoria),
      datasets: statusByCategoryDatasets,
      legendDisplay: statusByCategoryDatasets.length > 1,
      message: summary.totalScenarios === 0 ? reportLabels.noScenariosForFilters : undefined
    },
    scenariosByCategory: {
      labels: categories.map((category) => category.categoria),
      values: categories.map((category) => category.total),
      legendDisplay: false,
      message:
        categories.length > 0 && categories.every((category) => category.total === 1)
          ? reportLabels.allCategoriesSingleScenario
          : summary.totalScenarios === 0
            ? reportLabels.noScenariosForFilters
            : undefined
    },
    scoreDistribution: {
      labels: scoreDistribution.map((item) => item.score),
      values: scoreDistribution.map((item) => item.total),
      legendDisplay: false,
      message: scoreDistribution.length === 0 ? reportLabels.noScoreData : undefined
    }
  };
}

function historyMessage(history: unknown): string {
  if (!Array.isArray(history) || history.length === 0) {
    return reportLabels.noExecutionHistory;
  }

  return `${history.length} execution(s) available in history.`;
}

function safeHistoryEntry(value: unknown): ExecutionHistoryViewModel {
  const entry = isRecord(value) ? value : {};

  return {
    executionId: safeString(entry.executionId),
    executedAt: formatDateTime(typeof entry.executedAt === "string" ? entry.executedAt : undefined),
    totalScenarios: Math.max(0, safeNumber(entry.totalScenarios)),
    passCount: Math.max(0, safeNumber(entry.passCount)),
    failCount: Math.max(0, safeNumber(entry.failCount)),
    errorCount: Math.max(0, safeNumber(entry.errorCount)),
    successRate: Math.max(0, safeNumber(entry.successRate)),
    avgScore: Math.max(0, safeNumber(entry.avgScore)),
    appliedFiltersLabel: formatAppliedFilters(entry.appliedFilters),
    reportJsonPath: safeString(entry.reportJsonPath),
    reportHtmlPath: safeString(entry.reportHtmlPath)
  };
}

function buildHistory(history: unknown): ExecutionHistoryViewModel[] {
  if (!Array.isArray(history)) {
    return [];
  }

  return history.slice(0, 10).map(safeHistoryEntry);
}

function buildComparison(comparison: unknown): ComparisonViewModel {
  const fallback: ComparisonViewModel = {
    available: false,
    message: reportLabels.noPreviousExecution,
    currentExecutionId: fallbackValue,
    previousExecutionId: fallbackValue,
    metrics: []
  };

  if (!isRecord(comparison) || !isRecord(comparison.summary)) {
    return fallback;
  }

  const typedComparison = comparison as unknown as Partial<ExecutionComparisonReport>;
  const summary = comparison.summary;
  const currentExecutionId = safeString(typedComparison.currentExecutionId);
  const previousExecutionId = safeString(typedComparison.previousExecutionId);

  if (currentExecutionId === fallbackValue || previousExecutionId === fallbackValue) {
    return fallback;
  }

  const currentSuccessRate = safeNumber(summary.currentSuccessRate);
  const previousSuccessRate = safeNumber(summary.previousSuccessRate);
  const successRateDelta = safeNumber(summary.successRateDelta);
  const currentAvgScore = safeNumber(summary.currentAvgScore);
  const previousAvgScore = safeNumber(summary.previousAvgScore);
  const avgScoreDelta = safeNumber(summary.avgScoreDelta);
  const regressionsCount = Math.max(0, safeNumber(summary.regressionsCount));
  const improvementsCount = Math.max(0, safeNumber(summary.improvementsCount));
  const newScenariosCount = Math.max(0, safeNumber(summary.newScenariosCount));
  const removedScenariosCount = Math.max(0, safeNumber(summary.removedScenariosCount));

  return {
    available: true,
    message: `Compared with ${previousExecutionId}.`,
    currentExecutionId,
    previousExecutionId,
    metrics: [
      { label: reportLabels.currentSuccessRate, value: `${formatNumber(currentSuccessRate)}%` },
      { label: reportLabels.previousSuccessRate, value: `${formatNumber(previousSuccessRate)}%` },
      { label: reportLabels.successRateDelta, value: `${successRateDelta > 0 ? "+" : ""}${formatNumber(successRateDelta)}%` },
      { label: reportLabels.currentAvgScore, value: `${formatNumber(currentAvgScore)}/3` },
      { label: reportLabels.previousAvgScore, value: `${formatNumber(previousAvgScore)}/3` },
      { label: reportLabels.avgScoreDelta, value: `${avgScoreDelta > 0 ? "+" : ""}${formatNumber(avgScoreDelta)}` },
      { label: reportLabels.regressions, value: formatNumber(regressionsCount) },
      { label: reportLabels.improvements, value: formatNumber(improvementsCount) },
      { label: reportLabels.newScenarios, value: formatNumber(newScenariosCount) },
      { label: reportLabels.removedScenarios, value: formatNumber(removedScenariosCount) }
    ]
  };
}

function comparisonMessage(comparison: ComparisonViewModel): string {
  if (!comparison.available) {
    return comparison.message;
  }

  const regressions = comparison.metrics.find((metric) => metric.label === reportLabels.regressions)?.value ?? "0";
  const improvements = comparison.metrics.find((metric) => metric.label === reportLabels.improvements)?.value ?? "0";

  return `Compared with ${comparison.previousExecutionId}: ${regressions} regression(s), ${improvements} improvement(s).`;
}

export function buildReportViewModel(input: BuildReportViewModelInput): ReportDashboardViewModel {
  const currentReport = input.currentReport ?? {};
  const rawResults = Array.isArray(currentReport.results) ? currentReport.results : [];
  const scenarios = rawResults.map(safeScenario);
  const categorySummaries = getCategorySummaries(scenarios);
  const summary = buildSummary(scenarios, currentReport);
  const comparison = buildComparison(input.comparison);
  const history = buildHistory(input.history);

  return {
    executionInfo: buildExecutionInfo(currentReport, summary),
    summary,
    scenarios,
    categorySummaries,
    insights: getInsights(scenarios, summary, categorySummaries),
    chartData: buildChartData(summary, scenarios, categorySummaries),
    comparison,
    history,
    historyMessage: historyMessage(history),
    comparisonMessage: comparisonMessage(comparison)
  };
}
