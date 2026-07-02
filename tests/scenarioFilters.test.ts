import {
  filterScenariosByMetadata,
  formatScenarioFilters,
  formatScenarioFiltersForConsole,
  hasScenarioFilters,
  parseScenarioFilters
} from "../src/cli/scenarioFilters";
import type { PromptScenario } from "../src/types";

const scenarios: PromptScenario[] = [
  {
    id: "compra-001",
    categoria: "Compra",
    priority: "Critical",
    severity: "Major",
    type: "Regression",
    tags: ["PCD", "Compra", "Regression"],
    feature: "Jornada de Compra",
    requirementId: "REQ-001",
    author: "Caio Santos",
    version: "1.0",
    prompt: "quero comprar carro pcd",
    expected: "compra",
    intent: "Compra",
    entity: "PCD",
    response: "compra PCD"
  },
  {
    id: "ofertas-001",
    categoria: "Ofertas",
    priority: "High",
    severity: "Minor",
    type: "Smoke",
    tags: ["SUV", "Ofertas"],
    feature: "Ofertas",
    requirementId: "REQ-002",
    author: "QA Team",
    version: "2.0",
    prompt: "quais ofertas?",
    expected: "ofertas",
    intent: "Ofertas",
    entity: "SUV",
    response: "ofertas SUV"
  }
];

const scenariosWithStringTags = [
  {
    ...scenarios[0],
    id: "compra-csv-tags",
    tags: "PCD, Compra, Regression"
  },
  {
    ...scenarios[1],
    id: "ofertas-semicolon-tags",
    tags: "SUV;Ofertas;Smoke"
  }
] as unknown as PromptScenario[];

describe("scenarioFilters", () => {
  it("parses the legacy positional category argument", () => {
    expect(parseScenarioFilters(["Compra"])).toEqual({
      category: ["Compra"]
    });
  });

  it("parses metadata filters and formats them for terminal output", () => {
    const filters = parseScenarioFilters(["--priority", "Critical", "--type", "Regression", "--tag", "PCD"]);

    expect(filters).toEqual({
      priority: ["Critical"],
      type: ["Regression"],
      tag: ["PCD"]
    });
    expect(formatScenarioFilters(filters)).toBe("priority=Critical, type=Regression, tag=PCD");
    expect(formatScenarioFiltersForConsole(filters)).toBe("priority=Critical\ntype=Regression\ntag=PCD");
  });

  it("supports inline flag values", () => {
    expect(parseScenarioFilters(["--requirementId=REQ-001", "--author=Caio Santos"])).toEqual({
      requirementId: ["REQ-001"],
      author: ["Caio Santos"]
    });
  });

  it("filters scenarios by combined metadata using case-insensitive matching", () => {
    const filters = parseScenarioFilters(["--priority", "critical", "--type", "regression", "--tag", "pcd"]);

    expect(filterScenariosByMetadata(scenarios, filters).map((scenario) => scenario.id)).toEqual(["compra-001"]);
  });

  it("filters by priority", () => {
    const filters = parseScenarioFilters(["--priority", "Critical"]);

    expect(filterScenariosByMetadata(scenarios, filters).map((scenario) => scenario.id)).toEqual(["compra-001"]);
  });

  it("filters by type", () => {
    const filters = parseScenarioFilters(["--type", "Regression"]);

    expect(filterScenariosByMetadata(scenarios, filters).map((scenario) => scenario.id)).toEqual(["compra-001"]);
  });

  it("filters by PCD tag", () => {
    const filters = parseScenarioFilters(["--tag", "PCD"]);

    expect(filterScenariosByMetadata(scenarios, filters).map((scenario) => scenario.id)).toEqual(["compra-001"]);
  });

  it("filters by Compra tag", () => {
    const filters = parseScenarioFilters(["--tag", "Compra"]);

    expect(filterScenariosByMetadata(scenarios, filters).map((scenario) => scenario.id)).toEqual(["compra-001"]);
  });

  it("requires all requested tags to be present in the scenario tags", () => {
    const matchingFilters = parseScenarioFilters(["--tag", "PCD", "--tag", "Regression"]);
    const missingFilters = parseScenarioFilters(["--tag", "PCD", "--tag", "SUV"]);

    expect(filterScenariosByMetadata(scenarios, matchingFilters).map((scenario) => scenario.id)).toEqual([
      "compra-001"
    ]);
    expect(filterScenariosByMetadata(scenarios, missingFilters)).toHaveLength(0);
  });

  it("supports scenario tags as comma-separated strings", () => {
    const filters = parseScenarioFilters(["--tag", "Compra"]);

    expect(filterScenariosByMetadata(scenariosWithStringTags, filters).map((scenario) => scenario.id)).toEqual([
      "compra-csv-tags"
    ]);
  });

  it("supports scenario tags as semicolon-separated strings", () => {
    const filters = parseScenarioFilters(["--tag", "SUV"]);

    expect(filterScenariosByMetadata(scenariosWithStringTags, filters).map((scenario) => scenario.id)).toEqual([
      "ofertas-semicolon-tags"
    ]);
  });

  it("supports tag filter values with comma-separated tags", () => {
    const filters = parseScenarioFilters(["--tag", "PCD,Compra"]);

    expect(filterScenariosByMetadata(scenarios, filters).map((scenario) => scenario.id)).toEqual(["compra-001"]);
  });

  it("filters by feature, requirement, author and version", () => {
    const filters = parseScenarioFilters([
      "--feature",
      "Compra",
      "--requirementId",
      "REQ-001",
      "--author",
      "caio santos",
      "--version",
      "1.0"
    ]);

    expect(filterScenariosByMetadata(scenarios, filters).map((scenario) => scenario.id)).toEqual(["compra-001"]);
  });

  it("matches feature filters using partial case-insensitive search", () => {
    const filters = parseScenarioFilters(["--feature", "compra"]);

    expect(filterScenariosByMetadata(scenarios, filters).map((scenario) => scenario.id)).toEqual(["compra-001"]);
  });

  it("detects whether filters were applied", () => {
    expect(hasScenarioFilters({})).toBe(false);
    expect(hasScenarioFilters({ category: ["Compra"] })).toBe(true);
  });

  it("throws for unknown filters and missing values", () => {
    expect(() => parseScenarioFilters(["--unknown", "value"])).toThrow('Unknown filter "--unknown".');
    expect(() => parseScenarioFilters(["--priority"])).toThrow("Missing value for --priority.");
  });
});
