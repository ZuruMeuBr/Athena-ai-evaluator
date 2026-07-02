export type EvaluationStatus = "PASS" | "FAIL" | "ERROR";
export type ProviderName = "mock" | "gemini";

export interface ProviderMetrics {
  provider: ProviderName;
  model: string;
  responseTimeMs: number;
  inputTokensApprox: number;
  outputTokensApprox: number;
}

export interface ProviderResponse {
  text: string;
  metrics: ProviderMetrics;
}

export type ScenarioPriority = "Critical" | "High" | "Medium" | "Low";
export type ScenarioSeverity = "Blocker" | "Major" | "Minor" | "Trivial";
export type ScenarioType = "Smoke" | "Regression" | "Functional" | "Exploratory";

export interface ScenarioMetadata {
  title?: string;
  description?: string;
  priority?: ScenarioPriority;
  severity?: ScenarioSeverity;
  type?: ScenarioType;
  tags?: string[];
  feature?: string;
  requirementId?: string;
  author?: string;
  version?: string;
}

export interface PromptScenario extends ScenarioMetadata {
  id: string;
  categoria: string;
  prompt: string;
  response?: string;
  expected: string;
  intent: string;
  entity: string;
}

export interface EvaluationResult extends ScenarioMetadata {
  id: string;
  categoria?: string;
  prompt: string;
  actualResponse: string;
  expected: string;
  intent?: string;
  entity?: string;
  provider: ProviderName;
  model: string;
  responseTimeMs: number;
  inputTokensApprox: number;
  outputTokensApprox: number;
  regexStatus: EvaluationStatus;
  intentStatus: EvaluationStatus;
  entityStatus: EvaluationStatus;
  overallStatus: EvaluationStatus;
  score: number;
  scorePercent: number;
  errorType: string | null;
  errorMessage: string | null;
}
