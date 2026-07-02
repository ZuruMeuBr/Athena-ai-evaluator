import { resolve } from "node:path";
import { importScenarios } from "./scenarioImporter";

function printSummary(totalRows: number, imported: number, ignored: number, errors: Array<{ rowNumber: number; message: string }>): void {
  console.log(`Total de linhas: ${totalRows}`);
  console.log(`Importados: ${imported}`);
  console.log(`Ignorados: ${ignored}`);
  console.log(`Erros encontrados: ${errors.length}`);

  for (const error of errors) {
    console.log(`Linha ${error.rowNumber}: ${error.message}`);
  }
}

async function main(): Promise<void> {
  const filePath = process.argv[2];

  if (filePath === undefined) {
    throw new Error("Informe o caminho do arquivo .xlsx ou .csv. Exemplo: npm run import -- arquivo.xlsx");
  }

  const summary = await importScenarios(resolve(process.cwd(), filePath), process.cwd());

  printSummary(summary.totalRows, summary.imported, summary.ignored, summary.errors);

  if (summary.errors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown import error";

  console.error(`Import failed: ${message}`);
  process.exitCode = 1;
});
