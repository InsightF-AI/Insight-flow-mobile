import type {
  Ativo,
  CotacaoAtual,
  ItemWatchlist,
  Notificacao,
  Posicao,
  Rentabilidade,
  ResultadoBacktest,
  Sinal,
  Uuid,
} from '@/api/tipos';
import { AVISO_IA } from '@/dominio/regulatorio';
import { formatarMoeda, formatarPercentual, paraNumero } from '@/utils/formatacao';

/** Watchlist em ordem alfabética de ticker: o backend não garante ordem e a tela não pode embaralhar a cada consulta. */
export function ordenarWatchlist(itens: ItemWatchlist[]): ItemWatchlist[] {
  return [...itens].sort((a, b) => (a.ativo.ticker < b.ativo.ticker ? -1 : a.ativo.ticker > b.ativo.ticker ? 1 : 0));
}

export interface VariacaoDoDia {
  /** Pontos percentuais ponderados pelo valor de mercado em BRL; null quando nenhuma posição tem cotação. */
  pontos: number | null;
  consideradas: number;
  total: number;
}

export function variacaoDoDia(
  posicoes: Posicao[],
  cotacoes: ReadonlyMap<Uuid, CotacaoAtual | undefined>,
): VariacaoDoDia {
  let peso = 0;
  let soma = 0;
  let consideradas = 0;
  for (const posicao of posicoes) {
    const cotacao = cotacoes.get(posicao.ativo_id);
    if (!cotacao) continue;
    const valor = paraNumero(posicao.valor_mercado_brl);
    const variacao = paraNumero(cotacao.variacao_percentual);
    if (!Number.isFinite(valor) || !Number.isFinite(variacao) || valor <= 0) continue;
    peso += valor;
    soma += valor * variacao;
    consideradas += 1;
  }
  return { pontos: peso > 0 ? soma / peso : null, consideradas, total: posicoes.length };
}

/** O backend devolve tudo zerado para carteira sem operações. */
export function carteiraVazia(r: Rentabilidade): boolean {
  return (
    paraNumero(r.custo_base_brl) === 0 && paraNumero(r.valor_mercado_brl) === 0 && paraNumero(r.lucro_realizado_brl) === 0
  );
}

export interface DadoKpi {
  valor: string;
  dica?: string;
  cor: 'padrao' | 'positivo' | 'negativo';
}

const LIMITE_ZERO_EM_REAIS = 0.005;

const SEM_COTACAO: DadoKpi = { valor: 'indisponível', dica: 'Sem cotação das posições', cor: 'padrao' };

/**
 * O backend mantém o custo das posições sem cotação em /rentabilidade, mas omite o valor de mercado delas: com valor
 * zero e custo positivo a fonte de dados está fora do ar, e o "prejuízo" de 100% não existe.
 */
function semValorDeMercado(r: Rentabilidade): boolean {
  return paraNumero(r.valor_mercado_brl) === 0 && paraNumero(r.custo_base_brl) > 0;
}

/** /portfolio/posicoes omite o que não consegue cotar: lista vazia com custo positivo = tudo sem cotação. */
export function posicoesSemCotacao(r: Rentabilidade | undefined, posicoes: Posicao[] | undefined): boolean {
  return r !== undefined && posicoes !== undefined && posicoes.length === 0 && paraNumero(r.custo_base_brl) > 0;
}

/** Verde e vermelho só para positivo e negativo (o chip do KPI não pode ser verde com "—" ou "indisponível"). */
export function tomDoKpi(cor: DadoKpi['cor']): 'positivo' | 'negativo' | 'neutro' {
  return cor === 'padrao' ? 'neutro' : cor;
}

function corDoNumero(numero: number, limite: number): DadoKpi['cor'] {
  if (Math.abs(numero) < limite) return 'padrao';
  return numero > 0 ? 'positivo' : 'negativo';
}

export function kpiPatrimonio(r: Rentabilidade): DadoKpi {
  if (carteiraVazia(r)) return { valor: '—', dica: 'Registre uma operação simulada', cor: 'padrao' };
  if (semValorDeMercado(r)) return { ...SEM_COTACAO };
  return {
    valor: formatarMoeda(r.valor_mercado_brl, 'BRL'),
    dica: `Custo ${formatarMoeda(r.custo_base_brl, 'BRL')}`,
    cor: 'padrao',
  };
}

export function kpiResultado(r: Rentabilidade): DadoKpi {
  if (carteiraVazia(r)) return { valor: '—', dica: 'Registre uma operação simulada', cor: 'padrao' };
  if (semValorDeMercado(r)) return { ...SEM_COTACAO };
  const lucro = paraNumero(r.lucro_nao_realizado_brl);
  return {
    valor: formatarMoeda(lucro, 'BRL'),
    dica: formatarPercentual(r.percentual, 'fracao'),
    cor: corDoNumero(lucro, LIMITE_ZERO_EM_REAIS),
  };
}

/** Lucro de vendas já registradas: independe de haver cotação das posições abertas. */
export function kpiLucroRealizado(r: Rentabilidade): DadoKpi {
  if (carteiraVazia(r)) return { valor: '—', dica: 'Registre uma operação simulada', cor: 'padrao' };
  const lucro = paraNumero(r.lucro_realizado_brl);
  return {
    valor: formatarMoeda(lucro, 'BRL'),
    dica: 'Em vendas já registradas',
    cor: corDoNumero(lucro, LIMITE_ZERO_EM_REAIS),
  };
}

export function kpiVariacaoDoDia(v: VariacaoDoDia, semCotacaoNoServidor = false): DadoKpi {
  if (semCotacaoNoServidor) return { ...SEM_COTACAO };
  if (v.total === 0) return { valor: '—', dica: 'Sem posições abertas', cor: 'padrao' };
  if (v.pontos === null) return { valor: 'indisponível', dica: 'Sem cotação das posições', cor: 'padrao' };
  const texto = formatarPercentual(v.pontos, 'pontos');
  return {
    valor: texto,
    dica:
      v.consideradas < v.total
        ? `${v.consideradas} de ${v.total} posições, ponderada pelo valor`
        : 'Ponderada pelo valor em BRL',
    cor: texto.startsWith('+') ? 'positivo' : texto.startsWith('-') ? 'negativo' : 'padrao',
  };
}

export function kpiSinais(contagem: {
  total: number;
  semDados: number;
  ativos: number;
  watchlistIndisponivel: boolean;
}): DadoKpi {
  const { total, semDados, ativos, watchlistIndisponivel } = contagem;
  if (watchlistIndisponivel) return { valor: 'indisponível', dica: 'Watchlist indisponível', cor: 'padrao' };
  // Zero só é um fato quando algum ativo respondeu: se todos falharam, não há número.
  if (ativos > 0 && semDados === ativos) {
    return { valor: 'indisponível', dica: 'Sinais indisponíveis no momento', cor: 'padrao' };
  }
  if (semDados === 0) return { valor: String(total), cor: 'padrao' };
  return { valor: String(total), dica: `${semDados} ${semDados === 1 ? 'ativo' : 'ativos'} sem dados`, cor: 'padrao' };
}

export interface ResumoDiario {
  texto: string;
  avisoLegal: string;
  geradoEm: string;
}

/** Último resumo diário com texto utilizável. O aviso legal do servidor tem preferência; sem ele, o padrão (RN-05). */
export function ultimoResumoDiario(notificacoes: Notificacao[] | undefined): ResumoDiario | null {
  const candidatos = (notificacoes ?? []).filter(
    (n) => n.tipo === 'RESUMO_DIARIO' && typeof n.contexto.texto === 'string' && n.contexto.texto.trim() !== '',
  );
  if (candidatos.length === 0) return null;
  const ultimo = candidatos.reduce((a, b) => (Date.parse(b.criado_em) > Date.parse(a.criado_em) ? b : a));
  const aviso = ultimo.contexto.aviso_legal;
  return {
    texto: (ultimo.contexto.texto as string).trim(),
    avisoLegal: typeof aviso === 'string' && aviso.trim() !== '' ? aviso.trim() : AVISO_IA,
    geradoEm: ultimo.criado_em,
  };
}

export interface SinalDaWatchlist {
  ativo: Ativo;
  sinal: Sinal;
}

/** Sinais vigentes de todos os ativos da watchlist, do mais recente para o mais antigo. */
export function reunirSinais(
  itens: ItemWatchlist[],
  sinaisPorAtivo: ReadonlyMap<Uuid, Sinal[] | undefined>,
): SinalDaWatchlist[] {
  const lista: SinalDaWatchlist[] = [];
  for (const { ativo } of itens) {
    for (const sinal of sinaisPorAtivo.get(ativo.id) ?? []) {
      if (sinal.data_desativacao === null) lista.push({ ativo, sinal });
    }
  }
  return lista.sort(
    (a, b) =>
      Date.parse(b.sinal.data_ativacao) - Date.parse(a.sinal.data_ativacao) ||
      (a.ativo.ticker < b.ativo.ticker ? -1 : a.ativo.ticker > b.ativo.ticker ? 1 : 0),
  );
}

export function descreverBacktest(backtest: ResultadoBacktest): string {
  if (backtest.total_ocorrencias === 0) return 'Sem ocorrências nos últimos 24 meses';
  const n = backtest.total_ocorrencias;
  const ocorrencias = `${n} ${n === 1 ? 'ocorrência' : 'ocorrências'} em 24 meses`;
  const retorno =
    backtest.retorno_medio_20_pregoes === null
      ? 'retorno médio em 20 pregões indisponível'
      : `retorno médio ${formatarPercentual(backtest.retorno_medio_20_pregoes, 'pontos')} em 20 pregões`;
  return `${ocorrencias} · ${retorno}`;
}
