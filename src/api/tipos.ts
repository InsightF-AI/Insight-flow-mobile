// Espelho dos schemas Pydantic do backend (src/app/api/v1/schemas/).
// O Pydantic v2 serializa Decimal como string em JSON, por isso Decimal = string.

export type Decimal = string;
export type Uuid = string;
export type DataHoraISO = string;
export type DataISO = string;

/** INDICE é interno do backend (Ibovespa, usado no benchmark): não aparece na busca nem na watchlist. */
export type TipoAtivo = 'ACAO' | 'FII' | 'ETF' | 'BDR' | 'CRIPTO' | 'INDICE';
export type TipoIndicador = 'SMA' | 'RSI' | 'MACD' | 'BOLLINGER' | 'VOLUME_RELATIVO';
export type TipoOperacao = 'COMPRA' | 'VENDA';
export type TipoBenchmark = 'CDI' | 'IBOVESPA';
export type TipoCondicaoAlerta = 'PRECO_MAIOR_IGUAL' | 'PRECO_MENOR_IGUAL';
export type TipoNotificacao = 'SINAL_ATIVADO' | 'ALERTA_DISPARADO' | 'RESUMO_DIARIO';
export type PeriodoHistorico = '1D' | '1S' | '1M' | '3M' | '1A' | '5A';

export interface TokenResponse {
  access_token: string;
  /** Opaco, 30 dias, rotativo: cada /auth/refresh devolve um novo e invalida o anterior. */
  refresh_token: string;
  token_type: string;
  /** Validade do access token em segundos (1800 por padrão). */
  expires_in: number;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface CadastroRequest {
  nome: string;
  email: string;
  senha: string;
}

export interface Ativo {
  id: Uuid;
  ticker: string;
  nome: string;
  tipo: TipoAtivo;
  setor: string | null;
  moeda: string;
}

export interface ItemWatchlist {
  ativo: Ativo;
  notificar: boolean;
  adicionado_em: DataHoraISO;
}

export interface AtivoEncontrado {
  ticker: string;
  nome: string;
  tipo: TipoAtivo;
  moeda: string;
  setor: string | null;
}

export interface CotacaoAtual {
  ticker: string;
  preco: Decimal;
  variacao: Decimal;
  /** Pontos percentuais: "1.23" = 1,23%. */
  variacao_percentual: Decimal;
  maxima_dia: Decimal;
  minima_dia: Decimal;
  volume: Decimal;
}

export interface PontoHistorico {
  data: DataHoraISO;
  abertura: Decimal;
  maxima: Decimal;
  minima: Decimal;
  fechamento: Decimal;
  volume: Decimal;
}

export interface IndicadorTecnico {
  tipo: TipoIndicador;
  parametros: Record<string, number>;
  data_calculo: DataHoraISO;
  valor: Decimal;
  /** Valores complementares como números JSON (ex.: banda_superior, linha_sinal). */
  valores_auxiliares: Record<string, number> | null;
}

export interface Sinal {
  id: Uuid;
  ativo_id: Uuid;
  regra_id: Uuid;
  regra_nome: string;
  regra_descricao: string;
  data_ativacao: DataHoraISO;
  contexto: Record<string, unknown>;
  data_desativacao: DataHoraISO | null;
}

export interface ResultadoBacktest {
  regra_id: Uuid;
  ativo_id: Uuid;
  total_ocorrencias: number;
  /** Pontos percentuais: "-2.5" = −2,5%. */
  retorno_medio_5_pregoes: Decimal | null;
  retorno_medio_20_pregoes: Decimal | null;
  retorno_medio_60_pregoes: Decimal | null;
}

export interface Alerta {
  id: Uuid;
  ativo: Ativo;
  tipo_condicao: TipoCondicaoAlerta;
  valor_alvo: Decimal;
  moeda_alvo: string;
  habilitado: boolean;
  ultimo_estado: boolean;
  disparado_em: DataHoraISO | null;
  criado_em: DataHoraISO;
  atualizado_em: DataHoraISO;
}

export interface CriarAlertaRequest {
  ticker: string;
  tipo_condicao: TipoCondicaoAlerta;
  valor_alvo: Decimal;
}

export interface AtualizarAlertaRequest {
  tipo_condicao?: TipoCondicaoAlerta;
  valor_alvo?: Decimal;
  ativo?: boolean;
}

export interface Notificacao {
  id: Uuid;
  /** null no RESUMO_DIARIO. */
  ativo_id: Uuid | null;
  tipo: TipoNotificacao;
  /** No RESUMO_DIARIO é só o título; o texto completo vem em contexto.texto. */
  mensagem: string;
  /** SINAL_ATIVADO: {sinal_id, regra_id}; ALERTA_DISPARADO: {alerta_id, preco}; RESUMO_DIARIO: {texto, aviso_legal, ...}. */
  contexto: Record<string, unknown>;
  lida: boolean;
  criado_em: DataHoraISO;
}

export interface Operacao {
  id: Uuid;
  ativo_id: Uuid;
  tipo: TipoOperacao;
  quantidade: Decimal;
  preco_unitario: Decimal;
  data: DataISO;
  criado_em: DataHoraISO;
}

export interface RegistrarOperacaoRequest {
  ativo_id: Uuid;
  tipo: TipoOperacao;
  quantidade: Decimal;
  preco_unitario: Decimal;
  data: DataISO;
}

export interface Posicao {
  ativo_id: Uuid;
  ticker: string;
  quantidade: Decimal;
  preco_medio: Decimal;
  cotacao_atual: Decimal;
  valor_mercado: Decimal;
  valor_mercado_brl: Decimal;
  lucro_nao_realizado: Decimal;
  lucro_realizado: Decimal;
}

export interface Rentabilidade {
  custo_base_brl: Decimal;
  valor_mercado_brl: Decimal;
  lucro_nao_realizado_brl: Decimal;
  lucro_realizado_brl: Decimal;
  /** Fração: "0.05" = 5%. */
  percentual: Decimal;
}

export interface Comparativo {
  benchmark: TipoBenchmark;
  /** Fração. */
  rentabilidade_carteira_percentual: Decimal;
  /** Fração; null quando a fonte do benchmark está indisponível. */
  rentabilidade_benchmark_percentual: Decimal | null;
}

export interface Distribuicao {
  /** Frações por classe (chaves são valores de TipoAtivo). */
  por_classe: Record<string, Decimal>;
  /** Frações por setor; "N/A" quando o ativo não tem setor. */
  por_setor: Record<string, Decimal>;
  por_moeda: Record<string, Decimal>;
}
