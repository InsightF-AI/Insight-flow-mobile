import type { TipoAtivo, TipoNotificacao } from '@/api/tipos';

export const ROTULO_TIPO_ATIVO: Record<TipoAtivo, string> = {
  ACAO: 'Ação',
  FII: 'FII',
  ETF: 'ETF',
  BDR: 'BDR',
  CRIPTO: 'Cripto',
  INDICE: 'Índice',
};

export const ROTULO_CLASSE_PLURAL: Record<TipoAtivo, string> = {
  ACAO: 'Ações',
  FII: 'FIIs',
  ETF: 'ETFs',
  BDR: 'BDRs',
  CRIPTO: 'Criptomoedas',
  INDICE: 'Índices',
};

export const ROTULO_TIPO_NOTIFICACAO: Record<TipoNotificacao, string> = {
  SINAL_ATIVADO: 'Sinal técnico',
  ALERTA_DISPARADO: 'Alerta de preço',
  RESUMO_DIARIO: 'Resumo diário',
};
