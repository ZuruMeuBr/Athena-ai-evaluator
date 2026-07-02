import { resolve } from "node:path";
import { loadAppConfig } from "./config/env";
import { createProvider } from "./config/providerFactory";
import { printResults } from "./consoleReporter";
import { evaluateScenarios } from "./evaluator";
import { loadPromptScenarios } from "./promptLoader";
import { compareLatestWithPrevious, type ExecutionComparisonReport } from "./reportComparison";
import { refreshExecutionHtmlReports, writeExecutionReports } from "./reportWriter";
import {
  filterScenariosByMetadata,
  formatScenarioFilters,
  formatScenarioFiltersForConsole,
  hasScenarioFilters,
  parseScenarioFilters
} from "./cli/scenarioFilters";

const promptsPath = resolve(process.cwd(), "prompts.json");
const reportsRootPath = resolve(process.cwd(), "reports");

function printGeneratedReports(paths: {
  latestJsonPath: string;
  latestHtmlPath: string;
  historyJsonPath: string;
  historyHtmlPath: string;
}): void {
  console.log("Reports generated:");
  console.log(`Latest JSON: ${paths.latestJsonPath}`);
  console.log(`Latest HTML: ${paths.latestHtmlPath}`);
  console.log(`History JSON: ${paths.historyJsonPath}`);
  console.log(`History HTML: ${paths.historyHtmlPath}`);
}

function formatDelta(value: number, suffix = ""): string {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value}${suffix}`;
}

function printComparisonSummary(comparison: ExecutionComparisonReport): void {
  console.log("Comparison with previous execution:");
  console.log(
    `Success Rate: ${comparison.summary.previousSuccessRate}% -> ${comparison.summary.currentSuccessRate}% (${formatDelta(
      comparison.summary.successRateDelta,
      "%"
    )})`
  );
  console.log(`Regressions: ${comparison.summary.regressionsCount}`);
  console.log(`Improvements: ${comparison.summary.improvementsCount}`);
  console.log(`New scenarios: ${comparison.summary.newScenariosCount}`);
  console.log(`Removed scenarios: ${comparison.summary.removedScenariosCount}`);
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const executionDate = new Date();
  const config = loadAppConfig();
  const scenarios = await loadPromptScenarios(promptsPath, {
    provider: config.provider,
    strictMockResponseValidation: config.strictMockResponseValidation
  });
  const filters = parseScenarioFilters(process.argv.slice(2));
  const filteredScenarios = filterScenariosByMetadata(scenarios, filters);

  if (hasScenarioFilters(filters)) {
    console.log("Applied filters:");
    console.log(formatScenarioFiltersForConsole(filters));
  }

  if (hasScenarioFilters(filters) && filteredScenarios.length === 0) {
    throw new Error(`No scenarios found for filters: ${formatScenarioFilters(filters)}`);
  }

  const providerConfig = createProvider(config, filteredScenarios);
  const results = await evaluateScenarios(filteredScenarios, providerConfig.provider, providerConfig.name);

  printResults(results);
  const generatedReportPaths = await writeExecutionReports({
    reportsRootPath,
    results,
    appliedFilters: filters,
    executionDate,
    durationMs: Date.now() - startedAt
  });

  printGeneratedReports(generatedReportPaths);

  const comparisonResult = await compareLatestWithPrevious(reportsRootPath);

  await refreshExecutionHtmlReports({
    reportsRootPath,
    executionId: generatedReportPaths.executionId,
    comparison: comparisonResult.comparison
  });

  if (comparisonResult.comparison !== null) {
    printComparisonSummary(comparisonResult.comparison);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";

  console.error(`Evaluation failed: ${message}`);
  process.exitCode = 1;
});
