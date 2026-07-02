import type { PromptScenario } from "../types";

export interface ImportRow {
  rowNumber: number;
  values: Record<string, string>;
}

export interface ImportError {
  rowNumber: number;
  message: string;
}

export interface ImportSummary {
  totalRows: number;
  imported: number;
  ignored: number;
  errors: ImportError[];
  scenarios: PromptScenario[];
}
