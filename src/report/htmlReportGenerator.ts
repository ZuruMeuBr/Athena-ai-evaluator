import type { EvaluationResult, EvaluationStatus } from "../types";
import {
  buildReportViewModel,
  escapeHtml,
  type ComparisonViewModel,
  type ExecutionHistoryViewModel,
  type ExecutionInfoViewModel,
  type QualityGateViewModel,
  type SafeScenarioViewModel
} from "../reportViewModel";
import type { ExecutionHistoryEntry, ExecutionReportPayload } from "../reportWriter";
import type { ExecutionComparisonReport } from "../reportComparison";
import { formatDuration } from "./reportFormatters";
import { reportLabels } from "./reportLabels";

type HtmlReportInput = EvaluationResult[] | Partial<ExecutionReportPayload>;

export interface HtmlReportContext {
  history?: ExecutionHistoryEntry[] | unknown;
  comparison?: ExecutionComparisonReport | null | unknown;
}

function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replaceAll("</", "<\\/");
}

function getCurrentReport(input: HtmlReportInput, executionDate: Date): Partial<ExecutionReportPayload> {
  if (Array.isArray(input)) {
    return {
      executedAt: executionDate.toISOString(),
      appliedFilters: {},
      results: input
    };
  }

  return input;
}

function statusBadge(status: EvaluationStatus): string {
  const className =
    status === "PASS" ? "status status-pass" : status === "ERROR" ? "status status-error" : "status status-fail";

  return `<span class="${className}">${status}</span>`;
}

function metadataBadge(value: string | undefined, kind: "priority" | "severity"): string {
  if (value === undefined || value === "-") {
    return "-";
  }

  return `<span class="metadata-badge ${kind}-${escapeHtml(value.toLowerCase())}">${escapeHtml(value)}</span>`;
}

function renderTags(tags: string[] | undefined): string {
  if (tags === undefined || tags.length === 0) {
    return "-";
  }

  return tags.map((tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join(" ");
}

function getOptionalResultField(result: SafeScenarioViewModel, field: string): string {
  const value = (result as unknown as Record<string, unknown>)[field];

  return typeof value === "string" && value.trim() !== "" ? value : "-";
}

function renderExpandableText(value: string): string {
  const previewLength = 150;

  if (value.length <= previewLength) {
    return `<span>${escapeHtml(value)}</span>`;
  }

  const preview = value.slice(0, previewLength);

  return `<div class="response-preview">
              <span>${escapeHtml(preview)}...</span>
              <details>
                <summary>${reportLabels.showMore}</summary>
                <p>${escapeHtml(value)}</p>
              </details>
            </div>`;
}

function renderKpiCard(label: string, value: string | number, tone = ""): string {
  const renderedValue = typeof value === "number" ? String(value) : escapeHtml(value);

  return `<article class="kpi-card ${tone}">
      <span class="kpi-label">${escapeHtml(label)}</span>
      <strong class="kpi-value">${renderedValue}</strong>
    </article>`;
}

function renderInsight(label: string, value: string): string {
  return `<article class="insight-card">
      <span>${label}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>`;
}

function renderChartCard(title: string, canvasId: string, message?: string): string {
  return `<article class="chart-card">
      <h2>${title}</h2>
      ${
        message === undefined
          ? `<canvas id="${canvasId}"></canvas>`
          : `<div class="chart-message">${escapeHtml(message)}</div>`
      }
    </article>`;
}

function renderInfoItem(label: string, value: string | number): string {
  const renderedValue = typeof value === "number" ? String(value) : escapeHtml(value);

  return `<div class="info-item">
      <span>${escapeHtml(label)}</span>
      <strong>${renderedValue}</strong>
    </div>`;
}

function renderExecutionInfo(info: ExecutionInfoViewModel): string {
  return `<section class="section-card" aria-label="Execution information">
      <h2>${reportLabels.executionInfo}</h2>
      <div class="info-grid">
        ${renderInfoItem(reportLabels.executionId, info.executionId)}
        ${renderInfoItem(reportLabels.executedAt, info.executedAt)}
        ${renderInfoItem(reportLabels.provider, info.provider)}
        ${renderInfoItem(reportLabels.model, info.model)}
        ${renderInfoItem(reportLabels.appliedFilters, info.appliedFiltersLabel)}
        ${renderInfoItem(reportLabels.executionDuration, info.durationLabel)}
      </div>
    </section>`;
}

function qualityGateStatusBadge(status: string): string {
  const normalizedStatus = status.toLowerCase();
  const className =
    status === "PASSED"
      ? "status status-pass"
      : status === "FAILED"
        ? "status status-error"
        : "status status-disabled";

  return `<span class="${className}">${escapeHtml(normalizedStatus.toUpperCase())}</span>`;
}

function renderQualityGateSection(qualityGate: QualityGateViewModel): string {
  if (!qualityGate.enabled) {
    return `<section class="section-card" aria-label="Quality Gate">
      <h2>${reportLabels.qualityGate}</h2>
      <p class="section-note">${escapeHtml(qualityGate.message)}</p>
      ${qualityGateStatusBadge(qualityGate.status)}
    </section>`;
  }

  return `<section class="section-card" aria-label="Quality Gate">
      <h2>${reportLabels.qualityGate}</h2>
      <p class="section-note">${escapeHtml(qualityGate.message)} ${qualityGateStatusBadge(qualityGate.status)}</p>
      <div class="quality-gate-grid">
        ${qualityGate.metrics
          .map(
            (metric) => `<article class="info-item">
              <span>${escapeHtml(metric.label)}</span>
              <strong>${escapeHtml(metric.actual)} / ${escapeHtml(metric.expected)}</strong>
              ${qualityGateStatusBadge(metric.status)}
            </article>`
          )
          .join("")}
      </div>
      ${qualityGate.warnings.map((warning) => `<p class="quality-gate-warning">${escapeHtml(warning)}</p>`).join("")}
    </section>`;
}

function renderComparisonSection(comparison: ComparisonViewModel): string {
  if (!comparison.available) {
    return `<section class="section-card" aria-label="Comparison with previous execution">
        <h2>${reportLabels.comparison}</h2>
        <div class="empty-dashboard-message">${escapeHtml(comparison.message)}</div>
      </section>`;
  }

  return `<section class="section-card" aria-label="Comparison with previous execution">
      <h2>${reportLabels.comparison}</h2>
      <p class="section-note">${escapeHtml(comparison.message)}</p>
      ${comparison.scopeWarning === null ? "" : `<p class="comparison-scope-warning">${escapeHtml(comparison.scopeWarning)}</p>`}
      <div class="comparison-grid">
        ${comparison.metrics.map((metric) => renderKpiCard(metric.label, metric.value)).join("")}
      </div>
    </section>`;
}

function renderHistoryRows(history: ExecutionHistoryViewModel[]): string {
  if (history.length === 0) {
    return `<tr>
        <td colspan="9" class="empty-state">${reportLabels.noExecutionHistory}</td>
      </tr>`;
  }

  return history
    .map(
      (entry) => `<tr>
        <td>${escapeHtml(entry.executionId)}</td>
        <td>${escapeHtml(entry.executedAt)}</td>
        <td>${entry.totalScenarios}</td>
        <td>${entry.passCount}</td>
        <td>${entry.failCount}</td>
        <td>${entry.errorCount}</td>
        <td>${entry.successRate}%</td>
        <td>${entry.avgScore}/3</td>
        <td>${escapeHtml(entry.appliedFiltersLabel)}</td>
      </tr>`
    )
    .join("");
}

function renderHistorySection(history: ExecutionHistoryViewModel[], historyMessage: string): string {
  return `<section class="section-card" aria-label="Execution history">
      <h2>${reportLabels.executionHistory}</h2>
      <details class="history-details" id="historyDetails">
        <summary id="historySummary">${reportLabels.showHistory}</summary>
        ${history.length === 0 ? `<p class="section-note">${escapeHtml(historyMessage)}</p>` : ""}
        <div class="history-table-wrapper">
          <table class="history-table">
            <thead>
              <tr>
                <th>${reportLabels.executionId}</th>
                <th>${reportLabels.executedAt}</th>
                <th>${reportLabels.totalScenarios}</th>
                <th>${reportLabels.pass}</th>
                <th>${reportLabels.fail}</th>
                <th>${reportLabels.error}</th>
                <th>${reportLabels.successRate}</th>
                <th>${reportLabels.averageScore}</th>
                <th>${reportLabels.appliedFilters}</th>
              </tr>
            </thead>
            <tbody>${renderHistoryRows(history)}</tbody>
          </table>
        </div>
      </details>
    </section>`;
}

function renderRows(results: SafeScenarioViewModel[]): string {
  if (results.length === 0) {
    return `
          <tr>
            <td colspan="11" class="empty-state">${reportLabels.noScenariosExecuted}</td>
          </tr>`;
  }

  return results
    .map((result, index) => {
      const category = result.categoria;
      const rowClass = result.errorType === "MISSING_RESPONSE" ? "missing-response-row" : "";

      return `
          <tr class="scenario-row ${rowClass}" data-index="${index}" data-category="${escapeHtml(category)}" data-status="${result.overallStatus}" data-id="${escapeHtml(result.id)}">
            <td><button class="expand-button" type="button" data-expand="${index}">+</button></td>
            <td>${escapeHtml(result.title)}</td>
            <td>${escapeHtml(category)}</td>
            <td>${metadataBadge(result.priority, "priority")}</td>
            <td>${metadataBadge(result.severity, "severity")}</td>
            <td>${escapeHtml(result.provider)}</td>
            <td>${escapeHtml(result.model)}</td>
            <td>${result.responseTimeMs}</td>
            <td>${statusBadge(result.overallStatus)}</td>
            <td>${result.score}/3</td>
            <td>${escapeHtml(result.errorType ?? "-")}</td>
          </tr>
          <tr class="scenario-detail" data-detail="${index}" hidden>
            <td colspan="11">
              <div class="diagnostic-grid">
                <section>
                  <h3>${reportLabels.input}</h3>
                  <dl>
                    <div><dt>${reportLabels.fullPrompt}</dt><dd>${escapeHtml(result.prompt)}</dd></div>
                    <div><dt>ID</dt><dd>${escapeHtml(result.id)}</dd></div>
                    <div><dt>Title</dt><dd>${escapeHtml(result.title)}</dd></div>
                    <div><dt>Description</dt><dd>${escapeHtml(result.description)}</dd></div>
                  </dl>
                </section>
                <section>
                  <h3>${reportLabels.response}</h3>
                  <dl>
                    <div><dt>${reportLabels.fullAiResponse}</dt><dd>${escapeHtml(result.actualResponse)}</dd></div>
                    <div><dt>${reportLabels.inputTokens}</dt><dd>${result.inputTokensApprox}</dd></div>
                    <div><dt>${reportLabels.outputTokens}</dt><dd>${result.outputTokensApprox}</dd></div>
                  </dl>
                </section>
                <section>
                  <h3>${reportLabels.expectedCriteria}</h3>
                  <dl>
                    <div><dt>${reportLabels.expectedRegex}</dt><dd>${escapeHtml(getOptionalResultField(result, "expected"))}</dd></div>
                    <div><dt>${reportLabels.expectedIntent}</dt><dd>${escapeHtml(getOptionalResultField(result, "intent"))}</dd></div>
                    <div><dt>${reportLabels.expectedEntity}</dt><dd>${escapeHtml(getOptionalResultField(result, "entity"))}</dd></div>
                    <div><dt>${reportLabels.feature}</dt><dd>${escapeHtml(result.feature)}</dd></div>
                    <div><dt>${reportLabels.requirementId}</dt><dd>${escapeHtml(result.requirementId)}</dd></div>
                    <div><dt>${reportLabels.tags}</dt><dd>${renderTags(result.tags)}</dd></div>
                  </dl>
                </section>
                <section>
                  <h3>${reportLabels.validationResults}</h3>
                  <dl>
                    <div><dt>${reportLabels.regexStatus}</dt><dd>${statusBadge(result.regexStatus)}</dd></div>
                    <div><dt>${reportLabels.intentStatus}</dt><dd>${statusBadge(result.intentStatus)}</dd></div>
                    <div><dt>${reportLabels.entityStatus}</dt><dd>${statusBadge(result.entityStatus)}</dd></div>
                    <div><dt>${reportLabels.overallStatus}</dt><dd>${statusBadge(result.overallStatus)}</dd></div>
                    <div><dt>${reportLabels.score}</dt><dd>${result.score}/3 (${result.scorePercent}%)</dd></div>
                  </dl>
                </section>
                <section>
                  <h3>${reportLabels.diagnostics}</h3>
                  <dl>
                    <div><dt>${reportLabels.errorType}</dt><dd>${escapeHtml(result.errorType)}</dd></div>
                    <div><dt>${reportLabels.errorMessage}</dt><dd>${escapeHtml(result.diagnosticMessage)}</dd></div>
                  </dl>
                </section>
              </div>
            </td>
          </tr>`;
    })
    .join("");
}

export function generateHtmlReport(input: HtmlReportInput, executionDate = new Date(), context: HtmlReportContext = {}): string {
  const currentReport = getCurrentReport(input, executionDate);
  const viewModel = buildReportViewModel({
    currentReport,
    history: context.history,
    comparison: context.comparison
  });
  const summary = viewModel.summary;
  const chartData = viewModel.chartData;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${reportLabels.title}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      color-scheme: light;
      --background: #f5f7fb;
      --surface: #ffffff;
      --surface-soft: #f8fafc;
      --text: #172033;
      --muted: #667085;
      --border: #d9e1ec;
      --pass-bg: #dcfce7;
      --pass-text: #166534;
      --fail-bg: #fef3c7;
      --fail-text: #92400e;
      --error-bg: #fee2e2;
      --error-text: #991b1b;
      --accent: #2563eb;
      --shadow: 0 16px 40px rgba(16, 24, 40, 0.08);
    }

    body.dark {
      color-scheme: dark;
      --background: #0f172a;
      --surface: #111827;
      --surface-soft: #1f2937;
      --text: #f8fafc;
      --muted: #cbd5e1;
      --border: #334155;
      --shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--background);
      color: var(--text);
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.5;
    }

    main {
      width: min(1440px, calc(100% - 32px));
      margin: 32px auto;
    }

    .topbar {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
    }

    h1,
    h2 {
      margin: 0;
    }

    h1 {
      font-size: 32px;
    }

    h2 {
      margin-bottom: 14px;
      font-size: 20px;
    }

    .execution-date {
      margin: 8px 0 0;
      color: var(--muted);
    }

    .theme-toggle,
    .expand-button,
    .pagination button {
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      color: var(--text);
      cursor: pointer;
      font: inherit;
    }

    .theme-toggle {
      padding: 10px 14px;
      font-weight: 700;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }

    .kpi-card,
    .chart-card,
    .insight-card,
    .section-card,
    .table-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: var(--shadow);
    }

    .kpi-card {
      padding: 18px;
    }

    .section-card {
      margin-bottom: 24px;
      padding: 18px;
    }

    .section-note {
      margin: 0 0 14px;
      color: var(--muted);
      font-weight: 700;
    }

    .info-grid,
    .comparison-grid,
    .quality-gate-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }

    .info-item {
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface-soft);
      padding: 14px;
    }

    .info-item span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .info-item strong {
      display: block;
      margin-top: 8px;
      overflow-wrap: anywhere;
      font-size: 16px;
    }

    .history-table-wrapper {
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: 8px;
    }

    .history-table {
      min-width: 1080px;
    }

    .history-details summary {
      display: inline-flex;
      margin-bottom: 14px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface-soft);
      color: var(--text);
      cursor: pointer;
      padding: 10px 14px;
      font-weight: 700;
    }

    .kpi-label {
      display: block;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .kpi-value {
      display: block;
      margin-top: 8px;
      font-size: 30px;
    }

    .kpi-pass .kpi-value {
      color: var(--pass-text);
    }

    .kpi-fail .kpi-value {
      color: var(--fail-text);
    }

    .kpi-error .kpi-value {
      color: var(--error-text);
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .chart-card {
      min-height: 320px;
      padding: 18px;
    }

    .chart-card canvas {
      max-height: 250px;
    }

    .chart-message {
      display: grid;
      min-height: 220px;
      place-items: center;
      border: 1px dashed var(--border);
      border-radius: 8px;
      color: var(--muted);
      font-size: 18px;
      font-weight: 700;
      text-align: center;
    }

    .insights-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }

    .insight-card {
      padding: 16px;
    }

    .insight-card span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .insight-card strong {
      display: block;
      margin-top: 8px;
      font-size: 18px;
    }

    .table-card {
      padding: 16px;
    }

    .table-toolbar {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 14px;
    }

    .table-toolbar input,
    .table-toolbar select,
    .table-toolbar button {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      color: var(--text);
      padding: 10px;
      font: inherit;
    }

    .table-toolbar button {
      cursor: pointer;
      font-weight: 700;
    }

    .table-wrapper {
      max-height: 680px;
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: 8px;
    }

    table {
      width: 100%;
      min-width: 1280px;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }

    th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--surface-soft);
      color: var(--muted);
      cursor: pointer;
      font-size: 12px;
      text-transform: uppercase;
      user-select: none;
    }

    .status {
      display: inline-flex;
      justify-content: center;
      min-width: 56px;
      border-radius: 999px;
      padding: 3px 10px;
      font-size: 12px;
      font-weight: 700;
    }

    .status-pass {
      background: var(--pass-bg);
      color: var(--pass-text);
    }

    .status-fail {
      background: var(--fail-bg);
      color: var(--fail-text);
    }

    .status-error {
      background: var(--error-bg);
      color: var(--error-text);
    }

    .status-disabled {
      background: var(--surface-soft);
      color: var(--muted);
      border: 1px solid var(--border);
    }

    .quality-gate-warning,
    .comparison-scope-warning {
      margin: 14px 0 0;
      color: var(--fail-text);
      font-weight: 700;
    }

    .comparison-scope-warning {
      margin: 0 0 14px;
      border: 1px solid var(--fail-text);
      border-radius: 8px;
      background: var(--fail-background);
      padding: 12px;
    }

    .metadata-badge,
    .tag-badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 3px 10px;
      font-size: 12px;
      font-weight: 700;
    }

    .priority-critical,
    .severity-blocker,
    .severity-critical {
      background: #fee2e2;
      color: #991b1b;
    }

    .priority-high,
    .severity-major {
      background: #ffedd5;
      color: #9a3412;
    }

    .priority-medium,
    .severity-minor {
      background: #fef3c7;
      color: #92400e;
    }

    .priority-low {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .tag-badge {
      margin: 0 4px 4px 0;
      background: var(--surface-soft);
      color: var(--text);
      border: 1px solid var(--border);
    }

    .missing-response-row td {
      background: #fff7ed;
    }

    body.dark .missing-response-row td {
      background: #422006;
    }

    .response-preview {
      max-width: 360px;
    }

    .response-preview summary {
      display: inline-flex;
      width: fit-content;
      margin-top: 8px;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 4px 10px;
      background: var(--surface);
      color: var(--text);
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
    }

    .response-preview p,
    .scenario-detail dd {
      white-space: pre-wrap;
    }

    .scenario-detail td {
      background: var(--surface-soft);
    }

    .diagnostic-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .diagnostic-grid section {
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      padding: 14px;
    }

    .diagnostic-grid h3 {
      margin: 0 0 10px;
      font-size: 15px;
    }

    .scenario-detail dl {
      margin: 0;
    }

    .scenario-detail dt {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .scenario-detail dd {
      margin: 4px 0 0;
    }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 12px;
    }

    .pagination button {
      padding: 8px 12px;
    }

    .empty-state {
      color: var(--muted);
      text-align: center;
    }

    .empty-dashboard-message {
      margin-bottom: 24px;
      border: 1px dashed var(--border);
      border-radius: 8px;
      background: var(--surface);
      color: var(--muted);
      padding: 16px;
      font-weight: 700;
      text-align: center;
    }

    @media (max-width: 1100px) {
      .kpi-grid,
      .charts-grid,
      .insights-grid,
      .info-grid,
      .comparison-grid,
      .quality-gate-grid,
      .table-toolbar {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      main {
        width: min(100% - 20px, 1440px);
        margin: 20px auto;
      }

      .topbar {
        flex-direction: column;
      }

      .kpi-grid,
      .charts-grid,
      .insights-grid,
      .info-grid,
      .comparison-grid,
      .quality-gate-grid,
      .table-toolbar,
      .diagnostic-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main>
    <header class="topbar">
      <div>
        <h1>${reportLabels.title}</h1>
        <p class="execution-date">${reportLabels.executionDate}: ${escapeHtml(viewModel.executionInfo.executedAt)} | ${reportLabels.provider}: ${escapeHtml(summary.provider)} | ${reportLabels.model}: ${escapeHtml(summary.model)} | ${reportLabels.filters}: ${escapeHtml(summary.appliedFiltersLabel)}</p>
      </div>
      <button class="theme-toggle" id="themeToggle" type="button">${reportLabels.darkMode}</button>
    </header>

    ${renderExecutionInfo(viewModel.executionInfo)}

    ${renderQualityGateSection(viewModel.qualityGate)}

    ${renderComparisonSection(viewModel.comparison)}

    ${renderHistorySection(viewModel.history, viewModel.historyMessage)}

    <section aria-label="Summary">
      <h2>${reportLabels.summary}</h2>
      <div class="kpi-grid">
        ${renderKpiCard(reportLabels.totalScenarios, summary.totalScenarios)}
        ${renderKpiCard(reportLabels.pass, summary.passCount, "kpi-pass")}
        ${renderKpiCard(reportLabels.fail, summary.failCount, "kpi-fail")}
        ${renderKpiCard(reportLabels.error, summary.errorCount, "kpi-error")}
        ${renderKpiCard(reportLabels.missingResponses, summary.missingResponseCount)}
        ${renderKpiCard(reportLabels.successRate, `${summary.successRate}%`)}
        ${renderKpiCard(reportLabels.averageScore, `${summary.averageScore}/3`)}
        ${renderKpiCard(
          reportLabels.averageResponseTime,
          summary.provider.toLowerCase() === "mock" ? reportLabels.mockResponseTime : formatDuration(summary.averageResponseTimeMs)
        )}
        ${renderKpiCard(reportLabels.executionDuration, formatDuration(summary.executionDurationMs))}
      </div>
    </section>

    ${
      summary.emptyStateMessage === null
        ? ""
        : `<section class="empty-dashboard-message">${escapeHtml(summary.emptyStateMessage)}</section>`
    }

    <section class="charts-grid" aria-label="Charts">
      ${renderChartCard(reportLabels.statusChart, "statusChart", chartData.status.message)}
      ${renderChartCard(reportLabels.statusByCategoryChart, "statusCategoryChart", chartData.statusByCategory.message)}
      ${renderChartCard(
        reportLabels.scenariosByCategoryChart,
        "scenarioCategoryChart",
        chartData.scenariosByCategory.message
      )}
      ${renderChartCard(reportLabels.scoreDistributionChart, "scoreDistributionChart", chartData.scoreDistribution.message)}
    </section>

    <section aria-label="Insights">
      <h2>${reportLabels.insights}</h2>
      <div class="insights-grid">
        ${viewModel.insights.map((insight) => renderInsight(insight.label, insight.value)).join("")}
      </div>
    </section>

    <section class="table-card" aria-label="Scenario table">
      <h2>${reportLabels.scenarios}</h2>
      <div class="table-toolbar">
        <input id="idSearch" type="search" placeholder="${reportLabels.searchById}">
        <input id="categorySearch" type="search" placeholder="${reportLabels.searchByCategory}">
        <select id="statusFilter">
          <option value="all">PASS / FAIL / ERROR</option>
          <option value="PASS">PASS</option>
          <option value="FAIL">FAIL</option>
          <option value="ERROR">ERROR</option>
        </select>
        <select id="pageSize">
          <option value="10">${reportLabels.pageSize10}</option>
          <option value="25">${reportLabels.pageSize25}</option>
          <option value="50">${reportLabels.pageSize50}</option>
          <option value="100">${reportLabels.pageSize100}</option>
        </select>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th data-sort="expand">${reportLabels.details}</th>
              <th data-sort="id">${reportLabels.idTitle}</th>
              <th data-sort="category">${reportLabels.category}</th>
              <th data-sort="priority">${reportLabels.priority}</th>
              <th data-sort="severity">${reportLabels.severity}</th>
              <th data-sort="provider">${reportLabels.provider}</th>
              <th data-sort="model">${reportLabels.model}</th>
              <th data-sort="time">${reportLabels.timeMs}</th>
              <th data-sort="overall">${reportLabels.overallStatus}</th>
              <th data-sort="score">${reportLabels.score}</th>
              <th data-sort="errorType">${reportLabels.errorType}</th>
            </tr>
          </thead>
          <tbody>${renderRows(viewModel.scenarios)}
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <button id="prevPage" type="button">${reportLabels.previous}</button>
        <span id="pageInfo"></span>
        <button id="nextPage" type="button">${reportLabels.next}</button>
      </div>
    </section>
  </main>

  <script>
    const chartData = ${jsonForScript(chartData)};

    function makeChart(id, type, labels, values, label) {
      const canvas = document.getElementById(id);
      if (!canvas || !window.Chart) return;
      new Chart(canvas, {
        type,
        data: {
          labels,
          datasets: [{
            label,
            data: values,
            backgroundColor: ["#16a34a", "#f59e0b", "#dc2626", "#2563eb", "#7c3aed", "#0891b2"]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false, position: "bottom" } },
          scales: type === "bar" ? { y: { beginAtZero: true } } : undefined
        }
      });
    }

    function makeStackedChart(id, labels, datasets) {
      const canvas = document.getElementById(id);
      if (!canvas || !window.Chart) return;
      new Chart(canvas, {
        type: "bar",
        data: {
          labels,
          datasets: datasets.map((dataset) => ({
            label: dataset.label,
            data: dataset.values,
            backgroundColor: dataset.color
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: datasets.length > 1, position: "bottom" } },
          scales: {
            x: { stacked: true },
            y: { beginAtZero: true, stacked: true }
          }
        }
      });
    }

    makeChart("statusChart", "pie", chartData.status.labels, chartData.status.values, "Status");
    makeStackedChart("statusCategoryChart", chartData.statusByCategory.labels, chartData.statusByCategory.datasets);
    makeChart("scenarioCategoryChart", "bar", chartData.scenariosByCategory.labels, chartData.scenariosByCategory.values, ${jsonForScript(reportLabels.scenarios)});
    makeChart("scoreDistributionChart", "bar", chartData.scoreDistribution.labels, chartData.scoreDistribution.values, ${jsonForScript(reportLabels.score)});

    const state = {
      page: 1,
      pageSize: 10,
      sortKey: "id",
      sortDirection: "asc"
    };

    const rows = [...document.querySelectorAll("tr.scenario-row")];
    const details = new Map([...document.querySelectorAll("tr.scenario-detail")].map((row) => [row.dataset.detail, row]));
    const idSearch = document.getElementById("idSearch");
    const categorySearch = document.getElementById("categorySearch");
    const statusFilter = document.getElementById("statusFilter");
    const pageSize = document.getElementById("pageSize");
    const pageInfo = document.getElementById("pageInfo");
    const historyDetails = document.getElementById("historyDetails");
    const historySummary = document.getElementById("historySummary");

    function rowValue(row, key) {
      const cells = row.children;
      const values = {
        id: cells[1]?.innerText ?? "",
        category: cells[2]?.innerText ?? "",
        priority: cells[3]?.innerText ?? "",
        severity: cells[4]?.innerText ?? "",
        provider: cells[5]?.innerText ?? "",
        model: cells[6]?.innerText ?? "",
        time: Number(cells[7]?.innerText ?? 0),
        overall: cells[8]?.innerText ?? "",
        score: cells[9]?.innerText ?? "",
        errorType: cells[10]?.innerText ?? ""
      };
      return values[key] ?? "";
    }

    function getFilteredRows() {
      const idTerm = idSearch.value.trim().toLowerCase();
      const categoryTerm = categorySearch.value.trim().toLowerCase();
      const status = statusFilter.value;

      return rows
        .filter((row) => row.dataset.id.toLowerCase().includes(idTerm))
        .filter((row) => row.dataset.category.toLowerCase().includes(categoryTerm))
        .filter((row) => status === "all" || row.dataset.status === status)
        .sort((left, right) => {
          const leftValue = rowValue(left, state.sortKey);
          const rightValue = rowValue(right, state.sortKey);
          const direction = state.sortDirection === "asc" ? 1 : -1;

          if (typeof leftValue === "number" && typeof rightValue === "number") {
            return (leftValue - rightValue) * direction;
          }

          return String(leftValue).localeCompare(String(rightValue)) * direction;
        });
    }

    function hideDetail(row) {
      const detail = details.get(row.dataset.index);
      if (detail) detail.hidden = true;
      const button = row.querySelector("[data-expand]");
      if (button) button.textContent = "+";
    }

    function renderTable() {
      const filteredRows = getFilteredRows();
      const totalPages = Math.max(1, Math.ceil(filteredRows.length / state.pageSize));
      state.page = Math.min(state.page, totalPages);
      const start = (state.page - 1) * state.pageSize;
      const visibleRows = new Set(filteredRows.slice(start, start + state.pageSize));

      for (const row of rows) {
        row.hidden = !visibleRows.has(row);
        if (row.hidden) hideDetail(row);
      }

      pageInfo.textContent = \`${reportLabels.page} \${state.page} ${reportLabels.of} \${totalPages} | \${filteredRows.length} ${reportLabels.scenarios}\`;
      document.getElementById("prevPage").disabled = state.page <= 1;
      document.getElementById("nextPage").disabled = state.page >= totalPages;
    }

    document.querySelectorAll("th[data-sort]").forEach((header) => {
      header.addEventListener("click", () => {
        const key = header.dataset.sort;
        if (key === "expand") return;
        state.sortDirection = state.sortKey === key && state.sortDirection === "asc" ? "desc" : "asc";
        state.sortKey = key;
        renderTable();
      });
    });

    document.querySelectorAll("[data-expand]").forEach((button) => {
      button.addEventListener("click", () => {
        const row = button.closest("tr");
        const detail = details.get(button.dataset.expand);
        if (!row || !detail) return;
        const shouldOpen = detail.hidden;
        detail.hidden = !shouldOpen;
        button.textContent = shouldOpen ? "-" : "+";
      });
    });

    [idSearch, categorySearch, statusFilter].forEach((control) => {
      control.addEventListener("input", () => {
        state.page = 1;
        renderTable();
      });
      control.addEventListener("change", () => {
        state.page = 1;
        renderTable();
      });
    });

    pageSize.addEventListener("change", () => {
      state.pageSize = Number(pageSize.value);
      state.page = 1;
      renderTable();
    });

    document.getElementById("prevPage").addEventListener("click", () => {
      state.page -= 1;
      renderTable();
    });

    document.getElementById("nextPage").addEventListener("click", () => {
      state.page += 1;
      renderTable();
    });

    document.getElementById("themeToggle").addEventListener("click", () => {
      document.body.classList.toggle("dark");
    });

    if (historyDetails && historySummary) {
      historyDetails.addEventListener("toggle", () => {
        historySummary.textContent = historyDetails.open ? ${jsonForScript(reportLabels.hideHistory)} : ${jsonForScript(reportLabels.showHistory)};
      });
    }

    renderTable();
  </script>
</body>
</html>
`;
}
