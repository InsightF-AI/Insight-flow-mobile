import { ApiError } from '@/api/client';
import type { DataISO, Decimal, TipoOperacao } from '@/api/tipos';
import { mensagemDeErro } from '@/utils/erros';
import { dataParaISOLocal, formatarQuantidade, normalizarDecimal } from '@/utils/formatacao';

export interface FormOperacao {
  tipo: TipoOperacao;
  ticker: string;
  quantidade: string;
  precoUnitario: string;
  data: Date;
}

export type ErrosOperacao = Partial<Record<'ticker' | 'quantidade' | 'precoUnitario' | 'data', string>>;

export interface OperacaoValidada {
  ticker: string;
  tipo: TipoOperacao;
  quantidade: Decimal;
  precoUnitario: Decimal;
  data: DataISO;
}

export type ResultadoValidacaoOperacao = { ok: true; dados: OperacaoValidada } | { ok: false; erros: ErrosOperacao };

/** O backend grava quantidade e preço em Numeric(18, 6): mais casas seriam arredondadas em silêncio (e 0,0000001 vira 0). */
const MAXIMO_DE_CASAS_DECIMAIS = 6;
const MENSAGEM_CASAS_DECIMAIS = 'Use no máximo 6 casas decimais';

function casasDecimais(decimal: Decimal): number {
  const fracao = decimal.split('.')[1];
  return fracao ? fracao.replace(/0+$/, '').length : 0;
}

function decimalPositivo(entrada: string): Decimal | null {
  const decimal = normalizarDecimal(entrada);
  return decimal !== null && Number(decimal) > 0 ? decimal : null;
}

export interface RestricoesOperacao {
  /** Tickers que o usuário pode operar (watchlist e catálogo). Ausente = sem restrição. */
  tickersPermitidos?: readonly string[];
  /** Quantidade em carteira. Só limita venda feita hoje; null/ausente = desconhecida, o servidor decide. */
  disponivel?: number | null;
}

const TOLERANCIA_DA_QUANTIDADE = 1e-8;

export function validarOperacao(
  form: FormOperacao,
  hoje: Date = new Date(),
  restricoes: RestricoesOperacao = {},
): ResultadoValidacaoOperacao {
  const erros: ErrosOperacao = {};
  const ticker = form.ticker.trim().toUpperCase();
  const quantidade = decimalPositivo(form.quantidade);
  const precoUnitario = decimalPositivo(form.precoUnitario);
  const data = dataParaISOLocal(form.data);
  const dataDeHoje = dataParaISOLocal(hoje);

  if (!ticker) erros.ticker = 'Informe o ticker do ativo';
  else if (restricoes.tickersPermitidos && !restricoes.tickersPermitidos.some((t) => t.toUpperCase() === ticker)) {
    erros.ticker = 'Escolha um ativo da lista';
  }
  if (quantidade === null) erros.quantidade = 'Informe uma quantidade maior que zero';
  else if (casasDecimais(quantidade) > MAXIMO_DE_CASAS_DECIMAIS) erros.quantidade = MENSAGEM_CASAS_DECIMAIS;
  if (precoUnitario === null) erros.precoUnitario = 'Informe um preço maior que zero';
  else if (casasDecimais(precoUnitario) > MAXIMO_DE_CASAS_DECIMAIS) erros.precoUnitario = MENSAGEM_CASAS_DECIMAIS;
  // Strings AAAA-MM-DD comparam na mesma ordem que as datas.
  if (data > dataDeHoje) erros.data = 'A data não pode ser futura';

  // Venda feita hoje: a posição na data é a de agora. Com data passada ela pode ser outra e o servidor decide.
  const disponivel = restricoes.disponivel;
  if (
    form.tipo === 'VENDA' &&
    quantidade !== null &&
    !erros.quantidade &&
    data === dataDeHoje &&
    disponivel !== undefined &&
    disponivel !== null
  ) {
    if (disponivel <= TOLERANCIA_DA_QUANTIDADE) erros.quantidade = 'Sem posição em carteira neste ativo';
    else if (Number(quantidade) > disponivel + TOLERANCIA_DA_QUANTIDADE) {
      erros.quantidade = `Maior que a quantidade disponível (${formatarQuantidade(disponivel)})`;
    }
  }

  if (Object.keys(erros).length > 0 || quantidade === null || precoUnitario === null) return { ok: false, erros };
  return { ok: true, dados: { ticker, tipo: form.tipo, quantidade, precoUnitario, data } };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** O backend converte QuantidadeInsuficienteError(ativo_id) em string: o `detail` do 422 é só o UUID. */
export function mensagemErroOperacao(erro: unknown, contexto: 'registrar' | 'remover'): string {
  if (erro instanceof ApiError && erro.status === 422 && UUID.test(erro.message.trim())) {
    return contexto === 'registrar'
      ? 'Quantidade insuficiente em carteira: a venda deixaria o saldo negativo na data informada ou em uma venda posterior.'
      : 'Esta operação não pode ser removida: uma venda posterior ficaria sem saldo em carteira.';
  }
  return mensagemDeErro(erro);
}
