# Etapa 3: aba Início (dashboard e watchlist) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a aba "Watchlist" na aba **Início**: KPIs da carteira, resumo diário por IA com aviso legal, watchlist com preço, variação, nº de sinais e sino de notificar, e sinais ativos com histórico de 20 pregões, cada parte falhando de forma independente; e entregar o documento do Checkpoint 02.

**Architecture:** Regras puras de apresentação (ordenação, variação do dia ponderada, resumo diário, sinais, texto do backtest, valores dos KPIs) em `src/dominio/inicio.ts`, com teste ao lado. Dois hooks novos em `src/hooks/useAtivo.ts` (`useQueries` por ativo, mesmas chaves do detalhe, então o cache é compartilhado). Componentes de apresentação novos (`Skeleton`, `Kpi`, `ResumoDiarioCard`, `ItemSinalAtivo`) e `LinhaAtivo` estendida. A tela `app/(tabs)/index.tsx` só orquestra hooks e componentes.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript 6, TanStack Query 5, Jest + React Native Testing Library 14.

**Spec:** `docs/PLANO.md` §8 (Etapa 3) e §5.4 (estados de tela); `docs/MAPEAMENTO.md` §3 (mapa de telas, linha "Dashboard") e §2.5 (comportamentos); `Checkpoint02-Mobile.pdf` (requisitos e documentação do checkpoint).

## Global Constraints

- Repositório `C:\Users\Bruno\Insight-flow-mobile`; branch nova `feature/etapa-3-inicio` a partir de `feature/ciclo-1-base-sessao` (PR #3 ainda não entrou). Não alterar backend, web nem desktop.
- Sem dependências novas.
- Fronteiras do `CLAUDE.md`: `app/` só rotas; telas falam com hooks; `src/components/` recebe dados por props e não chama hooks de dados; regras puras em `src/dominio/` com teste ao lado.
- Decimais da API são strings: converter com `paraNumero`. Escalas: `'pontos'` (cotação, backtest, `variacao_percentual`) e `'fracao'` (rentabilidade, benchmark).
- Sem número inventado: `null`/falha nunca vira zero; dado ausente aparece como "—" ou "indisponível".
- Verde/vermelho só para positivo/negativo; sinais técnicos em âmbar/azul; IA em violeta com `AvisoIA` visível (RN-05).
- Cores só via `useTema()`; nunca `fontWeight`; ícones só via `Icone`; alvo de toque ≥ 44 pt; contraste ≥ 4,5:1.
- Linguagem factual: nada de "compre", "venda", "invista".
- Mensagens de erro só via `mensagemDeErro`; sessão só via `useSessao` (não tocar).
- `npm run verificar` verde ao fim de cada tarefa.
- Commits em pt-BR (Conventional Commits) terminando com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; PRs terminam com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- `git push`/`gh` sempre com `GH_TOKEN="$(gh auth token --user brunoosouza09)"` exportado **na mesma chamada**.

## Review Focus

1. **Conta nova** (watchlist vazia, sem operações, sem resumo): nenhum KPI mostra `R$ 0,00`, `NaN` ou `0,00%`; mostram "—" com a explicação, e a tela oferece buscar ativo. Teste na Tarefa 5.
2. **Posição sem cotação** (fonte de dados fora do ar): a variação do dia usa só as posições com cotação e a dica diz "n de m posições"; com nenhuma cotação, mostra "indisponível", nunca `0,00%`. Testes nas Tarefas 1 e 5.
3. **Resumo diário sem `contexto.texto`, com texto vazio ou sem `aviso_legal`:** nunca mostra texto de IA sem o aviso legal; sem texto, cai no estado "nenhum resumo". Testes nas Tarefas 1 e 4.
4. **Falha de um ativo** (cotação ou sinais) não derruba a tela nem os demais ativos. Teste na Tarefa 5.
5. **Valores decimais no limite** (`"0"`, `"0.00"`, `"-12.5"`, percentual `"-0.0001"`): formatação, sinal e cor corretos; `-0` não vira "−0,00%". Teste na Tarefa 1.

---

### Task 1: Branch e regras puras da tela Início

**Files:**
- Create: `src/dominio/inicio.ts`, `src/dominio/inicio.test.ts`

**Interfaces:**
- Consumes: tipos de `@/api/tipos` (`Ativo`, `CotacaoAtual`, `ItemWatchlist`, `Notificacao`, `Posicao`, `Rentabilidade`, `ResultadoBacktest`, `Sinal`, `Uuid`); `paraNumero`, `formatarMoeda`, `formatarPercentual` de `@/utils/formatacao`; `AVISO_IA` de `@/dominio/regulatorio`.
- Produces (usado pelas Tarefas 4 e 5):
  - `ordenarWatchlist(itens: ItemWatchlist[]): ItemWatchlist[]`
  - `interface VariacaoDoDia { pontos: number | null; consideradas: number; total: number }`
  - `variacaoDoDia(posicoes: Posicao[], cotacoes: ReadonlyMap<Uuid, CotacaoAtual | undefined>): VariacaoDoDia`
  - `carteiraVazia(rentabilidade: Rentabilidade): boolean`
  - `interface DadoKpi { valor: string; dica?: string; cor: 'padrao' | 'positivo' | 'negativo' }`
  - `kpiPatrimonio(r: Rentabilidade): DadoKpi`, `kpiResultado(r: Rentabilidade): DadoKpi`, `kpiVariacaoDoDia(v: VariacaoDoDia): DadoKpi`, `kpiSinais(contagem: { total: number; semDados: number }): DadoKpi`
  - `interface ResumoDiario { texto: string; avisoLegal: string; geradoEm: string }` e `ultimoResumoDiario(notificacoes: Notificacao[] | undefined): ResumoDiario | null`
  - `interface SinalDaWatchlist { ativo: Ativo; sinal: Sinal }` e `reunirSinais(itens: ItemWatchlist[], sinaisPorAtivo: ReadonlyMap<Uuid, Sinal[] | undefined>): SinalDaWatchlist[]`
  - `descreverBacktest(backtest: ResultadoBacktest): string`

- [ ] **Step 1: Criar a branch**

```bash
cd /c/Users/Bruno/Insight-flow-mobile
git status --short
git switch -c feature/etapa-3-inicio feature/ciclo-1-base-sessao
```

Expected: árvore limpa; `Switched to a new branch 'feature/etapa-3-inicio'`.

- [ ] **Step 2: Escrever os testes (falham)**

`src/dominio/inicio.test.ts`:

```ts
import type {
  Ativo,
  CotacaoAtual,
  ItemWatchlist,
  Notificacao,
  Posicao,
  Rentabilidade,
  ResultadoBacktest,
  Sinal,
} from '@/api/tipos';
import {
  carteiraVazia,
  descreverBacktest,
  kpiPatrimonio,
  kpiResultado,
  kpiSinais,
  kpiVariacaoDoDia,
  ordenarWatchlist,
  reunirSinais,
  ultimoResumoDiario,
  variacaoDoDia,
} from '@/dominio/inicio';
import { AVISO_IA } from '@/dominio/regulatorio';

const NBSP = '\u00a0';

function ativo(id: string, ticker: string): Ativo {
  return { id, ticker, nome: ticker, tipo: 'ACAO', setor: null, moeda: 'BRL' };
}

function item(id: string, ticker: string): ItemWatchlist {
  return { ativo: ativo(id, ticker), notificar: true, adicionado_em: '2026-10-01T12:00:00Z' };
}

function posicao(ativoId: string, valorBrl: string): Posicao {
  return {
    ativo_id: ativoId,
    ticker: ativoId.toUpperCase(),
    quantidade: '1',
    preco_medio: '1',
    cotacao_atual: '1',
    valor_mercado: valorBrl,
    valor_mercado_brl: valorBrl,
    lucro_nao_realizado: '0',
    lucro_realizado: '0',
  };
}

function cotacao(variacaoPercentual: string): CotacaoAtual {
  return {
    ticker: 'X',
    preco: '10',
    variacao: '0',
    variacao_percentual: variacaoPercentual,
    maxima_dia: '10',
    minima_dia: '10',
    volume: '0',
  };
}

function rentabilidade(parcial: Partial<Rentabilidade> = {}): Rentabilidade {
  return {
    custo_base_brl: '3750.00',
    valor_mercado_brl: '4000.00',
    lucro_nao_realizado_brl: '250.00',
    lucro_realizado_brl: '0',
    percentual: '0.0667',
    ...parcial,
  };
}

const RENTABILIDADE_ZERADA = rentabilidade({
  custo_base_brl: '0',
  valor_mercado_brl: '0',
  lucro_nao_realizado_brl: '0',
  lucro_realizado_brl: '0',
  percentual: '0',
});

describe('ordenarWatchlist', () => {
  it('ordena por ticker, sem alterar a lista recebida', () => {
    const recebida = [item('a-3', 'VALE3'), item('a-1', 'PETR4'), item('a-2', 'BTC')];
    const ordenada = ordenarWatchlist(recebida);
    expect(ordenada.map((i) => i.ativo.ticker)).toEqual(['BTC', 'PETR4', 'VALE3']);
    expect(recebida.map((i) => i.ativo.ticker)).toEqual(['VALE3', 'PETR4', 'BTC']);
  });
});

describe('variacaoDoDia', () => {
  it('pondera pelo valor de mercado em BRL', () => {
    const cotacoes = new Map([
      ['a-1', cotacao('2.00')],
      ['a-2', cotacao('-2.00')],
    ]);
    const v = variacaoDoDia([posicao('a-1', '3000.00'), posicao('a-2', '1000.00')], cotacoes);
    expect(v).toEqual({ pontos: 1, consideradas: 2, total: 2 });
  });

  it('usa só as posições com cotação e informa quantas entraram', () => {
    const cotacoes = new Map([['a-1', cotacao('2.00')]]);
    const v = variacaoDoDia([posicao('a-1', '3000.00'), posicao('a-2', '1000.00')], cotacoes);
    expect(v).toEqual({ pontos: 2, consideradas: 1, total: 2 });
  });

  it('sem nenhuma cotação o resultado é null, nunca zero', () => {
    const v = variacaoDoDia([posicao('a-1', '3000.00')], new Map());
    expect(v).toEqual({ pontos: null, consideradas: 0, total: 1 });
  });

  it('sem posições o total é zero', () => {
    expect(variacaoDoDia([], new Map())).toEqual({ pontos: null, consideradas: 0, total: 0 });
  });

  it('ignora cotação com valor que não é número', () => {
    const cotacoes = new Map([['a-1', cotacao('abc')]]);
    expect(variacaoDoDia([posicao('a-1', '3000.00')], cotacoes).consideradas).toBe(0);
  });
});

describe('carteiraVazia', () => {
  it('verdadeiro quando tudo é zero, em qualquer grafia', () => {
    expect(carteiraVazia(RENTABILIDADE_ZERADA)).toBe(true);
    expect(carteiraVazia(rentabilidade({ custo_base_brl: '0.00', valor_mercado_brl: '0.000', lucro_realizado_brl: '0' }))).toBe(true);
  });

  it('falso quando só há lucro realizado (posições encerradas)', () => {
    expect(carteiraVazia({ ...RENTABILIDADE_ZERADA, lucro_realizado_brl: '120.00' })).toBe(false);
  });
});

describe('KPIs', () => {
  it('patrimônio mostra valor de mercado e custo', () => {
    expect(kpiPatrimonio(rentabilidade())).toEqual({
      valor: `R$${NBSP}4.000,00`,
      dica: `Custo R$${NBSP}3.750,00`,
      cor: 'padrao',
    });
  });

  it('patrimônio de carteira vazia é traço com orientação, não R$ 0,00', () => {
    expect(kpiPatrimonio(RENTABILIDADE_ZERADA)).toEqual({
      valor: '—',
      dica: 'Registre uma operação simulada',
      cor: 'padrao',
    });
  });

  it('resultado positivo é verde e mostra o percentual em fração × 100', () => {
    expect(kpiResultado(rentabilidade())).toEqual({ valor: `R$${NBSP}250,00`, dica: '+6,67%', cor: 'positivo' });
  });

  it('resultado negativo é vermelho e usa o sinal do número', () => {
    const k = kpiResultado(rentabilidade({ lucro_nao_realizado_brl: '-12.5', percentual: '-0.0033' }));
    expect(k.cor).toBe('negativo');
    expect(k.valor).toContain('12,50');
    expect(k.valor.startsWith('-')).toBe(true);
    expect(k.dica).toBe('-0,33%');
  });

  it('resultado quase zero é neutro e nunca "−0,00%"', () => {
    const k = kpiResultado(rentabilidade({ lucro_nao_realizado_brl: '-0.001', percentual: '-0.00001' }));
    expect(k.cor).toBe('padrao');
    expect(k.dica).toBe('0,00%');
  });

  it('resultado de carteira vazia é traço', () => {
    expect(kpiResultado(RENTABILIDADE_ZERADA)).toEqual({ valor: '—', cor: 'padrao' });
  });

  it('variação do dia completa', () => {
    expect(kpiVariacaoDoDia({ pontos: 1, consideradas: 2, total: 2 })).toEqual({
      valor: '+1,00%',
      dica: 'Ponderada pelo valor em BRL',
      cor: 'positivo',
    });
  });

  it('variação do dia parcial informa quantas posições entraram', () => {
    const k = kpiVariacaoDoDia({ pontos: -0.5, consideradas: 1, total: 2 });
    expect(k).toEqual({ valor: '-0,50%', dica: '1 de 2 posições, ponderada pelo valor', cor: 'negativo' });
  });

  it('variação do dia sem cotação é "indisponível", nunca 0,00%', () => {
    expect(kpiVariacaoDoDia({ pontos: null, consideradas: 0, total: 2 })).toEqual({
      valor: 'indisponível',
      dica: 'Sem cotação das posições',
      cor: 'padrao',
    });
  });

  it('variação do dia sem posições é traço', () => {
    expect(kpiVariacaoDoDia({ pontos: null, consideradas: 0, total: 0 })).toEqual({
      valor: '—',
      dica: 'Sem posições abertas',
      cor: 'padrao',
    });
  });

  it('sinais ativos informam os ativos sem dados', () => {
    expect(kpiSinais({ total: 3, semDados: 0 })).toEqual({ valor: '3', cor: 'padrao' });
    expect(kpiSinais({ total: 3, semDados: 1 })).toEqual({ valor: '3', dica: '1 ativo sem dados', cor: 'padrao' });
    expect(kpiSinais({ total: 0, semDados: 2 }).dica).toBe('2 ativos sem dados');
  });
});

describe('ultimoResumoDiario', () => {
  function notificacao(parcial: Partial<Notificacao>): Notificacao {
    return {
      id: 'n-1',
      ativo_id: null,
      tipo: 'RESUMO_DIARIO',
      mensagem: 'Resumo diario da carteira',
      contexto: { texto: 'A carteira variou +1,00%.', aviso_legal: 'Aviso do servidor.' },
      lida: false,
      criado_em: '2026-10-09T21:30:00Z',
      ...parcial,
    };
  }

  it('devolve o mais recente, com o texto e o aviso do servidor', () => {
    const resumo = ultimoResumoDiario([
      notificacao({ id: 'antigo', criado_em: '2026-10-08T21:30:00Z', contexto: { texto: 'Ontem.', aviso_legal: 'A.' } }),
      notificacao({ id: 'novo' }),
    ]);
    expect(resumo).toEqual({
      texto: 'A carteira variou +1,00%.',
      avisoLegal: 'Aviso do servidor.',
      geradoEm: '2026-10-09T21:30:00Z',
    });
  });

  it('sem aviso no contexto usa o aviso legal padrão', () => {
    const resumo = ultimoResumoDiario([notificacao({ contexto: { texto: 'Texto.' } })]);
    expect(resumo?.avisoLegal).toBe(AVISO_IA);
  });

  it.each([{}, { texto: '' }, { texto: '   ' }, { texto: 42 }])(
    'contexto sem texto utilizável (%o) não vira resumo',
    (contexto) => {
      expect(ultimoResumoDiario([notificacao({ contexto })])).toBeNull();
    },
  );

  it('ignora outros tipos de notificação e lista ausente', () => {
    expect(ultimoResumoDiario([notificacao({ tipo: 'ALERTA_DISPARADO' })])).toBeNull();
    expect(ultimoResumoDiario(undefined)).toBeNull();
    expect(ultimoResumoDiario([])).toBeNull();
  });

  it('compara pela data, não pelo texto (microssegundos)', () => {
    const resumo = ultimoResumoDiario([
      notificacao({ id: 'a', criado_em: '2026-10-09T21:30:00.500000Z', contexto: { texto: 'Mais novo.' } }),
      notificacao({ id: 'b', criado_em: '2026-10-09T21:30:00Z', contexto: { texto: 'Mais velho.' } }),
    ]);
    expect(resumo?.texto).toBe('Mais novo.');
  });
});

describe('reunirSinais', () => {
  function sinal(id: string, ativoId: string, ativadoEm: string, desativadoEm: string | null = null): Sinal {
    return {
      id,
      ativo_id: ativoId,
      regra_id: 'r-1',
      regra_nome: 'Sobrevenda RSI',
      regra_descricao: 'RSI(14) abaixo de 30',
      data_ativacao: ativadoEm,
      contexto: { valor: '28.4' },
      data_desativacao: desativadoEm,
    };
  }

  it('junta os sinais vigentes, do mais recente para o mais antigo, ignorando ativos sem dados', () => {
    const itens = [item('a-1', 'PETR4'), item('a-2', 'VALE3'), item('a-3', 'BTC')];
    const lista = reunirSinais(
      itens,
      new Map([
        ['a-1', [sinal('s-1', 'a-1', '2026-10-08T13:00:00Z')]],
        ['a-2', [sinal('s-2', 'a-2', '2026-10-09T13:00:00Z'), sinal('s-3', 'a-2', '2026-10-01T13:00:00Z', '2026-10-02T13:00:00Z')]],
        ['a-3', undefined],
      ]),
    );
    expect(lista.map((s) => s.sinal.id)).toEqual(['s-2', 's-1']);
    expect(lista[0].ativo.ticker).toBe('VALE3');
  });
});

describe('descreverBacktest', () => {
  function backtest(parcial: Partial<ResultadoBacktest>): ResultadoBacktest {
    return {
      regra_id: 'r-1',
      ativo_id: 'a-1',
      total_ocorrencias: 14,
      retorno_medio_5_pregoes: '1.8',
      retorno_medio_20_pregoes: '3.2',
      retorno_medio_60_pregoes: null,
      ...parcial,
    };
  }

  it('descreve ocorrências e o retorno médio em 20 pregões', () => {
    expect(descreverBacktest(backtest({}))).toBe('14 ocorrências em 24 meses · retorno médio +3,20% em 20 pregões');
  });

  it('singular e retorno negativo', () => {
    expect(descreverBacktest(backtest({ total_ocorrencias: 1, retorno_medio_20_pregoes: '-2.5' }))).toBe(
      '1 ocorrência em 24 meses · retorno médio -2,50% em 20 pregões',
    );
  });

  it('retorno de 20 pregões nulo não vira zero', () => {
    expect(descreverBacktest(backtest({ retorno_medio_20_pregoes: null }))).toBe(
      '14 ocorrências em 24 meses · retorno médio em 20 pregões indisponível',
    );
  });

  it('sem ocorrências', () => {
    expect(descreverBacktest(backtest({ total_ocorrencias: 0, retorno_medio_20_pregoes: null }))).toBe(
      'Sem ocorrências nos últimos 24 meses',
    );
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx jest src/dominio/inicio.test.ts`
Expected: FAIL (`Cannot find module '@/dominio/inicio'`).

- [ ] **Step 4: Implementar `src/dominio/inicio.ts`**

```ts
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

function corDoNumero(numero: number, limite: number): DadoKpi['cor'] {
  if (Math.abs(numero) < limite) return 'padrao';
  return numero > 0 ? 'positivo' : 'negativo';
}

export function kpiPatrimonio(r: Rentabilidade): DadoKpi {
  if (carteiraVazia(r)) return { valor: '—', dica: 'Registre uma operação simulada', cor: 'padrao' };
  return {
    valor: formatarMoeda(r.valor_mercado_brl, 'BRL'),
    dica: `Custo ${formatarMoeda(r.custo_base_brl, 'BRL')}`,
    cor: 'padrao',
  };
}

export function kpiResultado(r: Rentabilidade): DadoKpi {
  if (carteiraVazia(r)) return { valor: '—', cor: 'padrao' };
  const lucro = paraNumero(r.lucro_nao_realizado_brl);
  return {
    valor: formatarMoeda(lucro, 'BRL'),
    dica: formatarPercentual(r.percentual, 'fracao'),
    cor: corDoNumero(lucro, LIMITE_ZERO_EM_REAIS),
  };
}

export function kpiVariacaoDoDia(v: VariacaoDoDia): DadoKpi {
  if (v.total === 0) return { valor: '—', dica: 'Sem posições abertas', cor: 'padrao' };
  if (v.pontos === null) return { valor: 'indisponível', dica: 'Sem cotação das posições', cor: 'padrao' };
  const texto = formatarPercentual(v.pontos, 'pontos');
  return {
    valor: texto,
    dica: v.consideradas < v.total ? `${v.consideradas} de ${v.total} posições, ponderada pelo valor` : 'Ponderada pelo valor em BRL',
    cor: texto.startsWith('+') ? 'positivo' : texto.startsWith('-') ? 'negativo' : 'padrao',
  };
}

export function kpiSinais(contagem: { total: number; semDados: number }): DadoKpi {
  const { total, semDados } = contagem;
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
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx jest src/dominio/inicio.test.ts`
Expected: PASS. Se o teste "carteiraVazia verdadeiro quando tudo é zero" falhar por causa da segunda asserção (`'0.000'` também é zero e deve dar `true`), corrigir o **teste**: a segunda linha deve esperar `true` e a descrição deve dizer "em qualquer grafia".

- [ ] **Step 6: Verificar e commitar**

Run: `npm run verificar` → exit 0.

```bash
git add src/dominio/inicio.ts src/dominio/inicio.test.ts
git commit -m "feat(inicio): regras puras da tela Início (variação do dia, KPIs, resumo diário e sinais)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Hooks de sinais e backtests da watchlist

**Files:**
- Modify: `src/hooks/useAtivo.ts`
- Create: `src/hooks/inicio.test.tsx`

**Interfaces:**
- Consumes: `ativosApi.sinais`, `ativosApi.backtest`, `chaves.sinais`, `chaves.backtest`.
- Produces:
  - `useSinaisDosAtivos(ativoIds: Uuid[])`: `useQueries`, um resultado por id, na mesma ordem; `UseQueryResult<Sinal[], Error>[]`
  - `useBacktestsDosSinais(pares: { ativoId: Uuid; regraId: Uuid }[])`: um resultado por par, na mesma ordem; `UseQueryResult<ResultadoBacktest, Error>[]`
  - As chaves são as do detalhe do ativo, então o cache é compartilhado.

- [ ] **Step 1: Escrever o teste (falha)**

`src/hooks/inicio.test.tsx`:

```tsx
import { renderHook, waitFor } from '@testing-library/react-native';

import { ativosApi } from '@/api/ativos';
import type { ResultadoBacktest, Sinal } from '@/api/tipos';
import { chaves } from '@/hooks/chaves';
import { useBacktestsDosSinais, useSinaisDosAtivos } from '@/hooks/useAtivo';
import { criarProvedor, criarQueryClientDeTeste } from '@/test/renderizar';

jest.mock('@/api/ativos', () => ({ ativosApi: { sinais: jest.fn(), backtest: jest.fn() } }));

const sinal: Sinal = {
  id: 's-1',
  ativo_id: 'a-1',
  regra_id: 'r-1',
  regra_nome: 'Sobrevenda RSI',
  regra_descricao: 'RSI(14) abaixo de 30',
  data_ativacao: '2026-10-09T13:00:00Z',
  contexto: { valor: '28.4' },
  data_desativacao: null,
};

const backtest: ResultadoBacktest = {
  regra_id: 'r-1',
  ativo_id: 'a-1',
  total_ocorrencias: 14,
  retorno_medio_5_pregoes: '1.8',
  retorno_medio_20_pregoes: '3.2',
  retorno_medio_60_pregoes: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

it('useSinaisDosAtivos busca um ativo por vez e falha em separado', async () => {
  jest.mocked(ativosApi.sinais).mockImplementation(async (ativoId: string) => {
    if (ativoId === 'a-2') throw new Error('falhou');
    return [sinal];
  });
  const { result } = await renderHook(() => useSinaisDosAtivos(['a-1', 'a-2']), { wrapper: criarProvedor() });
  await waitFor(() => expect(result.current.every((consulta) => !consulta.isPending)).toBe(true));
  expect(result.current[0].data).toEqual([sinal]);
  expect(result.current[1].isError).toBe(true);
  expect(ativosApi.sinais).toHaveBeenCalledTimes(2);
});

it('useSinaisDosAtivos usa a chave do detalhe do ativo (cache compartilhado)', async () => {
  jest.mocked(ativosApi.sinais).mockResolvedValue([sinal]);
  const queryClient = criarQueryClientDeTeste();
  const { result } = await renderHook(() => useSinaisDosAtivos(['a-1']), { wrapper: criarProvedor(queryClient) });
  await waitFor(() => expect(result.current[0].isSuccess).toBe(true));
  expect(queryClient.getQueryData(chaves.sinais('a-1'))).toEqual([sinal]);
});

it('useBacktestsDosSinais busca por par ativo+regra com a chave do detalhe', async () => {
  jest.mocked(ativosApi.backtest).mockResolvedValue(backtest);
  const queryClient = criarQueryClientDeTeste();
  const { result } = await renderHook(() => useBacktestsDosSinais([{ ativoId: 'a-1', regraId: 'r-1' }]), {
    wrapper: criarProvedor(queryClient),
  });
  await waitFor(() => expect(result.current[0].isSuccess).toBe(true));
  expect(ativosApi.backtest).toHaveBeenCalledWith('a-1', 'r-1');
  expect(queryClient.getQueryData(chaves.backtest('a-1', 'r-1'))).toEqual(backtest);
});

it('sem ativos não faz nenhuma chamada', async () => {
  const { result } = await renderHook(() => useSinaisDosAtivos([]), { wrapper: criarProvedor() });
  expect(result.current).toEqual([]);
  expect(ativosApi.sinais).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/hooks/inicio.test.tsx`
Expected: FAIL (`useSinaisDosAtivos is not a function`).

- [ ] **Step 3: Implementar em `src/hooks/useAtivo.ts`**

Acrescentar, depois de `const VALIDADE_BACKTEST_MS = 5 * 60_000;`:

```ts
// Os sinais são reavaliados pelo servidor a cada 15 min (5 min para cripto); um minuto evita refazer a cada troca de aba.
const VALIDADE_SINAIS_MS = 60_000;
```

E acrescentar ao fim do arquivo:

```ts
/** Sinais vigentes de vários ativos (tela Início). Mesma chave do detalhe: o cache é compartilhado. */
export function useSinaisDosAtivos(ativoIds: Uuid[]) {
  return useQueries({
    queries: ativoIds.map((ativoId) => ({
      queryKey: chaves.sinais(ativoId),
      queryFn: () => ativosApi.sinais(ativoId),
      staleTime: VALIDADE_SINAIS_MS,
    })),
  });
}

/** Backtest de vários pares ativo+regra (tela Início). Mesma chave do detalhe do ativo. */
export function useBacktestsDosSinais(pares: { ativoId: Uuid; regraId: Uuid }[]) {
  return useQueries({
    queries: pares.map(({ ativoId, regraId }) => ({
      queryKey: chaves.backtest(ativoId, regraId),
      queryFn: () => ativosApi.backtest(ativoId, regraId),
      staleTime: VALIDADE_BACKTEST_MS,
    })),
  });
}
```

- [ ] **Step 4: Rodar e ver passar; verificar; commitar**

Run: `npx jest src/hooks/inicio.test.tsx` → PASS (4 testes).
Run: `npm run verificar` → exit 0.

```bash
git add src/hooks/useAtivo.ts src/hooks/inicio.test.tsx
git commit -m "feat(inicio): hooks de sinais e backtests da watchlist com o cache do detalhe" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Skeleton, Kpi, ícone da aba e aviso legal com texto do servidor

**Files:**
- Create: `src/components/Skeleton.tsx`, `src/components/Kpi.tsx`, `src/components/inicio.test.tsx`
- Modify: `src/components/Icone.tsx` (ícone `casa`), `src/components/AvisoIA.tsx` (prop `texto`)

**Interfaces:**
- Produces:
  - `Skeleton({ largura?: DimensionValue; altura?: number })`: bloco cinza estático com `aria-label="Carregando"`
  - `Kpi({ rotulo: string; valor: string; icone: NomeIcone; tomIcone?: TomChip; corValor?: CorTexto; dica?: string; carregando?: boolean })`
  - `AvisoIA({ texto?: string })` (padrão `AVISO_IA`)
  - Ícone `casa` em `NOMES_DE_ICONES`

- [ ] **Step 1: Escrever os testes (falham)**

`src/components/inicio.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';

import { AvisoIA } from '@/components/AvisoIA';
import { Icone } from '@/components/Icone';
import { Kpi } from '@/components/Kpi';
import { Skeleton } from '@/components/Skeleton';
import { AVISO_IA } from '@/dominio/regulatorio';

const incluirOcultos = { includeHiddenElements: true };

describe('Skeleton', () => {
  it('anuncia o carregamento para leitores de tela', async () => {
    await render(<Skeleton />);
    expect(screen.getByLabelText('Carregando')).toBeOnTheScreen();
  });
});

describe('Kpi', () => {
  it('mostra rótulo, valor e dica', async () => {
    await render(<Kpi rotulo="Patrimônio simulado" valor="R$ 4.000,00" dica="Custo R$ 3.750,00" icone="carteira" />);
    expect(screen.getByText('Patrimônio simulado')).toBeOnTheScreen();
    expect(screen.getByText('R$ 4.000,00')).toBeOnTheScreen();
    expect(screen.getByText('Custo R$ 3.750,00')).toBeOnTheScreen();
  });

  it('carregando troca valor e dica por esqueletos e não mostra o valor', async () => {
    await render(<Kpi rotulo="Patrimônio simulado" valor="R$ 4.000,00" dica="Custo" icone="carteira" carregando />);
    expect(screen.getByText('Patrimônio simulado')).toBeOnTheScreen();
    expect(screen.queryByText('R$ 4.000,00')).not.toBeOnTheScreen();
    expect(screen.getAllByLabelText('Carregando')).toHaveLength(2);
  });

  it('sem dica não reserva linha', async () => {
    await render(<Kpi rotulo="Sinais ativos" valor="3" icone="atividade" />);
    expect(screen.getByText('3')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Carregando')).not.toBeOnTheScreen();
  });
});

describe('Icone casa', () => {
  it('existe na versão instalada do lucide', async () => {
    await render(<Icone nome="casa" />);
    expect(screen.getByTestId('icone-casa', incluirOcultos)).toBeOnTheScreen();
  });
});

describe('AvisoIA', () => {
  it('sem texto usa o aviso legal padrão', async () => {
    await render(<AvisoIA />);
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
  });

  it('usa o texto do servidor quando informado', async () => {
    await render(<AvisoIA texto="Aviso do servidor." />);
    expect(screen.getByText('Aviso do servidor.')).toBeOnTheScreen();
    expect(screen.queryByText(AVISO_IA)).not.toBeOnTheScreen();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/components/inicio.test.tsx`
Expected: FAIL (módulos `Kpi` e `Skeleton` inexistentes).

- [ ] **Step 3: Implementar**

`src/components/Skeleton.tsx`:

```tsx
import { type DimensionValue, StyleSheet, View } from 'react-native';

import { raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  largura?: DimensionValue;
  altura?: number;
}

/** Espaço reservado enquanto o dado carrega (estático: sem timers de animação nos testes). */
export function Skeleton({ largura = '100%', altura = 16 }: Props) {
  const { cores } = useTema();
  return (
    <View
      accessible
      aria-label="Carregando"
      style={[estilos.bloco, { width: largura, height: altura, backgroundColor: cores.superficieAlta }]}
    />
  );
}

const estilos = StyleSheet.create({
  bloco: { borderRadius: raio.sm },
});
```

`src/components/Kpi.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';

import type { NomeIcone } from '@/components/Icone';
import { IconeChip, type TomChip } from '@/components/IconeChip';
import { Skeleton } from '@/components/Skeleton';
import { type CorTexto, Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  rotulo: string;
  valor: string;
  icone: NomeIcone;
  tomIcone?: TomChip;
  corValor?: CorTexto;
  dica?: string;
  carregando?: boolean;
}

/** Métrica com rótulo, valor e dica (padrão `Kpi` do web). */
export function Kpi({ rotulo, valor, icone, tomIcone = 'primaria', corValor = 'padrao', dica, carregando = false }: Props) {
  const { cores, sombras } = useTema();
  return (
    <View
      style={[
        estilos.kpi,
        { backgroundColor: cores.superficie, borderColor: cores.borda, boxShadow: `${sombras.md}, ${sombras.brilho}` },
      ]}
    >
      <View style={estilos.topo}>
        <Texto variante="rotulo" cor="terciario" style={estilos.rotulo}>
          {rotulo}
        </Texto>
        <IconeChip nome={icone} tom={tomIcone} tamanho={28} />
      </View>
      {carregando ? (
        <>
          <Skeleton altura={24} largura="70%" />
          <Skeleton altura={12} largura="50%" />
        </>
      ) : (
        <>
          <Texto variante="titulo" numerico cor={corValor} numberOfLines={1} adjustsFontSizeToFit>
            {valor}
          </Texto>
          {dica ? (
            <Texto variante="legenda" cor="secundario" numberOfLines={2}>
              {dica}
            </Texto>
          ) : null}
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  kpi: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: espaco.sm,
    padding: espaco.md,
    borderWidth: 1,
    borderRadius: raio.lg,
  },
  topo: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: espaco.sm },
  rotulo: { flexShrink: 1 },
});
```

`src/components/Icone.tsx`: acrescentar `House,` à lista de imports do `lucide-react-native` (em ordem alfabética, depois de `Eye, EyeOff,`) e `casa: House,` ao mapa `ICONES` (depois de `'caixa-vazia': Inbox,`... em ordem: antes de `'caixa-vazia'`, mantendo o agrupamento existente). Se `House` não existir na versão instalada, usar `Home`.

`src/components/AvisoIA.tsx`: trocar a assinatura e o texto:

```tsx
export function AvisoIA({ texto = AVISO_IA }: { texto?: string }) {
```

e `{AVISO_IA}` por `{texto}` dentro do `Texto`.

- [ ] **Step 4: Rodar e ver passar; verificar; commitar**

Run: `npx jest src/components/inicio.test.tsx src/components/icone.test.tsx src/components/dominio.test.tsx` → PASS.
Run: `npm run verificar` → exit 0.

```bash
git add src/components/Skeleton.tsx src/components/Kpi.tsx src/components/inicio.test.tsx src/components/Icone.tsx src/components/AvisoIA.tsx
git commit -m "feat(inicio): componentes Skeleton e Kpi, ícone da aba Início e aviso legal com texto do servidor" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Linha da watchlist com sinais e sino, resumo diário e linha de sinal ativo

**Files:**
- Modify: `src/components/LinhaAtivo.tsx`, `src/components/listas.test.tsx`
- Create: `src/components/ResumoDiarioCard.tsx`, `src/components/ItemSinalAtivo.tsx`
- Modify (testes): `src/components/inicio.test.tsx`

**Interfaces:**
- Consumes: `Skeleton`, `AvisoIA({ texto })` (Tarefa 3); `ResumoDiario` (Tarefa 1).
- Produces:
  - `LinhaAtivo` com props opcionais `sinais?: number`, `notificar?: boolean`, `aoAlternarNotificacao?: () => void` (o sino só aparece com `aoAlternarNotificacao`; role `switch`, nome `Notificações de {ticker}`)
  - `ResumoDiarioCard({ estado: 'carregando' | 'erro' | 'ok'; erro?: unknown; resumo: ResumoDiario | null; aoTentarNovamente: () => void })`
  - `ItemSinalAtivo({ ticker: string; regraNome: string; ativadoEm: string; backtest?: string; carregandoBacktest: boolean; aoPressionar: () => void })` (nome acessível `{ticker}, {regraNome}`)

- [ ] **Step 1: Escrever os testes (falham)**

Em `src/components/listas.test.tsx`, dentro de `describe('LinhaAtivo', ...)`, acrescentar:

```tsx
  it('mostra o selo de sinais só quando há sinais, com singular e plural', async () => {
    const { rerender } = await render(
      <LinhaAtivo ativo={ativo} cotacao={cotacao} estadoCotacao="ok" sinais={1} aoPressionar={jest.fn()} />,
    );
    expect(screen.getByText('1 sinal')).toBeOnTheScreen();
    await rerender(<LinhaAtivo ativo={ativo} cotacao={cotacao} estadoCotacao="ok" sinais={2} aoPressionar={jest.fn()} />);
    expect(screen.getByText('2 sinais')).toBeOnTheScreen();
    await rerender(<LinhaAtivo ativo={ativo} cotacao={cotacao} estadoCotacao="ok" sinais={0} aoPressionar={jest.fn()} />);
    expect(screen.queryByText(/sinal/)).not.toBeOnTheScreen();
  });

  it('sem aoAlternarNotificacao não mostra o sino', async () => {
    await render(<LinhaAtivo ativo={ativo} estadoCotacao="carregando" notificar aoPressionar={jest.fn()} />);
    expect(screen.queryByRole('switch')).not.toBeOnTheScreen();
  });

  it('o sino reflete o estado e alterna sem abrir o ativo', async () => {
    const user = userEvent.setup();
    const aoPressionar = jest.fn();
    const aoAlternar = jest.fn();
    await render(
      <LinhaAtivo
        ativo={ativo}
        estadoCotacao="carregando"
        notificar
        aoAlternarNotificacao={aoAlternar}
        aoPressionar={aoPressionar}
      />,
    );
    const sino = screen.getByRole('switch', { name: 'Notificações de PETR4' });
    expect(sino).toBeChecked();
    await user.press(sino);
    expect(aoAlternar).toHaveBeenCalledTimes(1);
    expect(aoPressionar).not.toHaveBeenCalled();
  });
```

Em `src/components/inicio.test.tsx`, acrescentar (e os imports `userEvent` de `@testing-library/react-native`, `ApiError` de `@/api/client`, `ItemSinalAtivo`, `ResumoDiarioCard`):

```tsx
describe('ResumoDiarioCard', () => {
  const resumo = { texto: 'A carteira variou +1,00% no dia.', avisoLegal: 'Aviso do servidor.', geradoEm: '2026-10-09T21:30:00Z' };

  it('com resumo mostra texto, data e SEMPRE o aviso legal', async () => {
    await render(<ResumoDiarioCard estado="ok" resumo={resumo} aoTentarNovamente={jest.fn()} />);
    expect(screen.getByText('A carteira variou +1,00% no dia.')).toBeOnTheScreen();
    expect(screen.getByText('Gerado em 09/10/2026 18:30')).toBeOnTheScreen();
    expect(screen.getByText('Aviso do servidor.')).toBeOnTheScreen();
  });

  it('sem resumo explica quando ele é gerado e não mostra aviso de IA', async () => {
    await render(<ResumoDiarioCard estado="ok" resumo={null} aoTentarNovamente={jest.fn()} />);
    expect(screen.getByText(/Nenhum resumo gerado ainda/)).toBeOnTheScreen();
    expect(screen.queryByText(AVISO_IA)).not.toBeOnTheScreen();
  });

  it('carregando mostra esqueletos', async () => {
    await render(<ResumoDiarioCard estado="carregando" resumo={null} aoTentarNovamente={jest.fn()} />);
    expect(screen.getAllByLabelText('Carregando').length).toBeGreaterThan(0);
  });

  it('erro mostra mensagem e permite tentar de novo', async () => {
    const user = userEvent.setup();
    const tentar = jest.fn();
    await render(
      <ResumoDiarioCard estado="erro" erro={new ApiError(500, 'Erro 500')} resumo={null} aoTentarNovamente={tentar} />,
    );
    expect(screen.getByText('Resumo diário indisponível no momento.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(tentar).toHaveBeenCalledTimes(1);
  });
});

describe('ItemSinalAtivo', () => {
  const base = { ticker: 'PETR4', regraNome: 'Sobrevenda RSI', ativadoEm: '2026-10-09T13:00:00Z' };

  it('mostra ticker, regra, data e o histórico da condição', async () => {
    await render(
      <ItemSinalAtivo {...base} backtest="14 ocorrências em 24 meses" carregandoBacktest={false} aoPressionar={jest.fn()} />,
    );
    expect(screen.getByText('PETR4')).toBeOnTheScreen();
    expect(screen.getByText('Sobrevenda RSI')).toBeOnTheScreen();
    expect(screen.getByText('Ativo desde 09/10/2026 10:00')).toBeOnTheScreen();
    expect(screen.getByText('14 ocorrências em 24 meses')).toBeOnTheScreen();
  });

  it('sem histórico mostra "indisponível" e carregando mostra esqueleto', async () => {
    const { rerender } = await render(<ItemSinalAtivo {...base} carregandoBacktest={false} aoPressionar={jest.fn()} />);
    expect(screen.getByText('Histórico indisponível no momento')).toBeOnTheScreen();
    await rerender(<ItemSinalAtivo {...base} carregandoBacktest aoPressionar={jest.fn()} />);
    expect(screen.getByLabelText('Carregando')).toBeOnTheScreen();
  });

  it('é pressionável pelo nome acessível', async () => {
    const user = userEvent.setup();
    const aoPressionar = jest.fn();
    await render(<ItemSinalAtivo {...base} carregandoBacktest={false} aoPressionar={aoPressionar} />);
    await user.press(screen.getByRole('button', { name: 'PETR4, Sobrevenda RSI' }));
    expect(aoPressionar).toHaveBeenCalledTimes(1);
  });
});
```

Em `src/components/listas.test.tsx`, o import de `render` precisa ficar `import { render, screen, userEvent } from '@testing-library/react-native';` (já está).

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/components/listas.test.tsx src/components/inicio.test.tsx`
Expected: FAIL (selo, sino, `ResumoDiarioCard` e `ItemSinalAtivo` inexistentes).

- [ ] **Step 3: Implementar**

`src/components/LinhaAtivo.tsx` (substituir o arquivo):

```tsx
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { Ativo, CotacaoAtual } from '@/api/tipos';
import { Icone } from '@/components/Icone';
import { Pill } from '@/components/Pill';
import { Texto } from '@/components/Texto';
import { VariacaoBadge } from '@/components/VariacaoBadge';
import { ROTULO_TIPO_ATIVO } from '@/dominio/rotulos';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { formatarMoeda } from '@/utils/formatacao';

export type EstadoCotacao = 'carregando' | 'ok' | 'indisponivel';

interface Props {
  ativo: Ativo;
  cotacao?: CotacaoAtual;
  estadoCotacao: EstadoCotacao;
  aoPressionar: () => void;
  /** Sinais técnicos vigentes: o selo só aparece quando há pelo menos um. */
  sinais?: number;
  /** Estado das notificações do ativo; o sino só aparece com `aoAlternarNotificacao`. */
  notificar?: boolean;
  aoAlternarNotificacao?: () => void;
}

export function LinhaAtivo({
  ativo,
  cotacao,
  estadoCotacao,
  aoPressionar,
  sinais = 0,
  notificar = false,
  aoAlternarNotificacao,
}: Props) {
  const { cores, sombras } = useTema();
  return (
    <View
      style={[estilos.linha, { backgroundColor: cores.superficie, borderColor: cores.borda, boxShadow: sombras.sm }]}
    >
      <Pressable
        role="button"
        aria-label={`${ativo.ticker}, ${ativo.nome}`}
        onPress={aoPressionar}
        style={({ pressed }) => [estilos.principal, { opacity: pressed ? 0.85 : 1 }]}
      >
        <View style={estilos.esquerda}>
          <Texto variante="subtitulo">{ativo.ticker}</Texto>
          <Texto variante="legenda" cor="secundario" numberOfLines={1}>
            {`${ROTULO_TIPO_ATIVO[ativo.tipo]} · ${ativo.nome}`}
          </Texto>
          {sinais > 0 ? <Pill tom="amarelo">{`${sinais} ${sinais === 1 ? 'sinal' : 'sinais'}`}</Pill> : null}
        </View>
        <View style={estilos.direita}>
          {estadoCotacao === 'carregando' ? <ActivityIndicator aria-label="Carregando" color={cores.primaria} /> : null}
          {estadoCotacao === 'indisponivel' ? (
            <>
              <Texto negrito>—</Texto>
              <Texto variante="legenda" cor="secundario">
                sem cotação
              </Texto>
            </>
          ) : null}
          {estadoCotacao === 'ok' && cotacao ? (
            <>
              <Texto negrito numerico>
                {formatarMoeda(cotacao.preco, ativo.moeda)}
              </Texto>
              <VariacaoBadge valor={cotacao.variacao_percentual} escala="pontos" />
            </>
          ) : null}
        </View>
      </Pressable>
      {aoAlternarNotificacao ? (
        <Pressable
          role="switch"
          aria-label={`Notificações de ${ativo.ticker}`}
          aria-checked={notificar}
          onPress={aoAlternarNotificacao}
          style={estilos.sino}
        >
          <Icone nome={notificar ? 'sino' : 'sino-desligado'} tamanho={20} cor={notificar ? 'primaria' : 'textoTerciario'} />
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: raio.lg },
  principal: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: espaco.md, padding: espaco.lg },
  esquerda: { flex: 1, gap: 2, alignItems: 'flex-start' },
  direita: { alignItems: 'flex-end', gap: espaco.xs },
  sino: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: espaco.xs },
});
```

`src/components/ResumoDiarioCard.tsx`:

```tsx
import { AvisoIA } from '@/components/AvisoIA';
import { Card } from '@/components/Card';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Skeleton } from '@/components/Skeleton';
import { Texto } from '@/components/Texto';
import type { ResumoDiario } from '@/dominio/inicio';
import { formatarDataHora } from '@/utils/formatacao';

interface Props {
  estado: 'carregando' | 'erro' | 'ok';
  erro?: unknown;
  resumo: ResumoDiario | null;
  aoTentarNovamente: () => void;
}

/** Resumo diário da carteira gerado por IA. Todo texto de IA vem acompanhado do aviso legal (RN-05). */
export function ResumoDiarioCard({ estado, erro, resumo, aoTentarNovamente }: Props) {
  return (
    <Card titulo="Resumo diário" icone="brilho" tomIcone="ia">
      {estado === 'carregando' ? (
        <>
          <Skeleton />
          <Skeleton />
          <Skeleton largura="60%" />
        </>
      ) : null}
      {estado === 'erro' ? (
        <ErroComRetry erro={erro} mensagem="Resumo diário indisponível no momento." aoTentarNovamente={aoTentarNovamente} />
      ) : null}
      {estado === 'ok' && resumo ? (
        <>
          <Texto>{resumo.texto}</Texto>
          <Texto variante="legenda" cor="secundario">
            {`Gerado em ${formatarDataHora(resumo.geradoEm)}`}
          </Texto>
          <AvisoIA texto={resumo.avisoLegal} />
        </>
      ) : null}
      {estado === 'ok' && !resumo ? (
        <EstadoVazio mensagem="Nenhum resumo gerado ainda. O servidor gera o resumo da carteira ao fim do pregão (18h30)." />
      ) : null}
    </Card>
  );
}
```

`src/components/ItemSinalAtivo.tsx`:

```tsx
import { Pressable, StyleSheet, View } from 'react-native';

import { Pill } from '@/components/Pill';
import { Skeleton } from '@/components/Skeleton';
import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { formatarDataHora } from '@/utils/formatacao';

interface Props {
  ticker: string;
  regraNome: string;
  ativadoEm: string;
  /** Texto do histórico da condição (24 meses); ausente = indisponível. */
  backtest?: string;
  carregandoBacktest: boolean;
  aoPressionar: () => void;
}

/** Sinal técnico vigente de um ativo da watchlist, com o histórico da mesma condição (RN-03). */
export function ItemSinalAtivo({ ticker, regraNome, ativadoEm, backtest, carregandoBacktest, aoPressionar }: Props) {
  const { cores, sombras } = useTema();
  return (
    <Pressable
      role="button"
      aria-label={`${ticker}, ${regraNome}`}
      onPress={aoPressionar}
      style={({ pressed }) => [
        estilos.item,
        { backgroundColor: cores.superficie, borderColor: cores.borda, boxShadow: sombras.sm, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={estilos.cabecalho}>
        <Texto variante="subtitulo">{ticker}</Texto>
        <Pill tom="amarelo">{regraNome}</Pill>
      </View>
      <Texto variante="legenda" cor="secundario">
        {`Ativo desde ${formatarDataHora(ativadoEm)}`}
      </Texto>
      {carregandoBacktest ? (
        <Skeleton altura={12} largura="80%" />
      ) : (
        <Texto variante="legenda" cor="secundario">
          {backtest ?? 'Histórico indisponível no momento'}
        </Texto>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  item: { gap: espaco.xs, padding: espaco.lg, borderWidth: 1, borderRadius: raio.lg },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, flexWrap: 'wrap' },
});
```

- [ ] **Step 4: Rodar e ver passar; verificar; commitar**

Run: `npx jest src/components/listas.test.tsx src/components/inicio.test.tsx` → PASS.
Run: `npm run verificar` → exit 0 (o teste `watchlist.test.tsx` ainda passa: a tela antiga continua usando `LinhaAtivo` sem as props novas).

```bash
git add src/components/LinhaAtivo.tsx src/components/ResumoDiarioCard.tsx src/components/ItemSinalAtivo.tsx src/components/listas.test.tsx src/components/inicio.test.tsx
git commit -m "feat(inicio): linha da watchlist com sinais e sino, resumo diário com aviso legal e linha de sinal ativo" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Tela Início, aba renomeada e testes de tela

**Files:**
- Modify: `app/(tabs)/index.tsx` (reescrita), `app/(tabs)/_layout.tsx`
- Create: `__tests__/telas/inicio.test.tsx`
- Delete: `__tests__/telas/watchlist.test.tsx` (seus 3 testes passam para o arquivo novo)

**Interfaces:**
- Consumes: tudo das Tarefas 1 a 4; `useWatchlist`, `useDefinirNotificacao`, `useRentabilidade`, `usePosicoes`, `useNotificacoes`, `useCotacoes`.
- Produces: tela `Inicio` (export default) e a aba "Início" com ícone `casa`.

- [ ] **Step 1: Escrever os testes de tela (falham)**

`__tests__/telas/inicio.test.tsx`:

```tsx
import { screen, userEvent, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ativosApi } from '@/api/ativos';
import { ApiError } from '@/api/client';
import { notificacoesApi } from '@/api/notificacoes';
import { portfolioApi } from '@/api/portfolio';
import type {
  CotacaoAtual,
  ItemWatchlist,
  Notificacao,
  Posicao,
  Rentabilidade,
  ResultadoBacktest,
  Sinal,
} from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { AVISO_IA } from '@/dominio/regulatorio';
import { renderizar } from '@/test/renderizar';

import Inicio from '../../app/(tabs)/index';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn(), definirNotificacao: jest.fn() } }));
jest.mock('@/api/ativos', () => ({ ativosApi: { cotacao: jest.fn(), sinais: jest.fn(), backtest: jest.fn() } }));
jest.mock('@/api/portfolio', () => ({ portfolioApi: { rentabilidade: jest.fn(), posicoes: jest.fn() } }));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));

const NBSP = '\u00a0';

function item(id: string, ticker: string, nome: string, notificar = true): ItemWatchlist {
  return { ativo: { id, ticker, nome, tipo: 'ACAO', setor: null, moeda: 'BRL' }, notificar, adicionado_em: '2026-10-01T12:00:00Z' };
}

function cotacao(ticker: string, preco: string, variacaoPercentual: string): CotacaoAtual {
  return { ticker, preco, variacao: '0', variacao_percentual: variacaoPercentual, maxima_dia: preco, minima_dia: preco, volume: '1' };
}

function posicao(ativoId: string, ticker: string, valorBrl: string): Posicao {
  return {
    ativo_id: ativoId,
    ticker,
    quantidade: '100',
    preco_medio: '30',
    cotacao_atual: '38',
    valor_mercado: valorBrl,
    valor_mercado_brl: valorBrl,
    lucro_nao_realizado: '0',
    lucro_realizado: '0',
  };
}

const RENTABILIDADE: Rentabilidade = {
  custo_base_brl: '3750.00',
  valor_mercado_brl: '4000.00',
  lucro_nao_realizado_brl: '250.00',
  lucro_realizado_brl: '0',
  percentual: '0.0667',
};

const RENTABILIDADE_ZERADA: Rentabilidade = {
  custo_base_brl: '0',
  valor_mercado_brl: '0',
  lucro_nao_realizado_brl: '0',
  lucro_realizado_brl: '0',
  percentual: '0',
};

const SINAL: Sinal = {
  id: 's-1',
  ativo_id: 'a-1',
  regra_id: 'r-1',
  regra_nome: 'Sobrevenda RSI',
  regra_descricao: 'RSI(14) abaixo de 30',
  data_ativacao: '2026-10-09T13:00:00Z',
  contexto: { valor: '28.4' },
  data_desativacao: null,
};

const BACKTEST: ResultadoBacktest = {
  regra_id: 'r-1',
  ativo_id: 'a-1',
  total_ocorrencias: 14,
  retorno_medio_5_pregoes: '1.8',
  retorno_medio_20_pregoes: '3.2',
  retorno_medio_60_pregoes: null,
};

const RESUMO: Notificacao = {
  id: 'n-1',
  ativo_id: null,
  tipo: 'RESUMO_DIARIO',
  mensagem: 'Resumo diario da carteira',
  contexto: { texto: 'A carteira variou +1,00% no dia.', aviso_legal: AVISO_IA },
  lida: false,
  criado_em: '2026-10-09T21:30:00Z',
};

/** Cenário completo: PETR4 e VALE3 (a API devolve fora de ordem), uma posição em cada e um sinal em PETR4. */
function prepararComDados() {
  jest.mocked(watchlistApi.listar).mockResolvedValue([item('a-2', 'VALE3', 'Vale ON'), item('a-1', 'PETR4', 'Petrobras PN')]);
  jest.mocked(ativosApi.cotacao).mockImplementation(async (ativoId: string) =>
    ativoId === 'a-1' ? cotacao('PETR4', '38.5', '2.00') : cotacao('VALE3', '60', '-2.00'),
  );
  jest.mocked(ativosApi.sinais).mockImplementation(async (ativoId: string) => (ativoId === 'a-1' ? [SINAL] : []));
  jest.mocked(ativosApi.backtest).mockResolvedValue(BACKTEST);
  jest.mocked(portfolioApi.rentabilidade).mockResolvedValue(RENTABILIDADE);
  jest.mocked(portfolioApi.posicoes).mockResolvedValue([posicao('a-1', 'PETR4', '3000.00'), posicao('a-2', 'VALE3', '1000.00')]);
  jest.mocked(notificacoesApi.listar).mockResolvedValue([RESUMO]);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  jest.mocked(watchlistApi.definirNotificacao).mockResolvedValue(item('a-1', 'PETR4', 'Petrobras PN', false));
  jest.mocked(ativosApi.cotacao).mockResolvedValue(cotacao('X', '10', '0'));
  jest.mocked(ativosApi.sinais).mockResolvedValue([]);
  jest.mocked(ativosApi.backtest).mockResolvedValue(BACKTEST);
  jest.mocked(portfolioApi.rentabilidade).mockResolvedValue(RENTABILIDADE_ZERADA);
  jest.mocked(portfolioApi.posicoes).mockResolvedValue([]);
  jest.mocked(notificacoesApi.listar).mockResolvedValue([]);
});

describe('com dados', () => {
  it('mostra os KPIs da carteira', async () => {
    prepararComDados();
    await renderizar(<Inicio />);
    expect(await screen.findByText(`R$${NBSP}4.000,00`)).toBeOnTheScreen();
    expect(screen.getByText(`Custo R$${NBSP}3.750,00`)).toBeOnTheScreen();
    expect(screen.getByText(`R$${NBSP}250,00`)).toBeOnTheScreen();
    expect(screen.getByText('+6,67%')).toBeOnTheScreen();
    expect(await screen.findByText('+1,00%')).toBeOnTheScreen();
    expect(screen.getByText('Ponderada pelo valor em BRL')).toBeOnTheScreen();
    expect(await screen.findByText('1')).toBeOnTheScreen();
  });

  it('mostra o resumo diário da IA com o aviso legal', async () => {
    prepararComDados();
    await renderizar(<Inicio />);
    expect(await screen.findByText('A carteira variou +1,00% no dia.')).toBeOnTheScreen();
    expect(screen.getByText('Gerado em 09/10/2026 18:30')).toBeOnTheScreen();
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
  });

  it('lista a watchlist em ordem alfabética, com preço, variação e selo de sinais', async () => {
    prepararComDados();
    await renderizar(<Inicio />);
    expect(await screen.findByText(`R$${NBSP}38,50`)).toBeOnTheScreen();
    expect(screen.getByText('▲ +2,00%')).toBeOnTheScreen();
    expect(await screen.findByText('1 sinal')).toBeOnTheScreen();
    const nomes = screen.getAllByRole('button', { name: /^(PETR4|VALE3), (Petrobras PN|Vale ON)$/ }).map((b) => b.props['aria-label']);
    expect(nomes).toEqual(['PETR4, Petrobras PN', 'VALE3, Vale ON']);
  });

  it('lista os sinais ativos com o histórico de 20 pregões e abre o ativo ao tocar', async () => {
    const user = userEvent.setup();
    prepararComDados();
    await renderizar(<Inicio />);
    expect(await screen.findByText('14 ocorrências em 24 meses · retorno médio +3,20% em 20 pregões')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'PETR4, Sobrevenda RSI' }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1', ticker: 'PETR4' } });
  });

  it('tocar na linha da watchlist abre o detalhe com id e ticker', async () => {
    const user = userEvent.setup();
    prepararComDados();
    await renderizar(<Inicio />);
    await user.press(await screen.findByRole('button', { name: 'PETR4, Petrobras PN' }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1', ticker: 'PETR4' } });
  });

  it('o sino alterna as notificações do ativo sem abri-lo', async () => {
    const user = userEvent.setup();
    prepararComDados();
    await renderizar(<Inicio />);
    const sino = await screen.findByRole('switch', { name: 'Notificações de PETR4' });
    expect(sino).toBeChecked();
    await user.press(sino);
    await waitFor(() => expect(watchlistApi.definirNotificacao).toHaveBeenCalledWith('a-1', false));
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('vazio', () => {
  it('conta nova: traços nos KPIs, sem R$ 0,00, e oferece a busca', async () => {
    const user = userEvent.setup();
    await renderizar(<Inicio />);
    expect(await screen.findByText('Sua watchlist está vazia.')).toBeOnTheScreen();
    expect(screen.getByText('Registre uma operação simulada')).toBeOnTheScreen();
    expect(screen.getByText('Sem posições abertas')).toBeOnTheScreen();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText(`R$${NBSP}0,00`)).not.toBeOnTheScreen();
    expect(screen.queryByText('0,00%')).not.toBeOnTheScreen();
    expect(screen.getByText(/Nenhum resumo gerado ainda/)).toBeOnTheScreen();
    expect(screen.getByText('Nenhum sinal técnico ativo no momento.')).toBeOnTheScreen();
    expect(screen.queryByText(AVISO_IA)).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Buscar ativo' }));
    expect(router.push).toHaveBeenCalledWith('/buscar');
  });
});

describe('carregando', () => {
  it('mostra esqueletos enquanto a API não responde', async () => {
    const pendente = () => new Promise<never>(() => {});
    jest.mocked(watchlistApi.listar).mockImplementation(pendente);
    jest.mocked(portfolioApi.rentabilidade).mockImplementation(pendente);
    jest.mocked(portfolioApi.posicoes).mockImplementation(pendente);
    jest.mocked(notificacoesApi.listar).mockImplementation(pendente);
    await renderizar(<Inicio />);
    expect(screen.getAllByLabelText('Carregando').length).toBeGreaterThan(5);
    expect(screen.queryByText('Sua watchlist está vazia.')).not.toBeOnTheScreen();
  });
});

describe('falha de comunicação', () => {
  it('mostra o erro com o endereço, só na seção afetada, e tenta de novo', async () => {
    const user = userEvent.setup();
    prepararComDados();
    jest
      .mocked(watchlistApi.listar)
      .mockRejectedValueOnce(new ApiError(0, 'Sem conexão com o servidor (http://api.teste)', { causa: 'rede' }));
    await renderizar(<Inicio />);
    expect(await screen.findByText('Sem conexão com o servidor (http://api.teste)')).toBeOnTheScreen();
    // O resto da tela continua funcionando.
    expect(await screen.findByText(`R$${NBSP}4.000,00`)).toBeOnTheScreen();
    jest.mocked(watchlistApi.listar).mockResolvedValue([item('a-1', 'PETR4', 'Petrobras PN')]);
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('button', { name: 'PETR4, Petrobras PN' })).toBeOnTheScreen();
    expect(watchlistApi.listar).toHaveBeenCalledTimes(2);
  });
});

describe('erro do servidor', () => {
  it('traduz o 500 e mostra o código do erro', async () => {
    jest
      .mocked(watchlistApi.listar)
      .mockRejectedValue(new ApiError(500, 'Erro 500', { requestId: 'srv-42' }));
    await renderizar(<Inicio />);
    expect(await screen.findByText('Erro no servidor. Tente novamente em instantes.')).toBeOnTheScreen();
    expect(screen.getByText('Código do erro: srv-42')).toBeOnTheScreen();
  });

  it('resumo diário com erro não esconde o resto da tela', async () => {
    prepararComDados();
    jest.mocked(notificacoesApi.listar).mockRejectedValue(new ApiError(500, 'Erro 500'));
    await renderizar(<Inicio />);
    expect(await screen.findByText('Resumo diário indisponível no momento.')).toBeOnTheScreen();
    expect(await screen.findByText(`R$${NBSP}4.000,00`)).toBeOnTheScreen();
    expect(screen.queryByText(AVISO_IA)).not.toBeOnTheScreen();
  });

  it('rentabilidade com erro mostra "indisponível" nos KPIs da carteira', async () => {
    prepararComDados();
    jest.mocked(portfolioApi.rentabilidade).mockRejectedValue(new ApiError(503, 'Fonte de dados de mercado indisponivel'));
    await renderizar(<Inicio />);
    expect(await screen.findAllByText('indisponível')).toHaveLength(2);
    expect(await screen.findByText('+1,00%')).toBeOnTheScreen();
  });
});

describe('independência entre ativos', () => {
  it('cotação que falha vira "sem cotação" só naquele ativo, e a variação do dia usa as demais posições', async () => {
    prepararComDados();
    jest.mocked(ativosApi.cotacao).mockImplementation(async (ativoId: string) => {
      if (ativoId === 'a-2') throw new ApiError(404, 'Cotacao nao encontrada para o ativo');
      return cotacao('PETR4', '38.5', '2.00');
    });
    await renderizar(<Inicio />);
    expect(await screen.findByText('sem cotação')).toBeOnTheScreen();
    expect(await screen.findByText(`R$${NBSP}38,50`)).toBeOnTheScreen();
    expect(await screen.findByText('+2,00%')).toBeOnTheScreen();
    expect(screen.getByText('1 de 2 posições, ponderada pelo valor')).toBeOnTheScreen();
  });

  it('sinais que falham em um ativo aparecem como "sem dados" no KPI, sem derrubar os demais', async () => {
    prepararComDados();
    jest.mocked(ativosApi.sinais).mockImplementation(async (ativoId: string) => {
      if (ativoId === 'a-2') throw new ApiError(500, 'Erro 500');
      return [SINAL];
    });
    await renderizar(<Inicio />);
    expect(await screen.findByText('1 ativo sem dados')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'PETR4, Sobrevenda RSI' })).toBeOnTheScreen();
    const kpi = screen.getByText('Sinais ativos').parent?.parent;
    expect(kpi).toBeTruthy();
    expect(within(kpi!).getByText('1')).toBeOnTheScreen();
  });

  it('nenhuma posição com cotação: variação do dia é "indisponível", nunca 0,00%', async () => {
    prepararComDados();
    jest.mocked(ativosApi.cotacao).mockRejectedValue(new ApiError(503, 'Fonte de dados de mercado indisponivel'));
    await renderizar(<Inicio />);
    expect(await screen.findByText('Sem cotação das posições')).toBeOnTheScreen();
    expect(screen.queryByText('0,00%')).not.toBeOnTheScreen();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest __tests__/telas/inicio.test.tsx`
Expected: FAIL (a tela atual não mostra KPIs, resumo nem sinais; vários `findBy...` estouram).

- [ ] **Step 3: Reescrever a tela `app/(tabs)/index.tsx`**

```tsx
import type { UseQueryResult } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import type { CotacaoAtual, Sinal, Uuid } from '@/api/tipos';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Kpi } from '@/components/Kpi';
import { type EstadoCotacao, LinhaAtivo } from '@/components/LinhaAtivo';
import { ItemSinalAtivo } from '@/components/ItemSinalAtivo';
import { ResumoDiarioCard } from '@/components/ResumoDiarioCard';
import { Skeleton } from '@/components/Skeleton';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import {
  descreverBacktest,
  kpiPatrimonio,
  kpiResultado,
  kpiSinais,
  kpiVariacaoDoDia,
  ordenarWatchlist,
  reunirSinais,
  ultimoResumoDiario,
  variacaoDoDia,
} from '@/dominio/inicio';
import { useBacktestsDosSinais, useCotacoes, useSinaisDosAtivos } from '@/hooks/useAtivo';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { usePosicoes, useRentabilidade } from '@/hooks/usePortfolio';
import { useDefinirNotificacao, useWatchlist } from '@/hooks/useWatchlist';
import { espaco } from '@/theme/escala';
import { mensagemDeErro } from '@/utils/erros';

function estadoDaCotacao(consulta?: { isPending: boolean; isError: boolean }): EstadoCotacao {
  if (!consulta || consulta.isPending) return 'carregando';
  return consulta.isError ? 'indisponivel' : 'ok';
}

export default function Inicio() {
  const watchlist = useWatchlist();
  const rentabilidade = useRentabilidade();
  const posicoes = usePosicoes();
  const notificacoes = useNotificacoes();
  const definirNotificacao = useDefinirNotificacao();

  const itens = useMemo(() => ordenarWatchlist(watchlist.data ?? []), [watchlist.data]);
  const idsDaWatchlist = itens.map((item) => item.ativo.id);
  // Posições podem ter ativos que não estão na watchlist; a chave é a mesma, então não há consulta repetida.
  const idsDeCotacao = Array.from(new Set([...idsDaWatchlist, ...(posicoes.data ?? []).map((p) => p.ativo_id)]));
  const cotacoes = useCotacoes(idsDeCotacao);
  const consultasSinais = useSinaisDosAtivos(idsDaWatchlist);

  const cotacaoPorId = new Map<Uuid, UseQueryResult<CotacaoAtual, Error>>();
  idsDeCotacao.forEach((id, indice) => cotacaoPorId.set(id, cotacoes[indice]));
  const sinaisPorAtivo = new Map<Uuid, Sinal[] | undefined>();
  idsDaWatchlist.forEach((id, indice) => sinaisPorAtivo.set(id, consultasSinais[indice].data));

  const sinaisAtivos = reunirSinais(itens, sinaisPorAtivo);
  const backtests = useBacktestsDosSinais(
    sinaisAtivos.map(({ ativo, sinal }) => ({ ativoId: ativo.id, regraId: sinal.regra_id })),
  );

  const carregandoSinais = consultasSinais.some((consulta) => consulta.isPending);
  const ativosSemSinais = consultasSinais.filter((consulta) => consulta.isError).length;

  const carregandoVariacao =
    posicoes.isPending || (posicoes.data ?? []).some((p) => cotacaoPorId.get(p.ativo_id)?.isPending ?? false);
  const cotacoesPorId = new Map<Uuid, CotacaoAtual | undefined>(
    idsDeCotacao.map((id, indice) => [id, cotacoes[indice].data]),
  );

  function atualizar() {
    const consultas: { refetch: () => unknown }[] = [
      watchlist,
      rentabilidade,
      posicoes,
      notificacoes,
      ...cotacoes,
      ...consultasSinais,
      ...backtests,
    ];
    consultas.forEach((consulta) => void consulta.refetch());
  }

  function alternarNotificacao(ativoId: Uuid, notificar: boolean) {
    if (definirNotificacao.isPending) return;
    definirNotificacao.mutate(
      { ativoId, notificar: !notificar },
      { onError: (erro) => Alert.alert('Não foi possível alterar as notificações', mensagemDeErro(erro)) },
    );
  }

  const patrimonio = rentabilidade.data ? kpiPatrimonio(rentabilidade.data) : null;
  const resultado = rentabilidade.data ? kpiResultado(rentabilidade.data) : null;
  const variacao = posicoes.data ? kpiVariacaoDoDia(variacaoDoDia(posicoes.data, cotacoesPorId)) : null;
  const sinaisKpi = kpiSinais({ total: sinaisAtivos.length, semDados: ativosSemSinais });
  const resumo = ultimoResumoDiario(notificacoes.data);

  return (
    <Tela aoAtualizar={atualizar} atualizando={watchlist.isRefetching}>
      <View style={estilos.kpis}>
        <Kpi
          rotulo="Patrimônio simulado"
          icone="carteira"
          valor={rentabilidade.isError ? 'indisponível' : (patrimonio?.valor ?? '')}
          dica={patrimonio?.dica}
          carregando={rentabilidade.isPending}
        />
        <Kpi
          rotulo="Resultado não realizado"
          icone="tendencia"
          tomIcone={resultado?.cor === 'negativo' ? 'negativo' : 'positivo'}
          corValor={resultado?.cor}
          valor={rentabilidade.isError ? 'indisponível' : (resultado?.valor ?? '')}
          dica={resultado?.dica}
          carregando={rentabilidade.isPending}
        />
        <Kpi
          rotulo="Variação do dia"
          icone="atividade"
          tomIcone={variacao?.cor === 'negativo' ? 'negativo' : 'positivo'}
          corValor={variacao?.cor}
          valor={posicoes.isError ? 'indisponível' : (variacao?.valor ?? '')}
          dica={variacao?.dica}
          carregando={carregandoVariacao}
        />
        <Kpi
          rotulo="Sinais ativos"
          icone="atividade"
          tomIcone="destaque"
          valor={sinaisKpi.valor}
          dica={sinaisKpi.dica}
          carregando={carregandoSinais}
        />
      </View>

      <ResumoDiarioCard
        estado={notificacoes.isPending ? 'carregando' : notificacoes.isError ? 'erro' : 'ok'}
        erro={notificacoes.error}
        resumo={resumo}
        aoTentarNovamente={() => void notificacoes.refetch()}
      />

      <Texto variante="subtitulo" role="heading">
        Watchlist
      </Texto>
      {watchlist.isPending ? (
        <>
          <Skeleton altura={72} />
          <Skeleton altura={72} />
          <Skeleton altura={72} />
        </>
      ) : null}
      {watchlist.isError ? (
        <ErroComRetry erro={watchlist.error} aoTentarNovamente={() => void watchlist.refetch()} />
      ) : null}
      {watchlist.isSuccess && itens.length === 0 ? (
        <EstadoVazio
          mensagem="Sua watchlist está vazia."
          acao={{ titulo: 'Buscar ativo', onPress: () => router.push('/buscar') }}
        />
      ) : null}
      {itens.map((item, indice) => {
        const cotacao = cotacaoPorId.get(item.ativo.id);
        const sinais = consultasSinais[indice];
        return (
          <LinhaAtivo
            key={item.ativo.id}
            ativo={item.ativo}
            cotacao={cotacao?.data}
            estadoCotacao={estadoDaCotacao(cotacao)}
            sinais={sinais?.data?.length}
            notificar={item.notificar}
            aoAlternarNotificacao={() => alternarNotificacao(item.ativo.id, item.notificar)}
            aoPressionar={() =>
              router.push({ pathname: '/ativo/[id]', params: { id: item.ativo.id, ticker: item.ativo.ticker } })
            }
          />
        );
      })}

      <Texto variante="subtitulo" role="heading">
        Sinais técnicos ativos
      </Texto>
      {carregandoSinais && sinaisAtivos.length === 0 && idsDaWatchlist.length > 0 ? (
        <>
          <Skeleton altura={72} />
          <Skeleton altura={72} />
        </>
      ) : null}
      {!carregandoSinais && sinaisAtivos.length === 0 ? (
        <EstadoVazio mensagem="Nenhum sinal técnico ativo no momento." />
      ) : null}
      {sinaisAtivos.map(({ ativo, sinal }, indice) => {
        const backtest = backtests[indice];
        return (
          <ItemSinalAtivo
            key={sinal.id}
            ticker={ativo.ticker}
            regraNome={sinal.regra_nome}
            ativadoEm={sinal.data_ativacao}
            backtest={backtest?.data ? descreverBacktest(backtest.data) : undefined}
            carregandoBacktest={backtest?.isPending ?? true}
            aoPressionar={() => router.push({ pathname: '/ativo/[id]', params: { id: ativo.id, ticker: ativo.ticker } })}
          />
        );
      })}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.md },
});
```

Em `app/(tabs)/_layout.tsx`, trocar o `title: 'Watchlist'` por `title: 'Início'` e `nome="estrela"` por `nome="casa"` (a ação de busca no cabeçalho continua).

- [ ] **Step 4: Rodar, ajustar e ver passar**

Run: `git rm -q __tests__/telas/watchlist.test.tsx && npx jest __tests__/telas/inicio.test.tsx`
Expected: PASS. Se algum teste falhar por seletor (ex.: `getByText('1')` ambíguo com o selo "1 sinal" não ocorre, mas "1" pode coincidir com outro KPI), ajustar o **seletor do teste** (ex.: `within`), nunca o comportamento. O teste "sinais que falham em um ativo…" navega `parent?.parent` do rótulo; se a estrutura do `Kpi` mudar, trocar por `getByText('Sinais ativos')` + `getAllByText('1')`.

- [ ] **Step 5: Verificar e commitar**

Run: `npm run verificar` → exit 0.

```bash
git add "app/(tabs)/index.tsx" "app/(tabs)/_layout.tsx" __tests__/telas/inicio.test.tsx
git commit -m "feat(inicio): aba Início com KPIs, resumo diário, watchlist com sinais e sinais ativos" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Documento do Checkpoint 02, README e PR

**Files:**
- Create: `docs/checkpoint-02.md`
- Modify: `README.md`, `docs/PLANO.md` (§8: marcar a Etapa 3)

**Interfaces:** nenhuma nova.

- [ ] **Step 1: Conferir os fatos do documento contra o código**

Run:

```bash
cd /c/Users/Bruno/Insight-flow-mobile
ls app app/\(tabs\) app/\(auth\) app/ativo app/operacao
grep -n "title:" "app/(tabs)/_layout.tsx" app/_layout.tsx | head -20
git log --format='%h %cs %s' --reverse 2bd747e^..HEAD | head -5
```

Expected: telas `login`, `cadastro`, abas `index` (Início), `portfolio`, `alertas`, `perfil`, e `ativo/[id]`, `buscar`, `chat`, `operacao/nova`. Qualquer divergência com o texto do Step 2 é corrigida **no texto**.

- [ ] **Step 2: Escrever `docs/checkpoint-02.md`**

```markdown
# Checkpoint 02 — Programação Mobile

Projeto Integrador: **InsightFlow**, aplicativo mobile (React Native + Expo + TypeScript) do Sistema de Análise de Ativos do Mercado Financeiro.

Repositório: <https://github.com/InsightF-AI/Insight-flow-mobile> (privado, organização InsightF-AI).
WebAPI utilizada: `Insight-flow-backend` (FastAPI), repositório <https://github.com/InsightF-AI/Insight-flow-backend> (público). Sobe com `docker compose up` em `http://localhost:8000`; a documentação interativa (Swagger) fica em `/docs`.

## 1. Evolução do projeto

**Ponto de partida (Checkpoint 01).** [Preencher: o que foi entregue em 22/09/2026.]

**O que foi implementado desde então:**

- Cadastro e login reais na WebAPI, com sessão por token de acesso (30 min) e token de renovação (30 dias) guardados em armazenamento seguro (`expo-secure-store`). O aplicativo renova a sessão sozinho; se a renovação for recusada, volta ao login.
- Consumo de dados reais por `GET` em todas as telas: watchlist, cotação, histórico de preços, indicadores técnicos, sinais e seu histórico (backtest), alertas, notificações, posições, rentabilidade, comparação com CDI e Ibovespa, e distribuição da carteira.
- Operações com `POST`, `PATCH` e `DELETE`: adicionar e remover ativos da watchlist, ligar e desligar notificações, criar, alterar e remover alertas de preço, registrar e remover operações simuladas.
- Tela **Início** (dashboard): indicadores da carteira, resumo diário gerado por IA (com o aviso legal obrigatório), watchlist com preço, variação e sinais, e sinais técnicos ativos com o histórico da mesma condição.
- Tratamento explícito de carregamento, lista vazia, falha de comunicação e erro do servidor em todas as telas.
- Identidade visual do cliente web (tema escuro e claro, fontes Inter e Space Grotesk).

**O que foi alterado:** a primeira aba deixou de ser uma lista simples de ativos e passou a ser o painel Início; a camada de acesso à API passou a renovar a sessão e a traduzir as mensagens de erro do servidor para o português.

## 2. Navegação

Biblioteca: **Expo Router** (rotas por arquivo, pilhas e abas).

| Tela | Rota | Como se chega |
| --- | --- | --- |
| Login | `/login` | Abertura sem sessão; "Entrar" no cadastro |
| Cadastro | `/cadastro` | "Criar conta" no login |
| Início | `/` (aba) | Abertura com sessão |
| Portfólio | `/portfolio` (aba) | Aba inferior |
| Alertas | `/alertas` (aba) | Aba inferior |
| Perfil | `/perfil` (aba) | Aba inferior |
| Detalhe do ativo | `/ativo/[id]` | Toque num ativo da watchlist, num sinal ou numa notificação |
| Buscar ativo | `/buscar` | Botão "+" do cabeçalho do Início |
| Nova operação | `/operacao/nova` (modal) | Botão do Portfólio |
| Chat com IA | `/chat` | Botão do cabeçalho do Portfólio (em construção) |

**Proteção de rotas.** O layout raiz mostra só `(auth)` sem sessão e só `(tabs)` e as pilhas com sessão (`Stack.Protected`); ao sair ou ao perder a sessão, o aplicativo volta ao login sozinho.

**Dados entre telas.** Só o identificador (e o ticker, para o título) trafega pelos parâmetros de rota, por exemplo `router.push({ pathname: '/ativo/[id]', params: { id, ticker } })`. O restante vem do **cache do TanStack Query**: a mesma chave de consulta não gera nova requisição enquanto o dado está válido, então abrir o detalhe de um ativo já visto na watchlist é imediato.

## 3. Integração com a WebAPI

**Endereço base.** Variável `EXPO_PUBLIC_API_URL` (raiz do servidor, sem `/api/v1`), por exemplo `http://192.168.0.10:8000` no celular físico. O aplicativo valida o valor ao abrir e mostra uma tela explicativa se estiver errado. Todas as rotas ficam sob `/api/v1`.

**Formato.** JSON. Valores decimais chegam como **texto** (`"38.42"`) e são convertidos só na apresentação; datas chegam em ISO 8601 UTC e são exibidas no fuso do aparelho.

**Autenticação.** Cabeçalho `Authorization: Bearer <token>` em todas as rotas, exceto `/auth/*` e `POST /usuarios`.

| Recurso | Método e rota | Uso no aplicativo |
| --- | --- | --- |
| Cadastro | `POST /usuarios` | Criar conta (já devolve a sessão) |
| Sessão | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` | Entrar, renovar e sair |
| Busca | `GET /ativos/buscar?termo=` | Buscar ativo por ticker ou nome |
| Cotação | `GET /ativos/{id}/cotacao` | Preço e variação do dia |
| Histórico | `GET /ativos/{id}/historico?periodo=` | Gráfico de fechamento (1D a 5A) |
| Indicadores | `GET /ativos/{id}/indicadores` | SMA, RSI, MACD, Bollinger, volume relativo |
| Sinais | `GET /ativos/{id}/sinais` | Sinais técnicos vigentes |
| Backtest | `GET /ativos/{id}/sinais/{regra}/backtest` | Histórico da condição (24 meses) |
| Watchlist | `GET`, `POST /watchlist`; `DELETE /watchlist/{id}`; `PATCH /watchlist/{id}/notificacao` | Lista, adicionar, remover, notificar |
| Alertas | `GET`, `POST /alertas`; `PATCH`, `DELETE /alertas/{id}` | Alertas de preço |
| Operações | `GET`, `POST /operacoes`; `DELETE /operacoes/{id}` | Portfólio simulado |
| Carteira | `GET /portfolio/posicoes`, `/rentabilidade`, `/benchmark`, `/distribuicao` | Posições, resultado, CDI/Ibovespa, distribuição |
| Notificações | `GET /notificacoes`; `PATCH /notificacoes/{id}/lida` | Caixa de notificações e resumo diário |

**Entidades principais.** `Ativo` (id, ticker, nome, tipo, setor, moeda), `ItemWatchlist`, `CotacaoAtual`, `PontoHistorico`, `IndicadorTecnico`, `Sinal`, `ResultadoBacktest`, `Alerta`, `Operacao`, `Posicao`, `Rentabilidade`, `Notificacao`. Os tipos estão em `src/api/tipos.ts`, espelhando os esquemas do backend.

**Separação entre interface e comunicação.** `src/api/` só faz HTTP (uma função por rota, sem React Native); `src/hooks/` envolve cada função em `useQuery`/`useMutation`; as telas em `app/` só usam hooks e componentes. As regras de formatação e de cálculo de apresentação ficam em `src/dominio/` e `src/utils/`, com testes.

## 4. Tratamento de estado

**Armazenamento dos dados recebidos.**

- **Estado do servidor:** TanStack Query (`useQuery`), com cache por chave, repetição automática só para falhas transitórias (sem conexão e erros 5xx, no máximo duas vezes) e atualização ao puxar a tela para baixo.
- **Sessão:** Zustand (`useSessao`), com os tokens também no armazenamento seguro.
- **Preferências:** Zustand (`usePreferencias`), com o tema salvo no aparelho.
- Estado local de formulário com `useState`.

**Controle de carregamento.** Cada consulta expõe `isPending`. Na tela Início, cada bloco (indicadores, resumo diário, watchlist, sinais) mostra **esqueletos** no lugar do conteúdo enquanto carrega, de modo que a tela não "pula" e uma consulta lenta não bloqueia as outras.

**Cenários mínimos exigidos** (todos cobertos por testes automatizados em `__tests__/telas/inicio.test.tsx`):

| Cenário | Como o aplicativo se comporta |
| --- | --- |
| WebAPI disponível e com dados | Mostra indicadores, resumo, watchlist ordenada e sinais |
| WebAPI disponível sem registros | Mensagens de lista vazia com ação ("Sua watchlist está vazia" + "Buscar ativo"); indicadores mostram "—" com orientação, nunca "R$ 0,00" |
| Aguardando resposta | Esqueletos nos blocos e indicador de carregamento nas linhas |
| Falha na comunicação | Mensagem "Sem conexão com o servidor (endereço)" ou "O servidor demorou demais para responder (endereço)", com botão "Tentar novamente" |
| Erro enviado pelo servidor | Mensagem em português ("Erro no servidor. Tente novamente em instantes.") e o **código do erro** (`X-Request-ID`) para localizar a requisição nos logs do servidor |

**Apresentação de erros.** Cada bloco trata o próprio erro: se o resumo diário falha, a watchlist e os indicadores continuam aparecendo; se a cotação de um ativo falha, só aquela linha mostra "sem cotação". Mensagens do backend (muitas sem acento) são traduzidas por um dicionário em `src/utils/erros.ts`; as que não constam passam como vieram. Valores ausentes nunca viram zero.

## 5. Regras do produto respeitadas

- Todo texto gerado por IA aparece com o aviso **"Análise gerada por IA. Não constitui recomendação de investimento."**
- Linguagem informativa: nenhuma tela tem botão ou texto de compra ou venda; verde e vermelho indicam só valor positivo ou negativo.
- Portfólio **simulado**: nenhuma operação é executada em corretora.
```

- [ ] **Step 3: Atualizar README e PLANO**

Em `README.md`, na lista "Funcionalidades", trocar o item `- Watchlist com cotação e variação do dia, e busca de ativos` por:

```markdown
- Início: indicadores da carteira (patrimônio, resultado, variação do dia, sinais ativos), resumo diário por IA com aviso legal, watchlist com preço, variação, sinais e notificação por ativo, e sinais técnicos ativos com o histórico da condição. Busca de ativos
```

Em `docs/PLANO.md`, na linha da Etapa 3 da tabela do §8, acrescentar ao fim da coluna "Critério de pronto" ` **Feito em 10/10/2026** (PR da Etapa 3); documento em `docs/checkpoint-02.md`.`

- [ ] **Step 4: Verificar e commitar**

Run: `npm run verificar` → exit 0.

```bash
git add docs/checkpoint-02.md README.md docs/PLANO.md
git commit -m "docs: documento do Checkpoint 02 e atualização do README e do plano" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Enviar a branch e abrir o PR**

```bash
export GH_TOKEN="$(gh auth token --user brunoosouza09)"
cd /c/Users/Bruno/Insight-flow-mobile
git push -u origin feature/etapa-3-inicio
gh pr create -R InsightF-AI/Insight-flow-mobile --base feature/ciclo-1-base-sessao --head feature/etapa-3-inicio \
  --title "feat: Etapa 3 — aba Início (dashboard e watchlist) e documento do Checkpoint 02" --body-file - <<'EOF'
<resumo, verificação e o que ficou de fora; preencher com o resultado real antes de executar>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

(Antes de executar, substituir a linha `<resumo...>` pelo texto real: o que muda, `npm run verificar` com a contagem de testes, "não testado em aparelho" e os menores adiados da revisão.)

- [ ] **Step 6: Resumo do ciclo para o usuário**

Responder com: o que foi feito, o que foi e não foi testado em aparelho, o que precisa ser preenchido no documento (Checkpoint 01 e capturas de tela), o Termo de Uso de IA (entrega separada) e o próximo passo (Etapa 4).
