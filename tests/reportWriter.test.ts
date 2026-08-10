import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildExecutionReportPayload,
  createExecutionId,
  refreshExecutionHtmlReports,
  writeExecutionQualityGate,
  writeExecutionReports,
  type ExecutionHistoryEntry
} from "../src/reportWriter";
import { defaultQualityGateCriteria, evaluateQualityGate } from "../src/qualityGate";
import type { EvaluationResult } from "../src/types";

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), "llm-evaluator-reports-"));
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

const result: EvaluationResult = {
  id: "compra-001",
  categoria: "Compra",
  prompt: "quero comprar carro pcd",
  actualResponse: "Posso iniciar sua jornada de compra para veiculo PCD.",
  expected: "compra",
  intent: "Compra",
  entity: "PCD",
  provider: "mock",
  model: "mock",
  responseTimeMs: 12,
  inputTokensApprox: 5,
  outputTokensApprox: 8,
  regexStatus: "PASS",
  intentStatus: "PASS",
  entityStatus: "PASS",
  overallStatus: "PASS",
  score: 3,
  scorePercent: 100,
  errorType: null,
  errorMessage: null
};

describe("reportWriter", () => {
  it("creates an executionId from timestamp", () => {
    expect(createExecutionId(new Date(2026, 5, 25, 13, 30, 10))).toBe("2026-06-25_13-30-10");
  });

  it("builds report payload with execution metadata, summary and filters", () => {
    const payload = buildExecutionReportPayload([result], {
      executionId: "2026-06-25_13-30-10",
      executionDate: new Date("2026-06-25T16:30:10.000Z"),
      appliedFilters: {
        priority: ["Critical"],
        tag: ["Compra", "PCD"]
      },
      durationMs: 245
    });

    expect(payload).toMatchObject({
      executionId: "2026-06-25_13-30-10",
      executedAt: "2026-06-25T16:30:10.000Z",
      appliedFilters: {
        priority: "Critical",
        tag: ["Compra", "PCD"]
      },
      summary: {
        totalScenarios: 1,
        passCount: 1,
        failCount: 0,
        errorCount: 0,
        successRate: 100,
        avgScore: 3,
        avgResponseTimeMs: 12,
        durationMs: 245
      }
    });
  });

  it("creates history folder and updates latest plus legacy aliases", async () => {
    const dir = createTempDir();

    try {
      const paths = await writeExecutionReports({
        reportsRootPath: join(dir, "reports"),
        results: [result],
        appliedFilters: { priority: ["Critical"] },
        executionDate: new Date(2026, 5, 25, 13, 30, 10),
        durationMs: 245
      });

      expect(paths.executionId).toBe("2026-06-25_13-30-10");
      expect(existsSync(join(dir, "reports", "history", "2026-06-25_13-30-10", "report.json"))).toBe(true);
      expect(existsSync(join(dir, "reports", "history", "2026-06-25_13-30-10", "report.html"))).toBe(true);
      expect(existsSync(join(dir, "reports", "latest", "report.json"))).toBe(true);
      expect(existsSync(join(dir, "reports", "latest", "report.html"))).toBe(true);
      expect(existsSync(join(dir, "reports", "report.json"))).toBe(true);
      expect(existsSync(join(dir, "reports", "report.html"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("updates history.json and preserves previous executions", async () => {
    const dir = createTempDir();
    const reportsRootPath = join(dir, "reports");
    const previousEntry: ExecutionHistoryEntry = {
      executionId: "2026-06-25_12-00-00",
      executedAt: "2026-06-25T15:00:00.000Z",
      provider: "mock",
      model: "mock",
      totalScenarios: 2,
      passCount: 1,
      failCount: 1,
      errorCount: 0,
      successRate: 50,
      avgScore: 2,
      avgResponseTimeMs: 0,
      durationMs: 100,
      appliedFilters: {},
      reportJsonPath: "reports/history/2026-06-25_12-00-00/report.json",
      reportHtmlPath: "reports/history/2026-06-25_12-00-00/report.html"
    };

    try {
      mkdirSync(reportsRootPath, { recursive: true });
      writeFileSync(join(reportsRootPath, "history.json"), `${JSON.stringify([previousEntry], null, 2)}\n`, "utf8");

      await writeExecutionReports({
        reportsRootPath,
        results: [result],
        appliedFilters: { tag: ["Compra"] },
        executionDate: new Date(2026, 5, 25, 14, 5, 22),
        durationMs: 200
      });

      const history = readJson<ExecutionHistoryEntry[]>(join(reportsRootPath, "history.json"));

      expect(history).toHaveLength(2);
      expect(history[0]).toMatchObject({
        executionId: "2026-06-25_14-05-22",
        provider: "mock",
        model: "mock",
        totalScenarios: 1,
        passCount: 1,
        failCount: 0,
        errorCount: 0,
        successRate: 100,
        avgScore: 3,
        avgResponseTimeMs: 12,
        durationMs: 200,
        appliedFilters: {
          tag: "Compra"
        },
        reportJsonPath: "reports/history/2026-06-25_14-05-22/report.json",
        reportHtmlPath: "reports/history/2026-06-25_14-05-22/report.html"
      });
      expect(history[1]).toEqual(previousEntry);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes execution metadata into latest report.json", async () => {
    const dir = createTempDir();

    try {
      await writeExecutionReports({
        reportsRootPath: join(dir, "reports"),
        results: [result],
        appliedFilters: { feature: ["Compra"] },
        executionDate: new Date(2026, 5, 25, 14, 5, 22),
        durationMs: 300
      });

      const latestReport = readJson<Record<string, unknown>>(join(dir, "reports", "latest", "report.json"));
      const latestHtml = readFileSync(join(dir, "reports", "latest", "report.html"), "utf8");

      expect(latestReport).toMatchObject({
        executionId: "2026-06-25_14-05-22",
        appliedFilters: {
          feature: "Compra"
        },
        summary: {
          durationMs: 300
        }
      });
      expect(latestHtml).toContain("Filters: feature=Compra");
      expect(latestHtml).toContain('<span class="kpi-label">Execution Duration</span>');
      expect(latestHtml).toContain('<strong class="kpi-value">300 ms</strong>');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("preserves UTF-8 accented characters in report.json", async () => {
    const dir = createTempDir();
    const accentedText = "cenário veículo revisão não ação São Paulo João ç á é í ó ú";

    try {
      await writeExecutionReports({
        reportsRootPath: join(dir, "reports"),
        results: [
          {
            ...result,
            title: `Agendamento - cenário positivo 1`,
            description: accentedText,
            prompt: accentedText,
            actualResponse: accentedText,
            expected: "revisão",
            intent: "Ação",
            entity: "São Paulo",
            author: "João"
          }
        ],
        appliedFilters: {},
        executionDate: new Date(2026, 5, 25, 14, 5, 22),
        durationMs: 300
      });

      const rawReport = readFileSync(join(dir, "reports", "latest", "report.json"), "utf8");
      const report = JSON.parse(rawReport) as { results: Array<Record<string, unknown>> };

      expect(report.results[0]).toMatchObject({
        title: "Agendamento - cenário positivo 1",
        description: accentedText,
        prompt: accentedText,
        actualResponse: accentedText,
        expected: "revisão",
        intent: "Ação",
        entity: "São Paulo",
        author: "João"
      });
      expect(rawReport).toContain(accentedText);
      expect(rawReport).not.toContain("cenÃ¡rio");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("adds Quality Gate data to latest, history and legacy report.json", async () => {
    const dir = createTempDir();
    const reportsRootPath = join(dir, "reports");

    try {
      const paths = await writeExecutionReports({
        reportsRootPath,
        results: [result],
        appliedFilters: {},
        executionDate: new Date(2026, 5, 25, 14, 5, 22),
        durationMs: 300
      });
      const qualityGate = evaluateQualityGate({
        enabled: true,
        criteria: defaultQualityGateCriteria,
        summary: paths.payload.summary,
        results: [result],
        comparison: null
      });

      await writeExecutionQualityGate({
        reportsRootPath,
        executionId: paths.executionId,
        qualityGate
      });

      for (const reportPath of [
        join(reportsRootPath, "latest", "report.json"),
        join(reportsRootPath, "history", paths.executionId, "report.json"),
        join(reportsRootPath, "report.json")
      ]) {
        expect(readJson<Record<string, unknown>>(reportPath)).toMatchObject({
          qualityGate: {
            enabled: true,
            status: "PASSED",
            criteria: defaultQualityGateCriteria,
            results: {
              successRate: {
                actual: 100,
                expected: 90,
                status: "PASSED"
              }
            }
          }
        });
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refreshes generated HTML with history and comparison context", async () => {
    const dir = createTempDir();

    try {
      const paths = await writeExecutionReports({
        reportsRootPath: join(dir, "reports"),
        results: [result],
        appliedFilters: { feature: ["Compra"] },
        executionDate: new Date(2026, 5, 25, 14, 5, 22),
        durationMs: 300
      });

      await refreshExecutionHtmlReports({
        reportsRootPath: join(dir, "reports"),
        executionId: paths.executionId,
        comparison: {
          currentExecutionId: "2026-06-25_14-05-22",
          previousExecutionId: "2026-06-25_13-30-10",
          sameScope: true,
          summary: {
            currentSuccessRate: 100,
            previousSuccessRate: 80,
            successRateDelta: 20,
            currentAvgScore: 3,
            previousAvgScore: 2.4,
            avgScoreDelta: 0.6,
            currentErrorCount: 0,
            previousErrorCount: 1,
            errorCountDelta: -1,
            currentFailCount: 0,
            previousFailCount: 1,
            failCountDelta: -1,
            regressionsCount: 0,
            improvementsCount: 1,
            newScenariosCount: 0,
            removedScenariosCount: 0,
            scopeDifferencesCount: 0
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
        }
      });

      const latestHtml = readFileSync(join(dir, "reports", "latest", "report.html"), "utf8");
      const historyHtml = readFileSync(
        join(dir, "reports", "history", "2026-06-25_14-05-22", "report.html"),
        "utf8"
      );

      expect(latestHtml).toContain("<h2>Execution History</h2>");
      expect(latestHtml).toContain("feature=Compra");
      expect(latestHtml).toContain("<h2>Comparison with Previous Execution</h2>");
      expect(latestHtml).toContain("Previous Success Rate");
      expect(latestHtml).toContain("Improvements");
      expect(historyHtml).toContain("<h2>Comparison with Previous Execution</h2>");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
