import { generateHtmlReport } from "../src/report/htmlReportGenerator";
import { defaultQualityGateCriteria, evaluateQualityGate } from "../src/qualityGate";
import type { ExecutionComparisonReport } from "../src/reportComparison";
import type { ExecutionHistoryEntry, ExecutionReportPayload } from "../src/reportWriter";
import type { EvaluationResult } from "../src/types";

const results: EvaluationResult[] = [
  {
    id: "001",
    title: "Transferencia para especialista",
    description: "Valida atendimento humano com especialista.",
    categoria: "AtendimentoHumano",
    priority: "Critical",
    severity: "Major",
    type: "Regression",
    tags: ["Atendimento", "Humano"],
    feature: "Atendimento Humano",
    requirementId: "REQ-ATD-001",
    author: "Caio Santos",
    version: "1.0",
    prompt: "quero atendimento humano",
    actualResponse: "Vou transferir voce para um atendente.",
    expected: "(atendente|especialista|consultor)",
    intent: "AtendimentoHumano",
    entity: "Atendente",
    provider: "mock",
    model: "mock",
    responseTimeMs: 12,
    inputTokensApprox: 6,
    outputTokensApprox: 8,
    regexStatus: "PASS",
    intentStatus: "PASS",
    entityStatus: "PASS",
    overallStatus: "PASS",
    score: 3,
    scorePercent: 100,
    errorType: null,
    errorMessage: null
  },
  {
    id: "002",
    categoria: "Compra",
    prompt: "quero comprar carro pcd",
    actualResponse: "Nao consegui identificar a entidade correta para carro pcd.",
    expected: "(comprar|compra|jornada)",
    intent: "Compra",
    entity: "PCD",
    provider: "mock",
    model: "mock",
    responseTimeMs: 18,
    inputTokensApprox: 7,
    outputTokensApprox: 9,
    regexStatus: "PASS",
    intentStatus: "PASS",
    entityStatus: "FAIL",
    overallStatus: "FAIL",
    score: 2,
    scorePercent: 66,
    errorType: null,
    errorMessage: null
  }
];

function reportPayload(overrides: Partial<ExecutionReportPayload> = {}): ExecutionReportPayload {
  return {
    executionId: "2026-06-17_12-30-00",
    executedAt: "2026-06-17T15:30:00.000Z",
    appliedFilters: {},
    summary: {
      totalScenarios: 2,
      passCount: 1,
      failCount: 1,
      errorCount: 0,
      successRate: 50,
      avgScore: 2.5,
      avgResponseTimeMs: 15,
      durationMs: 245
    },
    results,
    ...overrides
  };
}

function comparison(overrides: Partial<ExecutionComparisonReport> = {}): ExecutionComparisonReport {
  return {
    currentExecutionId: "current",
    previousExecutionId: "previous",
    sameScope: true,
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
      regressionsCount: 3,
      improvementsCount: 2,
      newScenariosCount: 1,
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
    },
    ...overrides
  };
}

function historyEntry(overrides: Partial<ExecutionHistoryEntry> = {}): ExecutionHistoryEntry {
  return {
    executionId: "2026-06-17_12-00-00",
    executedAt: "2026-06-17T15:00:00.000Z",
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
    reportJsonPath: "reports/history/2026-06-17_12-00-00/report.json",
    reportHtmlPath: "reports/history/2026-06-17_12-00-00/report.html",
    ...overrides
  };
}

describe("generateHtmlReport", () => {
  it("renders the dashboard shell", () => {
    const html = generateHtmlReport(results, new Date(2026, 5, 17, 12, 30, 0));

    expect(html).toContain("<title>LLM Evaluator Report</title>");
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain("<h1>LLM Evaluator Report</h1>");
    expect(html).toContain("Execution Date: 17/06/2026 12:30:00");
    expect(html).toContain("Filters: None");
    expect(html).toContain("https://cdn.jsdelivr.net/npm/chart.js");
    expect(html).toContain('id="themeToggle"');
  });

  it("renders KPI cards", () => {
    const html = generateHtmlReport(results, new Date(2026, 5, 17, 12, 30, 0));

    expect(html).toContain('<span class="kpi-label">Total Scenarios</span>');
    expect(html).toContain('<span class="kpi-label">PASS</span>');
    expect(html).toContain('<span class="kpi-label">FAIL</span>');
    expect(html).toContain('<span class="kpi-label">ERROR</span>');
    expect(html).toContain('<span class="kpi-label">Missing Responses</span>');
    expect(html).toContain('<span class="kpi-label">Success Rate</span>');
    expect(html).toContain('<span class="kpi-label">Average Score</span>');
    expect(html).toContain('<span class="kpi-label">Average Response Time</span>');
  });

  it("renders execution info", () => {
    const html = generateHtmlReport(
      reportPayload({
        appliedFilters: {
          priority: "Critical"
        }
      }),
      new Date(2026, 5, 17, 12, 30, 0)
    );

    expect(html).toContain("<h2>Execution Info</h2>");
    expect(html).toContain("Execution ID");
    expect(html).toContain("2026-06-17_12-30-00");
    expect(html).toContain("Executed At");
    expect(html).toContain("17/06/2026 12:30:00");
    expect(html).toContain("Provider");
    expect(html).toContain("mock");
    expect(html).toContain("Applied Filters");
    expect(html).toContain("priority=Critical");
    expect(html).toContain("Execution Duration");
    expect(html).toContain("245 ms");
  });

  it("preserves UTF-8 accented characters in the final HTML", () => {
    const accentedText = "cenário veículo revisão não ação São Paulo João ç á é í ó ú";
    const html = generateHtmlReport(
      [
        {
          ...results[0],
          title: "Agendamento - cenário positivo 1",
          description: accentedText,
          prompt: accentedText,
          actualResponse: accentedText,
          expected: "revisão",
          intent: "Ação",
          entity: "São Paulo",
          author: "João"
        }
      ],
      new Date(2026, 5, 17, 12, 30, 0)
    );

    expect(html).toContain("Agendamento - cenário positivo 1");
    expect(html).toContain(accentedText);
    expect(html).not.toContain("cenÃ¡rio");
  });

  it("renders a disabled Quality Gate section when the gate was not requested", () => {
    const html = generateHtmlReport(reportPayload(), new Date(2026, 5, 17, 12, 30, 0));

    expect(html).toContain("<h2>Quality Gate</h2>");
    expect(html).toContain("Quality Gate: Disabled");
    expect(html).toContain("DISABLED");
  });

  it("renders Quality Gate status and all gate criteria", () => {
    const payload = reportPayload();
    const qualityGate = evaluateQualityGate({
      enabled: true,
      criteria: defaultQualityGateCriteria,
      summary: payload.summary,
      results: payload.results,
      comparison: null
    });
    const html = generateHtmlReport({ ...payload, qualityGate }, new Date(2026, 5, 17, 12, 30, 0));

    expect(html).toContain("Quality Gate: FAILED");
    expect(html).toContain("Success Rate Gate");
    expect(html).toContain("Avg Score Gate");
    expect(html).toContain("Fail Count Gate");
    expect(html).toContain("Error Count Gate");
    expect(html).toContain("Regression Count Gate");
    expect(html).toContain("Critical Failures Gate");
    expect(html).toContain("Regression gate skipped because no previous comparison is available.");
  });

  it("renders comparison cards when comparison data exists", () => {
    const html = generateHtmlReport(reportPayload(), new Date(2026, 5, 17, 12, 30, 0), {
      comparison: comparison()
    });

    expect(html).toContain("<h2>Comparison with Previous Execution</h2>");
    expect(html).toContain("Compared with previous.");
    expect(html).toContain("Current Success Rate");
    expect(html).toContain("60%");
    expect(html).toContain("Previous Success Rate");
    expect(html).toContain("80%");
    expect(html).toContain("Success Rate Delta");
    expect(html).toContain("-20%");
    expect(html).toContain("Current Avg Score");
    expect(html).toContain("1.8/3");
    expect(html).toContain("Previous Avg Score");
    expect(html).toContain("2.4/3");
    expect(html).toContain("Avg Score Delta");
    expect(html).toContain("-0.6");
    expect(html).toContain("Regressions");
    expect(html).toContain("Improvements");
    expect(html).toContain("New Scenarios");
    expect(html).toContain("Removed Scenarios");
  });

  it("renders a visual warning when comparison scopes differ", () => {
    const html = generateHtmlReport(reportPayload(), new Date(2026, 5, 17, 12, 30, 0), {
      comparison: comparison({ sameScope: false })
    });

    expect(html).toContain('class="comparison-scope-warning"');
    expect(html).toContain(
      "Executions have different scopes. New/removed scenarios may reflect filter differences."
    );
  });

  it("renders friendly comparison message when comparison is absent", () => {
    const html = generateHtmlReport(reportPayload(), new Date(2026, 5, 17, 12, 30, 0));

    expect(html).toContain("<h2>Comparison with Previous Execution</h2>");
    expect(html).toContain("No previous execution available for comparison yet.");
  });

  it("renders execution history with valid entries", () => {
    const html = generateHtmlReport(reportPayload(), new Date(2026, 5, 17, 12, 30, 0), {
      history: [
        historyEntry({
          appliedFilters: {
            tag: ["Compra", "PCD"]
          }
        })
      ]
    });

    expect(html).toContain("<h2>Execution History</h2>");
    expect(html).toContain('<details class="history-details" id="historyDetails">');
    expect(html).toContain('<summary id="historySummary">Show History</summary>');
    expect(html).toContain("Hide History");
    expect(html).toContain("<th>Execution ID</th>");
    expect(html).toContain("2026-06-17_12-00-00");
    expect(html).toContain("17/06/2026 12:00:00");
    expect(html).toContain("<td>10</td>");
    expect(html).toContain("<td>8</td>");
    expect(html).toContain("<td>1</td>");
    expect(html).toContain("<td>80%</td>");
    expect(html).toContain("<td>2.6/3</td>");
    expect(html).toContain("tag=Compra, PCD");
  });

  it("renders friendly history message when history is empty", () => {
    const html = generateHtmlReport(reportPayload(), new Date(2026, 5, 17, 12, 30, 0), {
      history: []
    });

    expect(html).toContain("<h2>Execution History</h2>");
    expect(html).toContain("No execution history available yet.");
  });

  it("does not break when executedAt is missing", () => {
    const payload = reportPayload();
    const html = generateHtmlReport(
      {
        ...payload,
        executedAt: undefined
      },
      new Date(2026, 5, 17, 12, 30, 0)
    );

    expect(html).toContain("<h2>Execution Info</h2>");
    expect(html).toContain("<strong>-</strong>");
  });

  it("escapes history and comparison fields", () => {
    const html = generateHtmlReport(reportPayload(), new Date(2026, 5, 17, 12, 30, 0), {
      comparison: comparison({
        previousExecutionId: '<script>alert("comparison")</script>'
      }),
      history: [
        historyEntry({
          executionId: "<script>history</script>",
          appliedFilters: {
            tag: '<img src=x onerror="alert(1)">'
          },
          reportJsonPath: "<unsafe-json>",
          reportHtmlPath: "<unsafe-html>"
        })
      ]
    });

    expect(html).toContain("&lt;script&gt;alert(&quot;comparison&quot;)&lt;/script&gt;");
    expect(html).toContain("&lt;script&gt;history&lt;/script&gt;");
    expect(html).toContain("tag=&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<img src=x");
  });

  it("renders applied filters and execution duration from a report payload", () => {
    const executionDate = new Date(2026, 5, 17, 12, 30, 0);
    const html = generateHtmlReport(
      {
        executionId: "2026-06-17_12-30-00",
        executedAt: executionDate.toISOString(),
        appliedFilters: {
          priority: "Critical",
          tag: ["Compra", "PCD"]
        },
        summary: {
          totalScenarios: 2,
          passCount: 1,
          failCount: 1,
          errorCount: 0,
          successRate: 50,
          avgScore: 2.5,
          avgResponseTimeMs: 15,
          durationMs: 245
        },
        results
      },
      executionDate
    );

    expect(html).toContain("Filters: priority=Critical, tag=Compra, PCD");
    expect(html).toContain('<span class="kpi-label">Execution Duration</span>');
    expect(html).toContain('<strong class="kpi-value">245 ms</strong>');
  });

  it("renders chart canvases and embedded chart data", () => {
    const html = generateHtmlReport(results, new Date(2026, 5, 17, 12, 30, 0));

    expect(html).toContain('id="statusChart"');
    expect(html).toContain('id="statusCategoryChart"');
    expect(html).toContain("Status by Category");
    expect(html).toContain("Scenarios by Category");
    expect(html).toContain("Score Distribution");
    expect(html).toContain("All categories have only 1 scenario.");
    expect(html).toContain('id="scoreDistributionChart"');
    expect(html).toContain('"labels":["PASS","FAIL","ERROR"]');
    expect(html).toContain('"statusByCategory"');
    expect(html).toContain('"label":"PASS"');
    expect(html).toContain('"label":"FAIL"');
    expect(html).toContain('"labels":["2/3","3/3"]');
    expect(html).toContain('"values":[1,1]');
    expect(html).toContain('"legendDisplay":false');
  });

  it("renders safe insights", () => {
    const html = generateHtmlReport(results, new Date(2026, 5, 17, 12, 30, 0));

    expect(html).toContain("<h2>Insights</h2>");
    expect(html).toContain("Quality Failures");
    expect(html).toContain("1 scenario(s) failed quality validations.");
    expect(html).toContain("Technical Errors");
    expect(html).toContain("No technical/provider/configuration errors detected.");
    expect(html).toContain("Highest FAIL Category");
    expect(html).toContain("Compra (1 FAIL)");
    expect(html).toContain("Most Affected Validator");
    expect(html).toContain("Entity (1 FAIL)");
    expect(html).toContain("Success Rate");
    expect(html).toContain("50% overall success rate.");
  });

  it("renders interactive table controls", () => {
    const html = generateHtmlReport(results, new Date(2026, 5, 17, 12, 30, 0));

    expect(html).toContain('id="idSearch"');
    expect(html).toContain('id="categorySearch"');
    expect(html).toContain('id="statusFilter"');
    expect(html).toContain('id="pageSize"');
    expect(html).toContain('id="prevPage"');
    expect(html).toContain('id="nextPage"');
    expect(html).toContain('data-sort="score"');
    expect(html).toContain('data-sort="priority"');
    expect(html).toContain('data-sort="severity"');
  });

  it("renders expandable scenario rows and details", () => {
    const html = generateHtmlReport(results, new Date(2026, 5, 17, 12, 30, 0));

    expect(html).toContain('class="scenario-row ');
    expect(html).toContain('data-expand="0"');
    expect(html).toContain('class="scenario-detail"');
    expect(html).toContain('<th data-sort="id">ID / Title</th>');
    expect(html).toContain("<td>Transferencia para especialista</td>");
    expect(html).toContain('<span class="metadata-badge priority-critical">Critical</span>');
    expect(html).toContain('<span class="metadata-badge severity-major">Major</span>');
    expect(html).toContain("<h3>Input</h3>");
    expect(html).toContain("<h3>Response</h3>");
    expect(html).toContain("<h3>Expected Criteria</h3>");
    expect(html).toContain("<h3>Validation Results</h3>");
    expect(html).toContain("<h3>Diagnostics</h3>");
    expect(html).toContain("<dt>Expected Regex</dt>");
    expect(html).toContain("(atendente|especialista|consultor)");
    expect(html).toContain("<dt>Expected Intent</dt>");
    expect(html).toContain("AtendimentoHumano");
    expect(html).toContain("<dt>Expected Entity</dt>");
    expect(html).toContain("Atendente");
    expect(html).toContain("<dt>Feature</dt>");
    expect(html).toContain("Atendimento Humano");
    expect(html).toContain("<dt>Requirement ID</dt>");
    expect(html).toContain("REQ-ATD-001");
    expect(html).toContain('<span class="tag-badge">Atendimento</span>');
    expect(html).toContain('<span class="tag-badge">Humano</span>');
    expect(html).toContain("<dt>Regex Status</dt>");
    expect(html).toContain("<dt>Error Message</dt>");
    expect(html).not.toContain("Entrada");
    expect(html).not.toContain("Resposta");
    expect(html).not.toContain("Critérios");
    expect(html).not.toContain("Resultado das Validações");
    expect(html).not.toContain("Diagnóstico");
  });

  it("renders smart all-pass insights and non-redundant chart messages", () => {
    const html = generateHtmlReport([results[0]], new Date(2026, 5, 17, 12, 30, 0));

    expect(html).toContain("All scenarios passed. 100%");
    expect(html).toContain("All scenarios passed. No failures detected.");
    expect(html).toContain("No technical errors detected.");
    expect(html).toContain("Average score is at maximum.");
    expect(html).not.toContain("Highest FAIL Category");
    expect(html).not.toContain("Most Affected Validator");
  });

  it("renders mock response time as not applicable and execution duration KPI", () => {
    const html = generateHtmlReport(results, new Date(2026, 5, 17, 12, 30, 0));

    expect(html).toContain("N/A (Mock Provider)");
    expect(html).toContain('<span class="kpi-label">Execution Duration</span>');
    expect(html).toContain('<strong class="kpi-value">0 ms</strong>');
  });

  it("highlights missing response errors", () => {
    const html = generateHtmlReport(
      [
        {
          ...results[0],
          actualResponse: "",
          regexStatus: "ERROR",
          intentStatus: "ERROR",
          entityStatus: "ERROR",
          overallStatus: "ERROR",
          score: 0,
          scorePercent: 0,
          errorType: "MISSING_RESPONSE",
          errorMessage: "Scenario executed with MockProvider but response field is missing."
        }
      ],
      new Date(2026, 5, 17, 12, 30, 0)
    );

    expect(html).toContain("missing-response-row");
    expect(html).toContain("MISSING_RESPONSE");
    expect(html).toContain("Scenario executed with MockProvider but response field is missing.");
  });

  it("renders long AI responses with preview and details", () => {
    const longResponse = "a".repeat(180);
    const html = generateHtmlReport(
      [
        {
          ...results[0],
          actualResponse: longResponse
        }
      ],
      new Date(2026, 5, 17, 12, 30, 0)
    );

    expect(html).toContain(`<div><dt>Full AI Response</dt><dd>${longResponse}</dd></div>`);
  });

  it("escapes dynamic text content", () => {
    const html = generateHtmlReport(
      [
        {
          id: "<script>",
          categoria: "Consulta",
          prompt: "prompt & response",
          actualResponse: "response <unsafe>",
          expected: "response",
          intent: "Consulta",
          entity: "unsafe",
          provider: "mock",
          model: "mock",
          responseTimeMs: 1,
          inputTokensApprox: 2,
          outputTokensApprox: 3,
          regexStatus: "PASS",
          intentStatus: "PASS",
          entityStatus: "PASS",
          overallStatus: "PASS",
          score: 3,
          scorePercent: 100,
          errorType: null,
          errorMessage: null
        }
      ],
      new Date(2026, 5, 17, 12, 30, 0)
    );

    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("prompt &amp; response");
    expect(html).toContain("response &lt;unsafe&gt;");
    expect(html).not.toContain("<td><script></td>");
  });
});
