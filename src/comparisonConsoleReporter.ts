import type { ExecutionComparisonReport } from "./reportComparison";

export const differentScopeTerminalWarning =
  "Executions have different filters. Scenario differences may reflect filter scope, not actual additions/removals.";

export interface ComparisonConsoleOutput {
  log: (message: string) => void;
  warn: (message: string) => void;
}

function formatDelta(value: number, suffix = ""): string {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value}${suffix}`;
}

export function printComparisonSummary(
  comparison: ExecutionComparisonReport,
  output: ComparisonConsoleOutput = console
): void {
  output.log("Comparison with previous execution:");
  output.log(
    `Success Rate: ${comparison.summary.previousSuccessRate}% -> ${comparison.summary.currentSuccessRate}% (${formatDelta(
      comparison.summary.successRateDelta,
      "%"
    )})`
  );
  output.log(`Regressions: ${comparison.summary.regressionsCount}`);
  output.log(`Improvements: ${comparison.summary.improvementsCount}`);
  output.log(`New scenarios: ${comparison.summary.newScenariosCount}`);
  output.log(`Removed scenarios: ${comparison.summary.removedScenariosCount}`);
  output.log(`Scope differences: ${comparison.summary.scopeDifferencesCount}`);

  if (!comparison.sameScope) {
    output.warn("Comparison scope warning:");
    output.warn(differentScopeTerminalWarning);
  }
}
