import type { Notificacao } from '@/api/tipos';
import {
  contarNaoLidas,
  destinoDaNotificacao,
  mesclarNotificacoes,
  tituloDaNotificacao,
} from '@/dominio/notificacoes';

function notificacao(id: string, parcial: Partial<Notificacao> = {}): Notificacao {
  return {
    id,
    ativo_id: 'a-1',
    tipo: 'SINAL_ATIVADO',
    mensagem: `Mensagem ${id}`,
    contexto: {},
    lida: false,
    criado_em: '2026-10-10T12:00:00Z',
    ...parcial,
  };
}

describe('mesclarNotificacoes', () => {
  it('une por id sem duplicar e deixa a mais recente primeiro', () => {
    const antiga = notificacao('n-1', { criado_em: '2026-10-10T10:00:00Z' });
    const nova = notificacao('n-2', { criado_em: '2026-10-10T11:00:00Z' });
    const resultado = mesclarNotificacoes([antiga], [nova, antiga]);
    expect(resultado.map((n) => n.id)).toEqual(['n-2', 'n-1']);
  });

  it('lida nunca volta a não lida: a leitura local vence um GET antigo', () => {
    const lidaLocal = notificacao('n-1', { lida: true });
    const naoLidaDoServidor = notificacao('n-1', { lida: false });
    expect(mesclarNotificacoes([lidaLocal], [naoLidaDoServidor])[0].lida).toBe(true);
  });

  it('sem lista anterior usa só as novas', () => {
    expect(mesclarNotificacoes(undefined, [notificacao('n-1')])).toHaveLength(1);
  });

  it('não altera as listas recebidas', () => {
    const atual = [notificacao('n-1')];
    mesclarNotificacoes(atual, [notificacao('n-2')]);
    expect(atual).toHaveLength(1);
  });
});

describe('contarNaoLidas', () => {
  it('conta só as não lidas e aceita lista ausente', () => {
    expect(contarNaoLidas([notificacao('n-1'), notificacao('n-2', { lida: true })])).toBe(1);
    expect(contarNaoLidas(undefined)).toBe(0);
  });
});

describe('destinoDaNotificacao', () => {
  it('notificação de ativo abre o ativo, com o ticker quando conhecido', () => {
    expect(destinoDaNotificacao(notificacao('n-1'), 'PETR4')).toEqual({
      pathname: '/ativo/[id]',
      params: { id: 'a-1', ticker: 'PETR4' },
    });
  });

  it('sem ticker conhecido (ativo fora da watchlist) abre o ativo só com o id', () => {
    expect(destinoDaNotificacao(notificacao('n-1'), null)).toEqual({
      pathname: '/ativo/[id]',
      params: { id: 'a-1' },
    });
  });

  it('resumo diário (sem ativo) abre o detalhe da notificação', () => {
    const resumo = notificacao('n-9', { ativo_id: null, tipo: 'RESUMO_DIARIO' });
    expect(destinoDaNotificacao(resumo)).toEqual({ pathname: '/notificacao/[id]', params: { id: 'n-9' } });
  });
});

describe('tituloDaNotificacao', () => {
  it('junta o tipo e o ticker quando há', () => {
    expect(tituloDaNotificacao(notificacao('n-1'), 'PETR4')).toBe('Sinal técnico · PETR4');
    expect(tituloDaNotificacao(notificacao('n-1', { tipo: 'ALERTA_DISPARADO' }))).toBe('Alerta de preço');
  });
});
