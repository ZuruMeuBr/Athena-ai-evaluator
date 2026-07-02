import type { EvaluationResult } from "./types";

export function printResults(results: EvaluationResult[]): void {
  for (const result of results) {
    console.log(`${result.overallStatus} ${result.id}`);
  }
}
