import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  compareExecutionReports,
  compareLatestWithPrevious,
  differentScopeComparisonMessage,
  haveSameExecutionScope
} from "../src/reportComparison";
import type { ExecutionHistoryEntry, ExecutionReportPayload, ReportSummary } from "../src/reportWriter";
import type { EvaluationResult, EvaluationStatus } from "../src/types";

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), "llm-evaluator-comparison-"));
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function result(id: string, overallStatus: EvaluationStatus, scorePercent: number): EvaluationResult {
  return {
    id,
    categoria: "Compra",
    prompt: `prompt ${id}`,
    actualResponse: `response ${id}`,
    expected: "expected",
    intent: "Compra",
    entity: "PCD",
    provider: "mock",
    model: "mock",
    responseTimeMs: 0,
    inputTokensApprox: 1,
    outputTokensApprox: 1,
    regexStatus: overallStatus,
    intentStatus: overallStatus,
    entityStatus: overallStatus,
    overallStatus,
    score: Math.round((scorePercent / 100) * 3),
    scorePercent,
    errorType: overallStatus === "ERROR" ? "PROVIDER_ERROR" : null,
    errorMessage: overallStatus === "ERROR" ? "Provider failed." : null
  };
}

function summary(overrides: Partial<ReportSummary>): ReportSummary {
  return {
    totalScenarios: 1,
    passCount: 1,
    failCount: 0,
    errorCount: 0,
    successRate: 100,
    avgScore: 3,
    avgResponseTimeMs: 0,
    durationMs: 100,
    ...overrides
  };
}

function report(
  executionId: string,
  results: EvaluationResult[],
  summaryOverrides: Partial<ReportSummary> = {},
  appliedFilters: ExecutionReportPayload["appliedFilters"] = {}
): ExecutionReportPayload {
  return {
    executionId,
    executedAt: "2026-06-25T16:30:00.000Z",
    appliedFilters,
    summary: summary(summaryOverrides),
    results
  };
}

describe("reportComparison", () => {
  it("treats two complete executions as the same scope", () => {
    const comparison = compareExecutionReports(
      report("current", [result("scenario-001", "PASS", 100)]),
      report("previous", [result("scenario-001", "PASS", 100)])
    );

    expect(comparison.sameScope).toBe(true);
    expect(comparison.message).toBeUndefined();
  });

  it("treats identical filtered executions as the same scope", () => {
    const comparison = compareExecutionReports(
      report("current", [], {}, { tag: "Compra", priority: "Critical" }),
      report("previous", [], {}, { tag: "Compra", priority: "Critical" })
    );

    expect(comparison.sameScope).toBe(true);
  });

  it("ignores filter key and value order when comparing scopes", () => {
    expect(
      haveSameExecutionScope(
        { tag: ["Compra", "PCD"], priority: "Critical" },
        { priority: "Critical", tag: ["PCD", "Compra"] }
      )
    ).toBe(true);
  });

  it("treats a complete and a filtered execution as different scopes", () => {
    const comparison = compareExecutionReports(
      report("current", [], {}, { tag: "Compra" }),
      report("previous", [])
    );

    expect(comparison.sameScope).toBe(false);
    expect(comparison.message).toBe(differentScopeComparisonMessage);
  });

  it("treats tag Compra in both executions as the same scope", () => {
    expect(haveSameExecutionScope({ tag: "Compra" }, { tag: "Compra" })).toBe(true);
  });

  it("treats tag Compra and tag Financiamento as different scopes", () => {
    expect(haveSameExecutionScope({ tag: "Compra" }, { tag: "Financiamento" })).toBe(false);
  });

  it("treats priority Critical and no filter as different scopes", () => {
    expect(haveSameExecutionScope({ priority: "Critical" }, {})).toBe(false);
  });

  it("classifies PASS to FAIL as regression", () => {
    const comparison = compareExecutionReports(
      report("current", [result("scenario-001", "FAIL", 66)]),
      report("previous", [result("scenario-001", "PASS", 100)])
    );

    expect(comparison.regressions).toMatchObject([
      {
        id: "scenario-001",
        previousStatus: "PASS",
        currentStatus: "FAIL",
        changeType: "PASS_TO_FAIL"
      }
    ]);
    expect(comparison.summary.regressionsCount).toBe(1);
  });

  it("classifies PASS to ERROR as regression", () => {
    const comparison = compareExecutionReports(
      report("current", [result("scenario-001", "ERROR", 0)]),
      report("previous", [result("scenario-001", "PASS", 100)])
    );

    expect(comparison.regressions).toMatchObject([
      {
        id: "scenario-001",
        previousStatus: "PASS",
        currentStatus: "ERROR",
        changeType: "PASS_TO_ERROR"
      }
    ]);
  });

  it("classifies FAIL to PASS as improvement", () => {
    const comparison = compareExecutionReports(
      report("current", [result("scenario-001", "PASS", 100)]),
      report("previous", [result("scenario-001", "FAIL", 66)])
    );

    expect(comparison.improvements).toMatchObject([
      {
        id: "scenario-001",
        previousStatus: "FAIL",
        currentStatus: "PASS",
        changeType: "FAIL_TO_PASS"
      }
    ]);
    expect(comparison.summary.improvementsCount).toBe(1);
  });

  it("classifies ERROR to PASS as improvement", () => {
    const comparison = compareExecutionReports(
      report("current", [result("scenario-001", "PASS", 100)]),
      report("previous", [result("scenario-001", "ERROR", 0)])
    );

    expect(comparison.improvements).toMatchObject([
      {
        id: "scenario-001",
        previousStatus: "ERROR",
        currentStatus: "PASS",
        changeType: "ERROR_TO_PASS"
      }
    ]);
  });

  it("identifies new and removed scenarios", () => {
    const comparison = compareExecutionReports(
      report("current", [result("new-scenario", "PASS", 100)]),
      report("previous", [result("removed-scenario", "PASS", 100)])
    );

    expect(comparison.newScenarios).toMatchObject([
      {
        id: "new-scenario",
        changeType: "NEW_SCENARIO"
      }
    ]);
    expect(comparison.removedScenarios).toMatchObject([
      {
        id: "removed-scenario",
        changeType: "REMOVED_SCENARIO"
      }
    ]);
    expect(comparison.summary.newScenariosCount).toBe(1);
    expect(comparison.summary.removedScenariosCount).toBe(1);
    expect(comparison.summary.scopeDifferencesCount).toBe(0);
    expect(comparison.sameScope).toBe(true);
  });

  it("moves absent scenarios to scope differences when filters differ", () => {
    const comparison = compareExecutionReports(
      report("current", [result("current-only", "PASS", 100)], {}, { tag: "Compra" }),
      report("previous", [result("previous-only", "PASS", 100)])
    );

    expect(comparison.newScenarios).toEqual([]);
    expect(comparison.removedScenarios).toEqual([]);
    expect(comparison.scopeDifferences.currentOnlyScenarios).toMatchObject([
      { id: "current-only", changeType: "CURRENT_SCOPE_ONLY" }
    ]);
    expect(comparison.scopeDifferences.previousOnlyScenarios).toMatchObject([
      { id: "previous-only", changeType: "PREVIOUS_SCOPE_ONLY" }
    ]);
    expect(comparison.summary).toMatchObject({
      newScenariosCount: 0,
      removedScenariosCount: 0,
      scopeDifferencesCount: 2,
      regressionsCount: 0,
      improvementsCount: 0
    });
  });

  it("keeps unchanged PASS, FAIL and ERROR scenarios grouped as unchanged", () => {
    const comparison = compareExecutionReports(
      report("current", [
        result("pass-scenario", "PASS", 100),
        result("fail-scenario", "FAIL", 66),
        result("error-scenario", "ERROR", 0)
      ]),
      report("previous", [
        result("pass-scenario", "PASS", 100),
        result("fail-scenario", "FAIL", 66),
        result("error-scenario", "ERROR", 0)
      ])
    );

    expect(comparison.unchanged.map((item) => item.changeType)).toEqual([
      "UNCHANGED_PASS",
      "UNCHANGED_FAIL",
      "UNCHANGED_ERROR"
    ]);
  });

  it("calculates successRate and avgScore deltas", () => {
    const comparison = compareExecutionReports(
      report("current", [result("scenario-001", "FAIL", 66)], {
        successRate: 60,
        avgScore: 1.8,
        failCount: 10,
        errorCount: 10
      }),
      report("previous", [result("scenario-001", "PASS", 100)], {
        successRate: 80,
        avgScore: 2.4,
        failCount: 5,
        errorCount: 8
      })
    );

    expect(comparison.summary).toMatchObject({
      currentSuccessRate: 60,
      previousSuccessRate: 80,
      successRateDelta: -20,
      currentAvgScore: 1.8,
      previousAvgScore: 2.4,
      avgScoreDelta: -0.6,
      currentErrorCount: 10,
      previousErrorCount: 8,
      errorCountDelta: 2,
      currentFailCount: 10,
      previousFailCount: 5,
      failCountDelta: 5
    });
  });

  it("writes reports/comparison.json for latest versus previous execution", async () => {
    const dir = createTempDir();
    const reportsRootPath = join(dir, "reports");
    const current = report("current", [result("scenario-001", "FAIL", 66)], {
      successRate: 60,
      avgScore: 1.8,
      failCount: 1
    }, { tag: "Compra" });
    const previous = report("previous", [result("scenario-001", "PASS", 100)], {
      successRate: 80,
      avgScore: 2.4
    });
    const history: ExecutionHistoryEntry[] = [
      {
        executionId: "current",
        executedAt: current.executedAt,
        provider: "mock",
        model: "mock",
        ...current.summary,
        appliedFilters: {},
        reportJsonPath: "reports/history/current/report.json",
        reportHtmlPath: "reports/history/current/report.html"
      },
      {
        executionId: "previous",
        executedAt: previous.executedAt,
        provider: "mock",
        model: "mock",
        ...previous.summary,
        appliedFilters: {},
        reportJsonPath: "reports/history/previous/report.json",
        reportHtmlPath: "reports/history/previous/report.html"
      }
    ];

    try {
      mkdirSync(join(reportsRootPath, "latest"), { recursive: true });
      mkdirSync(join(reportsRootPath, "history", "previous"), { recursive: true });
      writeFileSync(join(reportsRootPath, "latest", "report.json"), JSON.stringify(current), "utf8");
      writeFileSync(join(reportsRootPath, "history", "previous", "report.json"), JSON.stringify(previous), "utf8");
      writeFileSync(join(reportsRootPath, "history.json"), JSON.stringify(history), "utf8");

      const result = await compareLatestWithPrevious(reportsRootPath);

      expect(result.comparisonPath).toBe("reports/comparison.json");
      expect(result.comparison?.summary.successRateDelta).toBe(-20);
      expect(existsSync(join(reportsRootPath, "comparison.json"))).toBe(true);
      expect(readJson<Record<string, unknown>>(join(reportsRootPath, "comparison.json"))).toMatchObject({
        currentExecutionId: "current",
        previousExecutionId: "previous",
        sameScope: false,
        message: differentScopeComparisonMessage,
        summary: {
          scopeDifferencesCount: 0
        }
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
