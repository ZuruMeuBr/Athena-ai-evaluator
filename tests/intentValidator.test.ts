import { containsExpectedIntent } from "../validators/intentValidator";

describe("containsExpectedIntent", () => {
  it("returns true when the normalized intent name is present in the response", () => {
    expect(containsExpectedIntent("Fluxo de Atendimento Humano confirmado.", "AtendimentoHumano")).toBe(true);
  });

  it.each([
    ["AtendimentoHumano", "Vou transferir você para um atendente especializado."],
    ["AtendimentoHumano", "Um consultor humano vai continuar o atendimento."],
    ["ListaInteresse", "Adicionei seu interesse pelo Corolla híbrido na lista."],
    ["ListaInteresse", "Cadastrei seu interesse na lista."],
    ["Revisao", "Vamos realizar o agendamento da revisão do veículo."],
    ["Revisao", "A manutenção pode ser marcada amanhã."],
    ["Compra", "Posso iniciar sua jornada de compra para veículo PCD."],
    ["Ofertas", "Temos condições especiais para SUV."],
    ["Agendamento", "Vamos agendar seu test drive."],
    ["Consulta", "Vou consultar o status do seu pedido."],
    ["Fotos", "Vou enviar as imagens disponíveis do Onix."]
  ])("returns true for alias of %s", (intent, response) => {
    expect(containsExpectedIntent(response, intent)).toBe(true);
  });

  it("returns false when neither intent nor aliases are present", () => {
    expect(containsExpectedIntent("Resposta sem nenhum termo relacionado.", "AtendimentoHumano")).toBe(false);
  });

  it("returns true when no intent expectation is provided", () => {
    expect(containsExpectedIntent("Resposta antiga sem intenção configurada.")).toBe(true);
  });
});
