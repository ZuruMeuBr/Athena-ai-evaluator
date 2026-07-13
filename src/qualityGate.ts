import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ExecutionComparisonReport } from "./reportComparison";
import type { EvaluationResult } from "./types";

export interface QualityGateCriteria {
  minSuccessRate: number;
  minAvgScore: number;
  maxFailCount: number;
  maxErrorCount: number;
  maxRegressionCount: number;
  blockOnCriticalFailures: boolean;
}

export type QualityGateStatus = "PASSED" | "FAILED" | "DISABLED";
export type QualityGateCheckStatus = QualityGateStatus | "SKIPPED";

export interface QualityGateCheck {
  actual: number;
  expected: number;
  status: QualityGateCheckStatus;
}

export interface CriticalFailuresQualityGateCheck {
  actual: number;
  blocking: boolean;
  status: QualityGateCheckStatus;
}

export interface QualityGateResult {
  enabled: boolean;
  status: QualityGateStatus;
  criteria: QualityGateCriteria;
  results: {
    successRate: QualityGateCheck;
    avgScore: QualityGateCheck;
    failCount: QualityGateCheck;
    errorCount: QualityGateCheck;
    regressionCount: QualityGateCheck;
    criticalFailures: CriticalFailuresQualityGateCheck;
  };
  warnings: string[];
}

export interface QualityGateSummary {
  successRate: number;
  failCount: number;
  errorCount: number;
}

export interface QualityGateCliOptions {
  enabled: boolean;
  remainingArgs: string[];
}

export const defaultQualityGateCriteria: QualityGateCriteria = {
  minSuccessRate: 90,
  minAvgScore: 80,
  maxFailCount: 0,
  maxErrorCount: 0,
  maxRegressionCount: 0,
  blockOnCriticalFailures: true
};

export const noPreviousComparisonWarning =
  "Regression gate skipped because no previous comparison is available.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPercentage(value: unknown, key: string, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`Quality Gate criterion "${key}" must be a number between 0 and 100.`);
  }

  return value;
}

function readCount(value: unknown, key: string, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`Quality Gate criterion "${key}" must be a non-negative integer.`);
  }

  return value;
}

function readBoolean(value: unknown, key: string, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "boolean") {
    throw new Error(`Quality Gate criterion "${key}" must be a boolean.`);
  }

  return value;
}

function normalizeCriteria(value: unknown): QualityGateCriteria {
  if (!isRecord(value)) {
    throw new Error("Quality Gate configuration must be a JSON object.");
  }

  return {
    minSuccessRate: readPercentage(
      value.minSuccessRate,
      "minSuccessRate",
      defaultQualityGateCriteria.minSuccessRate
    ),
    minAvgScore: readPercentage(value.minAvgScore, "minAvgScore", defaultQualityGateCriteria.minAvgScore),
    maxFailCount: readCount(value.maxFailCount, "maxFailCount", defaultQualityGateCriteria.maxFailCount),
    maxErrorCount: readCount(value.maxErrorCount, "maxErrorCount", defaultQualityGateCriteria.maxErrorCount),
    maxRegressionCount: readCount(
      value.maxRegressionCount,
      "maxRegressionCount",
      defaultQualityGateCriteria.maxRegressionCount
    ),
    blockOnCriticalFailures: readBoolean(
      value.blockOnCriticalFailures,
      "blockOnCriticalFailures",
      defaultQualityGateCriteria.blockOnCriticalFailures
    )
  };
}

export async function loadQualityGateCriteria(
  configPath = resolve(process.cwd(), "quality-gates.json")
): Promise<QualityGateCriteria> {
  try {
    const content = await readFile(configPath, "utf8");
    const parsedContent: unknown = JSON.parse(content);

    return normalizeCriteria(parsedContent);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { ...defaultQualityGateCriteria };
    }

    if (error instanceof SyntaxError) {
      throw new Error(`Invalid Quality Gate configuration JSON at ${configPath}: ${error.message}`);
    }

    throw error;
  }
}

export function parseQualityGateArgs(args: string[]): QualityGateCliOptions {
  return {
    enabled: args.includes("--quality-gate"),
    remainingArgs: args.filter((arg) => arg !== "--quality-gate")
  };
}

function averageScorePercent(results: EvaluationResult[]): number {
  if (results.length === 0) {
    return 0;
  }

  const average = results.reduce((total, result) => total + result.scorePercent, 0) / results.length;

  return Number(average.toFixed(2));
}

function criticalFailureCount(results: EvaluationResult[]): number {
  return results.filter(
    (result) => result.priority?.trim().toLowerCase() === "critical" && result.overallStatus !== "PASS"
  ).length;
}

function checkStatus(enabled: boolean, passed: boolean): QualityGateCheckStatus {
  if (!enabled) {
    return "DISABLED";
  }

  return passed ? "PASSED" : "FAILED";
}

export function evaluateQualityGate(options: {
  enabled: boolean;
  criteria: QualityGateCriteria;
  summary: QualityGateSummary;
  results: EvaluationResult[];
  comparison?: ExecutionComparisonReport | null;
}): QualityGateResult {
  const avgScore = averageScorePercent(options.results);
  const criticalFailures = criticalFailureCount(options.results);
  const comparison = options.comparison ?? null;
  const comparisonAvailable = comparison !== null;
  const regressionCount = comparison === null ? 0 : comparison.summary.regressionsCount;
  const warnings = options.enabled && !comparisonAvailable ? [noPreviousComparisonWarning] : [];
  const results: QualityGateResult["results"] = {
    successRate: {
      actual: options.summary.successRate,
      expected: options.criteria.minSuccessRate,
      status: checkStatus(options.enabled, options.summary.successRate >= options.criteria.minSuccessRate)
    },
    avgScore: {
      actual: avgScore,
      expected: options.criteria.minAvgScore,
      status: checkStatus(options.enabled, avgScore >= options.criteria.minAvgScore)
    },
    failCount: {
      actual: options.summary.failCount,
      expected: options.criteria.maxFailCount,
      status: checkStatus(options.enabled, options.summary.failCount <= options.criteria.maxFailCount)
    },
    errorCount: {
      actual: options.summary.errorCount,
      expected: options.criteria.maxErrorCount,
      status: checkStatus(options.enabled, options.summary.errorCount <= options.criteria.maxErrorCount)
    },
    regressionCount: {
      actual: regressionCount,
      expected: options.criteria.maxRegressionCount,
      status: comparisonAvailable
        ? checkStatus(options.enabled, regressionCount <= options.criteria.maxRegressionCount)
        : options.enabled
          ? "SKIPPED"
          : "DISABLED"
    },
    criticalFailures: {
      actual: criticalFailures,
      blocking: options.criteria.blockOnCriticalFailures,
      status: checkStatus(
        options.enabled,
        !options.criteria.blockOnCriticalFailures || criticalFailures === 0
      )
    }
  };
  const failed = Object.values(results).some((result) => result.status === "FAILED");

  return {
    enabled: options.enabled,
    status: options.enabled ? (failed ? "FAILED" : "PASSED") : "DISABLED",
    criteria: { ...options.criteria },
    results,
    warnings
  };
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

export function printQualityGateResult(qualityGate: QualityGateResult): void {
  console.log(`Quality Gate: ${qualityGate.status}`);

  if (!qualityGate.enabled) {
    return;
  }

  console.log(
    `Success Rate: ${formatNumber(qualityGate.results.successRate.actual)}% / Required: ${formatNumber(
      qualityGate.results.successRate.expected
    )}%`
  );
  console.log(
    `Avg Score: ${formatNumber(qualityGate.results.avgScore.actual)}% / Required: ${formatNumber(
      qualityGate.results.avgScore.expected
    )}%`
  );
  console.log(`Failures: ${qualityGate.results.failCount.actual} / Max: ${qualityGate.results.failCount.expected}`);
  console.log(`Errors: ${qualityGate.results.errorCount.actual} / Max: ${qualityGate.results.errorCount.expected}`);
  console.log(
    `Regressions: ${qualityGate.results.regressionCount.actual} / Max: ${qualityGate.results.regressionCount.expected}${
      qualityGate.results.regressionCount.status === "SKIPPED" ? " (SKIPPED)" : ""
    }`
  );
  console.log(
    `Critical Failures: ${qualityGate.results.criticalFailures.actual} / Blocking: ${
      qualityGate.results.criticalFailures.blocking ? "Yes" : "No"
    }`
  );

  for (const warning of qualityGate.warnings) {
    console.warn(warning);
  }
}
