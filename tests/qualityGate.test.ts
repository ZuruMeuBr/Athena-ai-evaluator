import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  defaultQualityGateCriteria,
  evaluateQualityGate,
  loadQualityGateCriteria,
  noPreviousComparisonWarning,
  parseQualityGateArgs,
  type QualityGateCriteria
} from "../src/qualityGate";
import type { ExecutionComparisonReport } from "../src/reportComparison";
import type { EvaluationResult, EvaluationStatus } from "../src/types";

const lenientCriteria: QualityGateCriteria = {
  minSuccessRate: 0,
  minAvgScore: 0,
  maxFailCount: 100,
  maxErrorCount: 100,
  maxRegressionCount: 100,
  blockOnCriticalFailures: false
};

function result(overrides: {
  overallStatus?: EvaluationStatus;
  priority?: EvaluationResult["priority"];
  scorePercent?: number;
} = {}): EvaluationResult {
  const overallStatus = overrides.overallStatus ?? "PASS";

  return {
    id: "scenario-001",
    categoria: "Compra",
    priority: overrides.priority,
    prompt: "quero comprar",
    actualResponse: "Compra iniciada",
    expected: "Compra",
    intent: "Compra",
    entity: "Compra",
    provider: "mock",
    model: "mock",
    responseTimeMs: 1,
    inputTokensApprox: 1,
    outputTokensApprox: 1,
    regexStatus: overallStatus,
    intentStatus: overallStatus,
    entityStatus: overallStatus,
    overallStatus,
    score: overallStatus === "PASS" ? 3 : 0,
    scorePercent: overrides.scorePercent ?? (overallStatus === "PASS" ? 100 : 0),
    errorType: null,
    errorMessage: null
  };
}

function comparison(regressionsCount: number): ExecutionComparisonReport {
  return {
    currentExecutionId: "current",
    previousExecutionId: "previous",
    summary: {
      currentSuccessRate: 100,
      previousSuccessRate: 100,
      successRateDelta: 0,
      currentAvgScore: 3,
      previousAvgScore: 3,
      avgScoreDelta: 0,
      currentErrorCount: 0,
      previousErrorCount: 0,
      errorCountDelta: 0,
      currentFailCount: 0,
      previousFailCount: 0,
      failCountDelta: 0,
      regressionsCount,
      improvementsCount: 0,
      newScenariosCount: 0,
      removedScenariosCount: 0
    },
    regressions: [],
    improvements: [],
    unchanged: [],
    newScenarios: [],
    removedScenarios: []
  };
}

function evaluate(overrides: {
  enabled?: boolean;
  criteria?: QualityGateCriteria;
  successRate?: number;
  failCount?: number;
  errorCount?: number;
  results?: EvaluationResult[];
  comparison?: ExecutionComparisonReport | null;
} = {}) {
  return evaluateQualityGate({
    enabled: overrides.enabled ?? true,
    criteria: overrides.criteria ?? lenientCriteria,
    summary: {
      successRate: overrides.successRate ?? 100,
      failCount: overrides.failCount ?? 0,
      errorCount: overrides.errorCount ?? 0
    },
    results: overrides.results ?? [result()],
    comparison: overrides.comparison === undefined ? comparison(0) : overrides.comparison
  });
}

describe("Quality Gates", () => {
  it("passes when every criterion is satisfied", () => {
    const qualityGate = evaluate({
      criteria: {
        ...defaultQualityGateCriteria,
        minSuccessRate: 100,
        minAvgScore: 100
      }
    });

    expect(qualityGate.status).toBe("PASSED");
  });

  it("fails when success rate is below the minimum", () => {
    const qualityGate = evaluate({
      criteria: { ...lenientCriteria, minSuccessRate: 80 },
      successRate: 79
    });

    expect(qualityGate.status).toBe("FAILED");
    expect(qualityGate.results.successRate.status).toBe("FAILED");
  });

  it("fails when average score percentage is below the minimum", () => {
    const qualityGate = evaluate({
      criteria: { ...lenientCriteria, minAvgScore: 70 },
      results: [result({ scorePercent: 69 })]
    });

    expect(qualityGate.status).toBe("FAILED");
    expect(qualityGate.results.avgScore).toMatchObject({ actual: 69, expected: 70, status: "FAILED" });
  });

  it("fails when fail count exceeds the maximum", () => {
    const qualityGate = evaluate({
      criteria: { ...lenientCriteria, maxFailCount: 1 },
      failCount: 2
    });

    expect(qualityGate.results.failCount.status).toBe("FAILED");
    expect(qualityGate.status).toBe("FAILED");
  });

  it("fails when error count exceeds the maximum", () => {
    const qualityGate = evaluate({
      criteria: { ...lenientCriteria, maxErrorCount: 1 },
      errorCount: 2
    });

    expect(qualityGate.results.errorCount.status).toBe("FAILED");
    expect(qualityGate.status).toBe("FAILED");
  });

  it("fails when regression count exceeds the maximum", () => {
    const qualityGate = evaluate({
      criteria: { ...lenientCriteria, maxRegressionCount: 0 },
      comparison: comparison(1)
    });

    expect(qualityGate.results.regressionCount.status).toBe("FAILED");
    expect(qualityGate.status).toBe("FAILED");
  });

  it("fails on a case-insensitive Critical scenario that did not pass", () => {
    const criticalResult = result({ overallStatus: "FAIL", priority: "Critical" });
    criticalResult.priority = "critical" as EvaluationResult["priority"];
    const qualityGate = evaluate({
      criteria: { ...lenientCriteria, blockOnCriticalFailures: true },
      results: [criticalResult]
    });

    expect(qualityGate.results.criticalFailures).toMatchObject({ actual: 1, status: "FAILED" });
    expect(qualityGate.status).toBe("FAILED");
  });

  it("is disabled when the CLI flag is not enabled", () => {
    const qualityGate = evaluate({ enabled: false, successRate: 0, failCount: 10, errorCount: 10 });

    expect(qualityGate.status).toBe("DISABLED");
    expect(qualityGate.results.successRate.status).toBe("DISABLED");
  });

  it("skips regression check and warns when no comparison exists", () => {
    const qualityGate = evaluate({
      criteria: { ...lenientCriteria, maxRegressionCount: 0 },
      comparison: null
    });

    expect(qualityGate.status).toBe("PASSED");
    expect(qualityGate.results.regressionCount.status).toBe("SKIPPED");
    expect(qualityGate.warnings).toContain(noPreviousComparisonWarning);
  });

  it("uses defaults when quality-gates.json is absent", async () => {
    const dir = mkdtempSync(join(tmpdir(), "quality-gate-defaults-"));

    try {
      await expect(loadQualityGateCriteria(join(dir, "quality-gates.json"))).resolves.toEqual(
        defaultQualityGateCriteria
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("loads and merges a custom quality-gates.json", async () => {
    const dir = mkdtempSync(join(tmpdir(), "quality-gate-custom-"));
    const configPath = join(dir, "quality-gates.json");

    try {
      writeFileSync(configPath, JSON.stringify({ minSuccessRate: 75, maxErrorCount: 4 }), "utf8");

      await expect(loadQualityGateCriteria(configPath)).resolves.toEqual({
        ...defaultQualityGateCriteria,
        minSuccessRate: 75,
        maxErrorCount: 4
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("extracts --quality-gate without changing filter arguments", () => {
    expect(parseQualityGateArgs(["--quality-gate", "--priority", "Critical"])).toEqual({
      enabled: true,
      remainingArgs: ["--priority", "Critical"]
    });
    expect(parseQualityGateArgs(["--tag", "Compra"])).toEqual({
      enabled: false,
      remainingArgs: ["--tag", "Compra"]
    });
  });
});
