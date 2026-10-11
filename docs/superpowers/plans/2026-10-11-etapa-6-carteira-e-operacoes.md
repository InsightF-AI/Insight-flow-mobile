# Etapa 6: carteira e operações simuladas — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar a aba da carteira com KPIs, comparativo com CDI e Ibovespa (`null` = "indisponível"), distribuição, posições com variação do dia e filtro por classe, aviso de simulação e aviso de dados parciais; e fazer a nova operação aceitar só ativos da watchlist, mostrando a quantidade disponível na venda e traduzindo os erros 422 do backend.

**Architecture:** Regras puras novas em `src/dominio/` (filtro de posições por classe, ativos sem cotação, quantidade disponível, restrições da validação de operação, KPI de lucro realizado), cada uma com teste ao lado. As telas só compõem hooks e componentes existentes (`Kpi`, `SeletorSegmentado`, `useCotacoes`). A quantidade disponível vem do **saldo das operações**, não de `/portfolio/posicoes`: o backend omite a posição de um ativo sem cotação, e usar a lista de posições bloquearia uma venda legítima.

**Tech Stack:** Expo SDK 57, React Native 0.86, TanStack Query 5, Expo Router, Jest + React Native Testing Library 14.

**Spec:** `docs/PLANO.md` §8 (Etapa 6), `docs/MAPEAMENTO.md` §2.2 (linhas 22–28 dos endpoints), §2.5 (sem cotação), §7.1; decisão D6 (adição explícita à watchlist).

## Global Constraints

- Repositório `C:\Users\Bruno\Insight-flow-mobile`; branch `feature/etapa-6-carteira-operacoes` a partir de `feature/etapa-5-alertas-notificacoes` (PR #6 aberto). Não alterar backend, web nem desktop. Sem dependências novas.
- Percentuais: `/portfolio/rentabilidade`, `/portfolio/benchmark` e `/portfolio/distribuicao` vêm em **fração** (×100 na exibição); a variação da cotação vem em **pontos percentuais**.
- Benchmark `null` (fonte fora do ar ou sem cobertura da data inicial) é "indisponível", nunca 0%. Posição sem cotação é omitida pelo backend: o valor de mercado e o resultado podem estar incompletos e a tela avisa.
- Operação simulada: nenhuma ordem real; "Compra" e "Venda" aparecem só como o tipo da operação que o usuário registra, sem verde nem vermelho (verde/vermelho só para valor positivo/negativo). Linguagem factual, sem recomendar compra ou venda.
- Fronteiras do `CLAUDE.md`: `app/` só rotas; `src/components/` por props e sem hooks de dados; regras puras em `src/dominio/` com teste ao lado; cores só via `useTema()`; nunca `fontWeight`; alvo de toque ≥ 44 pt; ícones só via `Icone`.
- `npm run verificar` verde ao fim de cada tarefa; commits em pt-BR terminando com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`; `gh`/`git push` com `GH_TOKEN="$(gh auth token --user brunoosouza09)"` exportado na mesma chamada. Sem merge e sem trocar a base dos PRs.

## Review Focus

1. **Ativo sem cotação:** o backend omite a posição, mas a operação existe. A venda não pode ser bloqueada por isso, a carteira não pode mostrar "prejuízo de 100%" e o aviso de dados parciais tem de aparecer. Tarefas 1 e 2.
2. **Escalas de percentual:** fração (×100) em rentabilidade/benchmark e pontos na variação do dia, nunca misturadas; `0`, `null` e `undefined` não viram "0,00%". Tarefas 1 e 2.
3. **Carteira vazia, só vendas e posição zerada:** sem divisão por zero, sem KPI com número inventado, filtro de classe sem opções inúteis. Tarefas 1 e 2.
4. **Nova operação:** ativo digitado fora da watchlist não é adicionado em silêncio; venda maior que a posição de hoje é recusada antes de ir ao servidor, mas uma venda com data passada segue para o servidor decidir; os 422 do backend (só o UUID do ativo, "data nao pode ser futura") aparecem em português. Tarefas 1 e 3.
5. **Remoção de operação:** a confirmação existe, o 422 de "venda posterior ficaria sem saldo" é legível e a lista não muda se a remoção falha. Tarefa 2.

---

### Task 1: Regras puras da carteira e da operação

**Files:**
- Modify: `src/dominio/portfolio.ts`, `src/dominio/operacao.ts`, `src/dominio/inicio.ts`, `src/dominio/rotulos.ts`, `src/utils/erros.ts`
- Create: `src/dominio/posicoes.test.ts`, `src/dominio/operacaoRestricoes.test.ts`, `src/dominio/kpiCarteira.test.ts`, `src/utils/errosOperacao.test.ts`

**Interfaces:**
- Produces (Tarefas 2 e 3):
  - `InfoAtivo` ganha `tipo?: TipoAtivo`; `mapaAtivos` preenche o tipo a partir da watchlist
  - `type FiltroPosicoes = 'TODAS' | TipoAtivo | 'OUTROS'`
  - `filtrosDasPosicoes(posicoes, ativos): FiltroPosicoes[]` (`['TODAS']` quando só existe uma classe)
  - `filtrarPosicoes(posicoes, ativos, filtro): Posicao[]`
  - `rotuloDoFiltro(filtro): string`
  - `ativosSemCotacao(operacoes, posicoes): Uuid[]`
  - `descreverDadosParciais(ids, ativos): string | null`
  - `quantidadeDisponivel(operacoes, ativoId): number`
  - `validarOperacao(form, hoje?, restricoes?: { tickersPermitidos?; disponivel? })`
  - `kpiLucroRealizado(r: Rentabilidade): DadoKpi`

- [ ] **Step 1: Criar a branch e escrever os testes (falham)**

```bash
cd /c/Users/Bruno/Insight-flow-mobile
git status --short
git switch -c feature/etapa-6-carteira-operacoes feature/etapa-5-alertas-notificacoes
```

`src/dominio/posicoes.test.ts`:

```ts
import type { ItemWatchlist, Operacao, Posicao } from '@/api/tipos';
import {
  ativosSemCotacao,
  descreverDadosParciais,
  filtrarPosicoes,
  filtrosDasPosicoes,
  mapaAtivos,
  quantidadeDisponivel,
  rotuloDoFiltro,
} from '@/dominio/portfolio';

function posicao(ativoId: string, ticker: string): Posicao {
  return {
    ativo_id: ativoId,
    ticker,
    quantidade: '10',
    preco_medio: '30',
    cotacao_atual: '33',
    valor_mercado: '330',
    valor_mercado_brl: '330',
    lucro_nao_realizado: '30',
    lucro_realizado: '0',
  };
}

function item(id: string, ticker: string, tipo: ItemWatchlist['ativo']['tipo']): ItemWatchlist {
  return {
    ativo: { id, ticker, nome: ticker, tipo, setor: null, moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-10-01T12:00:00Z',
  };
}

function operacao(id: string, ativoId: string, tipo: Operacao['tipo'], quantidade: string): Operacao {
  return { id, ativo_id: ativoId, tipo, quantidade, preco_unitario: '10', data: '2026-09-01', criado_em: '2026-09-01T12:00:00Z' };
}

describe('mapaAtivos', () => {
  it('guarda o tipo do ativo quando ele está na watchlist', () => {
    const mapa = mapaAtivos([posicao('a-1', 'PETR4')], [item('a-1', 'PETR4', 'ACAO')]);
    expect(mapa.get('a-1')).toEqual({ ticker: 'PETR4', moeda: 'BRL', tipo: 'ACAO' });
  });

  it('ativo só nas posições (saiu da watchlist) não tem tipo nem moeda', () => {
    expect(mapaAtivos([posicao('a-1', 'PETR4')], []).get('a-1')).toEqual({ ticker: 'PETR4' });
  });
});

describe('filtros das posições', () => {
  const ativos = mapaAtivos(undefined, [
    item('a-1', 'PETR4', 'ACAO'),
    item('a-2', 'VALE3', 'ACAO'),
    item('a-3', 'BTC', 'CRIPTO'),
  ]);

  it('mostra só as classes que existem, na ordem fixa, com "Todas" na frente', () => {
    const posicoes = [posicao('a-3', 'BTC'), posicao('a-1', 'PETR4'), posicao('a-2', 'VALE3')];
    expect(filtrosDasPosicoes(posicoes, ativos)).toEqual(['TODAS', 'ACAO', 'CRIPTO']);
  });

  it('uma classe só não tem filtro útil', () => {
    expect(filtrosDasPosicoes([posicao('a-1', 'PETR4'), posicao('a-2', 'VALE3')], ativos)).toEqual(['TODAS']);
    expect(filtrosDasPosicoes([], ativos)).toEqual(['TODAS']);
  });

  it('posição de ativo que saiu da watchlist cai em "Outros"', () => {
    const posicoes = [posicao('a-1', 'PETR4'), posicao('a-9', 'ITUB4')];
    expect(filtrosDasPosicoes(posicoes, ativos)).toEqual(['TODAS', 'ACAO', 'OUTROS']);
    expect(filtrarPosicoes(posicoes, ativos, 'OUTROS').map((p) => p.ticker)).toEqual(['ITUB4']);
  });

  it('filtra por classe e "Todas" devolve tudo', () => {
    const posicoes = [posicao('a-1', 'PETR4'), posicao('a-3', 'BTC')];
    expect(filtrarPosicoes(posicoes, ativos, 'CRIPTO').map((p) => p.ticker)).toEqual(['BTC']);
    expect(filtrarPosicoes(posicoes, ativos, 'TODAS')).toHaveLength(2);
  });

  it('rótulos curtos', () => {
    expect(rotuloDoFiltro('TODAS')).toBe('Todas');
    expect(rotuloDoFiltro('ACAO')).toBe('Ações');
    expect(rotuloDoFiltro('CRIPTO')).toBe('Cripto');
    expect(rotuloDoFiltro('OUTROS')).toBe('Outros');
  });
});

describe('ativosSemCotacao', () => {
  it('ativo com saldo comprado e sem posição é um ativo que o backend não conseguiu cotar', () => {
    const operacoes = [operacao('o-1', 'a-1', 'COMPRA', '10'), operacao('o-2', 'a-2', 'COMPRA', '5')];
    expect(ativosSemCotacao(operacoes, [posicao('a-1', 'PETR4')])).toEqual(['a-2']);
  });

  it('posição zerada por venda total não é falta de cotação', () => {
    const operacoes = [operacao('o-1', 'a-2', 'COMPRA', '5'), operacao('o-2', 'a-2', 'VENDA', '5')];
    expect(ativosSemCotacao(operacoes, [])).toEqual([]);
  });

  it('venda parcial deixa saldo e conta como sem cotação quando a posição some', () => {
    const operacoes = [operacao('o-1', 'a-2', 'COMPRA', '5'), operacao('o-2', 'a-2', 'VENDA', '2')];
    expect(ativosSemCotacao(operacoes, [])).toEqual(['a-2']);
  });

  it('sem operações não há o que avisar', () => {
    expect(ativosSemCotacao([], [])).toEqual([]);
  });
});

describe('descreverDadosParciais', () => {
  const ativos = mapaAtivos(undefined, [
    item('a-1', 'PETR4', 'ACAO'),
    item('a-2', 'VALE3', 'ACAO'),
    item('a-3', 'ITUB4', 'ACAO'),
    item('a-4', 'BBAS3', 'ACAO'),
  ]);

  it('sem ativos sem cotação não há aviso', () => {
    expect(descreverDadosParciais([], ativos)).toBeNull();
  });

  it('nomeia os ativos e explica o efeito', () => {
    expect(descreverDadosParciais(['a-2'], ativos)).toBe(
      'Sem cotação agora para VALE3: o valor de mercado e o resultado da carteira podem estar incompletos.',
    );
  });

  it('com mais de três nomeia três e conta o resto', () => {
    expect(descreverDadosParciais(['a-1', 'a-2', 'a-3', 'a-4'], ativos)).toContain('PETR4, VALE3, ITUB4 e mais 1');
  });

  it('ativo desconhecido entra só na contagem', () => {
    expect(descreverDadosParciais(['a-9', 'a-8'], ativos)).toContain('Sem cotação agora para 2 ativos:');
  });
});

describe('quantidadeDisponivel', () => {
  it('é o saldo das operações: compras menos vendas', () => {
    const operacoes = [
      operacao('o-1', 'a-1', 'COMPRA', '10'),
      operacao('o-2', 'a-1', 'COMPRA', '5.5'),
      operacao('o-3', 'a-1', 'VENDA', '3'),
      operacao('o-4', 'a-2', 'COMPRA', '99'),
    ];
    expect(quantidadeDisponivel(operacoes, 'a-1')).toBeCloseTo(12.5, 8);
  });

  it('ativo sem operações tem zero, e saldo negativo (operações inconsistentes) vira zero', () => {
    expect(quantidadeDisponivel([], 'a-1')).toBe(0);
    expect(quantidadeDisponivel([operacao('o-1', 'a-1', 'VENDA', '4')], 'a-1')).toBe(0);
  });
});
```

`src/dominio/operacaoRestricoes.test.ts`:

```ts
import { validarOperacao } from '@/dominio/operacao';

const HOJE = new Date(2026, 9, 10, 12, 0, 0);
const BASE = { tipo: 'COMPRA' as const, ticker: 'PETR4', quantidade: '10', precoUnitario: '38,5', data: HOJE };

describe('validarOperacao com restrições', () => {
  it('sem restrições segue como antes', () => {
    expect(validarOperacao(BASE, HOJE).ok).toBe(true);
  });

  it('ticker fora da watchlist é recusado, sem diferenciar maiúsculas', () => {
    const fora = validarOperacao({ ...BASE, ticker: 'vale3' }, HOJE, { tickersPermitidos: ['PETR4'] });
    expect(fora).toEqual({ ok: false, erros: { ticker: 'Escolha um ativo da sua watchlist' } });
    expect(validarOperacao({ ...BASE, ticker: ' petr4 ' }, HOJE, { tickersPermitidos: ['PETR4'] }).ok).toBe(true);
  });

  it('venda hoje maior que a quantidade disponível é recusada com a quantidade na mensagem', () => {
    const resultado = validarOperacao({ ...BASE, tipo: 'VENDA', quantidade: '11' }, HOJE, { disponivel: 10 });
    expect(resultado).toEqual({ ok: false, erros: { quantidade: 'Maior que a quantidade disponível (10)' } });
  });

  it('venda igual ao disponível passa', () => {
    expect(validarOperacao({ ...BASE, tipo: 'VENDA', quantidade: '10' }, HOJE, { disponivel: 10 }).ok).toBe(true);
  });

  it('venda sem posição diz isso', () => {
    const resultado = validarOperacao({ ...BASE, tipo: 'VENDA' }, HOJE, { disponivel: 0 });
    expect(resultado).toEqual({ ok: false, erros: { quantidade: 'Sem posição em carteira neste ativo' } });
  });

  it('venda com data passada vai para o servidor decidir (a posição na data pode ser outra)', () => {
    const ontem = new Date(2026, 9, 9, 12, 0, 0);
    expect(validarOperacao({ ...BASE, tipo: 'VENDA', quantidade: '50', data: ontem }, HOJE, { disponivel: 10 }).ok).toBe(true);
  });

  it('compra nunca é limitada pela quantidade disponível', () => {
    expect(validarOperacao({ ...BASE, quantidade: '500' }, HOJE, { disponivel: 10 }).ok).toBe(true);
  });

  it('disponível desconhecido (null) não bloqueia', () => {
    expect(validarOperacao({ ...BASE, tipo: 'VENDA', quantidade: '500' }, HOJE, { disponivel: null }).ok).toBe(true);
  });
});
```

`src/dominio/kpiCarteira.test.ts`:

```ts
import type { Rentabilidade } from '@/api/tipos';
import { kpiLucroRealizado } from '@/dominio/inicio';

const NBSP = ' ';

function rentabilidade(parcial: Partial<Rentabilidade>): Rentabilidade {
  return {
    custo_base_brl: '300',
    valor_mercado_brl: '330',
    lucro_nao_realizado_brl: '30',
    lucro_realizado_brl: '0',
    percentual: '0.1',
    ...parcial,
  };
}

describe('kpiLucroRealizado', () => {
  it('lucro realizado positivo em BRL, verde', () => {
    expect(kpiLucroRealizado(rentabilidade({ lucro_realizado_brl: '125.5' }))).toEqual({
      valor: `R$${NBSP}125,50`,
      dica: 'Em vendas já registradas',
      cor: 'positivo',
    });
  });

  it('prejuízo realizado fica vermelho', () => {
    expect(kpiLucroRealizado(rentabilidade({ lucro_realizado_brl: '-40' })).cor).toBe('negativo');
  });

  it('sem vendas é zero neutro, não verde', () => {
    const kpi = kpiLucroRealizado(rentabilidade({ lucro_realizado_brl: '0' }));
    expect(kpi.valor).toBe(`R$${NBSP}0,00`);
    expect(kpi.cor).toBe('padrao');
  });

  it('carteira sem operações mostra traço', () => {
    const vazia = rentabilidade({ custo_base_brl: '0', valor_mercado_brl: '0', lucro_realizado_brl: '0' });
    expect(kpiLucroRealizado(vazia)).toEqual({ valor: '—', dica: 'Registre uma operação simulada', cor: 'padrao' });
  });

  it('o lucro realizado não depende de haver cotação das posições abertas', () => {
    const semCotacao = rentabilidade({ valor_mercado_brl: '0', lucro_realizado_brl: '80' });
    expect(kpiLucroRealizado(semCotacao).valor).toBe(`R$${NBSP}80,00`);
  });
});
```

`src/utils/errosOperacao.test.ts`:

```ts
import { ApiError } from '@/api/client';
import { mensagemDeErro } from '@/utils/erros';

it('"data nao pode ser futura" do backend aparece em português', () => {
  expect(mensagemDeErro(new ApiError(422, 'data nao pode ser futura'))).toBe('A data da operação não pode ser futura');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/dominio/posicoes.test.ts src/dominio/operacaoRestricoes.test.ts src/dominio/kpiCarteira.test.ts src/utils/errosOperacao.test.ts`
Expected: FAIL (funções inexistentes; mensagem não traduzida).

- [ ] **Step 3: Implementar**

`src/dominio/rotulos.ts`: acrescentar, depois de `ROTULO_CLASSE_PLURAL`:

```ts
/** Rótulos curtos para filtros e segmentos (cabem em até sete opções na largura de um celular). */
export const ROTULO_CLASSE_CURTO: Record<TipoAtivo, string> = {
  ACAO: 'Ações',
  FII: 'FIIs',
  ETF: 'ETFs',
  BDR: 'BDRs',
  CRIPTO: 'Cripto',
  INDICE: 'Índices',
};
```

`src/utils/erros.ts`: acrescentar ao dicionário `MENSAGENS`, depois de `'Nenhuma operacao registrada'`:

```ts
  'data nao pode ser futura': 'A data da operação não pode ser futura',
```

`src/dominio/inicio.ts`: acrescentar depois de `kpiResultado`:

```ts
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
```

`src/dominio/portfolio.ts` (arquivo inteiro):

```ts
import type { Decimal, Distribuicao, ItemWatchlist, Operacao, Posicao, TipoAtivo, Uuid } from '@/api/tipos';
import { ROTULO_CLASSE_CURTO, ROTULO_CLASSE_PLURAL } from '@/dominio/rotulos';
import { paraNumero } from '@/utils/formatacao';

export interface InfoAtivo {
  ticker: string;
  moeda?: string;
  /** Só conhecido para ativos que estão na watchlist. */
  tipo?: TipoAtivo;
}

/** OperacaoResponse só traz ativo_id: o ticker vem das posições e, com moeda e tipo, da watchlist. */
export function mapaAtivos(
  posicoes: Posicao[] | undefined,
  watchlist: ItemWatchlist[] | undefined,
): Map<Uuid, InfoAtivo> {
  const mapa = new Map<Uuid, InfoAtivo>();
  for (const posicao of posicoes ?? []) mapa.set(posicao.ativo_id, { ticker: posicao.ticker });
  for (const item of watchlist ?? []) {
    mapa.set(item.ativo.id, { ticker: item.ativo.ticker, moeda: item.ativo.moeda, tipo: item.ativo.tipo });
  }
  return mapa;
}

export type DimensaoDistribuicao = 'classe' | 'setor' | 'moeda';

// `type` (e não `interface`): o PolarChart exige dados compatíveis com Record<string, unknown>.
export type FatiaDistribuicao = { rotulo: string; valor: number; cor: string };

function rotuloDaFatia(dimensao: DimensaoDistribuicao, chave: string): string {
  if (dimensao === 'classe') return ROTULO_CLASSE_PLURAL[chave as TipoAtivo] ?? chave;
  if (dimensao === 'setor' && chave === 'N/A') return 'Sem setor';
  return chave;
}

export function prepararDistribuicao(
  distribuicao: Distribuicao,
  dimensao: DimensaoDistribuicao,
  paleta: readonly string[],
): FatiaDistribuicao[] {
  const bruto: Record<string, Decimal> =
    dimensao === 'classe' ? distribuicao.por_classe : dimensao === 'setor' ? distribuicao.por_setor : distribuicao.por_moeda;

  return Object.entries(bruto)
    .map(([chave, valor]) => ({ rotulo: rotuloDaFatia(dimensao, chave), valor: paraNumero(valor) }))
    .filter((fatia) => fatia.valor > 0)
    .sort((a, b) => b.valor - a.valor)
    .map((fatia, indice) => ({ ...fatia, cor: paleta[indice % paleta.length] }));
}

export type FiltroPosicoes = 'TODAS' | TipoAtivo | 'OUTROS';

const ORDEM_DAS_CLASSES: readonly TipoAtivo[] = ['ACAO', 'FII', 'ETF', 'BDR', 'CRIPTO', 'INDICE'];

function classeDaPosicao(posicao: Posicao, ativos: ReadonlyMap<Uuid, InfoAtivo>): TipoAtivo | 'OUTROS' {
  return ativos.get(posicao.ativo_id)?.tipo ?? 'OUTROS';
}

/**
 * Filtros que valem a pena: só as classes que existem nas posições (e "Outros" para ativos que saíram da watchlist,
 * dos quais o tipo não se conhece). Com uma classe só não há o que filtrar.
 */
export function filtrosDasPosicoes(
  posicoes: readonly Posicao[],
  ativos: ReadonlyMap<Uuid, InfoAtivo>,
): FiltroPosicoes[] {
  const presentes = new Set(posicoes.map((posicao) => classeDaPosicao(posicao, ativos)));
  const filtros: FiltroPosicoes[] = ORDEM_DAS_CLASSES.filter((classe) => presentes.has(classe));
  if (presentes.has('OUTROS')) filtros.push('OUTROS');
  return filtros.length > 1 ? ['TODAS', ...filtros] : ['TODAS'];
}

export function filtrarPosicoes(
  posicoes: readonly Posicao[],
  ativos: ReadonlyMap<Uuid, InfoAtivo>,
  filtro: FiltroPosicoes,
): Posicao[] {
  if (filtro === 'TODAS') return [...posicoes];
  return posicoes.filter((posicao) => classeDaPosicao(posicao, ativos) === filtro);
}

export function rotuloDoFiltro(filtro: FiltroPosicoes): string {
  if (filtro === 'TODAS') return 'Todas';
  if (filtro === 'OUTROS') return 'Outros';
  return ROTULO_CLASSE_CURTO[filtro];
}

const TOLERANCIA_DO_SALDO = 1e-8;

/** Saldo comprado por ativo segundo as operações: COMPRA soma, VENDA subtrai. */
function saldoPorAtivo(operacoes: readonly Operacao[]): Map<Uuid, number> {
  const saldos = new Map<Uuid, number>();
  for (const operacao of operacoes) {
    const quantidade = paraNumero(operacao.quantidade);
    if (!Number.isFinite(quantidade)) continue;
    const sinal = operacao.tipo === 'COMPRA' ? 1 : -1;
    saldos.set(operacao.ativo_id, (saldos.get(operacao.ativo_id) ?? 0) + sinal * quantidade);
  }
  return saldos;
}

/**
 * `/portfolio/posicoes` omite o ativo que não consegue cotar. Ativo com saldo nas operações e sem posição é exatamente
 * isso (posição zerada por venda total não entra: o saldo é zero).
 */
export function ativosSemCotacao(operacoes: readonly Operacao[], posicoes: readonly Posicao[]): Uuid[] {
  const comPosicao = new Set(posicoes.map((posicao) => posicao.ativo_id));
  return [...saldoPorAtivo(operacoes)]
    .filter(([ativoId, saldo]) => saldo > TOLERANCIA_DO_SALDO && !comPosicao.has(ativoId))
    .map(([ativoId]) => ativoId);
}

/** Texto do aviso de dados parciais; null quando nada ficou sem cotação. */
export function descreverDadosParciais(ids: readonly Uuid[], ativos: ReadonlyMap<Uuid, InfoAtivo>): string | null {
  if (ids.length === 0) return null;
  const nomes = ids.map((id) => ativos.get(id)?.ticker).filter((ticker): ticker is string => Boolean(ticker));
  const mostrados = nomes.slice(0, 3);
  const restantes = ids.length - mostrados.length;
  let lista = mostrados.join(', ');
  if (restantes > 0) {
    lista = mostrados.length > 0 ? `${lista} e mais ${restantes}` : `${restantes} ${restantes === 1 ? 'ativo' : 'ativos'}`;
  }
  return `Sem cotação agora para ${lista}: o valor de mercado e o resultado da carteira podem estar incompletos.`;
}

/**
 * Quantidade que dá para vender hoje: o saldo das operações. Não usa `/portfolio/posicoes` porque ela omite o ativo sem
 * cotação, e a venda dele não pode ser bloqueada por falha da fonte de preços.
 */
export function quantidadeDisponivel(operacoes: readonly Operacao[], ativoId: Uuid): number {
  return Math.max(saldoPorAtivo(operacoes).get(ativoId) ?? 0, 0);
}
```

`src/dominio/operacao.ts`: trocar a importação de formatação para `import { dataParaISOLocal, formatarQuantidade, normalizarDecimal } from '@/utils/formatacao';` e substituir `validarOperacao` por:

```ts
export interface RestricoesOperacao {
  /** Tickers que o usuário pode operar (a watchlist). Ausente = sem restrição. */
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
    erros.ticker = 'Escolha um ativo da sua watchlist';
  }
  if (quantidade === null) erros.quantidade = 'Informe uma quantidade maior que zero';
  if (precoUnitario === null) erros.precoUnitario = 'Informe um preço maior que zero';
  // Strings AAAA-MM-DD comparam na mesma ordem que as datas.
  if (data > dataDeHoje) erros.data = 'A data não pode ser futura';

  // Venda feita hoje: a posição na data é a de agora. Com data passada ela pode ser outra e o servidor decide.
  const disponivel = restricoes.disponivel;
  if (
    form.tipo === 'VENDA' &&
    quantidade !== null &&
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
```

- [ ] **Step 4: Rodar, verificar e commitar**

Run: `npx jest src/dominio src/utils` → PASS (inclusive os testes anteriores de `portfolio` e `operacao`). Run: `npm run verificar` → exit 0.

```bash
git add docs/superpowers/plans/2026-10-11-etapa-6-carteira-e-operacoes.md src/dominio src/utils
git commit -m "feat(carteira): regras puras de filtro, dados parciais, saldo disponível e restrições da operação" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Aba Carteira

**Files:**
- Modify: `app/(tabs)/portfolio.tsx`, `app/(tabs)/_layout.tsx`, `src/components/ItemPosicao.tsx`, `__tests__/telas/portfolio.test.tsx`
- Create: `src/components/itemPosicao.test.tsx`

**Interfaces:**
- Consumes: tudo da Tarefa 1; `useCotacoes`; `variacaoDoDia`, `kpiPatrimonio`, `kpiResultado`, `kpiVariacaoDoDia`, `posicoesSemCotacao`, `tomDoKpi`.
- Produces: `ItemPosicao({ posicao, moeda?, variacaoDoDia?: Decimal | null, aoPressionar? })` (`undefined` = carregando, `null` = indisponível).

- [ ] **Step 1: Testes (falham)**

`src/components/itemPosicao.test.tsx`:

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { Operacao, Posicao } from '@/api/tipos';
import { ItemOperacao } from '@/components/ItemOperacao';
import { ItemPosicao } from '@/components/ItemPosicao';
import { coresEscuro } from '@/theme/cores';

const posicao: Posicao = {
  ativo_id: 'a-1',
  ticker: 'PETR4',
  quantidade: '10',
  preco_medio: '30',
  cotacao_atual: '33',
  valor_mercado: '330',
  valor_mercado_brl: '330',
  lucro_nao_realizado: '30',
  lucro_realizado: '0',
};

describe('ItemPosicao: variação do dia', () => {
  it('mostra a variação do dia em pontos percentuais', async () => {
    await render(<ItemPosicao posicao={posicao} moeda="BRL" variacaoDoDia="1.05" />);
    expect(screen.getByText('▲ +1,05%')).toBeOnTheScreen();
  });

  it('variação indisponível aparece como traço, nunca como 0,00%', async () => {
    await render(<ItemPosicao posicao={posicao} moeda="BRL" variacaoDoDia={null} />);
    expect(screen.getByText('Hoje —')).toBeOnTheScreen();
    expect(screen.queryByText(/0,00%/)).not.toBeOnTheScreen();
  });

  it('enquanto carrega não mostra nada no lugar da variação', async () => {
    await render(<ItemPosicao posicao={posicao} moeda="BRL" />);
    expect(screen.queryByText(/Hoje/)).not.toBeOnTheScreen();
    expect(screen.queryByText(/%/)).not.toBeOnTheScreen();
  });

  it('com aoPressionar vira botão', async () => {
    const user = userEvent.setup();
    const aoPressionar = jest.fn();
    await render(<ItemPosicao posicao={posicao} moeda="BRL" aoPressionar={aoPressionar} />);
    await user.press(screen.getByRole('button'));
    expect(aoPressionar).toHaveBeenCalledTimes(1);
  });

  it('sem aoPressionar não é botão', async () => {
    await render(<ItemPosicao posicao={posicao} moeda="BRL" />);
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });
});

describe('ItemOperacao: COMPRA e VENDA sem verde nem vermelho', () => {
  const base: Operacao = {
    id: 'o-1',
    ativo_id: 'a-1',
    tipo: 'COMPRA',
    quantidade: '10',
    preco_unitario: '30',
    data: '2026-09-01',
    criado_em: '2026-09-01T12:00:00Z',
  };

  it.each([
    ['COMPRA', 'Compra · PETR4'],
    ['VENDA', 'Venda · PETR4'],
  ] as const)('%s usa a cor padrão de texto', async (tipo, titulo) => {
    await render(
      <ItemOperacao operacao={{ ...base, tipo }} ticker="PETR4" moeda="BRL" aoRemover={jest.fn()} removendo={false} />,
    );
    const estilo = StyleSheet.flatten(screen.getByText(titulo).props.style) as { color?: string };
    expect([coresEscuro.positivo, coresEscuro.negativo]).not.toContain(estilo.color);
  });
});
```

`__tests__/telas/portfolio.test.tsx` — arquivo inteiro:

```tsx
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { ativosApi } from '@/api/ativos';
import { ApiError } from '@/api/client';
import { portfolioApi } from '@/api/portfolio';
import type { Comparativo, ItemWatchlist, Operacao, Posicao, TipoBenchmark } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { renderizar } from '@/test/renderizar';

import Portfolio from '../../app/(tabs)/portfolio';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
// A rosca usa Skia, que não roda no Jest.
jest.mock('@/components/GraficoDistribuicao', () => ({ GraficoDistribuicao: () => null }));
jest.mock('@/api/portfolio', () => ({
  portfolioApi: {
    listarOperacoes: jest.fn(),
    posicoes: jest.fn(),
    rentabilidade: jest.fn(),
    benchmark: jest.fn(),
    distribuicao: jest.fn(),
    removerOperacao: jest.fn(),
  },
}));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn() } }));
jest.mock('@/api/ativos', () => ({ ativosApi: { cotacao: jest.fn() } }));

const NBSP = ' ';

function compra(id: string, ativoId = 'a-1', parcial: Partial<Operacao> = {}): Operacao {
  return {
    id,
    ativo_id: ativoId,
    tipo: 'COMPRA',
    quantidade: '10',
    preco_unitario: '30',
    data: '2026-09-01',
    criado_em: '2026-09-01T12:00:00Z',
    ...parcial,
  };
}

function posicao(ativoId: string, ticker: string): Posicao {
  return {
    ativo_id: ativoId,
    ticker,
    quantidade: '10',
    preco_medio: '30',
    cotacao_atual: '33',
    valor_mercado: '330',
    valor_mercado_brl: '330',
    lucro_nao_realizado: '30',
    lucro_realizado: '0',
  };
}

function item(id: string, ticker: string, tipo: ItemWatchlist['ativo']['tipo'] = 'ACAO'): ItemWatchlist {
  return {
    ativo: { id, ticker, nome: ticker, tipo, setor: null, moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-09-25T12:00:00Z',
  };
}

const rentabilidade = {
  custo_base_brl: '300',
  valor_mercado_brl: '330',
  lucro_nao_realizado_brl: '30',
  lucro_realizado_brl: '12.5',
  percentual: '0.1',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  // Defaults: toda consulta da tela precisa devolver algo (o TanStack rejeita `undefined`).
  jest.mocked(portfolioApi.posicoes).mockResolvedValue([]);
  jest.mocked(portfolioApi.rentabilidade).mockResolvedValue({
    custo_base_brl: '0',
    valor_mercado_brl: '0',
    lucro_nao_realizado_brl: '0',
    lucro_realizado_brl: '0',
    percentual: '0',
  });
  jest.mocked(portfolioApi.benchmark).mockRejectedValue(new ApiError(404, 'Nenhuma operacao registrada'));
  jest.mocked(portfolioApi.distribuicao).mockResolvedValue({ por_classe: {}, por_setor: {}, por_moeda: {} });
  jest.mocked(ativosApi.cotacao).mockResolvedValue({
    ticker: 'PETR4',
    preco: '33',
    variacao: '0.34',
    variacao_percentual: '1.05',
    maxima_dia: '33.5',
    minima_dia: '32',
    volume: '1000',
  });
});

function prepararCarteiraCompleta() {
  jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([compra('o-1')]);
  jest.mocked(portfolioApi.posicoes).mockResolvedValue([posicao('a-1', 'PETR4')]);
  jest.mocked(portfolioApi.rentabilidade).mockResolvedValue(rentabilidade);
  jest.mocked(watchlistApi.listar).mockResolvedValue([item('a-1', 'PETR4')]);
  jest.mocked(portfolioApi.benchmark).mockImplementation(
    async (benchmark: TipoBenchmark): Promise<Comparativo> => ({
      benchmark,
      rentabilidade_carteira_percentual: '0.1',
      rentabilidade_benchmark_percentual: benchmark === 'CDI' ? null : '0.02',
    }),
  );
  jest.mocked(portfolioApi.distribuicao).mockResolvedValue({
    por_classe: { ACAO: '1' },
    por_setor: { Petróleo: '1' },
    por_moeda: { BRL: '1' },
  });
}

it('sem operações mostra o estado vazio com atalho para registrar', async () => {
  const user = userEvent.setup();
  jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([]);
  await renderizar(<Portfolio />);
  await user.press(await screen.findByRole('button', { name: 'Registrar operação' }));
  expect(router.push).toHaveBeenCalledWith('/operacao/nova');
});

describe('com operações', () => {
  it('mostra os KPIs com frações ×100 e o benchmark indisponível como "indisponível"', async () => {
    prepararCarteiraCompleta();
    await renderizar(<Portfolio />);

    expect(await screen.findByText('Patrimônio simulado')).toBeOnTheScreen();
    // 0,1 (fração) → +10,00%: na dica do Resultado não realizado e na linha da carteira do comparativo.
    expect(await screen.findAllByText('+10,00%')).toHaveLength(2);
    expect(screen.getByText(`R$${NBSP}12,50`)).toBeOnTheScreen();
    // Comparativo: CDI null → indisponível; Ibovespa 0,02 (fração) → +2,00%
    expect(await screen.findByText('+2,00%')).toBeOnTheScreen();
    expect(screen.getByText('indisponível')).toBeOnTheScreen();
  });

  it('mostra o ticker das operações e o aviso de simulação', async () => {
    prepararCarteiraCompleta();
    await renderizar(<Portfolio />);
    expect(await screen.findByText('Compra · PETR4')).toBeOnTheScreen();
    expect(screen.getByText(/Carteira simulada/)).toBeOnTheScreen();
  });

  it('a posição mostra a variação do dia da cotação em pontos percentuais', async () => {
    prepararCarteiraCompleta();
    await renderizar(<Portfolio />);
    expect(await screen.findAllByText('▲ +1,05%')).not.toHaveLength(0);
  });

  it('cotação do ativo indisponível mostra "Hoje —" na posição', async () => {
    prepararCarteiraCompleta();
    jest.mocked(ativosApi.cotacao).mockRejectedValue(new ApiError(404, 'Cotacao nao encontrada para o ativo'));
    await renderizar(<Portfolio />);
    expect(await screen.findByText('Hoje —')).toBeOnTheScreen();
  });

  it('tocar numa posição abre o detalhe do ativo', async () => {
    const user = userEvent.setup();
    prepararCarteiraCompleta();
    await renderizar(<Portfolio />);
    await user.press(await screen.findByRole('button', { name: /^PETR4/ }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1', ticker: 'PETR4' } });
  });
});

describe('dados parciais (ativo sem cotação)', () => {
  it('avisa quando uma operação tem saldo e o backend omitiu a posição', async () => {
    prepararCarteiraCompleta();
    jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([compra('o-1'), compra('o-2', 'a-2')]);
    jest.mocked(watchlistApi.listar).mockResolvedValue([item('a-1', 'PETR4'), item('a-2', 'VALE3')]);
    await renderizar(<Portfolio />);
    expect(await screen.findByText(/Sem cotação agora para VALE3/)).toBeOnTheScreen();
  });

  it('com todas as posições cotadas não mostra o aviso', async () => {
    prepararCarteiraCompleta();
    await renderizar(<Portfolio />);
    await screen.findByText('Compra · PETR4');
    expect(screen.queryByText(/Sem cotação agora/)).not.toBeOnTheScreen();
  });
});

describe('filtro das posições por classe', () => {
  function prepararDuasClasses() {
    prepararCarteiraCompleta();
    jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([compra('o-1'), compra('o-2', 'a-2')]);
    jest.mocked(portfolioApi.posicoes).mockResolvedValue([posicao('a-1', 'PETR4'), posicao('a-2', 'BTC')]);
    jest.mocked(watchlistApi.listar).mockResolvedValue([item('a-1', 'PETR4'), item('a-2', 'BTC', 'CRIPTO')]);
  }

  it('filtra por classe e volta para todas', async () => {
    const user = userEvent.setup();
    prepararDuasClasses();
    await renderizar(<Portfolio />);
    await user.press(await screen.findByRole('radio', { name: 'Cripto' }));
    expect(screen.queryByRole('button', { name: /^PETR4/ })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^BTC/ })).toBeOnTheScreen();
    await user.press(screen.getByRole('radio', { name: 'Todas' }));
    expect(screen.getByRole('button', { name: /^PETR4/ })).toBeOnTheScreen();
  });

  it('com uma classe só não mostra o filtro', async () => {
    prepararCarteiraCompleta();
    await renderizar(<Portfolio />);
    await screen.findByText('Compra · PETR4');
    expect(screen.queryByRole('radio', { name: 'Cripto' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('radiogroup', { name: 'Filtrar posições por classe' })).not.toBeOnTheScreen();
  });
});

it('remoção bloqueada pelo backend (422 só com UUID) mostra frase legível, nunca o UUID', async () => {
  const user = userEvent.setup();
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([compra('o-1')]);
  jest
    .mocked(portfolioApi.removerOperacao)
    .mockRejectedValue(new ApiError(422, '3fa85f64-5717-4562-b3fc-2c963f66afa6'));
  await renderizar(<Portfolio />);
  await user.press(await screen.findByRole('button', { name: /^Remover operação de compra/ }));
  const remover = alerta.mock.calls[0]?.[2]?.find((botao) => botao.text === 'Remover');
  remover?.onPress?.();
  await waitFor(() => expect(alerta).toHaveBeenCalledTimes(2));
  expect(alerta).toHaveBeenLastCalledWith(
    'Não foi possível remover',
    'Esta operação não pode ser removida: uma venda posterior ficaria sem saldo em carteira.',
  );
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/components/itemPosicao.test.tsx __tests__/telas/portfolio.test.tsx`
Expected: FAIL (`ItemPosicao` sem variação nem toque; a tela ainda não tem KPIs, aviso nem filtro).

- [ ] **Step 3: Implementar**

`src/components/ItemPosicao.tsx` (arquivo inteiro):

```tsx
import { Pressable, StyleSheet, View } from 'react-native';

import type { Decimal, Posicao } from '@/api/tipos';
import { Texto } from '@/components/Texto';
import { VariacaoBadge } from '@/components/VariacaoBadge';
import { espaco } from '@/theme/escala';
import { formatarMoeda, formatarQuantidade, paraNumero } from '@/utils/formatacao';

interface Props {
  posicao: Posicao;
  moeda?: string;
  /** Variação do dia do ativo em pontos percentuais: `undefined` = carregando, `null` = indisponível. */
  variacaoDoDia?: Decimal | null;
  aoPressionar?: () => void;
}

export function ItemPosicao({ posicao, moeda, variacaoDoDia, aoPressionar }: Props) {
  const lucro = paraNumero(posicao.lucro_nao_realizado);
  const corLucro = lucro > 0 ? 'positivo' : lucro < 0 ? 'negativo' : 'secundario';

  const conteudo = (
    <View style={estilos.linha}>
      <View style={estilos.esquerda}>
        <Texto negrito>{posicao.ticker}</Texto>
        <Texto variante="legenda" cor="secundario">
          {`${formatarQuantidade(posicao.quantidade)} × PM ${formatarMoeda(posicao.preco_medio, moeda)}`}
        </Texto>
      </View>
      <View style={estilos.direita}>
        <Texto negrito numerico>
          {formatarMoeda(posicao.valor_mercado_brl, 'BRL')}
        </Texto>
        <Texto variante="legenda" cor={corLucro} numerico>
          {`${lucro > 0 ? '+' : ''}${formatarMoeda(posicao.lucro_nao_realizado, moeda)}`}
        </Texto>
        {variacaoDoDia === null ? (
          <Texto variante="legenda" cor="secundario">
            Hoje —
          </Texto>
        ) : variacaoDoDia !== undefined ? (
          <VariacaoBadge valor={variacaoDoDia} escala="pontos" />
        ) : null}
      </View>
    </View>
  );

  if (!aoPressionar) return conteudo;
  return (
    <Pressable role="button" onPress={aoPressionar} style={estilos.alvo}>
      {conteudo}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  esquerda: { flex: 1, gap: 2 },
  direita: { alignItems: 'flex-end', gap: 2 },
  alvo: { minHeight: 44, justifyContent: 'center' },
});
```

`app/(tabs)/_layout.tsx`: trocar o título da aba (edição):

```edit:app/(tabs)/_layout.tsx
<<<<
          title: 'Portfólio',
====
          title: 'Carteira',
>>>>
```

`app/(tabs)/portfolio.tsx` (arquivo inteiro):

```tsx
import type { UseQueryResult } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import type { ApiError } from '@/api/client';
import type { Comparativo, CotacaoAtual, Operacao, Uuid } from '@/api/tipos';
import { BotaoFlutuante } from '@/components/BotaoFlutuante';
import { Card } from '@/components/Card';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoConsulta } from '@/components/EstadoConsulta';
import { EstadoVazio } from '@/components/EstadoVazio';
import { GraficoDistribuicao } from '@/components/GraficoDistribuicao';
import { ItemOperacao } from '@/components/ItemOperacao';
import { ItemPosicao } from '@/components/ItemPosicao';
import { Kpi } from '@/components/Kpi';
import { Linha } from '@/components/Linha';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import {
  kpiLucroRealizado,
  kpiPatrimonio,
  kpiResultado,
  kpiVariacaoDoDia,
  posicoesSemCotacao,
  tomDoKpi,
  variacaoDoDia,
} from '@/dominio/inicio';
import { mensagemErroOperacao } from '@/dominio/operacao';
import {
  ativosSemCotacao,
  type DimensaoDistribuicao,
  descreverDadosParciais,
  type FiltroPosicoes,
  filtrarPosicoes,
  filtrosDasPosicoes,
  mapaAtivos,
  prepararDistribuicao,
  rotuloDoFiltro,
} from '@/dominio/portfolio';
import { useCotacoes } from '@/hooks/useAtivo';
import {
  useBenchmark,
  useDistribuicao,
  useOperacoes,
  usePosicoes,
  useRemoverOperacao,
  useRentabilidade,
} from '@/hooks/usePortfolio';
import { useWatchlist } from '@/hooks/useWatchlist';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { ehStatus } from '@/utils/erros';
import { formatarPercentual } from '@/utils/formatacao';

const DIMENSOES: readonly { valor: DimensaoDistribuicao; rotulo: string }[] = [
  { valor: 'classe', rotulo: 'Classe' },
  { valor: 'setor', rotulo: 'Setor' },
  { valor: 'moeda', rotulo: 'Moeda' },
];

type ConsultaComparativo = UseQueryResult<Comparativo, ApiError>;

function textoDoBenchmark(consulta: ConsultaComparativo): string {
  const valor = consulta.data?.rentabilidade_benchmark_percentual;
  if (consulta.isError || valor === null || valor === undefined) return 'indisponível';
  return formatarPercentual(valor, 'fracao');
}

function ComparativoBenchmarks({ cdi, ibovespa }: { cdi: ConsultaComparativo; ibovespa: ConsultaComparativo }) {
  if (cdi.isPending || ibovespa.isPending) return <Carregando />;
  if (ehStatus(cdi.error, 404) || ehStatus(ibovespa.error, 404)) {
    return <EstadoVazio mensagem="Registre uma operação para comparar com CDI e Ibovespa." />;
  }
  const carteira = cdi.data?.rentabilidade_carteira_percentual ?? ibovespa.data?.rentabilidade_carteira_percentual;
  return (
    <>
      {carteira !== undefined ? <Linha rotulo="Carteira" valor={formatarPercentual(carteira, 'fracao')} /> : null}
      <Linha rotulo="CDI" valor={textoDoBenchmark(cdi)} />
      <Linha rotulo="Ibovespa" valor={textoDoBenchmark(ibovespa)} />
    </>
  );
}

export default function Portfolio() {
  const tema = useTema();
  const operacoes = useOperacoes();
  const rentabilidade = useRentabilidade();
  const cdi = useBenchmark('CDI');
  const ibovespa = useBenchmark('IBOVESPA');
  const distribuicao = useDistribuicao();
  const posicoes = usePosicoes();
  const watchlist = useWatchlist();
  const removerOperacao = useRemoverOperacao();
  const [dimensao, setDimensao] = useState<DimensaoDistribuicao>('classe');
  const [filtro, setFiltro] = useState<FiltroPosicoes>('TODAS');
  const ativos = mapaAtivos(posicoes.data, watchlist.data);

  // Variação do dia por posição: mesma chave de cotação do Início, então não repete a consulta.
  const idsDasPosicoes = useMemo(() => (posicoes.data ?? []).map((posicao) => posicao.ativo_id), [posicoes.data]);
  const consultasCotacao = useCotacoes(idsDasPosicoes);
  const cotacaoPorAtivo = new Map<Uuid, (typeof consultasCotacao)[number]>();
  idsDasPosicoes.forEach((id, indice) => cotacaoPorAtivo.set(id, consultasCotacao[indice]));
  const cotacoesPorId = new Map<Uuid, CotacaoAtual | undefined>(
    idsDasPosicoes.map((id, indice) => [id, consultasCotacao[indice]?.data]),
  );

  function atualizar() {
    for (const consulta of [operacoes, rentabilidade, cdi, ibovespa, distribuicao, posicoes, ...consultasCotacao]) {
      void consulta.refetch();
    }
  }

  function confirmarRemocao(operacao: Operacao) {
    Alert.alert('Remover operação', 'Remover esta operação simulada do histórico?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () =>
          removerOperacao.mutate(operacao.id, {
            onError: (erro) => Alert.alert('Não foi possível remover', mensagemErroOperacao(erro, 'remover')),
          }),
      },
    ]);
  }

  if (operacoes.isPending) return <Carregando />;
  if (operacoes.isError) {
    return <ErroComRetry erro={operacoes.error} aoTentarNovamente={() => void operacoes.refetch()} />;
  }
  if (operacoes.data.length === 0) {
    return (
      <Tela>
        <EstadoVazio
          mensagem="Nenhuma operação simulada registrada."
          acao={{ titulo: 'Registrar operação', onPress: () => router.push('/operacao/nova') }}
        />
      </Tela>
    );
  }

  const semCotacaoNoServidor = posicoesSemCotacao(rentabilidade.data, posicoes.data);
  const rentabilidadeIndisponivel = rentabilidade.isError && rentabilidade.data === undefined;
  const patrimonio = rentabilidade.data ? kpiPatrimonio(rentabilidade.data) : null;
  const resultado = rentabilidade.data ? kpiResultado(rentabilidade.data) : null;
  const realizado = rentabilidade.data ? kpiLucroRealizado(rentabilidade.data) : null;
  const variacao = posicoes.data
    ? kpiVariacaoDoDia(variacaoDoDia(posicoes.data, cotacoesPorId), semCotacaoNoServidor)
    : null;
  const carregandoVariacao = posicoes.isPending || consultasCotacao.some((consulta) => consulta.isPending);

  const avisoDeDadosParciais = posicoes.data
    ? descreverDadosParciais(ativosSemCotacao(operacoes.data, posicoes.data), ativos)
    : null;

  const filtros = filtrosDasPosicoes(posicoes.data ?? [], ativos);
  const filtroAtivo = filtros.includes(filtro) ? filtro : 'TODAS';

  return (
    <View style={estilos.tela}>
      <Tela aoAtualizar={atualizar} atualizando={operacoes.isRefetching}>
        <Texto variante="legenda" cor="secundario">
          Carteira simulada: as operações ficam só aqui e nenhuma ordem é enviada a corretoras. Ferramenta educacional
          de análise, não constitui recomendação de investimento.
        </Texto>

        {avisoDeDadosParciais ? (
          <Card titulo="Dados parciais" icone="info" tomIcone="destaque">
            <Texto role="alert">{avisoDeDadosParciais}</Texto>
          </Card>
        ) : null}

        <View style={estilos.kpis}>
          <Kpi
            rotulo="Patrimônio simulado"
            icone="carteira"
            valor={rentabilidadeIndisponivel ? 'indisponível' : (patrimonio?.valor ?? '')}
            dica={patrimonio?.dica}
            carregando={rentabilidade.isPending}
          />
          <Kpi
            rotulo="Resultado não realizado"
            icone="tendencia"
            tomIcone={tomDoKpi(resultado?.cor ?? 'padrao')}
            corValor={resultado?.cor}
            valor={rentabilidadeIndisponivel ? 'indisponível' : (resultado?.valor ?? '')}
            dica={resultado?.dica}
            carregando={rentabilidade.isPending}
          />
          <Kpi
            rotulo="Lucro realizado"
            icone="carteira"
            tomIcone={tomDoKpi(realizado?.cor ?? 'padrao')}
            corValor={realizado?.cor}
            valor={rentabilidadeIndisponivel ? 'indisponível' : (realizado?.valor ?? '')}
            dica={realizado?.dica}
            carregando={rentabilidade.isPending}
          />
          <Kpi
            rotulo="Variação do dia"
            icone="atividade"
            tomIcone={tomDoKpi(variacao?.cor ?? 'padrao')}
            corValor={variacao?.cor}
            valor={posicoes.isError && posicoes.data === undefined ? 'indisponível' : (variacao?.valor ?? '')}
            dica={variacao?.dica}
            carregando={carregandoVariacao}
          />
        </View>

        <Card titulo="Comparativo desde a 1ª operação" icone="tendencia">
          <ComparativoBenchmarks cdi={cdi} ibovespa={ibovespa} />
        </Card>

        <Card titulo="Distribuição" icone="grafico-pizza">
          <SeletorSegmentado
            rotulo="Agrupar distribuição por"
            opcoes={DIMENSOES}
            selecionado={dimensao}
            aoSelecionar={setDimensao}
          />
          <EstadoConsulta consulta={distribuicao}>
            {(dados) => {
              const fatias = prepararDistribuicao(dados, dimensao, tema.serie);
              return fatias.length > 0 ? (
                <GraficoDistribuicao fatias={fatias} />
              ) : (
                <EstadoVazio mensagem="Sem posições em carteira." />
              );
            }}
          </EstadoConsulta>
        </Card>

        <Card titulo="Posições" icone="lista">
          <EstadoConsulta consulta={posicoes}>
            {(lista) => {
              if (lista.length === 0) return <EstadoVazio mensagem="Nenhuma posição em aberto." />;
              return (
                <>
                  {filtros.length > 1 ? (
                    <SeletorSegmentado
                      rotulo="Filtrar posições por classe"
                      opcoes={filtros.map((valor) => ({ valor, rotulo: rotuloDoFiltro(valor) }))}
                      selecionado={filtroAtivo}
                      aoSelecionar={setFiltro}
                    />
                  ) : null}
                  {filtrarPosicoes(lista, ativos, filtroAtivo).map((posicao) => {
                    const consulta = cotacaoPorAtivo.get(posicao.ativo_id);
                    const variacaoDaPosicao = consulta?.data
                      ? consulta.data.variacao_percentual
                      : consulta?.isError
                        ? null
                        : undefined;
                    return (
                      <ItemPosicao
                        key={posicao.ativo_id}
                        posicao={posicao}
                        moeda={ativos.get(posicao.ativo_id)?.moeda}
                        variacaoDoDia={variacaoDaPosicao}
                        aoPressionar={() =>
                          router.push({
                            pathname: '/ativo/[id]',
                            params: { id: posicao.ativo_id, ticker: posicao.ticker },
                          })
                        }
                      />
                    );
                  })}
                </>
              );
            }}
          </EstadoConsulta>
        </Card>

        <Card titulo="Operações simuladas" icone="lista">
          {operacoes.data.map((operacao) => {
            const info = ativos.get(operacao.ativo_id);
            return (
              <ItemOperacao
                key={operacao.id}
                operacao={operacao}
                ticker={info?.ticker ?? null}
                moeda={info?.moeda}
                removendo={removerOperacao.isPending && removerOperacao.variables === operacao.id}
                aoRemover={() => confirmarRemocao(operacao)}
              />
            );
          })}
        </Card>

        <View style={estilos.espacoDoBotao} />
      </Tela>
      <BotaoFlutuante rotulo="Nova operação" icone="mais" onPress={() => router.push('/operacao/nova')} />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.md },
  espacoDoBotao: { height: 72 },
});
```

- [ ] **Step 4: Rodar, verificar e commitar**

Run: `npx jest src/components/itemPosicao.test.tsx __tests__/telas/portfolio.test.tsx` → PASS. Run: `npm run verificar` → exit 0.

```bash
git add app src __tests__
git commit -m "feat(carteira): KPIs, aviso de simulação e de dados parciais, posições com variação do dia e filtro" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Nova operação só com ativo da watchlist

**Files:**
- Modify: `app/operacao/nova.tsx`, `__tests__/telas/nova-operacao.test.tsx`

**Interfaces:**
- Consumes: `validarOperacao` com restrições, `quantidadeDisponivel` (Tarefa 1); `useOperacoes`.

- [ ] **Step 1: Testes (falham)**

`__tests__/telas/nova-operacao.test.tsx` — arquivo inteiro:

```tsx
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ativosApi } from '@/api/ativos';
import { ApiError } from '@/api/client';
import { portfolioApi } from '@/api/portfolio';
import type { ItemWatchlist, Operacao } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { renderizar } from '@/test/renderizar';
import { dataParaISOLocal } from '@/utils/formatacao';

import NovaOperacao from '../../app/operacao/nova';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
// O seletor de data é nativo; a data padrão (hoje) é suficiente para estes testes.
jest.mock('@/components/CampoData', () => ({ CampoData: () => null }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn(), adicionar: jest.fn() } }));
jest.mock('@/api/portfolio', () => ({ portfolioApi: { registrarOperacao: jest.fn(), listarOperacoes: jest.fn() } }));
jest.mock('@/api/ativos', () => ({ ativosApi: { cotacao: jest.fn() } }));

const NBSP = ' ';

function item(id: string, ticker: string): ItemWatchlist {
  return {
    ativo: { id, ticker, nome: ticker, tipo: 'ACAO', setor: null, moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-09-25T12:00:00Z',
  };
}

function compra(id: string, ativoId: string, quantidade: string): Operacao {
  return {
    id,
    ativo_id: ativoId,
    tipo: 'COMPRA',
    quantidade,
    preco_unitario: '30',
    data: '2026-09-01',
    criado_em: '2026-09-01T12:00:00Z',
  };
}

async function abrir() {
  await renderizar(<NovaOperacao />);
  await screen.findByRole('button', { name: 'Registrar operação' });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(watchlistApi.listar).mockResolvedValue([item('a-1', 'PETR4')]);
  jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([]);
  jest.mocked(ativosApi.cotacao).mockResolvedValue({
    ticker: 'PETR4',
    preco: '38.2',
    variacao: '0',
    variacao_percentual: '0',
    maxima_dia: '39',
    minima_dia: '38',
    volume: '1000',
  });
});

it('mostra o aviso de operação simulada', async () => {
  await abrir();
  expect(screen.getByText(/nenhuma ordem real é enviada/)).toBeOnTheScreen();
});

it('watchlist vazia leva à busca em vez de deixar digitar qualquer ativo', async () => {
  const user = userEvent.setup();
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  await renderizar(<NovaOperacao />);
  expect(await screen.findByText(/o ativo precisa estar na sua watchlist/)).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Registrar operação' })).not.toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Buscar ativo' }));
  expect(router.push).toHaveBeenCalledWith('/buscar');
});

it('valida os campos antes de enviar', async () => {
  const user = userEvent.setup();
  await abrir();
  await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
  expect(await screen.findByText('Informe o ticker do ativo')).toBeOnTheScreen();
  expect(portfolioApi.registrarOperacao).not.toHaveBeenCalled();
});

it('ticker fora da watchlist é recusado e nada é adicionado em silêncio', async () => {
  const user = userEvent.setup();
  await abrir();
  await user.type(screen.getByLabelText('Ativo (ticker)'), 'vale3');
  await user.type(screen.getByLabelText('Quantidade'), '10');
  await user.type(screen.getByLabelText('Preço unitário'), '61,4');
  await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
  expect(await screen.findByText('Escolha um ativo da sua watchlist')).toBeOnTheScreen();
  expect(watchlistApi.adicionar).not.toHaveBeenCalled();
  expect(portfolioApi.registrarOperacao).not.toHaveBeenCalled();
});

it('registra com o ativo da watchlist, ticker normalizado e decimais convertidos', async () => {
  const user = userEvent.setup();
  jest.mocked(portfolioApi.registrarOperacao).mockResolvedValue({ id: 'o-2' } as Operacao);
  await abrir();
  await user.type(screen.getByLabelText('Ativo (ticker)'), '  petr4 ');
  await user.type(screen.getByLabelText('Quantidade'), '10,5');
  await user.type(screen.getByLabelText('Preço unitário'), '38,2');
  await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
  await waitFor(() => expect(router.back).toHaveBeenCalled());
  expect(watchlistApi.adicionar).not.toHaveBeenCalled();
  expect(portfolioApi.registrarOperacao).toHaveBeenCalledWith({
    ativo_id: 'a-1',
    tipo: 'COMPRA',
    quantidade: '10.5',
    preco_unitario: '38.2',
    data: dataParaISOLocal(new Date()),
  });
});

it('atalho da watchlist e "usar cotação atual" preenchem ticker e preço', async () => {
  const user = userEvent.setup();
  await abrir();
  await user.press(await screen.findByRole('button', { name: 'Usar PETR4' }));
  await user.press(await screen.findByRole('button', { name: `Usar cotação atual (R$${NBSP}38,20)` }));
  expect(screen.getByLabelText('Ativo (ticker)')).toHaveDisplayValue('PETR4');
  expect(screen.getByLabelText('Preço unitário')).toHaveDisplayValue('38,2');
});

describe('venda', () => {
  it('mostra a quantidade disponível a partir das operações', async () => {
    const user = userEvent.setup();
    jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([compra('o-1', 'a-1', '10'), compra('o-2', 'a-1', '5')]);
    await abrir();
    await user.press(screen.getByRole('radio', { name: 'Venda' }));
    await user.press(await screen.findByRole('button', { name: 'Usar PETR4' }));
    expect(await screen.findByText('Disponível para venda: 15')).toBeOnTheScreen();
  });

  it('venda maior que o disponível hoje é recusada sem ir ao servidor', async () => {
    const user = userEvent.setup();
    jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([compra('o-1', 'a-1', '10')]);
    await abrir();
    await user.press(screen.getByRole('radio', { name: 'Venda' }));
    await user.press(await screen.findByRole('button', { name: 'Usar PETR4' }));
    await screen.findByText('Disponível para venda: 10');
    await user.type(screen.getByLabelText('Quantidade'), '11');
    await user.type(screen.getByLabelText('Preço unitário'), '38');
    await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
    expect(await screen.findByText('Maior que a quantidade disponível (10)')).toBeOnTheScreen();
    expect(portfolioApi.registrarOperacao).not.toHaveBeenCalled();
  });

  it('ativo sem posição diz isso', async () => {
    const user = userEvent.setup();
    await abrir();
    await user.press(screen.getByRole('radio', { name: 'Venda' }));
    await user.press(await screen.findByRole('button', { name: 'Usar PETR4' }));
    expect(await screen.findByText('Sem posição em carteira neste ativo.')).toBeOnTheScreen();
  });

  it('operações ainda não carregadas não bloqueiam a venda (o servidor decide)', async () => {
    const user = userEvent.setup();
    jest.mocked(portfolioApi.listarOperacoes).mockRejectedValue(new ApiError(500, 'Falha no servidor'));
    jest.mocked(portfolioApi.registrarOperacao).mockResolvedValue({ id: 'o-3' } as Operacao);
    await abrir();
    await user.press(screen.getByRole('radio', { name: 'Venda' }));
    await user.type(screen.getByLabelText('Ativo (ticker)'), 'PETR4');
    await user.type(screen.getByLabelText('Quantidade'), '500');
    await user.type(screen.getByLabelText('Preço unitário'), '38');
    await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
    await waitFor(() => expect(portfolioApi.registrarOperacao).toHaveBeenCalledTimes(1));
  });
});

describe('erros 422 do backend em português', () => {
  it('venda sem saldo mostra frase legível em vez do UUID', async () => {
    const user = userEvent.setup();
    jest
      .mocked(portfolioApi.registrarOperacao)
      .mockRejectedValue(new ApiError(422, '3fa85f64-5717-4562-b3fc-2c963f66afa6'));
    await abrir();
    await user.type(screen.getByLabelText('Ativo (ticker)'), 'PETR4');
    await user.type(screen.getByLabelText('Quantidade'), '100');
    await user.type(screen.getByLabelText('Preço unitário'), '38');
    await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Quantidade insuficiente em carteira para esta venda na data informada.');
    expect(alerta).not.toHaveTextContent('3fa85f64');
    expect(router.back).not.toHaveBeenCalled();
  });

  it('"data nao pode ser futura" vira frase em português', async () => {
    const user = userEvent.setup();
    jest.mocked(portfolioApi.registrarOperacao).mockRejectedValue(new ApiError(422, 'data nao pode ser futura'));
    await abrir();
    await user.type(screen.getByLabelText('Ativo (ticker)'), 'PETR4');
    await user.type(screen.getByLabelText('Quantidade'), '1');
    await user.type(screen.getByLabelText('Preço unitário'), '38');
    await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A data da operação não pode ser futura');
  });
});

it('submit inválido depois de um erro geral da API remove a mensagem geral e mostra só os erros de campo', async () => {
  const user = userEvent.setup();
  jest.mocked(portfolioApi.registrarOperacao).mockRejectedValue(new ApiError(500, 'Falha no servidor'));
  await abrir();
  await user.type(screen.getByLabelText('Ativo (ticker)'), 'PETR4');
  await user.type(screen.getByLabelText('Quantidade'), '5');
  await user.type(screen.getByLabelText('Preço unitário'), '38');
  await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
  expect(await screen.findByText('Erro no servidor. Tente novamente em instantes.')).toBeOnTheScreen();

  await user.clear(screen.getByLabelText('Ativo (ticker)'));
  await user.press(screen.getByRole('button', { name: 'Registrar operação' }));

  expect(await screen.findByText('Informe o ticker do ativo')).toBeOnTheScreen();
  expect(screen.queryByText('Erro no servidor. Tente novamente em instantes.')).not.toBeOnTheScreen();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest __tests__/telas/nova-operacao.test.tsx`
Expected: FAIL (ainda adiciona à watchlist em silêncio; sem disponível na venda; sem estado de watchlist vazia).

- [ ] **Step 3: Implementar**

`app/operacao/nova.tsx` (arquivo inteiro):

```tsx
import { router } from 'expo-router';
import { useState } from 'react';

import type { TipoOperacao } from '@/api/tipos';
import { Botao } from '@/components/Botao';
import { Campo } from '@/components/Campo';
import { CampoData } from '@/components/CampoData';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { SugestoesTicker } from '@/components/SugestoesTicker';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { type ErrosOperacao, mensagemErroOperacao, validarOperacao } from '@/dominio/operacao';
import { quantidadeDisponivel } from '@/dominio/portfolio';
import { useCotacao } from '@/hooks/useAtivo';
import { useOperacoes, useRegistrarOperacao } from '@/hooks/usePortfolio';
import { useWatchlist } from '@/hooks/useWatchlist';
import { ehStatus } from '@/utils/erros';
import { formatarMoeda, formatarQuantidade } from '@/utils/formatacao';

// Tipo da operação simulada que o próprio usuário registra (rótulos permitidos pela RN-01).
const TIPOS: readonly { valor: TipoOperacao; rotulo: string }[] = [
  { valor: 'COMPRA', rotulo: 'Compra' },
  { valor: 'VENDA', rotulo: 'Venda' },
];

export default function NovaOperacao() {
  const watchlist = useWatchlist();
  const operacoes = useOperacoes();
  const registrar = useRegistrarOperacao();
  const [tipo, setTipo] = useState<TipoOperacao>('COMPRA');
  const [ticker, setTicker] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [precoUnitario, setPrecoUnitario] = useState('');
  const [data, setData] = useState(() => new Date());
  const [erros, setErros] = useState<ErrosOperacao>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const itens = watchlist.data ?? [];
  // O ativo da operação precisa estar na watchlist: digitar um ticker nunca o adiciona em silêncio (decisão D6).
  const tickerNormalizado = ticker.trim().toUpperCase();
  const itemEscolhido = itens.find((item) => item.ativo.ticker.toUpperCase() === tickerNormalizado);
  const cotacao = useCotacao(itemEscolhido?.ativo.id);
  const precoAtual = cotacao.data?.preco;
  // Saldo vindo das operações (não de /portfolio/posicoes: ela omite o ativo sem cotação). null = ainda não se sabe.
  const disponivel =
    itemEscolhido && operacoes.data ? quantidadeDisponivel(operacoes.data, itemEscolhido.ativo.id) : null;

  async function aoRegistrar() {
    setErroGeral(null);
    const resultado = validarOperacao({ tipo, ticker, quantidade, precoUnitario, data }, new Date(), {
      tickersPermitidos: itens.map((item) => item.ativo.ticker),
      disponivel: tipo === 'VENDA' ? disponivel : null,
    });
    if (!resultado.ok) {
      setErros(resultado.erros);
      return;
    }
    setErros({});
    const { dados } = resultado;
    const ativo = itens.find((item) => item.ativo.ticker.toUpperCase() === dados.ticker);
    if (!ativo) {
      setErros({ ticker: 'Escolha um ativo da sua watchlist' });
      return;
    }
    try {
      await registrar.mutateAsync({
        ativo_id: ativo.ativo.id,
        tipo: dados.tipo,
        quantidade: dados.quantidade,
        preco_unitario: dados.precoUnitario,
        data: dados.data,
      });
      router.back();
    } catch (erro) {
      if (ehStatus(erro, 404)) setErros({ ticker: 'Ativo não encontrado' });
      else setErroGeral(mensagemErroOperacao(erro, 'registrar'));
    }
  }

  if (watchlist.isPending) {
    return (
      <Tela>
        <Carregando />
      </Tela>
    );
  }
  if (watchlist.isError) {
    return (
      <Tela>
        <ErroComRetry erro={watchlist.error} aoTentarNovamente={() => void watchlist.refetch()} />
      </Tela>
    );
  }
  if (itens.length === 0) {
    return (
      <Tela>
        <EstadoVazio
          mensagem="Para registrar uma operação, o ativo precisa estar na sua watchlist. Busque o ativo e adicione-o primeiro."
          acao={{ titulo: 'Buscar ativo', onPress: () => router.push('/buscar') }}
        />
      </Tela>
    );
  }

  return (
    <Tela>
      <Texto cor="secundario">Operação simulada: nenhuma ordem real é enviada a corretoras.</Texto>
      <SeletorSegmentado rotulo="Tipo da operação" opcoes={TIPOS} selecionado={tipo} aoSelecionar={setTipo} />
      <Campo
        rotulo="Ativo (ticker)"
        valor={ticker}
        aoMudar={setTicker}
        erro={erros.ticker}
        autoCapitalize="characters"
        placeholder="Ex.: PETR4"
      />
      <SugestoesTicker tickers={itens.map((item) => item.ativo.ticker)} aoEscolher={setTicker} />
      <Campo
        rotulo="Quantidade"
        valor={quantidade}
        aoMudar={setQuantidade}
        erro={erros.quantidade}
        keyboardType="decimal-pad"
        placeholder="Ex.: 100"
      />
      {tipo === 'VENDA' && itemEscolhido && disponivel !== null ? (
        <Texto variante="legenda" cor="secundario">
          {disponivel > 0
            ? `Disponível para venda: ${formatarQuantidade(disponivel)}`
            : 'Sem posição em carteira neste ativo.'}
        </Texto>
      ) : null}
      <Campo
        rotulo="Preço unitário"
        valor={precoUnitario}
        aoMudar={setPrecoUnitario}
        erro={erros.precoUnitario}
        keyboardType="decimal-pad"
        placeholder="Ex.: 38,50"
      />
      {precoAtual ? (
        <Botao
          variante="secundario"
          titulo={`Usar cotação atual (${formatarMoeda(precoAtual, itemEscolhido?.ativo.moeda)})`}
          onPress={() => setPrecoUnitario(precoAtual.replace('.', ','))}
        />
      ) : null}
      <CampoData rotulo="Data da operação" valor={data} aoMudar={setData} maximo={new Date()} erro={erros.data} />
      {erroGeral ? (
        <Texto role="alert" cor="negativo">
          {erroGeral}
        </Texto>
      ) : null}
      <Botao titulo="Registrar operação" onPress={aoRegistrar} carregando={registrar.isPending} />
    </Tela>
  );
}
```

- [ ] **Step 4: Rodar, verificar e commitar**

Run: `npx jest __tests__/telas/nova-operacao.test.tsx` → PASS. Run: `npm run verificar` → exit 0.

```bash
git add app/operacao/nova.tsx __tests__/telas/nova-operacao.test.tsx
git commit -m "feat(operacao): nova operação só com ativo da watchlist, disponível na venda e erros 422 traduzidos" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Conferência com o backend real, documentação e PR

**Files:**
- Modify: `README.md`, `docs/PLANO.md`, `docs/checkpoint-02.md`

- [ ] **Step 1: Conferir os erros e a omissão de posição no backend local**

Com o backend em `http://localhost:8000`, rodar um script Node (fora do repositório) que cria um usuário descartável, adiciona PETR4 à watchlist e verifica: (a) `POST /operacoes` com data futura devolve 422 com `detail` `data nao pode ser futura`; (b) venda sem posição devolve 422 cujo `detail` é só um UUID; (c) compra, venda parcial, e `DELETE` da compra com a venda ainda existente devolve 422 com UUID; (d) `GET /portfolio/rentabilidade` e `/portfolio/benchmark` voltam em fração; (e) `GET /portfolio/posicoes` não traz campo de moeda nem de tipo. Registrar o resultado no registro da execução. Nada de token em log.

- [ ] **Step 2: Documentação**

- `README.md`: trocar a linha do portfólio por `- Carteira simulada: KPIs (patrimônio, resultado não realizado, lucro realizado e variação do dia), comparação com CDI e Ibovespa (indisponível quando a fonte não cobre), distribuição por classe, setor e moeda, posições com variação do dia e filtro por classe, aviso de dados parciais quando um ativo fica sem cotação, e operações simuladas só com ativos da watchlist (com a quantidade disponível na venda e os erros do servidor em português)`.
- `docs/PLANO.md`, linha da Etapa 6 do §8: acrescentar ao fim do critério ` **Feito em 11/10/2026** (PR da Etapa 6); erros e escalas conferidos com o backend local.`
- `docs/checkpoint-02.md`, §1: acrescentar `- Carteira simulada com KPIs, comparação com CDI e Ibovespa, distribuição, posições com variação do dia e filtro, e registro de operações só com ativos da watchlist.` e, na tabela de endpoints, nada a acrescentar (as rotas já constam).

- [ ] **Step 3: Verificar, commitar, revisão independente e PR**

Run: `npm run verificar` → exit 0.

```bash
git add README.md docs
git commit -m "docs: carteira e operações no README, no plano e no checkpoint" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

Depois: pacote de revisão da branch inteira, revisor independente (opus, somente leitura), uma rodada de correções com teste RED→GREEN, "Registro da execução" no fim deste plano, `git push -u origin feature/etapa-6-carteira-operacoes` e `gh pr create --base feature/etapa-5-alertas-notificacoes` (sem merge, sem trocar bases).
