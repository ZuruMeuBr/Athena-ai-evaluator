const intentAliases: Record<string, string[]> = {
  agendamento: ["agendamento", "agendar", "agenda", "marcar", "test drive"],
  atendimentohumano: ["atendimento humano", "atendente", "especialista", "consultor", "humano"],
  compra: ["compra", "comprar", "jornada", "adquirir", "fechar negocio"],
  consulta: ["consulta", "consultar", "status", "pedido", "verificar"],
  fotos: ["fotos", "foto", "imagens", "imagem", "enviar fotos"],
  listainteresse: ["lista interesse", "lista", "interesse", "cadastro", "cadastrei", "adicionei"],
  ofertas: ["ofertas", "oferta", "condicoes especiais", "promocao", "desconto"],
  revisao: ["revisao", "revisão", "manutencao", "manutenção", "agendamento"]
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function containsExpectedIntent(actual: string, intent?: string): boolean {
  if (intent === undefined) {
    return true;
  }

  const normalizedActual = normalizeText(actual);
  const normalizedIntent = normalizeText(intent);
  const aliases = intentAliases[normalizedIntent] ?? [];
  const expectedTerms = [normalizedIntent, ...aliases.map(normalizeText)];

  return expectedTerms.some((term) => term !== "" && normalizedActual.includes(term));
}
