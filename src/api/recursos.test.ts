import { alertasApi } from '@/api/alertas';
import { ativosApi } from '@/api/ativos';
import { authApi } from '@/api/auth';
import { configurarApi } from '@/api/client';
import { notificacoesApi } from '@/api/notificacoes';
import { portfolioApi } from '@/api/portfolio';
import { watchlistApi } from '@/api/watchlist';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  configurarApi({
    baseUrl: 'http://api',
    obterToken: () => 'tok',
    tokenPertoDeVencer: () => false,
    renovarToken: jest.fn(async () => null),
    geracaoDaSessao: () => 0,
  });
});

const credenciais = { email: 'ana@exemplo.com', senha: 'segredo123' };
const cadastro = { nome: 'Ana', ...credenciais };
const alerta = { ticker: 'VALE3', tipo_condicao: 'PRECO_MAIOR_IGUAL' as const, valor_alvo: '70' };
const operacao = {
  ativo_id: 'a-1',
  tipo: 'COMPRA' as const,
  quantidade: '10',
  preco_unitario: '38.5',
  data: '2026-09-25',
};

const casos: [string, () => Promise<unknown>, string, string, unknown][] = [
  ['auth.login', () => authApi.login(credenciais), 'POST', '/auth/login', credenciais],
  ['auth.cadastrar', () => authApi.cadastrar(cadastro), 'POST', '/usuarios', cadastro],
  ['auth.renovar', () => authApi.renovar('ref-1'), 'POST', '/auth/refresh', { refresh_token: 'ref-1' }],
  ['auth.sair', () => authApi.sair('ref-1'), 'POST', '/auth/logout', { refresh_token: 'ref-1' }],
  ['watchlist.listar', () => watchlistApi.listar(), 'GET', '/watchlist', undefined],
  ['watchlist.adicionar', () => watchlistApi.adicionar('PETR4'), 'POST', '/watchlist', { ticker: 'PETR4' }],
  ['watchlist.remover', () => watchlistApi.remover('a-1'), 'DELETE', '/watchlist/a-1', undefined],
  [
    'watchlist.definirNotificacao',
    () => watchlistApi.definirNotificacao('a-1', false),
    'PATCH',
    '/watchlist/a-1/notificacao',
    { notificar: false },
  ],
  ['ativos.buscar', () => ativosApi.buscar('PETR'), 'GET', '/ativos/buscar?termo=PETR', undefined],
  ['ativos.cotacao', () => ativosApi.cotacao('a-1'), 'GET', '/ativos/a-1/cotacao', undefined],
  ['ativos.historico', () => ativosApi.historico('a-1', '3M'), 'GET', '/ativos/a-1/historico?periodo=3M', undefined],
  ['ativos.indicadores', () => ativosApi.indicadores('a-1'), 'GET', '/ativos/a-1/indicadores', undefined],
  ['ativos.sinais', () => ativosApi.sinais('a-1'), 'GET', '/ativos/a-1/sinais', undefined],
  ['ativos.backtest', () => ativosApi.backtest('a-1', 'r-1'), 'GET', '/ativos/a-1/sinais/r-1/backtest', undefined],
  ['alertas.listar', () => alertasApi.listar(), 'GET', '/alertas', undefined],
  ['alertas.criar', () => alertasApi.criar(alerta), 'POST', '/alertas', alerta],
  ['alertas.atualizar', () => alertasApi.atualizar('al-1', { ativo: false }), 'PATCH', '/alertas/al-1', { ativo: false }],
  ['alertas.remover', () => alertasApi.remover('al-1'), 'DELETE', '/alertas/al-1', undefined],
  ['notificacoes.listar', () => notificacoesApi.listar(), 'GET', '/notificacoes', undefined],
  [
    'notificacoes.listar só não lidas',
    () => notificacoesApi.listar(true),
    'GET',
    '/notificacoes?apenas_nao_lidas=true',
    undefined,
  ],
  ['notificacoes.marcarComoLida', () => notificacoesApi.marcarComoLida('n-1'), 'PATCH', '/notificacoes/n-1/lida', undefined],
  ['portfolio.listarOperacoes', () => portfolioApi.listarOperacoes(), 'GET', '/operacoes', undefined],
  ['portfolio.registrarOperacao', () => portfolioApi.registrarOperacao(operacao), 'POST', '/operacoes', operacao],
  ['portfolio.removerOperacao', () => portfolioApi.removerOperacao('o-1'), 'DELETE', '/operacoes/o-1', undefined],
  ['portfolio.posicoes', () => portfolioApi.posicoes(), 'GET', '/portfolio/posicoes', undefined],
  ['portfolio.rentabilidade', () => portfolioApi.rentabilidade(), 'GET', '/portfolio/rentabilidade', undefined],
  ['portfolio.benchmark', () => portfolioApi.benchmark('CDI'), 'GET', '/portfolio/benchmark?benchmark=CDI', undefined],
  ['portfolio.distribuicao', () => portfolioApi.distribuicao(), 'GET', '/portfolio/distribuicao', undefined],
];

it.each(casos)('%s', async (_nome, chamar, metodo, caminho, corpo) => {
  await chamar();
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe(`http://api/api/v1${caminho}`);
  expect(init.method).toBe(metodo);
  expect(init.body).toBe(corpo === undefined ? undefined : JSON.stringify(corpo));
});
