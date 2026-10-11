import {
  avaliarAmbiente,
  descreverSituacao,
  destinoDoPush,
  lerDadosDoPush,
  type MotivoDeIndisponibilidade,
  type SituacaoDoPush,
} from '@/dominio/push';

describe('avaliarAmbiente', () => {
  const pronto = { expoGo: false, aparelhoFisico: true, projectId: 'proj-1' };

  it('development build ou produção em aparelho físico, com projeto: suportado', () => {
    expect(avaliarAmbiente(pronto)).toEqual({ suportado: true, projectId: 'proj-1' });
  });

  it('Expo Go não recebe push remoto (tem prioridade sobre os outros motivos)', () => {
    expect(avaliarAmbiente({ expoGo: true, aparelhoFisico: false, projectId: null })).toEqual({
      suportado: false,
      motivo: 'expo-go',
    });
  });

  it('simulador ou emulador', () => {
    expect(avaliarAmbiente({ ...pronto, aparelhoFisico: false })).toEqual({
      suportado: false,
      motivo: 'aparelho-fisico',
    });
  });

  it.each([[null], ['']])('sem projectId (%p)', (projectId) => {
    expect(avaliarAmbiente({ ...pronto, projectId })).toEqual({ suportado: false, motivo: 'sem-projeto' });
  });
});

describe('lerDadosDoPush', () => {
  it('lê os três campos do payload do backend', () => {
    expect(lerDadosDoPush({ notificacao_id: 'n-1', tipo: 'ALERTA_DISPARADO', ativo_id: 'a-1' })).toEqual({
      notificacao_id: 'n-1',
      tipo: 'ALERTA_DISPARADO',
      ativo_id: 'a-1',
    });
  });

  it('ativo_id nulo (resumo diário) vira ausente', () => {
    expect(lerDadosDoPush({ notificacao_id: 'n-2', tipo: 'RESUMO_DIARIO', ativo_id: null })).toEqual({
      notificacao_id: 'n-2',
      tipo: 'RESUMO_DIARIO',
    });
  });

  it.each([[undefined], [null], ['texto'], [42], [[]], [{ notificacao_id: 7, ativo_id: {} }]])(
    'dados inválidos (%p) viram objeto vazio',
    (dados) => {
      expect(lerDadosDoPush(dados)).toEqual({});
    },
  );

  it('texto em branco não vale', () => {
    expect(lerDadosDoPush({ notificacao_id: '  ', ativo_id: '' })).toEqual({});
  });
});

describe('destinoDoPush', () => {
  it('com ativo abre o ativo', () => {
    expect(destinoDoPush({ notificacao_id: 'n-1', ativo_id: 'a-1' })).toEqual({
      pathname: '/ativo/[id]',
      params: { id: 'a-1' },
    });
  });

  it('sem ativo abre o detalhe da notificação', () => {
    expect(destinoDoPush({ notificacao_id: 'n-2' })).toEqual({
      pathname: '/notificacao/[id]',
      params: { id: 'n-2' },
    });
  });

  it('sem nada utilizável abre a caixa de notificações', () => {
    expect(destinoDoPush({})).toEqual({ pathname: '/notificacoes' });
  });
});

describe('descreverSituacao', () => {
  it.each<[SituacaoDoPush, string]>([
    ['ligado', 'Ligadas neste aparelho'],
    ['desligado', 'Desligadas neste aparelho'],
    ['negado', 'Bloqueadas pelo sistema'],
    ['verificando', 'Verificando'],
    ['erro', 'Não foi possível registrar este aparelho'],
  ])('%s', (situacao, titulo) => {
    expect(descreverSituacao(situacao).titulo).toBe(titulo);
  });

  it.each<[MotivoDeIndisponibilidade, string]>([
    ['expo-go', 'development build'],
    ['aparelho-fisico', 'aparelho físico'],
    ['sem-projeto', 'projeto Expo'],
  ])('indisponível por %s explica o motivo', (motivo, trecho) => {
    const texto = descreverSituacao('indisponivel', motivo);
    expect(texto.titulo).toBe('Indisponíveis neste aparelho');
    expect(texto.detalhe).toContain(trecho);
  });

  it('nenhum texto recomenda compra ou venda', () => {
    const situacoes: SituacaoDoPush[] = ['ligado', 'desligado', 'negado', 'verificando', 'erro', 'indisponivel'];
    for (const situacao of situacoes) {
      const { titulo, detalhe } = descreverSituacao(situacao, 'expo-go');
      expect(`${titulo} ${detalhe}`).not.toMatch(/\b(compre|comprar|venda|vender|invista|investir)\b/i);
    }
  });
});
