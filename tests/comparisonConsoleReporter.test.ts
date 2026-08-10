import {
  differentScopeTerminalWarning,
  printComparisonSummary
} from "../src/comparisonConsoleReporter";
import type { ExecutionComparisonReport } from "../src/reportComparison";

function comparison(sameScope: boolean): ExecutionComparisonReport {
  return {
    currentExecutionId: "current",
    previousExecutionId: "previous",
    sameScope,
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
      regressionsCount: 0,
      improvementsCount: 0,
      newScenariosCount: 0,
      removedScenariosCount: 0,
      scopeDifferencesCount: sameScope ? 0 : 10
    },
    regressions: [],
    improvements: [],
    unchanged: [],
    newScenarios: [],
    removedScenarios: [],
    scopeDifferences: {
      currentOnlyScenarios: [],
      previousOnlyScenarios: []
    }
  };
}

describe("comparisonConsoleReporter", () => {
  it("prints a scope warning when execution filters differ", () => {
    const logs: string[] = [];
    const warnings: string[] = [];

    printComparisonSummary(comparison(false), {
      log: (message) => logs.push(message),
      warn: (message) => warnings.push(message)
    });

    expect(logs).toContain("Scope differences: 10");
    expect(warnings).toEqual([
      "Comparison scope warning:",
      differentScopeTerminalWarning
    ]);
  });

  it("does not print a scope warning when execution filters match", () => {
    const warnings: string[] = [];

    printComparisonSummary(comparison(true), {
      log: () => undefined,
      warn: (message) => warnings.push(message)
    });

    expect(warnings).toEqual([]);
  });
});
