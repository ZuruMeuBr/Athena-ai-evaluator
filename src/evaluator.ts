import type { EvaluationResult, PromptScenario, ScenarioMetadata } from "./types";
import type { LLMProvider } from "../providers/LLMProvider";
import { classifyProviderError } from "./utils/providerError";
import { containsExpectedEntity } from "../validators/entityValidator";
import { containsExpectedIntent } from "../validators/intentValidator";
import { matchesExpectedRegex } from "../validators/regexValidator";
import type { ProviderName } from "./types";

function getScenarioMetadata(scenario: PromptScenario): ScenarioMetadata {
  const metadata: ScenarioMetadata = {};

  if (scenario.title !== undefined) metadata.title = scenario.title;
  if (scenario.description !== undefined) metadata.description = scenario.description;
  if (scenario.priority !== undefined) metadata.priority = scenario.priority;
  if (scenario.severity !== undefined) metadata.severity = scenario.severity;
  if (scenario.type !== undefined) metadata.type = scenario.type;
  if (scenario.tags !== undefined) metadata.tags = scenario.tags;
  if (scenario.feature !== undefined) metadata.feature = scenario.feature;
  if (scenario.requirementId !== undefined) metadata.requirementId = scenario.requirementId;
  if (scenario.author !== undefined) metadata.author = scenario.author;
  if (scenario.version !== undefined) metadata.version = scenario.version;

  return metadata;
}

export async function evaluateScenario(
  scenario: PromptScenario,
  provider: LLMProvider,
  providerName: ProviderName
): Promise<EvaluationResult> {
  let providerResponse;

  try {
    providerResponse = await provider.generateResponse(scenario.prompt);
  } catch (error: unknown) {
    const providerError = classifyProviderError(error);

    return {
      ...getScenarioMetadata(scenario),
      id: scenario.id,
      categoria: scenario.categoria,
      prompt: scenario.prompt,
      actualResponse: "",
      expected: scenario.expected,
      intent: scenario.intent,
      entity: scenario.entity,
      provider: providerName,
      model: "unknown",
      responseTimeMs: 0,
      inputTokensApprox: 0,
      outputTokensApprox: 0,
      regexStatus: "ERROR",
      intentStatus: "ERROR",
      entityStatus: "ERROR",
      overallStatus: "ERROR",
      score: 0,
      scorePercent: 0,
      errorType: providerError.code,
      errorMessage: providerError.message
    };
  }

  const actualResponse = providerResponse.text;
  const regexStatus = matchesExpectedRegex(actualResponse, scenario.expected) ? "PASS" : "FAIL";
  const intentStatus = containsExpectedIntent(actualResponse, scenario.intent) ? "PASS" : "FAIL";
  const entityStatus = containsExpectedEntity(actualResponse, scenario.entity) ? "PASS" : "FAIL";
  const overallStatus =
    regexStatus === "PASS" && intentStatus === "PASS" && entityStatus === "PASS" ? "PASS" : "FAIL";
  const score = [regexStatus, intentStatus, entityStatus].filter((status) => status === "PASS").length;
  const scorePercent = Math.floor((score / 3) * 100);

  return {
    ...getScenarioMetadata(scenario),
    id: scenario.id,
    categoria: scenario.categoria,
    prompt: scenario.prompt,
    actualResponse,
    expected: scenario.expected,
    intent: scenario.intent,
    entity: scenario.entity,
    provider: providerName,
    model: providerResponse.metrics.model,
    responseTimeMs: providerResponse.metrics.responseTimeMs,
    inputTokensApprox: providerResponse.metrics.inputTokensApprox,
    outputTokensApprox: providerResponse.metrics.outputTokensApprox,
    regexStatus,
    intentStatus,
    entityStatus,
    overallStatus,
    score,
    scorePercent,
    errorType: null,
    errorMessage: null
  };
}

export async function evaluateScenarios(
  scenarios: PromptScenario[],
  provider: LLMProvider,
  providerName: ProviderName
): Promise<EvaluationResult[]> {
  const results: EvaluationResult[] = [];

  for (const scenario of scenarios) {
    results.push(await evaluateScenario(scenario, provider, providerName));
  }

  return results;
}
