import { buildReportViewModel, escapeHtml } from "../src/reportViewModel";
import type { ExecutionComparisonReport } from "../src/reportComparison";
import type { ExecutionHistoryEntry, ExecutionReportPayload, ReportSummary } from "../src/reportWriter";
import type { EvaluationResult, EvaluationStatus } from "../src/types";

function evaluationResult(overrides: Partial<EvaluationResult> = {}): EvaluationResult {
  const status = overrides.overallStatus ?? "PASS";

  return {
    id: "scenario-001",
    categoria: "Compra",
    prompt: "prompt",
    actualResponse: "response",
    expected: "expected",
    intent: "Compra",
    entity: "PCD",
    provider: "mock",
    model: "mock",
    responseTimeMs: 0,
    inputTokensApprox: 1,
    outputTokensApprox: 1,
    regexStatus: status,
    intentStatus: status,
    entityStatus: status,
    overallStatus: status,
    score: status === "PASS" ? 3 : 0,
    scorePercent: status === "PASS" ? 100 : 0,
    errorType: status === "ERROR" ? "PROVIDER_ERROR" : null,
    errorMessage: status === "ERROR" ? "Provider failed." : null,
    ...overrides
  };
}

function report(results: EvaluationResult[], summaryOverrides: Partial<ReportSummary> = {}): ExecutionReportPayload {
  return {
    executionId: "current",
    executedAt: "2026-06-30T12:00:00.000Z",
    appliedFilters: {},
    summary: {
      totalScenarios: results.length,
      passCount: results.filter((result) => result.overallStatus === "PASS").length,
      failCount: results.filter((result) => result.overallStatus === "FAIL").length,
      errorCount: results.filter((result) => result.overallStatus === "ERROR").length,
      successRate: results.length === 0 ? 0 : 100,
      avgScore: results.length === 0 ? 0 : 3,
      avgResponseTimeMs: 0,
      durationMs: 10,
      ...summaryOverrides
    },
    results
  };
}

function comparison(regressionsCount: number, improvementsCount: number): ExecutionComparisonReport {
  return {
    currentExecutionId: "current",
    previousExecutionId: "previous",
    summary: {
      currentSuccessRate: 60,
      previousSuccessRate: 80,
      successRateDelta: -20,
      currentAvgScore: 1.8,
      previousAvgScore: 2.4,
      avgScoreDelta: -0.6,
      currentErrorCount: 1,
      previousErrorCount: 0,
      errorCountDelta: 1,
      currentFailCount: 1,
      previousFailCount: 0,
      failCountDelta: 1,
      regressionsCount,
      improvementsCount,
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

function historyEntry(overrides: Partial<ExecutionHistoryEntry> = {}): ExecutionHistoryEntry {
  return {
    executionId: "2026-06-30_12-00-00",
    executedAt: "2026-06-30T12:00:00.000Z",
    provider: "mock",
    model: "mock",
    totalScenarios: 10,
    passCount: 8,
    failCount: 1,
    errorCount: 1,
    successRate: 80,
    avgScore: 2.6,
    avgResponseTimeMs: 0,
    durationMs: 120,
    appliedFilters: {},
    reportJsonPath: "reports/history/2026-06-30_12-00-00/report.json",
    reportHtmlPath: "reports/history/2026-06-30_12-00-00/report.html",
    ...overrides
  };
}

describe("reportViewModel", () => {
  it("handles all PASS scenarios with coherent insights", () => {
    const viewModel = buildReportViewModel({
      currentReport: report([
        evaluationResult({ id: "pass-001", overallStatus: "PASS" }),
        evaluationResult({ id: "pass-002", overallStatus: "PASS" })
      ])
    });

    expect(viewModel.summary).toMatchObject({
      totalScenarios: 2,
      passCount: 2,
      failCount: 0,
      errorCount: 0,
      successRate: 100,
      averageScore: 3
    });
    expect(viewModel.insights.map((insight) => insight.value)).toContain("All scenarios passed. No failures detected.");
    expect(viewModel.insights.map((insight) => insight.label)).not.toContain("Most Affected Validator");
  });

  it("handles all FAIL scenarios as quality failures, not technical errors", () => {
    const viewModel = buildReportViewModel({
      currentReport: report([
        evaluationResult({
          id: "fail-001",
          categoria: "Compra",
          overallStatus: "FAIL",
          regexStatus: "FAIL",
          intentStatus: "PASS",
          entityStatus: "FAIL",
          score: 1,
          scorePercent: 33
        })
      ])
    });

    expect(viewModel.summary.failCount).toBe(1);
    expect(viewModel.summary.errorCount).toBe(0);
    expect(viewModel.insights.map((insight) => insight.value)).toContain("All scenarios failed quality validations.");
    expect(viewModel.insights.map((insight) => insight.label)).toContain("Most Affected Validator");
  });

  it("handles all ERROR scenarios as technical/provider/configuration errors", () => {
    const viewModel = buildReportViewModel({
      currentReport: report([
        evaluationResult({
          id: "error-001",
          overallStatus: "ERROR",
          errorType: "INVALID_API_KEY",
          errorMessage: "Invalid key."
        })
      ])
    });

    expect(viewModel.summary.errorCount).toBe(1);
    expect(viewModel.insights.map((insight) => insight.value)).toContain(
      "All scenarios ended with technical/provider/configuration errors."
    );
    expect(viewModel.insights.map((insight) => insight.value)).toContain("INVALID_API_KEY (1)");
  });

  it("handles mixed PASS, FAIL and ERROR scenarios with separate quality and technical insights", () => {
    const viewModel = buildReportViewModel({
      currentReport: report([
        evaluationResult({ id: "pass-001", overallStatus: "PASS" }),
        evaluationResult({ id: "fail-001", overallStatus: "FAIL", regexStatus: "FAIL", score: 2, scorePercent: 66 }),
        evaluationResult({ id: "error-001", overallStatus: "ERROR", errorType: "TIMEOUT" })
      ])
    });

    expect(viewModel.summary).toMatchObject({
      passCount: 1,
      failCount: 1,
      errorCount: 1
    });
    expect(viewModel.insights.map((insight) => insight.value)).toContain("1 scenario(s) failed quality validations.");
    expect(viewModel.insights.map((insight) => insight.value)).toContain(
      "1 scenario(s) ended with technical/provider/configuration errors."
    );
  });

  it("counts missing responses and provides a friendly diagnostic message", () => {
    const viewModel = buildReportViewModel({
      currentReport: report([
        evaluationResult({
          id: "missing-response",
          overallStatus: "ERROR",
          errorType: "MISSING_RESPONSE",
          errorMessage: "raw message"
        })
      ])
    });

    expect(viewModel.summary.missingResponseCount).toBe(1);
    expect(viewModel.scenarios[0].diagnosticMessage).toBe(
      "Scenario executed with MockProvider but response field is missing."
    );
  });

  it("protects calculations when totalScenarios is zero", () => {
    const viewModel = buildReportViewModel({
      currentReport: report([], { totalScenarios: 0, successRate: Number.NaN, avgScore: Number.NaN })
    });

    expect(viewModel.summary.successRate).toBe(0);
    expect(viewModel.summary.averageScore).toBe(0);
    expect(viewModel.summary.emptyStateMessage).toBe("No scenarios found for the applied filters.");
    expect(viewModel.chartData.status.message).toBe("No scenarios found for the applied filters.");
  });

  it("applies safe fallbacks for missing metadata", () => {
    const viewModel = buildReportViewModel({
      currentReport: report([
        evaluationResult({
          title: undefined,
          priority: undefined,
          severity: undefined,
          type: undefined,
          tags: undefined,
          feature: undefined,
          requirementId: undefined,
          author: undefined,
          version: undefined
        })
      ])
    });

    expect(viewModel.scenarios[0]).toMatchObject({
      title: "scenario-001",
      priority: "-",
      severity: "-",
      type: "-",
      tags: [],
      feature: "-",
      requirementId: "-",
      author: "-",
      version: "-"
    });
  });

  it("renders empty applied filters as None", () => {
    const viewModel = buildReportViewModel({
      currentReport: report([evaluationResult()])
    });

    expect(viewModel.summary.appliedFiltersLabel).toBe("None");
    expect(viewModel.executionInfo.appliedFiltersLabel).toBe("None");
  });

  it("handles missing history and missing comparison", () => {
    const viewModel = buildReportViewModel({
      currentReport: report([evaluationResult()]),
      history: undefined,
      comparison: undefined
    });

    expect(viewModel.historyMessage).toBe("No execution history available yet.");
    expect(viewModel.comparisonMessage).toBe("No previous execution available for comparison yet.");
  });

  it("summarizes PASS to FAIL regressions and FAIL to PASS improvements from comparison", () => {
    const regressionViewModel = buildReportViewModel({
      currentReport: report([evaluationResult()]),
      comparison: comparison(1, 0)
    });
    const improvementViewModel = buildReportViewModel({
      currentReport: report([evaluationResult()]),
      comparison: comparison(0, 1)
    });

    expect(regressionViewModel.comparisonMessage).toContain("1 regression(s), 0 improvement(s)");
    expect(improvementViewModel.comparisonMessage).toContain("0 regression(s), 1 improvement(s)");
  });

  it("builds execution info from the current report", () => {
    const viewModel = buildReportViewModel({
      currentReport: {
        ...report([evaluationResult()], { durationMs: 245 }),
        executionId: "current-execution",
        appliedFilters: {
          priority: "Critical"
        }
      }
    });

    expect(viewModel.executionInfo).toMatchObject({
      executionId: "current-execution",
      executedAt: "30/06/2026 09:00:00",
      provider: "mock",
      model: "mock",
      appliedFiltersLabel: "priority=Critical",
      durationMs: 245,
      durationLabel: "245 ms"
    });
  });

  it("builds comparison metrics when comparison data is available", () => {
    const viewModel = buildReportViewModel({
      currentReport: report([evaluationResult()]),
      comparison: comparison(2, 1)
    });

    expect(viewModel.comparison.available).toBe(true);
    expect(viewModel.comparison.metrics).toEqual(
      expect.arrayContaining([
        { label: "Current Success Rate", value: "60%" },
        { label: "Previous Success Rate", value: "80%" },
        { label: "Success Rate Delta", value: "-20%" },
        { label: "Current Avg Score", value: "1.8/3" },
        { label: "Previous Avg Score", value: "2.4/3" },
        { label: "Avg Score Delta", value: "-0.6" },
        { label: "Regressions", value: "2" },
        { label: "Improvements", value: "1" }
      ])
    );
  });

  it("builds recent execution history with safe fallbacks", () => {
    const viewModel = buildReportViewModel({
      currentReport: report([evaluationResult()]),
      history: [
        historyEntry({
          appliedFilters: {
            tag: ["Compra", "PCD"]
          }
        }),
        {
          executionId: "",
          executedAt: "",
          appliedFilters: {}
        }
      ]
    });

    expect(viewModel.history).toHaveLength(2);
    expect(viewModel.history[0]).toMatchObject({
      executionId: "2026-06-30_12-00-00",
      executedAt: "30/06/2026 09:00:00",
      appliedFiltersLabel: "tag=Compra, PCD"
    });
    expect(viewModel.history[1]).toMatchObject({
      executionId: "-",
      executedAt: "-",
      appliedFiltersLabel: "None"
    });
  });

  it("limits execution history to the latest 10 entries", () => {
    const viewModel = buildReportViewModel({
      currentReport: report([evaluationResult()]),
      history: Array.from({ length: 12 }, (_, index) =>
        historyEntry({
          executionId: `execution-${index + 1}`
        })
      )
    });

    expect(viewModel.history).toHaveLength(10);
    expect(viewModel.history[0].executionId).toBe("execution-1");
    expect(viewModel.history[9].executionId).toBe("execution-10");
  });

  it("escapes HTML and script content safely", () => {
    expect(escapeHtml('<script>alert("x")</script> & text')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; text"
    );
  });

  it("builds score distribution with only existing scores", () => {
    const viewModel = buildReportViewModel({
      currentReport: report([
        evaluationResult({ id: "score-0", overallStatus: "FAIL", score: 0, scorePercent: 0 }),
        evaluationResult({ id: "score-3", overallStatus: "PASS", score: 3, scorePercent: 100 })
      ])
    });

    expect(viewModel.chartData.scoreDistribution.labels).toEqual(["0/3", "3/3"]);
    expect(viewModel.chartData.scoreDistribution.values).toEqual([1, 1]);
  });

  it("hides chart legends when there is only one data series", () => {
    const viewModel = buildReportViewModel({
      currentReport: report([evaluationResult({ overallStatus: "PASS" })])
    });

    expect(viewModel.chartData.status.legendDisplay).toBe(false);
    expect(viewModel.chartData.scenariosByCategory.legendDisplay).toBe(false);
    expect(viewModel.chartData.statusByCategory.legendDisplay).toBe(false);
  });
});
