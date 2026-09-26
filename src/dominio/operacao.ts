import { ApiError } from '@/api/client';
import type { DataISO, Decimal, TipoOperacao } from '@/api/tipos';
import { mensagemDeErro } from '@/utils/erros';
import { dataParaISOLocal, normalizarDecimal } from '@/utils/formatacao';

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

function decimalPositivo(entrada: string): Decimal | null {
  const decimal = normalizarDecimal(entrada);
  return decimal !== null && Number(decimal) > 0 ? decimal : null;
}

export function validarOperacao(form: FormOperacao, hoje: Date = new Date()): ResultadoValidacaoOperacao {
  const erros: ErrosOperacao = {};
  const ticker = form.ticker.trim().toUpperCase();
  const quantidade = decimalPositivo(form.quantidade);
  const precoUnitario = decimalPositivo(form.precoUnitario);
  const data = dataParaISOLocal(form.data);

  if (!ticker) erros.ticker = 'Informe o ticker do ativo';
  if (quantidade === null) erros.quantidade = 'Informe uma quantidade maior que zero';
  if (precoUnitario === null) erros.precoUnitario = 'Informe um preço maior que zero';
  // Strings AAAA-MM-DD comparam na mesma ordem que as datas.
  if (data > dataParaISOLocal(hoje)) erros.data = 'A data não pode ser futura';

  if (!ticker || quantidade === null || precoUnitario === null || erros.data) return { ok: false, erros };
  return { ok: true, dados: { ticker, tipo: form.tipo, quantidade, precoUnitario, data } };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** O backend converte QuantidadeInsuficienteError(ativo_id) em string: o `detail` do 422 é só o UUID. */
export function mensagemErroOperacao(erro: unknown, contexto: 'registrar' | 'remover'): string {
  if (erro instanceof ApiError && erro.status === 422 && UUID.test(erro.message.trim())) {
    return contexto === 'registrar'
      ? 'Quantidade insuficiente em carteira para esta venda na data informada.'
      : 'Esta operação não pode ser removida: uma venda posterior ficaria sem saldo em carteira.';
  }
  return mensagemDeErro(erro);
}
