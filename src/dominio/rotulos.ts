import type { TipoAtivo } from '@/api/tipos';

export const ROTULO_TIPO_ATIVO: Record<TipoAtivo, string> = {
  ACAO: 'Ação',
  FII: 'FII',
  ETF: 'ETF',
  BDR: 'BDR',
  CRIPTO: 'Cripto',
};
