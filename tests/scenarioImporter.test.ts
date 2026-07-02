import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as XLSX from "xlsx";
import {
  importScenarios,
  readImportRows,
  validateAndBuildScenarios,
  writeImportedScenarios
} from "../src/import/scenarioImporter";
import type { ImportRow } from "../src/import/types";

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), "llm-evaluator-import-"));
}

describe("scenarioImporter", () => {
  it("validates rows, ignores empty rows and reports duplicate ids", () => {
    const rows: ImportRow[] = [
      {
        rowNumber: 2,
        values: {
          id: "ofertas-001",
          categoria: "Ofertas",
          prompt: "quais ofertas voces tem?",
          expected: "ofertas",
          intent: "Ofertas",
          entity: "SUV"
        }
      },
      {
        rowNumber: 3,
        values: {
          id: "ofertas-001",
          categoria: "Ofertas",
          prompt: "duplicado",
          expected: "ofertas",
          intent: "Ofertas",
          entity: "SUV"
        }
      },
      {
        rowNumber: 4,
        values: {
          id: "",
          categoria: "",
          prompt: "",
          expected: "",
          intent: "",
          entity: ""
        }
      }
    ];

    const summary = validateAndBuildScenarios(rows);

    expect(summary.totalRows).toBe(3);
    expect(summary.imported).toBe(1);
    expect(summary.ignored).toBe(2);
    expect(summary.errors).toEqual([
      {
        rowNumber: 3,
        message: 'Duplicate id "ofertas-001" also found at row 2.'
      }
    ]);
  });

  it("reads CSV files and imports scenarios", async () => {
    const dir = createTempDir();

    try {
      const csvPath = join(dir, "cenarios.csv");
      writeFileSync(
        csvPath,
        [
          "id,title,description,categoria,priority,severity,type,tags,feature,requirementId,author,version,prompt,expected,intent,entity,response",
          "compra-001,Compra PCD,Jornada de compra,Compra,Critical,Major,Regression,PCD;Compra,Jornada de Compra,REQ-001,Caio Santos,1.0,quero comprar carro,comprar,Compra,carro,Resposta mock"
        ].join("\n"),
        "utf8"
      );

      const summary = await importScenarios(csvPath, dir);
      const prompts = JSON.parse(readFileSync(join(dir, "prompts.json"), "utf8")) as unknown[];
      const compra = JSON.parse(readFileSync(join(dir, "scenarios", "compra.json"), "utf8")) as unknown[];

      expect(summary.imported).toBe(1);
      expect(prompts).toHaveLength(1);
      expect(prompts[0]).toMatchObject({
        title: "Compra PCD",
        description: "Jornada de compra",
        priority: "Critical",
        severity: "Major",
        type: "Regression",
        tags: ["PCD", "Compra"],
        feature: "Jornada de Compra",
        requirementId: "REQ-001",
        author: "Caio Santos",
        version: "1.0"
      });
      expect(compra).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reads XLSX files", async () => {
    const dir = createTempDir();

    try {
      const xlsxPath = join(dir, "cenarios.xlsx");
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet([
        {
          id: "consulta-001",
          title: "Consulta de pedido",
          categoria: "Consulta",
          priority: "Medium",
          severity: "Minor",
          type: "Functional",
          tags: "Consulta,Pedido",
          feature: "Status do Pedido",
          requirementId: "REQ-002",
          prompt: "qual o status do pedido?",
          expected: "status",
          intent: "Consulta",
          entity: "pedido"
        }
      ]);

      XLSX.utils.book_append_sheet(workbook, worksheet, "Cenarios");
      XLSX.writeFile(workbook, xlsxPath);

      const rows = await readImportRows(xlsxPath);
      const summary = validateAndBuildScenarios(rows);

      expect(rows).toHaveLength(1);
      expect(summary.scenarios[0]).toMatchObject({
        id: "consulta-001",
        title: "Consulta de pedido",
        categoria: "Consulta",
        priority: "Medium",
        severity: "Minor",
        type: "Functional",
        tags: ["Consulta", "Pedido"],
        feature: "Status do Pedido",
        requirementId: "REQ-002"
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("blocks invalid schema data before writing prompts and category files", async () => {
    const dir = createTempDir();

    try {
      const csvPath = join(dir, "invalid.csv");
      writeFileSync(
        csvPath,
        [
          "id,categoria,priority,prompt,expected,intent,entity",
          "compra-001,Compra,Urgent,quero comprar carro,compra,Compra,carro"
        ].join("\n"),
        "utf8"
      );

      const summary = await importScenarios(csvPath, dir);

      expect(summary.imported).toBe(0);
      expect(summary.errors).toEqual([
        {
          rowNumber: 2,
          message:
            '[compra-001] priority: Must be one of: "Critical", "High", "Medium", "Low". Received: "Urgent".'
        }
      ]);
      expect(existsSync(join(dir, "prompts.json"))).toBe(false);
      expect(existsSync(join(dir, "scenarios"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes prompts.json and category files", async () => {
    const dir = createTempDir();

    try {
      await writeImportedScenarios(dir, [
        {
          id: "agendamento-001",
          categoria: "Agendamento",
          prompt: "agendar test drive",
          expected: "agendar",
          intent: "Agendamento",
          entity: "test drive"
        }
      ]);

      expect(JSON.parse(readFileSync(join(dir, "prompts.json"), "utf8"))).toHaveLength(1);
      expect(JSON.parse(readFileSync(join(dir, "scenarios", "agendamento.json"), "utf8"))).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
