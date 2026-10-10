# Etapa 5: alertas e notificações — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levar as notificações para o primeiro plano em tempo real (WebSocket com autenticação, renovação e reconexão), mostrar banner in-app, ter uma tela de Notificações (não lidas, marcar todas, toque abre ativo ou resumo), badge de não lidas e reorganizar a aba Alertas em "Preço" (CRUD com preço atual, distância ao alvo e ticker por busca) e "Sinais".

**Architecture:** O cliente WebSocket é uma função pura sem React (`src/api/tempoReal.ts`, com socket e relógio injetáveis), testada com um socket falso. O hook `useTempoReal` liga esse cliente à sessão, ao `AppState` e ao cache do TanStack Query: ao autenticar e ao voltar ao primeiro plano ele sincroniza `GET /notificacoes?apenas_nao_lidas=true` e mescla por `id`; cada notificação recebida entra no cache, dispara o banner e invalida as consultas afetadas. Regras puras (mesclar, destino do toque, distância ao alvo) ficam em `src/dominio/` com teste ao lado.

**Tech Stack:** Expo SDK 57, React Native 0.86 (`WebSocket` e `AppState` nativos), TanStack Query 5, Zustand 5, Expo Router, Jest + React Native Testing Library 14.

**Spec:** `docs/PLANO.md` §4 (navegação e badge), §7 (notificações) e §8 (Etapa 5); `docs/MAPEAMENTO.md` §6.2 (protocolo do WebSocket). Protocolo conferido no backend (`src/app/notifications/websocket.py`): `autenticar` em até 10 s, `autenticado`, `ping` a cada 30 s, reautenticação na mesma conexão, fechamento `4401` quando o token vence ou é inválido, `1011` em erro interno; envelope `{"tipo":"notificacao","notificacao":{...}}`.

## Global Constraints

- Repositório `C:\Users\Bruno\Insight-flow-mobile`; branch `feature/etapa-5-alertas-notificacoes` a partir de `feature/etapa-4-detalhe-do-ativo` (PR #5 aberto). Não alterar backend, web nem desktop.
- Sem dependências novas.
- O token nunca vai na URL nem em header do WebSocket: só na mensagem `autenticar`.
- O servidor **não reenvia** o que chegou com a conexão caída: depois de toda conexão autenticada e ao voltar ao primeiro plano, `GET /notificacoes?apenas_nao_lidas=true`, mesclando por `id`.
- Em segundo plano o WebSocket é fechado. Conexão sem nenhuma mensagem por 90 s é considerada morta. Espera de reconexão crescente: 1 s, 2 s, 4 s… até 30 s.
- O polling de 60 s de `GET /notificacoes` fica só como reserva enquanto o WebSocket não estiver conectado.
- Fronteiras do `CLAUDE.md`: `app/` só rotas; `src/components/` por props e sem hooks de dados; regras puras em `src/dominio/` com teste ao lado; cores só via `useTema()`; nunca `fontWeight`; alvo de toque ≥ 44 pt; ícones só via `Icone`.
- Linguagem factual: nenhum texto sugere comprar ou vender; verde/vermelho só para valor positivo/negativo (o selo de não lidas usa a cor primária).
- Todo texto de IA (resumo diário) aparece com o aviso legal.
- `npm run verificar` verde ao fim de cada tarefa; commits em pt-BR terminando com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`; `gh`/`git push` com `GH_TOKEN="$(gh auth token --user brunoosouza09)"` exportado na mesma chamada. Sem merge e sem trocar a base dos PRs.

## Review Focus

1. **Reconexão em laço:** 4401 repetido (token inválido que a renovação não conserta) e queda sem rede não podem martelar o servidor; backoff com teto e no máximo 3 renovações seguidas por 4401. Tarefa 3.
2. **Notificação duplicada:** a mesma notificação chega pelo WebSocket e de novo pelo `GET` de sincronização; não pode duplicar na caixa, no badge nem repetir o banner. Tarefas 1 e 4.
3. **Sessão encerrada com a conexão aberta** (logout ou refresh recusado): não reconecta, não mostra banner depois do logout e o estado volta a "desconectado". Tarefas 3 e 4.
4. **App vai para segundo plano e volta:** fecha, reabre e sincroniza; nunca dois sockets ao mesmo tempo. Tarefas 3 e 4.
5. **Resumo diário sem texto, notificação de ativo fora da watchlist e "marcar todas" com falha parcial:** o toque não quebra, o ticker some em vez de inventar e a falha parcial é dita. Tarefas 1, 5 e 6.

---

### Task 1: Regras puras de notificação e de alerta

**Files:**
- Create: `src/dominio/notificacoes.ts`, `src/dominio/notificacoes.test.ts`
- Modify: `src/dominio/alerta.ts`, `src/dominio/alerta.test.ts`

**Interfaces:**
- Produces (Tarefas 4, 5, 6 e 7 usam):
  - `mesclarNotificacoes(atual: readonly Notificacao[] | undefined, novas: readonly Notificacao[]): Notificacao[]`
  - `contarNaoLidas(notificacoes: readonly Notificacao[] | undefined): number`
  - `destinoDaNotificacao(notificacao: Notificacao, ticker?: string | null): { pathname: '/ativo/[id]' | '/notificacao/[id]'; params: { id: string; ticker?: string } }`
  - `tituloDaNotificacao(notificacao: Notificacao, ticker?: string | null): string`
  - `distanciaAoAlvo(tipo: TipoCondicaoAlerta, preco: Decimal | number, alvo: Decimal | number): { atingido: boolean; faltaPercentual: number } | null`
  - `descreverDistancia(distancia: { atingido: boolean; faltaPercentual: number }): string`

- [ ] **Step 1: Criar a branch e escrever os testes (falham)**

```bash
cd /c/Users/Bruno/Insight-flow-mobile
git status --short
git switch -c feature/etapa-5-alertas-notificacoes feature/etapa-4-detalhe-do-ativo
```

`src/dominio/notificacoes.test.ts`:

```ts
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
```

Acrescentar ao fim de `src/dominio/alerta.test.ts` (importar `descreverDistancia` e `distanciaAoAlvo` junto dos imports existentes de `@/dominio/alerta`):

```ts
describe('distanciaAoAlvo', () => {
  it('Preço ≥: falta subir até o alvo', () => {
    const d = distanciaAoAlvo('PRECO_MAIOR_IGUAL', '38', '40');
    expect(d?.atingido).toBe(false);
    expect(d?.faltaPercentual).toBeCloseTo(5.263, 3);
  });

  it('Preço ≤: falta cair até o alvo', () => {
    const d = distanciaAoAlvo('PRECO_MENOR_IGUAL', '40', '38');
    expect(d?.atingido).toBe(false);
    expect(d?.faltaPercentual).toBeCloseTo(5, 6);
  });

  it('alvo já alcançado não tem distância', () => {
    expect(distanciaAoAlvo('PRECO_MAIOR_IGUAL', '41', '40')).toEqual({ atingido: true, faltaPercentual: 0 });
    expect(distanciaAoAlvo('PRECO_MENOR_IGUAL', '38', '38')).toEqual({ atingido: true, faltaPercentual: 0 });
  });

  it('preço inválido ou zero não gera distância', () => {
    expect(distanciaAoAlvo('PRECO_MAIOR_IGUAL', 'abc', '40')).toBeNull();
    expect(distanciaAoAlvo('PRECO_MAIOR_IGUAL', '0', '40')).toBeNull();
    expect(distanciaAoAlvo('PRECO_MAIOR_IGUAL', '', '40')).toBeNull();
  });
});

describe('descreverDistancia', () => {
  it('fala do alvo sem recomendar nada', () => {
    expect(descreverDistancia({ atingido: false, faltaPercentual: 5.263 })).toBe('Faltam 5,26% para o alvo');
    expect(descreverDistancia({ atingido: true, faltaPercentual: 0 })).toBe('Alvo atingido');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/dominio/notificacoes.test.ts src/dominio/alerta.test.ts`
Expected: FAIL (módulo `notificacoes` inexistente; `distanciaAoAlvo` não exportada).

- [ ] **Step 3: Implementar**

`src/dominio/notificacoes.ts`:

```ts
import type { Notificacao, Uuid } from '@/api/tipos';
import { ROTULO_TIPO_NOTIFICACAO } from '@/dominio/rotulos';

/**
 * Une listas de notificações por `id`, mais recentes primeiro. `lida` nunca volta a falso: uma leitura feita aqui e ainda
 * não confirmada pelo servidor vence um `GET` anterior a ela.
 */
export function mesclarNotificacoes(
  atual: readonly Notificacao[] | undefined,
  novas: readonly Notificacao[],
): Notificacao[] {
  const porId = new Map<Uuid, Notificacao>();
  for (const notificacao of atual ?? []) porId.set(notificacao.id, notificacao);
  for (const notificacao of novas) {
    const anterior = porId.get(notificacao.id);
    porId.set(notificacao.id, anterior ? { ...notificacao, lida: notificacao.lida || anterior.lida } : notificacao);
  }
  return [...porId.values()].sort((a, b) => Date.parse(b.criado_em) - Date.parse(a.criado_em));
}

export function contarNaoLidas(notificacoes: readonly Notificacao[] | undefined): number {
  return (notificacoes ?? []).filter((notificacao) => !notificacao.lida).length;
}

export interface DestinoDaNotificacao {
  pathname: '/ativo/[id]' | '/notificacao/[id]';
  params: { id: Uuid; ticker?: string };
}

/** Notificação de um ativo abre o ativo; as demais (resumo diário) abrem o detalhe da própria notificação. */
export function destinoDaNotificacao(notificacao: Notificacao, ticker?: string | null): DestinoDaNotificacao {
  if (notificacao.ativo_id) {
    return {
      pathname: '/ativo/[id]',
      params: ticker ? { id: notificacao.ativo_id, ticker } : { id: notificacao.ativo_id },
    };
  }
  return { pathname: '/notificacao/[id]', params: { id: notificacao.id } };
}

export function tituloDaNotificacao(notificacao: Notificacao, ticker?: string | null): string {
  const tipo = ROTULO_TIPO_NOTIFICACAO[notificacao.tipo];
  return ticker ? `${tipo} · ${ticker}` : tipo;
}
```

Em `src/dominio/alerta.ts`, acrescentar ao fim do arquivo e ajustar o import de formatação para `import { formatarMoeda, formatarNumero, normalizarDecimal } from '@/utils/formatacao';`:

```ts
export interface DistanciaAoAlvo {
  atingido: boolean;
  /** Quanto o preço ainda precisa andar, em % do preço atual (0 quando o alvo já foi alcançado). */
  faltaPercentual: number;
}

/** Distância do preço atual ao alvo do alerta. `null` sem preço utilizável. */
export function distanciaAoAlvo(
  tipo: TipoCondicaoAlerta,
  preco: Decimal | number,
  alvo: Decimal | number,
): DistanciaAoAlvo | null {
  // `Number('')` é 0: texto em branco é ausência de preço, não zero.
  if (typeof preco === 'string' && preco.trim() === '') return null;
  const atual = Number(preco);
  const valorAlvo = Number(alvo);
  if (!Number.isFinite(atual) || !Number.isFinite(valorAlvo) || atual <= 0) return null;
  const atingido = tipo === 'PRECO_MAIOR_IGUAL' ? atual >= valorAlvo : atual <= valorAlvo;
  if (atingido) return { atingido: true, faltaPercentual: 0 };
  const falta = tipo === 'PRECO_MAIOR_IGUAL' ? valorAlvo - atual : atual - valorAlvo;
  return { atingido: false, faltaPercentual: (falta / atual) * 100 };
}

export function descreverDistancia(distancia: DistanciaAoAlvo): string {
  return distancia.atingido ? 'Alvo atingido' : `Faltam ${formatarNumero(distancia.faltaPercentual)}% para o alvo`;
}
```

- [ ] **Step 4: Rodar, verificar e commitar**

Run: `npx jest src/dominio/notificacoes.test.ts src/dominio/alerta.test.ts` → PASS.
Run: `npm run verificar` → exit 0.

```bash
git add docs/superpowers/plans/2026-10-10-etapa-5-alertas-e-notificacoes.md src/dominio
git commit -m "feat(notificacoes): regras puras de mesclagem, destino do toque e distância ao alvo" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Endereço do WebSocket e cliente de tempo real

**Files:**
- Create: `src/api/tempoReal.ts`, `src/api/tempoReal.test.ts`
- Modify: `src/config/ambiente.ts`, `src/config/ambiente.test.ts` (se existir; senão `__tests__/ambiente.test.tsx`)

**Interfaces:**
- Produces (Tarefa 3):
  - `urlDoWebSocket(raiz: string): string`
  - `criarClienteTempoReal(opcoes: OpcoesTempoReal): ClienteTempoReal`
  - `type EstadoTempoReal = 'desconectado' | 'conectando' | 'conectado'`
  - `ClienteTempoReal { conectar(): boolean; desconectar(): void }` (`conectar` devolve `true` quando abriu uma conexão nova)
  - `OpcoesTempoReal { url; obterToken(); obterExpiracao(); renovarToken(); aoNotificacao(n); aoAutenticar(); aoMudarEstado?(e); criarSocket?(url); agora?() }`

- [ ] **Step 1: Testes (falham)**

`src/api/tempoReal.test.ts`:

```ts
import type { Notificacao } from '@/api/tipos';
import {
  CODIGO_NAO_AUTENTICADO,
  criarClienteTempoReal,
  type EstadoTempoReal,
  MARGEM_RENOVACAO_MS,
  SILENCIO_MAXIMO_MS,
  type SocketLike,
} from '@/api/tempoReal';

class SocketFalso implements SocketLike {
  static todos: SocketFalso[] = [];
  enviados: string[] = [];
  fechado = false;
  onopen: (() => void) | null = null;
  onmessage: ((evento: { data: unknown }) => void) | null = null;
  onclose: ((evento: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public url: string) {
    SocketFalso.todos.push(this);
  }
  send(dados: string) {
    this.enviados.push(dados);
  }
  close() {
    this.fechado = true;
  }
  abrir() {
    this.onopen?.();
  }
  receber(conteudo: unknown) {
    this.onmessage?.({ data: typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo) });
  }
  cair(codigo = 1006) {
    this.onclose?.({ code: codigo });
  }
  mensagensEnviadas() {
    return this.enviados.map((texto) => JSON.parse(texto) as { tipo: string; token?: string });
  }
}

const AGORA = new Date('2026-10-10T12:00:00Z').getTime();

function notificacao(id: string): Notificacao {
  return {
    id,
    ativo_id: 'a-1',
    tipo: 'ALERTA_DISPARADO',
    mensagem: 'Preço atingiu o alvo',
    contexto: {},
    lida: false,
    criado_em: '2026-10-10T12:00:00Z',
  };
}

async function avancar(ms: number) {
  await jest.advanceTimersByTimeAsync(ms);
}

function montar() {
  const sessao = { token: 'tok-1' as string | null, expiraEm: AGORA + 30 * 60_000 as number | null };
  const aoNotificacao = jest.fn();
  const aoAutenticar = jest.fn();
  const estados: EstadoTempoReal[] = [];
  const renovarToken = jest.fn(async (): Promise<string | null> => {
    sessao.token = 'tok-2';
    sessao.expiraEm = Date.now() + 30 * 60_000;
    return 'tok-2';
  });
  const cliente = criarClienteTempoReal({
    url: 'ws://servidor/api/v1/notificacoes/ws',
    obterToken: () => sessao.token,
    obterExpiracao: () => sessao.expiraEm,
    renovarToken,
    aoNotificacao,
    aoAutenticar,
    aoMudarEstado: (estado) => estados.push(estado),
    criarSocket: (url) => new SocketFalso(url),
  });
  return { cliente, sessao, aoNotificacao, aoAutenticar, estados, renovarToken };
}

/** Abre o socket mais recente e conclui a autenticação. */
async function autenticar(socket: SocketFalso) {
  socket.abrir();
  await avancar(0);
  socket.receber({ tipo: 'autenticado' });
}

beforeEach(() => {
  SocketFalso.todos = [];
  jest.useFakeTimers({ now: AGORA });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('autenticação', () => {
  it('abre o socket, autentica com o token e fica conectado só depois do "autenticado"', async () => {
    const { cliente, aoAutenticar, estados } = montar();
    expect(cliente.conectar()).toBe(true);
    const socket = SocketFalso.todos[0];
    expect(socket.url).toBe('ws://servidor/api/v1/notificacoes/ws');
    socket.abrir();
    await avancar(0);
    expect(socket.mensagensEnviadas()).toEqual([{ tipo: 'autenticar', token: 'tok-1' }]);
    expect(estados).toEqual(['conectando']);
    socket.receber({ tipo: 'autenticado' });
    expect(estados).toEqual(['conectando', 'conectado']);
    expect(aoAutenticar).toHaveBeenCalledTimes(1);
  });

  it('conectar de novo com a conexão ativa não abre outro socket', () => {
    const { cliente } = montar();
    expect(cliente.conectar()).toBe(true);
    expect(cliente.conectar()).toBe(false);
    expect(SocketFalso.todos).toHaveLength(1);
  });

  it('token perto de vencer é renovado antes de autenticar', async () => {
    const { cliente, sessao, renovarToken } = montar();
    sessao.expiraEm = AGORA + MARGEM_RENOVACAO_MS - 1;
    cliente.conectar();
    SocketFalso.todos[0].abrir();
    await avancar(0);
    expect(renovarToken).toHaveBeenCalledTimes(1);
    expect(SocketFalso.todos[0].mensagensEnviadas()).toEqual([{ tipo: 'autenticar', token: 'tok-2' }]);
  });

  it('sem sessão (renovação devolve null) desconecta e não tenta de novo', async () => {
    const { cliente, sessao, renovarToken, estados } = montar();
    sessao.token = null;
    renovarToken.mockResolvedValue(null);
    cliente.conectar();
    SocketFalso.todos[0].abrir();
    await avancar(0);
    expect(estados[estados.length - 1]).toBe('desconectado');
    await avancar(120_000);
    expect(SocketFalso.todos).toHaveLength(1);
  });
});

describe('mensagens', () => {
  it('entrega cada notificação ao callback e ignora mensagens que não entende', async () => {
    const { cliente, aoNotificacao } = montar();
    cliente.conectar();
    const socket = SocketFalso.todos[0];
    await autenticar(socket);
    socket.receber({ tipo: 'notificacao', notificacao: notificacao('n-1') });
    socket.receber('isto não é json');
    socket.receber({ tipo: 'desconhecida' });
    socket.receber({ tipo: 'notificacao' });
    expect(aoNotificacao).toHaveBeenCalledTimes(1);
    expect(aoNotificacao).toHaveBeenCalledWith(notificacao('n-1'));
  });
});

describe('reconexão', () => {
  it('queda reconecta com espera crescente (1 s, 2 s, 4 s) e zera depois de autenticar', async () => {
    const { cliente } = montar();
    cliente.conectar();
    await autenticar(SocketFalso.todos[0]);

    SocketFalso.todos[0].cair(1011);
    await avancar(999);
    expect(SocketFalso.todos).toHaveLength(1);
    await avancar(1);
    expect(SocketFalso.todos).toHaveLength(2);

    SocketFalso.todos[1].cair(1006);
    await avancar(1_999);
    expect(SocketFalso.todos).toHaveLength(2);
    await avancar(1);
    expect(SocketFalso.todos).toHaveLength(3);

    SocketFalso.todos[2].cair(1006);
    await avancar(4_000);
    expect(SocketFalso.todos).toHaveLength(4);

    await autenticar(SocketFalso.todos[3]);
    SocketFalso.todos[3].cair(1006);
    await avancar(1_000);
    expect(SocketFalso.todos).toHaveLength(5);
  });

  it('a espera não passa de 30 s', async () => {
    const { cliente } = montar();
    cliente.conectar();
    for (let i = 0; i < 8; i += 1) {
      SocketFalso.todos[SocketFalso.todos.length - 1].cair(1006);
      await avancar(30_000);
    }
    const antes = SocketFalso.todos.length;
    SocketFalso.todos[antes - 1].cair(1006);
    await avancar(29_999);
    expect(SocketFalso.todos).toHaveLength(antes);
    await avancar(1);
    expect(SocketFalso.todos).toHaveLength(antes + 1);
  });

  it('90 s sem nenhuma mensagem é conexão morta: fecha e reabre', async () => {
    const { cliente } = montar();
    cliente.conectar();
    const socket = SocketFalso.todos[0];
    await autenticar(socket);
    await avancar(SILENCIO_MAXIMO_MS - 1_000);
    socket.receber({ tipo: 'ping' });
    await avancar(SILENCIO_MAXIMO_MS - 1_000);
    expect(SocketFalso.todos).toHaveLength(1);
    await avancar(1_000);
    expect(socket.fechado).toBe(true);
    await avancar(1_000);
    expect(SocketFalso.todos).toHaveLength(2);
  });

  it('desconectar fecha o socket e não reconecta, nem com eventos tardios do socket antigo', async () => {
    const { cliente, estados, aoNotificacao } = montar();
    cliente.conectar();
    const socket = SocketFalso.todos[0];
    await autenticar(socket);
    cliente.desconectar();
    expect(socket.fechado).toBe(true);
    expect(estados[estados.length - 1]).toBe('desconectado');
    socket.receber({ tipo: 'notificacao', notificacao: notificacao('n-1') });
    socket.cair(1006);
    await avancar(60_000);
    expect(SocketFalso.todos).toHaveLength(1);
    expect(aoNotificacao).not.toHaveBeenCalled();
  });
});

describe('fechamento 4401 (não autenticado)', () => {
  it('renova o token e reconecta na hora com o token novo', async () => {
    const { cliente, renovarToken } = montar();
    cliente.conectar();
    await autenticar(SocketFalso.todos[0]);

    SocketFalso.todos[0].cair(CODIGO_NAO_AUTENTICADO);
    await avancar(0);
    expect(renovarToken).toHaveBeenCalledTimes(1);
    expect(SocketFalso.todos).toHaveLength(2);
    SocketFalso.todos[1].abrir();
    await avancar(0);
    expect(SocketFalso.todos[1].mensagensEnviadas()).toEqual([{ tipo: 'autenticar', token: 'tok-2' }]);
  });

  it('refresh recusado (null) encerra de vez: sessão acabou', async () => {
    const { cliente, renovarToken, estados } = montar();
    renovarToken.mockResolvedValue(null);
    cliente.conectar();
    await autenticar(SocketFalso.todos[0]);
    SocketFalso.todos[0].cair(CODIGO_NAO_AUTENTICADO);
    await avancar(0);
    await avancar(120_000);
    expect(SocketFalso.todos).toHaveLength(1);
    expect(estados[estados.length - 1]).toBe('desconectado');
  });

  it('4401 em sequência sem conseguir autenticar para de renovar e passa a esperar', async () => {
    const { cliente, renovarToken } = montar();
    cliente.conectar();
    for (let i = 0; i < 3; i += 1) {
      SocketFalso.todos[SocketFalso.todos.length - 1].cair(CODIGO_NAO_AUTENTICADO);
      await avancar(0);
    }
    expect(renovarToken).toHaveBeenCalledTimes(3);
    expect(SocketFalso.todos).toHaveLength(4);

    SocketFalso.todos[3].cair(CODIGO_NAO_AUTENTICADO);
    await avancar(0);
    expect(renovarToken).toHaveBeenCalledTimes(3);
    expect(SocketFalso.todos).toHaveLength(4);
    await avancar(1_000);
    expect(SocketFalso.todos).toHaveLength(5);
  });

  it('renovação sem rede (rejeita) cai no backoff em vez de ficar parado', async () => {
    const { cliente, renovarToken } = montar();
    renovarToken.mockRejectedValue(new Error('sem rede'));
    cliente.conectar();
    await autenticar(SocketFalso.todos[0]);
    SocketFalso.todos[0].cair(CODIGO_NAO_AUTENTICADO);
    await avancar(0);
    expect(SocketFalso.todos).toHaveLength(1);
    await avancar(1_000);
    expect(SocketFalso.todos).toHaveLength(2);
  });
});

describe('reautenticação na mesma conexão', () => {
  it('antes de o token vencer renova e reautentica sem trocar de socket nem repetir o aoAutenticar', async () => {
    const { cliente, sessao, renovarToken, aoAutenticar } = montar();
    sessao.expiraEm = AGORA + 2 * 60_000;
    cliente.conectar();
    const socket = SocketFalso.todos[0];
    await autenticar(socket);
    expect(aoAutenticar).toHaveBeenCalledTimes(1);

    await avancar(60_000);
    expect(renovarToken).toHaveBeenCalledTimes(1);
    expect(socket.mensagensEnviadas().map((m) => m.token)).toEqual(['tok-1', 'tok-2']);
    socket.receber({ tipo: 'autenticado' });
    expect(aoAutenticar).toHaveBeenCalledTimes(1);
    expect(SocketFalso.todos).toHaveLength(1);
  });

  it('se o HTTP já renovou o token, só reautentica com ele (sem outra renovação)', async () => {
    const { cliente, sessao, renovarToken } = montar();
    sessao.expiraEm = AGORA + 2 * 60_000;
    cliente.conectar();
    const socket = SocketFalso.todos[0];
    await autenticar(socket);

    sessao.token = 'tok-http';
    sessao.expiraEm = AGORA + 30 * 60_000;
    await avancar(60_000);
    expect(renovarToken).not.toHaveBeenCalled();
    expect(socket.mensagensEnviadas().map((m) => m.token)).toEqual(['tok-1', 'tok-http']);
  });
});
```

`urlDoWebSocket` — acrescentar ao teste de ambiente existente (`grep -rn "lerUrlDaApi" __tests__ src --include=*.test.*` mostra o arquivo; usar o mesmo, importando `urlDoWebSocket` de `@/config/ambiente`):

```ts
describe('urlDoWebSocket', () => {
  it('troca http por ws e https por wss e acrescenta o caminho do tempo real', () => {
    expect(urlDoWebSocket('http://192.168.0.10:8000')).toBe('ws://192.168.0.10:8000/api/v1/notificacoes/ws');
    expect(urlDoWebSocket('https://api.exemplo.com')).toBe('wss://api.exemplo.com/api/v1/notificacoes/ws');
  });

  it('não duplica a barra final', () => {
    expect(urlDoWebSocket('http://localhost:8000/')).toBe('ws://localhost:8000/api/v1/notificacoes/ws');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/api/tempoReal.test.ts` e o teste de ambiente.
Expected: FAIL (módulo inexistente; `urlDoWebSocket` não exportada).

- [ ] **Step 3: Implementar**

Em `src/config/ambiente.ts`, acrescentar ao fim:

```ts
/** Endereço do WebSocket de notificações a partir da raiz do servidor: `http` vira `ws` e `https` vira `wss`. */
export function urlDoWebSocket(raiz: string): string {
  return `${raiz.replace(/\/+$/, '').replace(/^http/i, 'ws')}/api/v1/notificacoes/ws`;
}
```

`src/api/tempoReal.ts`:

```ts
import type { Notificacao } from '@/api/tipos';

/** Cliente do WebSocket de notificações (protocolo: docs/MAPEAMENTO.md §6.2). Sem React nem React Native. */

export type EstadoTempoReal = 'desconectado' | 'conectando' | 'conectado';

export const CODIGO_NAO_AUTENTICADO = 4401;
export const ESPERA_MINIMA_MS = 1_000;
export const ESPERA_MAXIMA_MS = 30_000;
/** Três pings (30 s) sem chegar nada: a conexão é considerada morta. */
export const SILENCIO_MAXIMO_MS = 90_000;
/** Renova o token (e reautentica) quando faltar menos que isto para vencer. */
export const MARGEM_RENOVACAO_MS = 60_000;
const ESPERA_MINIMA_DA_REAUTENTICACAO_MS = 5_000;
const RENOVACOES_SEGUIDAS_POR_4401 = 3;

/** Subconjunto do `WebSocket` que o cliente usa (injetável nos testes). */
export interface SocketLike {
  send: (dados: string) => void;
  close: () => void;
  onopen: (() => void) | null;
  onmessage: ((evento: { data: unknown }) => void) | null;
  onclose: ((evento: { code: number }) => void) | null;
  onerror: (() => void) | null;
}

export interface OpcoesTempoReal {
  url: string;
  obterToken: () => string | null;
  /** Epoch em ms em que o access token vence. */
  obterExpiracao: () => number | null;
  /** Novo access token; null quando a sessão acabou; rejeita sem rede. */
  renovarToken: () => Promise<string | null>;
  aoNotificacao: (notificacao: Notificacao) => void;
  /** Primeira autenticação de cada conexão: é o momento de sincronizar o que chegou com ela caída. */
  aoAutenticar: () => void;
  aoMudarEstado?: (estado: EstadoTempoReal) => void;
  criarSocket?: (url: string) => SocketLike;
  agora?: () => number;
}

export interface ClienteTempoReal {
  /** Abre a conexão. Devolve `false` se já estava ativa. */
  conectar: () => boolean;
  /** Fecha e deixa de reconectar. */
  desconectar: () => void;
}

interface MensagemRecebida {
  tipo?: unknown;
  notificacao?: unknown;
}

function lerMensagem(dados: unknown): MensagemRecebida | null {
  if (typeof dados !== 'string') return null;
  try {
    const mensagem = JSON.parse(dados) as unknown;
    return typeof mensagem === 'object' && mensagem !== null ? (mensagem as MensagemRecebida) : null;
  } catch {
    return null;
  }
}

export function criarClienteTempoReal(opcoes: OpcoesTempoReal): ClienteTempoReal {
  const criarSocket = opcoes.criarSocket ?? ((url: string) => new WebSocket(url) as unknown as SocketLike);
  const agora = opcoes.agora ?? Date.now;

  let ativo = false;
  let socket: SocketLike | null = null;
  // Invalida os callbacks de sockets descartados: eventos tardios do socket antigo não tocam o atual.
  let geracao = 0;
  let tentativas = 0;
  let falhas4401 = 0;
  let estado: EstadoTempoReal = 'desconectado';
  let temporizadorReconexao: ReturnType<typeof setTimeout> | null = null;
  let temporizadorSilencio: ReturnType<typeof setTimeout> | null = null;
  let temporizadorRenovacao: ReturnType<typeof setTimeout> | null = null;

  function mudarEstado(novo: EstadoTempoReal) {
    if (novo === estado) return;
    estado = novo;
    opcoes.aoMudarEstado?.(novo);
  }

  function limpar(temporizador: ReturnType<typeof setTimeout> | null) {
    if (temporizador) clearTimeout(temporizador);
  }

  function descartarSocket() {
    geracao += 1;
    limpar(temporizadorSilencio);
    limpar(temporizadorRenovacao);
    temporizadorSilencio = null;
    temporizadorRenovacao = null;
    const antigo = socket;
    socket = null;
    if (antigo) {
      antigo.onopen = null;
      antigo.onmessage = null;
      antigo.onclose = null;
      antigo.onerror = null;
      try {
        antigo.close();
      } catch {
        // Já estava fechado.
      }
    }
  }

  function agendarReconexao() {
    if (!ativo) return;
    mudarEstado('conectando');
    const espera = Math.min(ESPERA_MINIMA_MS * 2 ** tentativas, ESPERA_MAXIMA_MS);
    tentativas += 1;
    limpar(temporizadorReconexao);
    temporizadorReconexao = setTimeout(() => {
      temporizadorReconexao = null;
      abrir();
    }, espera);
  }

  function reiniciarSilencio(minha: number) {
    limpar(temporizadorSilencio);
    temporizadorSilencio = setTimeout(() => {
      if (minha !== geracao) return;
      descartarSocket();
      agendarReconexao();
    }, SILENCIO_MAXIMO_MS);
  }

  /** Token em uso, renovado antes se estiver para vencer. null = sessão acabou. Rejeita sem rede. */
  async function obterTokenValido(): Promise<string | null> {
    const token = opcoes.obterToken();
    const expiraEm = opcoes.obterExpiracao();
    const vencendo = expiraEm !== null && expiraEm - agora() <= MARGEM_RENOVACAO_MS;
    if (token && !vencendo) return token;
    return opcoes.renovarToken();
  }

  async function enviarAutenticar(minha: number) {
    try {
      const token = await obterTokenValido();
      if (minha !== geracao) return;
      if (!token) {
        desconectar();
        return;
      }
      socket?.send(JSON.stringify({ tipo: 'autenticar', token }));
    } catch {
      if (minha !== geracao) return;
      descartarSocket();
      agendarReconexao();
    }
  }

  function agendarReautenticacao(minha: number) {
    limpar(temporizadorRenovacao);
    const expiraEm = opcoes.obterExpiracao();
    if (expiraEm === null) return;
    const espera = Math.max(expiraEm - agora() - MARGEM_RENOVACAO_MS, ESPERA_MINIMA_DA_REAUTENTICACAO_MS);
    temporizadorRenovacao = setTimeout(() => void enviarAutenticar(minha), espera);
  }

  async function renovarEReconectar() {
    mudarEstado('conectando');
    const minha = geracao;
    try {
      const token = await opcoes.renovarToken();
      if (!ativo || minha !== geracao) return;
      if (!token) {
        desconectar();
        return;
      }
      abrir();
    } catch {
      if (!ativo || minha !== geracao) return;
      agendarReconexao();
    }
  }

  function aoFechar(codigo: number) {
    descartarSocket();
    if (!ativo) return;
    if (codigo === CODIGO_NAO_AUTENTICADO) {
      falhas4401 += 1;
      if (falhas4401 <= RENOVACOES_SEGUIDAS_POR_4401) {
        void renovarEReconectar();
        return;
      }
    }
    agendarReconexao();
  }

  function abrir() {
    if (!ativo) return;
    descartarSocket();
    mudarEstado('conectando');
    const minha = geracao;
    let primeiraAutenticacao = true;
    const novo = criarSocket(opcoes.url);
    socket = novo;

    novo.onopen = () => {
      if (minha !== geracao) return;
      reiniciarSilencio(minha);
      void enviarAutenticar(minha);
    };
    novo.onmessage = (evento) => {
      if (minha !== geracao) return;
      reiniciarSilencio(minha);
      const mensagem = lerMensagem(evento.data);
      if (!mensagem) return;
      if (mensagem.tipo === 'autenticado') {
        tentativas = 0;
        falhas4401 = 0;
        mudarEstado('conectado');
        agendarReautenticacao(minha);
        if (primeiraAutenticacao) {
          primeiraAutenticacao = false;
          opcoes.aoAutenticar();
        }
      } else if (mensagem.tipo === 'notificacao' && typeof mensagem.notificacao === 'object' && mensagem.notificacao) {
        opcoes.aoNotificacao(mensagem.notificacao as Notificacao);
      }
    };
    novo.onclose = (evento) => {
      if (minha !== geracao) return;
      aoFechar(evento.code);
    };
    novo.onerror = () => {
      // O fechamento vem logo depois e é tratado em onclose.
    };
  }

  function desconectar() {
    ativo = false;
    limpar(temporizadorReconexao);
    temporizadorReconexao = null;
    descartarSocket();
    mudarEstado('desconectado');
  }

  function conectar(): boolean {
    if (ativo) return false;
    ativo = true;
    tentativas = 0;
    falhas4401 = 0;
    abrir();
    return true;
  }

  return { conectar, desconectar };
}
```

- [ ] **Step 4: Rodar, verificar e commitar**

Run: `npx jest src/api/tempoReal.test.ts` + teste de ambiente → PASS. Run: `npm run verificar` → exit 0.

```bash
git add src/api/tempoReal.ts src/api/tempoReal.test.ts src/config
git commit -m "feat(tempo-real): cliente WebSocket com autenticação, reautenticação, 4401 e reconexão" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Ligação com a sessão, o cache e o primeiro plano

**Files:**
- Create: `src/store/tempoReal.ts`, `src/store/banner.ts`, `src/hooks/useTempoReal.ts`, `src/hooks/useTempoReal.test.tsx`, `src/hooks/useAbrirNotificacao.ts`
- Modify: `src/hooks/useNotificacoes.ts`

**Interfaces:**
- Consumes: `criarClienteTempoReal`, `EstadoTempoReal` (Tarefa 2); `mesclarNotificacoes`, `destinoDaNotificacao` (Tarefa 1).
- Produces (Tarefas 4, 5 e 6):
  - `useConexaoTempoReal`: store `{ estado: EstadoTempoReal; definir(e) }`
  - `useBanner`: store `{ atual: { chave: number; notificacao: Notificacao; ticker: string | null } | null; mostrar(n, ticker); dispensar() }`
  - `useTempoReal(url: string | null): void`
  - `receberNotificacao(queryClient, notificacao): void` e `sincronizarNaoLidas(queryClient): Promise<void>`
  - `useAbrirNotificacao(): (notificacao: Notificacao) => void`
  - `useMarcarTodasLidas()`: mutation `{ falhas: number }` por lista de ids
  - `useNotificacoes()` passa a pausar o polling com o WebSocket conectado

- [ ] **Step 1: Testes (falham)**

`src/hooks/useTempoReal.test.tsx`:

```tsx
import type { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { notificacoesApi } from '@/api/notificacoes';
import type { OpcoesTempoReal } from '@/api/tempoReal';
import type { ItemWatchlist, Notificacao } from '@/api/tipos';
import { chaves } from '@/hooks/chaves';
import { receberNotificacao, sincronizarNaoLidas, useTempoReal } from '@/hooks/useTempoReal';
import { useBanner } from '@/store/banner';
import { useConexaoTempoReal } from '@/store/tempoReal';
import { criarProvedor, criarQueryClientDeTeste } from '@/test/renderizar';

const conectar = jest.fn();
const desconectar = jest.fn();
let opcoesCapturadas: OpcoesTempoReal | null = null;

jest.mock('@/api/tempoReal', () => ({
  criarClienteTempoReal: jest.fn((opcoes: OpcoesTempoReal) => {
    opcoesCapturadas = opcoes;
    return { conectar, desconectar };
  }),
}));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));

function notificacao(id: string, parcial: Partial<Notificacao> = {}): Notificacao {
  return {
    id,
    ativo_id: 'a-1',
    tipo: 'ALERTA_DISPARADO',
    mensagem: 'Preço atingiu o alvo',
    contexto: {},
    lida: false,
    criado_em: '2026-10-10T12:00:00Z',
    ...parcial,
  };
}

const itemWatchlist: ItemWatchlist = {
  ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: null, moeda: 'BRL' },
  notificar: true,
  adicionado_em: '2026-10-01T12:00:00Z',
};

let queryClient: QueryClient;
let mudancaDeEstado: ((estado: string) => void) | null = null;
const remover = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  opcoesCapturadas = null;
  mudancaDeEstado = null;
  queryClient = criarQueryClientDeTeste();
  useBanner.setState({ atual: null });
  useConexaoTempoReal.setState({ estado: 'desconectado' });
  jest.mocked(notificacoesApi.listar).mockResolvedValue([]);
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_tipo: string, ouvinte: (estado: string) => void) => {
    mudancaDeEstado = ouvinte;
    return { remove: remover };
  }) as never);
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
});

async function montar(url: string | null = 'ws://servidor/api/v1/notificacoes/ws') {
  return renderHook(() => useTempoReal(url), { wrapper: criarProvedor(queryClient) });
}

describe('useTempoReal', () => {
  it('conecta ao montar com o app em primeiro plano e desconecta ao desmontar', async () => {
    const { unmount } = await montar();
    expect(conectar).toHaveBeenCalledTimes(1);
    expect(opcoesCapturadas?.url).toBe('ws://servidor/api/v1/notificacoes/ws');
    await unmount();
    expect(desconectar).toHaveBeenCalled();
    expect(remover).toHaveBeenCalled();
    expect(useConexaoTempoReal.getState().estado).toBe('desconectado');
  });

  it('sem endereço (configuração inválida) não cria cliente', async () => {
    await montar(null);
    expect(opcoesCapturadas).toBeNull();
    expect(conectar).not.toHaveBeenCalled();
  });

  it('o estado da conexão vai para a store (o polling de reserva depende dele)', async () => {
    await montar();
    opcoesCapturadas?.aoMudarEstado?.('conectado');
    expect(useConexaoTempoReal.getState().estado).toBe('conectado');
  });

  it('segundo plano fecha a conexão; voltar abre de novo', async () => {
    await montar();
    conectar.mockClear();
    mudancaDeEstado?.('background');
    expect(desconectar).toHaveBeenCalledTimes(1);
    conectar.mockReturnValue(true);
    mudancaDeEstado?.('active');
    expect(conectar).toHaveBeenCalledTimes(1);
  });

  it('voltar ao primeiro plano com a conexão já ativa sincroniza pelo REST', async () => {
    queryClient.setQueryData(chaves.notificacoes, [notificacao('n-1', { lida: true })]);
    jest.mocked(notificacoesApi.listar).mockResolvedValue([notificacao('n-2')]);
    await montar();
    conectar.mockReturnValue(false);
    mudancaDeEstado?.('active');
    await waitFor(() => expect(notificacoesApi.listar).toHaveBeenCalledWith(true));
  });

  it('ao autenticar, sincroniza as não lidas e mescla por id sem duplicar', async () => {
    queryClient.setQueryData(chaves.notificacoes, [notificacao('n-1', { lida: true }), notificacao('n-2')]);
    jest.mocked(notificacoesApi.listar).mockResolvedValue([notificacao('n-2'), notificacao('n-3')]);
    await montar();
    opcoesCapturadas?.aoAutenticar();
    await waitFor(() =>
      expect((queryClient.getQueryData(chaves.notificacoes) as Notificacao[]).map((n) => n.id).sort()).toEqual([
        'n-1',
        'n-2',
        'n-3',
      ]),
    );
  });
});

describe('receberNotificacao', () => {
  it('insere no cache, mostra o banner com o ticker e invalida os alertas', () => {
    queryClient.setQueryData(chaves.watchlist, [itemWatchlist]);
    queryClient.setQueryData(chaves.notificacoes, []);
    const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
    receberNotificacao(queryClient, notificacao('n-1'));
    expect((queryClient.getQueryData(chaves.notificacoes) as Notificacao[])[0].id).toBe('n-1');
    expect(useBanner.getState().atual?.notificacao.id).toBe('n-1');
    expect(useBanner.getState().atual?.ticker).toBe('PETR4');
    expect(invalidar).toHaveBeenCalledWith({ queryKey: chaves.alertas });
  });

  it('sinal ativado invalida os sinais do ativo', () => {
    const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
    receberNotificacao(queryClient, notificacao('n-1', { tipo: 'SINAL_ATIVADO' }));
    expect(invalidar).toHaveBeenCalledWith({ queryKey: chaves.sinais('a-1') });
  });

  it('a mesma notificação de novo não repete o banner nem duplica na caixa', () => {
    queryClient.setQueryData(chaves.notificacoes, []);
    receberNotificacao(queryClient, notificacao('n-1'));
    useBanner.getState().dispensar();
    receberNotificacao(queryClient, notificacao('n-1'));
    expect(useBanner.getState().atual).toBeNull();
    expect(queryClient.getQueryData(chaves.notificacoes)).toHaveLength(1);
  });

  it('notificação que já chegou pelo REST (sincronização) não gera banner', () => {
    queryClient.setQueryData(chaves.notificacoes, [notificacao('n-1')]);
    receberNotificacao(queryClient, notificacao('n-1'));
    expect(useBanner.getState().atual).toBeNull();
  });

  it('ativo fora da watchlist mostra o banner sem ticker', () => {
    receberNotificacao(queryClient, notificacao('n-1', { ativo_id: 'a-9' }));
    expect(useBanner.getState().atual?.ticker).toBeNull();
  });
});

describe('sincronizarNaoLidas', () => {
  it('falha de rede não derruba nada (o polling de reserva cobre)', async () => {
    queryClient.setQueryData(chaves.notificacoes, [notificacao('n-1')]);
    jest.mocked(notificacoesApi.listar).mockRejectedValue(new Error('sem rede'));
    await expect(sincronizarNaoLidas(queryClient)).resolves.toBeUndefined();
    expect(queryClient.getQueryData(chaves.notificacoes)).toHaveLength(1);
  });

  it('sem lista carregada ainda, pede a lista completa em vez de criar uma só com as não lidas', async () => {
    const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
    await sincronizarNaoLidas(queryClient);
    expect(notificacoesApi.listar).not.toHaveBeenCalled();
    expect(invalidar).toHaveBeenCalledWith({ queryKey: chaves.notificacoes });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/hooks/useTempoReal.test.tsx`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar**

`src/store/tempoReal.ts`:

```ts
import { create } from 'zustand';

import type { EstadoTempoReal } from '@/api/tempoReal';

interface EstadoDaConexao {
  estado: EstadoTempoReal;
  definir: (estado: EstadoTempoReal) => void;
}

/** Estado do WebSocket de notificações: o polling de reserva só roda enquanto não estiver `conectado`. */
export const useConexaoTempoReal = create<EstadoDaConexao>()((set) => ({
  estado: 'desconectado',
  definir: (estado) => set({ estado }),
}));
```

`src/store/banner.ts`:

```ts
import { create } from 'zustand';

import type { Notificacao } from '@/api/tipos';

export interface BannerAtual {
  /** Muda a cada banner: reinicia o tempo de exibição mesmo quando a notificação é parecida. */
  chave: number;
  notificacao: Notificacao;
  ticker: string | null;
}

interface EstadoBanner {
  atual: BannerAtual | null;
  mostrar: (notificacao: Notificacao, ticker: string | null) => void;
  dispensar: () => void;
}

let contador = 0;

export const useBanner = create<EstadoBanner>()((set) => ({
  atual: null,
  mostrar: (notificacao, ticker) => {
    contador += 1;
    set({ atual: { chave: contador, notificacao, ticker } });
  },
  dispensar: () => set({ atual: null }),
}));
```

`src/hooks/useTempoReal.ts`:

```ts
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { notificacoesApi } from '@/api/notificacoes';
import { criarClienteTempoReal } from '@/api/tempoReal';
import type { ItemWatchlist, Notificacao } from '@/api/tipos';
import { mesclarNotificacoes } from '@/dominio/notificacoes';
import { chaves } from '@/hooks/chaves';
import { useBanner } from '@/store/banner';
import { useSessao } from '@/store/sessao';
import { useConexaoTempoReal } from '@/store/tempoReal';

function guardar(queryClient: QueryClient, novas: Notificacao[]) {
  queryClient.setQueryData<Notificacao[]>(chaves.notificacoes, (atual) => mesclarNotificacoes(atual, novas));
}

/**
 * O servidor não reenvia o que chegou com a conexão caída: depois de cada conexão autenticada e ao voltar ao primeiro
 * plano, busca as não lidas e mescla por `id`. Sem lista carregada ainda, só pede a lista completa.
 */
export async function sincronizarNaoLidas(queryClient: QueryClient): Promise<void> {
  if (queryClient.getQueryData(chaves.notificacoes) === undefined) {
    await queryClient.invalidateQueries({ queryKey: chaves.notificacoes });
    return;
  }
  try {
    guardar(queryClient, await notificacoesApi.listar(true));
  } catch {
    // Sem rede agora: o polling de reserva e a próxima conexão cobrem.
  }
}

/** Notificação que chegou pelo WebSocket: entra na caixa, invalida o que ela afeta e (se for nova) vira banner. */
export function receberNotificacao(queryClient: QueryClient, notificacao: Notificacao): void {
  const jaExistia =
    queryClient.getQueryData<Notificacao[]>(chaves.notificacoes)?.some((n) => n.id === notificacao.id) ?? false;
  guardar(queryClient, [notificacao]);

  if (notificacao.tipo === 'ALERTA_DISPARADO') void queryClient.invalidateQueries({ queryKey: chaves.alertas });
  if (notificacao.tipo === 'SINAL_ATIVADO' && notificacao.ativo_id) {
    void queryClient.invalidateQueries({ queryKey: chaves.sinais(notificacao.ativo_id) });
  }

  // Já tinha chegado (pelo REST ou antes pelo WebSocket): o usuário já foi avisado.
  if (jaExistia || notificacao.lida) return;
  const itens = queryClient.getQueryData<ItemWatchlist[]>(chaves.watchlist);
  const ticker = itens?.find((item) => item.ativo.id === notificacao.ativo_id)?.ativo.ticker ?? null;
  useBanner.getState().mostrar(notificacao, ticker);
}

/** Mantém o WebSocket de notificações aberto enquanto o app está em primeiro plano. `url` null = sem tempo real. */
export function useTempoReal(url: string | null): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!url) return;
    const definirEstado = useConexaoTempoReal.getState().definir;
    const cliente = criarClienteTempoReal({
      url,
      obterToken: () => useSessao.getState().token,
      obterExpiracao: () => useSessao.getState().expiraEm,
      renovarToken: () => useSessao.getState().renovar(),
      aoNotificacao: (notificacao) => receberNotificacao(queryClient, notificacao),
      aoAutenticar: () => void sincronizarNaoLidas(queryClient),
      aoMudarEstado: definirEstado,
    });

    if (AppState.currentState === 'active') cliente.conectar();
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'background') {
        cliente.desconectar();
      } else if (estado === 'active') {
        // Conexão nova sincroniza ao autenticar; se já estava ativa, sincroniza agora.
        if (!cliente.conectar()) void sincronizarNaoLidas(queryClient);
      }
    });

    return () => {
      assinatura.remove();
      cliente.desconectar();
      definirEstado('desconectado');
    };
  }, [url, queryClient]);
}
```

`src/hooks/useNotificacoes.ts` (arquivo inteiro):

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/api/client';
import { notificacoesApi } from '@/api/notificacoes';
import type { Notificacao, Uuid } from '@/api/tipos';
import { contarNaoLidas } from '@/dominio/notificacoes';
import { chaves } from '@/hooks/chaves';
import { useConexaoTempoReal } from '@/store/tempoReal';

// Reserva: o WebSocket entrega em tempo real; este polling só roda enquanto ele não está conectado.
export const INTERVALO_NOTIFICACOES_MS = 60_000;

export function useNotificacoes() {
  const conectado = useConexaoTempoReal((estado) => estado.estado === 'conectado');
  return useQuery<Notificacao[], ApiError>({
    queryKey: chaves.notificacoes,
    queryFn: () => notificacoesApi.listar(),
    refetchInterval: conectado ? false : INTERVALO_NOTIFICACOES_MS,
  });
}

export function useNaoLidas(): number {
  const { data } = useNotificacoes();
  return contarNaoLidas(data);
}

export function useMarcarLida() {
  const queryClient = useQueryClient();
  return useMutation<Notificacao, ApiError, Uuid>({
    mutationFn: (notificacaoId) => notificacoesApi.marcarComoLida(notificacaoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chaves.notificacoes }),
  });
}

/** O backend só marca uma por vez: dispara todas e informa quantas falharam (a lista é relida de qualquer jeito). */
export function useMarcarTodasLidas() {
  const queryClient = useQueryClient();
  return useMutation<{ falhas: number }, ApiError, Uuid[]>({
    mutationFn: async (ids) => {
      const resultados = await Promise.allSettled(ids.map((id) => notificacoesApi.marcarComoLida(id)));
      return { falhas: resultados.filter((resultado) => resultado.status === 'rejected').length };
    },
    onMutate: (ids) => {
      queryClient.setQueryData<Notificacao[]>(chaves.notificacoes, (atual) =>
        atual?.map((notificacao) => (ids.includes(notificacao.id) ? { ...notificacao, lida: true } : notificacao)),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.notificacoes }),
  });
}
```

`src/hooks/useAbrirNotificacao.ts`:

```ts
import { router } from 'expo-router';

import type { Notificacao } from '@/api/tipos';
import { destinoDaNotificacao } from '@/dominio/notificacoes';
import { mapaAtivos } from '@/dominio/portfolio';
import { useMarcarLida } from '@/hooks/useNotificacoes';
import { useWatchlist } from '@/hooks/useWatchlist';

/** Toque numa notificação (na caixa ou no banner): marca como lida e abre o ativo ou o detalhe. */
export function useAbrirNotificacao(): (notificacao: Notificacao) => void {
  const marcarLida = useMarcarLida();
  const watchlist = useWatchlist();
  return (notificacao) => {
    if (!notificacao.lida) marcarLida.mutate(notificacao.id);
    const ticker = notificacao.ativo_id
      ? mapaAtivos(undefined, watchlist.data).get(notificacao.ativo_id)?.ticker
      : undefined;
    router.push(destinoDaNotificacao(notificacao, ticker));
  };
}
```

- [ ] **Step 4: Rodar, verificar e commitar**

Run: `npx jest src/hooks` → PASS. Run: `npm run verificar` → exit 0.

```bash
git add src/store/tempoReal.ts src/store/banner.ts src/hooks
git commit -m "feat(tempo-real): hook que liga o WebSocket à sessão, ao cache e ao primeiro plano" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Banner in-app e ligação na raiz

**Files:**
- Create: `src/components/BannerNotificacao.tsx`, `src/components/banner.test.tsx`, `src/hooks/useBannerNotificacao.ts`, `src/hooks/useBannerNotificacao.test.tsx`
- Modify: `src/components/Icone.tsx`, `app/_layout.tsx`

**Interfaces:**
- Consumes: `useBanner` (Tarefa 3), `useAbrirNotificacao` (Tarefa 3), `tituloDaNotificacao` (Tarefa 1), `useTempoReal`, `urlDoWebSocket`.
- Produces: `BannerNotificacao({ titulo, mensagem, aoPressionar, aoDispensar })`, `useBannerNotificacao()`.

- [ ] **Step 1: Testes (falham)**

`src/components/banner.test.tsx`:

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';

import { BannerNotificacao } from '@/components/BannerNotificacao';

describe('BannerNotificacao', () => {
  it('mostra título e mensagem como alerta acessível e abre ao toque', async () => {
    const user = userEvent.setup();
    const aoPressionar = jest.fn();
    await render(
      <BannerNotificacao
        titulo="Alerta de preço · PETR4"
        mensagem="PETR4 atingiu R$ 40,00"
        aoPressionar={aoPressionar}
        aoDispensar={jest.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(screen.getByText('Alerta de preço · PETR4')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Abrir: Alerta de preço · PETR4. PETR4 atingiu R$ 40,00' }));
    expect(aoPressionar).toHaveBeenCalledTimes(1);
  });

  it('tem botão para dispensar sem abrir', async () => {
    const user = userEvent.setup();
    const aoPressionar = jest.fn();
    const aoDispensar = jest.fn();
    await render(<BannerNotificacao titulo="T" mensagem="M" aoPressionar={aoPressionar} aoDispensar={aoDispensar} />);
    await user.press(screen.getByRole('button', { name: 'Dispensar aviso' }));
    expect(aoDispensar).toHaveBeenCalledTimes(1);
    expect(aoPressionar).not.toHaveBeenCalled();
  });
});
```

`src/hooks/useBannerNotificacao.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';

import { notificacoesApi } from '@/api/notificacoes';
import type { Notificacao } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { DURACAO_DO_BANNER_MS, useBannerNotificacao } from '@/hooks/useBannerNotificacao';
import { useBanner } from '@/store/banner';
import { criarProvedor } from '@/test/renderizar';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn() } }));

const alerta: Notificacao = {
  id: 'n-1',
  ativo_id: 'a-1',
  tipo: 'ALERTA_DISPARADO',
  mensagem: 'PETR4 atingiu R$ 40,00',
  contexto: {},
  lida: false,
  criado_em: '2026-10-10T12:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  useBanner.setState({ atual: null });
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  jest.mocked(notificacoesApi.marcarComoLida).mockResolvedValue({ ...alerta, lida: true });
});

afterEach(() => {
  jest.useRealTimers();
});

it('sem notificação recebida não há banner', async () => {
  const { result } = await renderHook(() => useBannerNotificacao(), { wrapper: criarProvedor() });
  expect(result.current.banner).toBeNull();
});

it('monta o título com o ticker e some sozinho depois do tempo de exibição', async () => {
  const { result } = await renderHook(() => useBannerNotificacao(), { wrapper: criarProvedor() });
  await act(async () => {
    useBanner.getState().mostrar(alerta, 'PETR4');
  });
  expect(result.current.banner).toEqual({ titulo: 'Alerta de preço · PETR4', mensagem: 'PETR4 atingiu R$ 40,00' });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(DURACAO_DO_BANNER_MS);
  });
  expect(result.current.banner).toBeNull();
});

it('tocar no banner dispensa, marca como lida e abre o ativo', async () => {
  const { result } = await renderHook(() => useBannerNotificacao(), { wrapper: criarProvedor() });
  await act(async () => {
    useBanner.getState().mostrar(alerta, 'PETR4');
  });
  await act(async () => {
    result.current.aoPressionar();
  });
  expect(useBanner.getState().atual).toBeNull();
  expect(notificacoesApi.marcarComoLida).toHaveBeenCalledWith('n-1');
  expect(router.push).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1' } });
});

it('um banner novo reinicia o tempo de exibição', async () => {
  const { result } = await renderHook(() => useBannerNotificacao(), { wrapper: criarProvedor() });
  await act(async () => {
    useBanner.getState().mostrar(alerta, null);
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(DURACAO_DO_BANNER_MS - 1_000);
  });
  await act(async () => {
    useBanner.getState().mostrar({ ...alerta, id: 'n-2' }, null);
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(DURACAO_DO_BANNER_MS - 1_000);
  });
  expect(result.current.banner).not.toBeNull();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/components/banner.test.tsx src/hooks/useBannerNotificacao.test.tsx`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar**

Em `src/components/Icone.tsx`: acrescentar `X,` ao import de `lucide-react-native` (depois de `Wallet,`) e a entrada `fechar: X,` no mapa `ICONES` (depois de `estrela: Star,`).

`src/components/BannerNotificacao.tsx`:

```tsx
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone } from '@/components/Icone';
import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  titulo: string;
  mensagem: string;
  aoPressionar: () => void;
  aoDispensar: () => void;
}

/** Aviso in-app de uma notificação recebida com o app aberto. Flutua sobre a tela, abaixo da área segura. */
export function BannerNotificacao({ titulo, mensagem, aoPressionar, aoDispensar }: Props) {
  const { cores, sombras } = useTema();
  const insets = useSafeAreaInsets();
  return (
    <View
      role="alert"
      style={[
        estilos.contenedor,
        { top: insets.top + espaco.sm, backgroundColor: cores.superficieAlta, borderColor: cores.primaria, boxShadow: sombras.sm },
      ]}
    >
      <Pressable
        role="button"
        aria-label={`Abrir: ${titulo}. ${mensagem}`}
        onPress={aoPressionar}
        style={estilos.conteudo}
      >
        <Icone nome="sino" tamanho={20} cor="primaria" />
        <View style={estilos.textos}>
          <Texto variante="legenda" cor="secundario" negrito>
            {titulo}
          </Texto>
          <Texto numberOfLines={2}>{mensagem}</Texto>
        </View>
      </Pressable>
      <Pressable role="button" aria-label="Dispensar aviso" onPress={aoDispensar} style={estilos.fechar}>
        <Icone nome="fechar" tamanho={18} cor="textoSecundario" />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    position: 'absolute',
    left: espaco.lg,
    right: espaco.lg,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: raio.lg,
  },
  conteudo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: espaco.md, padding: espaco.md, minHeight: 44 },
  textos: { flex: 1, gap: 2 },
  fechar: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
```

`src/hooks/useBannerNotificacao.ts`:

```ts
import { useEffect } from 'react';

import { tituloDaNotificacao } from '@/dominio/notificacoes';
import { useAbrirNotificacao } from '@/hooks/useAbrirNotificacao';
import { useBanner } from '@/store/banner';

export const DURACAO_DO_BANNER_MS = 6_000;

/** Dados e ações do banner in-app: some sozinho e, ao toque, abre a notificação (marcando como lida). */
export function useBannerNotificacao() {
  const atual = useBanner((estado) => estado.atual);
  const dispensar = useBanner((estado) => estado.dispensar);
  const abrir = useAbrirNotificacao();
  const chave = atual?.chave ?? null;

  useEffect(() => {
    if (chave === null) return;
    const temporizador = setTimeout(dispensar, DURACAO_DO_BANNER_MS);
    return () => clearTimeout(temporizador);
  }, [chave, dispensar]);

  return {
    banner: atual
      ? { titulo: tituloDaNotificacao(atual.notificacao, atual.ticker), mensagem: atual.notificacao.mensagem }
      : null,
    aoPressionar: () => {
      if (!atual) return;
      dispensar();
      abrir(atual.notificacao);
    },
    aoDispensar: dispensar,
  };
}
```

`app/_layout.tsx` — quatro edições:

```edit:app/_layout.tsx
<<<<
import { ConfiguracaoInvalida } from '@/components/ConfiguracaoInvalida';
import { lerUrlDaApi } from '@/config/ambiente';
import { queryClient } from '@/hooks/queryClient';
====
import { BannerNotificacao } from '@/components/BannerNotificacao';
import { ConfiguracaoInvalida } from '@/components/ConfiguracaoInvalida';
import { lerUrlDaApi, urlDoWebSocket } from '@/config/ambiente';
import { queryClient } from '@/hooks/queryClient';
import { useBannerNotificacao } from '@/hooks/useBannerNotificacao';
import { useTempoReal } from '@/hooks/useTempoReal';
>>>>
<<<<
function temaDeNavegacao(tema: Tema): Theme {
====
// Com a sessão ativa: mantém o WebSocket de notificações aberto e mostra o banner de cada notificação recebida.
function SessaoAtiva() {
  useTempoReal(erroDeConfiguracao ? null : urlDoWebSocket(baseUrl));
  const { banner, aoPressionar, aoDispensar } = useBannerNotificacao();
  if (!banner) return null;
  return (
    <BannerNotificacao titulo={banner.titulo} mensagem={banner.mensagem} aoPressionar={aoPressionar} aoDispensar={aoDispensar} />
  );
}

function temaDeNavegacao(tema: Tema): Theme {
>>>>
<<<<
                <Stack.Screen name="chat" options={{ title: 'Perguntar à IA' }} />
====
                <Stack.Screen name="chat" options={{ title: 'Perguntar à IA' }} />
                <Stack.Screen name="notificacoes" options={{ title: 'Notificações' }} />
                <Stack.Screen name="notificacao/[id]" options={{ title: 'Notificação' }} />
>>>>
<<<<
            </Stack>
          </ThemeProvider>
====
            </Stack>
            {autenticado ? <SessaoAtiva /> : null}
          </ThemeProvider>
>>>>
```

- [ ] **Step 4: Rodar, verificar e commitar**

Run: `npx jest src/components/banner.test.tsx src/hooks/useBannerNotificacao.test.tsx src/components/icone.test.tsx` → PASS. Run: `npm run verificar` → exit 0 (a rota `notificacoes` ainda não existe: o `Stack.Screen` de rota inexistente só avisa em desenvolvimento; as rotas entram na Tarefa 5).

```bash
git add src/components/BannerNotificacao.tsx src/components/banner.test.tsx src/components/Icone.tsx src/hooks/useBannerNotificacao.ts src/hooks/useBannerNotificacao.test.tsx app/_layout.tsx
git commit -m "feat(notificacoes): banner in-app e tempo real ligado à sessão na raiz do app" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Tela de Notificações, detalhe, sino com selo e badge

**Files:**
- Create: `app/notificacoes.tsx`, `app/notificacao/[id].tsx`, `__tests__/telas/notificacoes.test.tsx`, `__tests__/telas/notificacao.test.tsx`
- Modify: `app/(tabs)/_layout.tsx`, `app/(tabs)/perfil.tsx`, `__tests__/telas/perfil.test.tsx`, `src/components/BotaoCabecalho.tsx`, `src/components/botaoCabecalho.test.tsx`

**Interfaces:**
- Consumes: `useNotificacoes`, `useMarcarTodasLidas`, `useAbrirNotificacao` (Tarefa 3), `contarNaoLidas`, `tituloDaNotificacao` (Tarefa 1), `ultimoResumoDiario`.
- Produces: rotas `/notificacoes` e `/notificacao/[id]`; `BotaoCabecalho` com `selo?: number`.

- [ ] **Step 1: Testes (falham)**

`__tests__/telas/notificacoes.test.tsx`:

```tsx
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { ApiError } from '@/api/client';
import { notificacoesApi } from '@/api/notificacoes';
import type { Notificacao } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { renderizar } from '@/test/renderizar';

import Notificacoes from '../../app/notificacoes';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn() } }));

function notificacao(id: string, parcial: Partial<Notificacao> = {}): Notificacao {
  return {
    id,
    ativo_id: 'a-1',
    tipo: 'SINAL_ATIVADO',
    mensagem: `Sobrevenda RSI ativado em PETR4 (${id})`,
    contexto: {},
    lida: false,
    criado_em: '2026-10-10T12:00:00Z',
    ...parcial,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  jest.mocked(watchlistApi.listar).mockResolvedValue([
    {
      ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: null, moeda: 'BRL' },
      notificar: true,
      adicionado_em: '2026-10-01T12:00:00Z',
    },
  ]);
  jest.mocked(notificacoesApi.marcarComoLida).mockImplementation(async (id) => notificacao(id, { lida: true }));
});

it('abre nas não lidas e a aba "Todas" mostra também as lidas', async () => {
  const user = userEvent.setup();
  jest.mocked(notificacoesApi.listar).mockResolvedValue([notificacao('n-1'), notificacao('n-2', { lida: true })]);
  await renderizar(<Notificacoes />);
  expect(await screen.findByText('Sobrevenda RSI ativado em PETR4 (n-1)')).toBeOnTheScreen();
  expect(screen.queryByText('Sobrevenda RSI ativado em PETR4 (n-2)')).not.toBeOnTheScreen();
  await user.press(screen.getByRole('radio', { name: 'Todas' }));
  expect(await screen.findByText('Sobrevenda RSI ativado em PETR4 (n-2)')).toBeOnTheScreen();
});

it('toque abre o ativo com o ticker e marca como lida', async () => {
  const user = userEvent.setup();
  jest.mocked(notificacoesApi.listar).mockResolvedValue([notificacao('n-1')]);
  await renderizar(<Notificacoes />);
  await user.press(await screen.findByRole('button', { name: /Não lida\. Sinal técnico · PETR4/ }));
  await waitFor(() => expect(notificacoesApi.marcarComoLida).toHaveBeenCalledWith('n-1'));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1', ticker: 'PETR4' } });
});

it('resumo diário abre o detalhe da notificação', async () => {
  const user = userEvent.setup();
  const resumo = notificacao('n-9', { ativo_id: null, tipo: 'RESUMO_DIARIO', mensagem: 'Resumo diario da carteira' });
  jest.mocked(notificacoesApi.listar).mockResolvedValue([resumo]);
  await renderizar(<Notificacoes />);
  await user.press(await screen.findByRole('button', { name: /Resumo diário/ }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/notificacao/[id]', params: { id: 'n-9' } });
});

it('notificação de ativo que saiu da watchlist abre o ativo sem inventar ticker', async () => {
  const user = userEvent.setup();
  jest.mocked(notificacoesApi.listar).mockResolvedValue([notificacao('n-1', { ativo_id: 'a-9' })]);
  await renderizar(<Notificacoes />);
  await user.press(await screen.findByRole('button', { name: /Não lida\. Sinal técnico\./ }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-9' } });
});

it('"Marcar todas como lidas" marca cada não lida e some quando não há nenhuma', async () => {
  const user = userEvent.setup();
  jest
    .mocked(notificacoesApi.listar)
    .mockResolvedValueOnce([notificacao('n-1'), notificacao('n-2')])
    .mockResolvedValue([notificacao('n-1', { lida: true }), notificacao('n-2', { lida: true })]);
  await renderizar(<Notificacoes />);
  await user.press(await screen.findByRole('button', { name: 'Marcar todas como lidas' }));
  await waitFor(() => expect(notificacoesApi.marcarComoLida).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Marcar todas como lidas' })).not.toBeOnTheScreen());
});

it('falha parcial ao marcar todas é dita ao usuário', async () => {
  const user = userEvent.setup();
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(notificacoesApi.listar).mockResolvedValue([notificacao('n-1'), notificacao('n-2')]);
  jest
    .mocked(notificacoesApi.marcarComoLida)
    .mockResolvedValueOnce(notificacao('n-1', { lida: true }))
    .mockRejectedValueOnce(new ApiError(500, 'Falha no servidor'));
  await renderizar(<Notificacoes />);
  await user.press(await screen.findByRole('button', { name: 'Marcar todas como lidas' }));
  await waitFor(() =>
    expect(alerta).toHaveBeenCalledWith(
      'Algumas notificações não foram marcadas',
      '1 de 2 não puderam ser marcadas como lidas. Tente novamente.',
    ),
  );
});

it('lista vazia, carregando e erro têm estado próprio', async () => {
  jest.mocked(notificacoesApi.listar).mockResolvedValue([]);
  await renderizar(<Notificacoes />);
  expect(await screen.findByText('Nenhuma notificação não lida.')).toBeOnTheScreen();
});

it('erro ao carregar mostra a mensagem com tentar de novo', async () => {
  jest.mocked(notificacoesApi.listar).mockRejectedValue(new ApiError(500, 'Falha no servidor'));
  await renderizar(<Notificacoes />);
  expect(await screen.findByRole('button', { name: 'Tentar novamente' })).toBeOnTheScreen();
});
```

`__tests__/telas/notificacao.test.tsx`:

```tsx
import { screen } from '@testing-library/react-native';

import { notificacoesApi } from '@/api/notificacoes';
import type { Notificacao } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { AVISO_IA } from '@/dominio/regulatorio';
import { renderizar } from '@/test/renderizar';

import DetalheNotificacao from '../../app/notificacao/[id]';

let idDaRota = 'n-9';
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: idDaRota }),
  router: { push: jest.fn() },
}));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn() } }));

const resumo: Notificacao = {
  id: 'n-9',
  ativo_id: null,
  tipo: 'RESUMO_DIARIO',
  mensagem: 'Resumo diario da carteira',
  contexto: { texto: 'A carteira fechou o dia estável.', aviso_legal: 'Análise gerada por IA. Não é recomendação.' },
  lida: true,
  criado_em: '2026-10-09T21:30:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  idDaRota = 'n-9';
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
});

it('resumo diário mostra o texto completo e o aviso legal', async () => {
  jest.mocked(notificacoesApi.listar).mockResolvedValue([resumo]);
  await renderizar(<DetalheNotificacao />);
  expect(await screen.findByText('A carteira fechou o dia estável.')).toBeOnTheScreen();
  expect(screen.getByText('Análise gerada por IA. Não é recomendação.')).toBeOnTheScreen();
});

it('resumo sem aviso legal do servidor usa o aviso padrão', async () => {
  jest
    .mocked(notificacoesApi.listar)
    .mockResolvedValue([{ ...resumo, contexto: { texto: 'A carteira fechou o dia estável.' } }]);
  await renderizar(<DetalheNotificacao />);
  expect(await screen.findByText(AVISO_IA)).toBeOnTheScreen();
});

it('resumo sem texto não quebra e explica', async () => {
  jest.mocked(notificacoesApi.listar).mockResolvedValue([{ ...resumo, contexto: {} }]);
  await renderizar(<DetalheNotificacao />);
  expect(await screen.findByText('Esta notificação não tem texto para mostrar.')).toBeOnTheScreen();
});

it('notificação inexistente mostra aviso em vez de tela em branco', async () => {
  idDaRota = 'n-404';
  jest.mocked(notificacoesApi.listar).mockResolvedValue([resumo]);
  await renderizar(<DetalheNotificacao />);
  expect(await screen.findByText('Notificação não encontrada.')).toBeOnTheScreen();
});
```

Em `src/components/botaoCabecalho.test.tsx`, acrescentar (adaptando o import de `render`/`screen` já presente):

```tsx
it('mostra o selo de não lidas e o inclui no nome acessível', async () => {
  await render(<BotaoCabecalho icone="sino" rotulo="Notificações" selo={3} onPress={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Notificações, 3 não lidas' })).toBeOnTheScreen();
  expect(screen.getByText('3')).toBeOnTheScreen();
});

it('selo zero ou ausente não aparece e muitos viram 99+', async () => {
  const { rerender } = await render(<BotaoCabecalho icone="sino" rotulo="Notificações" selo={0} onPress={jest.fn()} />);
  expect(screen.queryByText('0')).not.toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Notificações' })).toBeOnTheScreen();
  await rerender(<BotaoCabecalho icone="sino" rotulo="Notificações" selo={150} onPress={jest.fn()} />);
  expect(screen.getByText('99+')).toBeOnTheScreen();
});
```

`__tests__/telas/perfil.test.tsx` — arquivo inteiro (as notificações saíram do Perfil):

```tsx
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

import { authApi } from '@/api/auth';
import { notificacoesApi } from '@/api/notificacoes';
import type { Notificacao } from '@/api/tipos';
import { usePreferencias } from '@/store/preferencias';
import { useSessao } from '@/store/sessao';
import { renderizar } from '@/test/renderizar';
import { coresClaro, coresEscuro } from '@/theme/cores';

import Perfil from '../../app/(tabs)/perfil';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/auth', () => ({ authApi: { sair: jest.fn(), renovar: jest.fn() } }));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));

const armazenamento = (SecureStore as unknown as { __armazenamento: Map<string, string> }).__armazenamento;

const naoLida: Notificacao = {
  id: 'n-1',
  ativo_id: 'a-1',
  tipo: 'SINAL_ATIVADO',
  mensagem: 'Sobrevenda RSI ativado em PETR4',
  contexto: {},
  lida: false,
  criado_em: '2026-09-25T15:30:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  armazenamento.clear();
  usePreferencias.setState({ tema: 'escuro' });
  useSessao.setState({ status: 'autenticado', token: 'tok', refreshToken: 'ref', expiraEm: null, email: 'ana@exemplo.com' });
  jest.mocked(authApi.sair).mockResolvedValue(undefined);
  jest.mocked(notificacoesApi.listar).mockResolvedValue([naoLida]);
});

it('mostra o e-mail e leva à caixa de notificações com a contagem de não lidas', async () => {
  const user = userEvent.setup();
  await renderizar(<Perfil />);
  expect(await screen.findByText('ana@exemplo.com')).toBeOnTheScreen();
  expect(await screen.findByText('1 não lida')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Abrir notificações' }));
  expect(router.push).toHaveBeenCalledWith('/notificacoes');
});

it('sem notificações não lidas a contagem diz isso', async () => {
  jest.mocked(notificacoesApi.listar).mockResolvedValue([{ ...naoLida, lida: true }]);
  await renderizar(<Perfil />);
  expect(await screen.findByText('Nenhuma não lida')).toBeOnTheScreen();
});

it('sair pede confirmação e encerra a sessão', async () => {
  const user = userEvent.setup();
  jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensagem, botoes) => {
    botoes?.find((botao) => botao.style === 'destructive')?.onPress?.();
  });
  await renderizar(<Perfil />);
  await user.press(await screen.findByRole('button', { name: 'Sair' }));
  await waitFor(() => expect(useSessao.getState().status).toBe('anonimo'));
  expect(authApi.sair).toHaveBeenCalledWith('ref');
});

it('sair encerra a sessão mesmo se o armazenamento seguro falhar, sem rejeição não tratada', async () => {
  const user = userEvent.setup();
  jest.spyOn(SecureStore, 'deleteItemAsync').mockRejectedValue(new Error('falha no armazenamento'));
  jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensagem, botoes) => {
    botoes?.find((botao) => botao.style === 'destructive')?.onPress?.();
  });
  await renderizar(<Perfil />);
  await user.press(await screen.findByRole('button', { name: 'Sair' }));
  await waitFor(() => expect(SecureStore.deleteItemAsync).toHaveBeenCalled());
  await waitFor(() => expect(useSessao.getState().status).toBe('anonimo'));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      'Não foi possível concluir a saída',
      expect.stringContaining('encerrada neste aparelho'),
    ),
  );
  // Sem o `.catch` em perfil.tsx a rejeição de `sair` fica sem tratamento e o Jest reprova o teste em curso ao detectá-la.
  // O Node só a detecta depois de esvaziar as microtarefas, então cedemos voltas do laço de eventos antes de terminar
  // para que a detecção aconteça aqui dentro e não escape para depois do fim do teste.
  await new Promise<void>((resolver) => setImmediate(resolver));
  await new Promise<void>((resolver) => setImmediate(resolver));
});

describe('Aparência (tema)', () => {
  it('abre no escuro por padrão', async () => {
    await renderizar(<Perfil />);
    expect(await screen.findByRole('radio', { name: 'Escuro' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Claro' })).not.toBeChecked();
  });

  it('alternar para claro reestiliza a tela na hora e persiste a escolha', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);
    const titulo = await screen.findByRole('heading', { name: 'Aparência' });
    expect(titulo).toHaveStyle({ color: coresEscuro.texto });

    await user.press(screen.getByRole('radio', { name: 'Claro' }));

    expect(screen.getByRole('radio', { name: 'Claro' })).toBeChecked();
    expect(screen.getByRole('heading', { name: 'Aparência' })).toHaveStyle({ color: coresClaro.texto });
    expect(usePreferencias.getState().tema).toBe('claro');
    expect(armazenamento.get('insightflow.tema')).toBe('claro');
  });

  it('voltar para escuro também persiste', async () => {
    const user = userEvent.setup();
    usePreferencias.setState({ tema: 'claro' });
    await renderizar(<Perfil />);
    await user.press(await screen.findByRole('radio', { name: 'Escuro' }));
    expect(armazenamento.get('insightflow.tema')).toBe('escuro');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest __tests__/telas/notificacoes.test.tsx __tests__/telas/notificacao.test.tsx __tests__/telas/perfil.test.tsx src/components/botaoCabecalho.test.tsx`
Expected: FAIL (rotas inexistentes; Perfil ainda lista as notificações; `selo` ignorado).

- [ ] **Step 3: Implementar**

`src/components/BotaoCabecalho.tsx` (arquivo inteiro):

```tsx
import { Pressable, StyleSheet, View } from 'react-native';

import { Icone, type NomeIcone } from '@/components/Icone';
import { Texto } from '@/components/Texto';
import { useTema } from '@/theme/useTema';

interface Props {
  icone: NomeIcone;
  rotulo: string;
  onPress: () => void;
  /** Contagem sobre o ícone (notificações não lidas). Zero ou ausente não mostra nada. */
  selo?: number;
}

export function BotaoCabecalho({ icone, rotulo, onPress, selo }: Props) {
  const { cores } = useTema();
  const contagem = selo && selo > 0 ? selo : 0;
  return (
    <Pressable
      role="button"
      aria-label={contagem > 0 ? `${rotulo}, ${contagem} não lidas` : rotulo}
      onPress={onPress}
      style={estilos.botao}
    >
      <Icone nome={icone} tamanho={22} cor="primaria" />
      {contagem > 0 ? (
        <View style={[estilos.selo, { backgroundColor: cores.primaria }]}>
          <Texto variante="legenda" cor="sobrePrimaria" negrito>
            {contagem > 99 ? '99+' : String(contagem)}
          </Texto>
        </View>
      ) : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  selo: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

`app/notificacoes.tsx`:

```tsx
import { useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { ItemNotificacao } from '@/components/ItemNotificacao';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { mapaAtivos } from '@/dominio/portfolio';
import { useAbrirNotificacao } from '@/hooks/useAbrirNotificacao';
import { useMarcarTodasLidas, useNotificacoes } from '@/hooks/useNotificacoes';
import { useWatchlist } from '@/hooks/useWatchlist';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { mensagemDeErro } from '@/utils/erros';

type Filtro = 'nao_lidas' | 'todas';

const FILTROS: readonly { valor: Filtro; rotulo: string }[] = [
  { valor: 'nao_lidas', rotulo: 'Não lidas' },
  { valor: 'todas', rotulo: 'Todas' },
];

export default function Notificacoes() {
  const { cores } = useTema();
  const notificacoes = useNotificacoes();
  const watchlist = useWatchlist();
  const marcarTodas = useMarcarTodasLidas();
  const abrir = useAbrirNotificacao();
  const [filtro, setFiltro] = useState<Filtro>('nao_lidas');

  const ativos = mapaAtivos(undefined, watchlist.data);
  const todas = notificacoes.data ?? [];
  const naoLidas = todas.filter((notificacao) => !notificacao.lida);
  const lista = filtro === 'nao_lidas' ? naoLidas : todas;

  function marcarTodasComoLidas() {
    const ids = naoLidas.map((notificacao) => notificacao.id);
    marcarTodas.mutate(ids, {
      onSuccess: ({ falhas }) => {
        if (falhas > 0) {
          Alert.alert(
            'Algumas notificações não foram marcadas',
            `${falhas} de ${ids.length} não puderam ser marcadas como lidas. Tente novamente.`,
          );
        }
      },
      onError: (erro) => Alert.alert('Não foi possível marcar como lidas', mensagemDeErro(erro)),
    });
  }

  function listaVazia() {
    if (notificacoes.isPending) return <Carregando />;
    if (notificacoes.isError) {
      return <ErroComRetry erro={notificacoes.error} aoTentarNovamente={() => void notificacoes.refetch()} />;
    }
    return (
      <EstadoVazio
        mensagem={filtro === 'nao_lidas' ? 'Nenhuma notificação não lida.' : 'Nenhuma notificação por enquanto.'}
      />
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: cores.fundo }}
      contentContainerStyle={estilos.lista}
      data={lista}
      keyExtractor={(notificacao) => notificacao.id}
      refreshControl={
        <RefreshControl
          refreshing={notificacoes.isRefetching}
          onRefresh={() => void notificacoes.refetch()}
          tintColor={cores.primaria}
        />
      }
      ListHeaderComponent={
        <View style={estilos.cabecalho}>
          <SeletorSegmentado rotulo="Filtro das notificações" opcoes={FILTROS} selecionado={filtro} aoSelecionar={setFiltro} />
          {naoLidas.length > 0 ? (
            <Botao
              titulo="Marcar todas como lidas"
              variante="secundario"
              onPress={marcarTodasComoLidas}
              carregando={marcarTodas.isPending}
            />
          ) : null}
        </View>
      }
      ListEmptyComponent={listaVazia()}
      renderItem={({ item }) => (
        <ItemNotificacao
          notificacao={item}
          ticker={item.ativo_id ? (ativos.get(item.ativo_id)?.ticker ?? null) : null}
          aoPressionar={() => abrir(item)}
        />
      )}
    />
  );
}

const estilos = StyleSheet.create({
  lista: { padding: espaco.lg, gap: espaco.md, flexGrow: 1 },
  cabecalho: { gap: espaco.md, marginBottom: espaco.sm },
});
```

`app/notificacao/[id].tsx`:

```tsx
import { useLocalSearchParams } from 'expo-router';

import { AvisoIA } from '@/components/AvisoIA';
import { Card } from '@/components/Card';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { ultimoResumoDiario } from '@/dominio/inicio';
import { tituloDaNotificacao } from '@/dominio/notificacoes';
import { mapaAtivos } from '@/dominio/portfolio';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { useWatchlist } from '@/hooks/useWatchlist';
import { formatarDataHora } from '@/utils/formatacao';

export default function DetalheNotificacao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const notificacoes = useNotificacoes();
  const watchlist = useWatchlist();
  const notificacao = notificacoes.data?.find((item) => item.id === id);

  if (notificacoes.isPending) {
    return (
      <Tela>
        <Carregando />
      </Tela>
    );
  }
  if (notificacoes.isError && !notificacao) {
    return (
      <Tela>
        <ErroComRetry erro={notificacoes.error} aoTentarNovamente={() => void notificacoes.refetch()} />
      </Tela>
    );
  }
  if (!notificacao) {
    return (
      <Tela>
        <EstadoVazio mensagem="Notificação não encontrada." />
      </Tela>
    );
  }

  const ticker = notificacao.ativo_id ? mapaAtivos(undefined, watchlist.data).get(notificacao.ativo_id)?.ticker : null;
  const resumo = notificacao.tipo === 'RESUMO_DIARIO' ? ultimoResumoDiario([notificacao]) : null;

  return (
    <Tela>
      <Card titulo={tituloDaNotificacao(notificacao, ticker)} icone={resumo ? 'brilho' : 'sino'} tomIcone={resumo ? 'ia' : 'destaque'}>
        {notificacao.tipo === 'RESUMO_DIARIO' ? (
          resumo ? (
            <>
              <Texto>{resumo.texto}</Texto>
              <Texto variante="legenda" cor="secundario">
                {`Gerado em ${formatarDataHora(resumo.geradoEm)}`}
              </Texto>
              <AvisoIA texto={resumo.avisoLegal} />
            </>
          ) : (
            <Texto cor="secundario">Esta notificação não tem texto para mostrar.</Texto>
          )
        ) : (
          <>
            <Texto>{notificacao.mensagem}</Texto>
            <Texto variante="legenda" cor="secundario">
              {formatarDataHora(notificacao.criado_em)}
            </Texto>
          </>
        )}
      </Card>
    </Tela>
  );
}
```

`app/(tabs)/_layout.tsx` (arquivo inteiro):

```tsx
import { router, Tabs } from 'expo-router';
import { View } from 'react-native';

import { BotaoCabecalho } from '@/components/BotaoCabecalho';
import { Icone } from '@/components/Icone';
import { useNaoLidas } from '@/hooks/useNotificacoes';
import { familia } from '@/theme/familias';
import { useTema } from '@/theme/useTema';

export default function TabsLayout() {
  const { cores } = useTema();
  // Montar as abas liga a lista de notificações (só acontece com sessão ativa); o tempo real fica na raiz.
  const naoLidas = useNaoLidas();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: cores.superficie },
        headerTitleStyle: { fontFamily: familia.tituloSemi, color: cores.texto },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: cores.fundo },
        tabBarStyle: { backgroundColor: cores.superficie, borderTopColor: cores.borda },
        tabBarActiveTintColor: cores.primaria,
        tabBarInactiveTintColor: cores.textoTerciario,
        tabBarLabelStyle: { fontFamily: familia.medio, fontSize: 11 },
        // Contagem de não lidas não é "negativo": usa a cor primária (vermelho só para valor negativo).
        tabBarBadgeStyle: {
          backgroundColor: cores.primaria,
          color: cores.textoSobrePrimaria,
          fontFamily: familia.negrito,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Icone nome="casa" corExata={color} tamanho={size} />,
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <BotaoCabecalho
                icone="sino"
                rotulo="Notificações"
                selo={naoLidas}
                onPress={() => router.push('/notificacoes')}
              />
              <BotaoCabecalho icone="mais" rotulo="Buscar ativo" onPress={() => router.push('/buscar')} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfólio',
          tabBarIcon: ({ color, size }) => <Icone nome="grafico-pizza" corExata={color} tamanho={size} />,
          headerRight: () => (
            <BotaoCabecalho icone="mensagem" rotulo="Perguntar à IA" onPress={() => router.push('/chat')} />
          ),
        }}
      />
      <Tabs.Screen
        name="alertas"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color, size }) => <Icone nome="sino" corExata={color} tamanho={size} />,
          tabBarBadge: naoLidas > 0 ? naoLidas : undefined,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Icone nome="usuario" corExata={color} tamanho={size} />,
        }}
      />
    </Tabs>
  );
}
```

`app/(tabs)/perfil.tsx` (arquivo inteiro):

```tsx
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { Botao } from '@/components/Botao';
import { Card } from '@/components/Card';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { useNaoLidas } from '@/hooks/useNotificacoes';
import { type EsquemaTema, usePreferencias } from '@/store/preferencias';
import { useSessao } from '@/store/sessao';

const TEMAS: readonly { valor: EsquemaTema; rotulo: string }[] = [
  { valor: 'escuro', rotulo: 'Escuro' },
  { valor: 'claro', rotulo: 'Claro' },
];

export default function Perfil() {
  const tema = usePreferencias((estado) => estado.tema);
  const definirTema = usePreferencias((estado) => estado.definirTema);
  const email = useSessao((estado) => estado.email);
  const sair = useSessao((estado) => estado.sair);
  const naoLidas = useNaoLidas();

  function confirmarSaida() {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        // `sair` limpa o estado antes de tocar no armazenamento seguro: se ele falhar, a sessão já foi encerrada.
        onPress: () => {
          void sair().catch(() => {
            Alert.alert(
              'Não foi possível concluir a saída',
              'A sessão foi encerrada neste aparelho, mas o acesso salvo pode voltar ao reabrir o app.',
            );
          });
        },
      },
    ]);
  }

  return (
    <Tela>
      <Card titulo="Conta" icone="usuario">
        <Texto cor="secundario">Conectado como</Texto>
        <Texto negrito>{email ?? '—'}</Texto>
      </Card>
      <Card titulo="Notificações" icone="sino">
        <Texto cor="secundario">{naoLidas === 1 ? '1 não lida' : naoLidas > 0 ? `${naoLidas} não lidas` : 'Nenhuma não lida'}</Texto>
        <Botao titulo="Abrir notificações" variante="secundario" onPress={() => router.push('/notificacoes')} />
      </Card>
      <Card titulo="Aparência" icone="lua" tomIcone="destaque">
        <SeletorSegmentado
          rotulo="Tema do aplicativo"
          opcoes={TEMAS}
          selecionado={tema}
          aoSelecionar={(valor) => void definirTema(valor)}
        />
      </Card>
      <Botao titulo="Sair" variante="perigo" onPress={confirmarSaida} />
      <Texto variante="legenda" cor="secundario" style={{ textAlign: 'center' }}>
        Ferramenta educacional de análise. Não constitui recomendação de investimento.
      </Texto>
    </Tela>
  );
}
```

- [ ] **Step 4: Rodar, verificar e commitar**

Run: `npx jest __tests__/telas src/components` → PASS. Run: `npm run verificar` → exit 0.

```bash
git add app __tests__ src/components
git commit -m "feat(notificacoes): tela de notificações, detalhe do resumo, sino com selo e badge na aba Alertas" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Aba Alertas com "Preço" e "Sinais"

**Files:**
- Modify: `app/(tabs)/alertas.tsx`, `src/components/ItemAlerta.tsx`, `__tests__/telas/alertas.test.tsx`, `src/components/alerta.test.tsx`

**Interfaces:**
- Consumes: `distanciaAoAlvo`, `descreverDistancia` (Tarefa 1); `useCotacoes`, `useSinaisDosAtivos`, `useBacktestsDosSinais`; `useBuscaAtivos`, `useDebounce`; `SugestoesTicker`; `reunirSinais`, `ordenarWatchlist`.
- Produces: `ItemAlerta` com `cotacao?: { preco: Decimal } | null` e `cotacaoIndisponivel?: boolean`.

- [ ] **Step 1: Testes (falham)**

Em `src/components/alerta.test.tsx` acrescentar (usando o `alerta` e imports já existentes no arquivo; se o nome da fixture for outro, usar o dele):

```tsx
describe('ItemAlerta: preço atual e distância ao alvo', () => {
  it('mostra o preço atual e quanto falta para o alvo', async () => {
    await render(
      <ItemAlerta alerta={alerta} cotacao={{ preco: '38' }} ocupado={false} aoAlternar={jest.fn()} aoRemover={jest.fn()} />,
    );
    expect(screen.getByText(/Preço atual/)).toBeOnTheScreen();
    expect(screen.getByText('Faltam 5,26% para o alvo')).toBeOnTheScreen();
  });

  it('alvo alcançado diz "Alvo atingido"', async () => {
    await render(
      <ItemAlerta alerta={alerta} cotacao={{ preco: '41' }} ocupado={false} aoAlternar={jest.fn()} aoRemover={jest.fn()} />,
    );
    expect(screen.getByText('Alvo atingido')).toBeOnTheScreen();
  });

  it('sem cotação não inventa distância', async () => {
    await render(
      <ItemAlerta alerta={alerta} cotacaoIndisponivel ocupado={false} aoAlternar={jest.fn()} aoRemover={jest.fn()} />,
    );
    expect(screen.getByText('Preço atual indisponível')).toBeOnTheScreen();
    expect(screen.queryByText(/Faltam/)).not.toBeOnTheScreen();
  });
});
```

`__tests__/telas/alertas.test.tsx` — acrescentar os mocks no topo (junto dos existentes) e os testes; `beforeEach` passa a mockar os novos:

```tsx
// no topo, junto dos outros imports e mocks:
import { ativosApi } from '@/api/ativos';
import { watchlistApi } from '@/api/watchlist';

jest.mock('@/api/ativos', () => ({
  ativosApi: { cotacao: jest.fn(), buscar: jest.fn(), sinais: jest.fn(), backtest: jest.fn() },
}));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn() } }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

// no beforeEach existente, depois de mockar alertasApi.listar:
//   jest.mocked(ativosApi.cotacao).mockResolvedValue({ ticker: 'PETR4', preco: '38', variacao: '0', variacao_percentual: '0', maxima_dia: '38', minima_dia: '38', volume: '0' });
//   jest.mocked(ativosApi.buscar).mockResolvedValue([]);
//   jest.mocked(watchlistApi.listar).mockResolvedValue([]);
//   jest.mocked(ativosApi.sinais).mockResolvedValue([]);

it('mostra o preço atual e a distância ao alvo de cada alerta', async () => {
  jest.mocked(alertasApi.listar).mockResolvedValue([alerta]);
  await renderizar(<Alertas />);
  expect(await screen.findByText('Faltam 5,26% para o alvo')).toBeOnTheScreen();
});

it('sugere tickers da busca enquanto o usuário digita e preenche o campo ao tocar', async () => {
  const user = userEvent.setup();
  jest.mocked(ativosApi.buscar).mockResolvedValue([
    { ticker: 'VALE3', nome: 'Vale ON', tipo: 'ACAO', moeda: 'BRL', setor: null },
    { ticker: 'VALE5', nome: 'Vale PNA', tipo: 'ACAO', moeda: 'BRL', setor: null },
  ]);
  await renderizar(<Alertas />);
  await user.type(screen.getByLabelText('Ticker'), 'VAL');
  await user.press(await screen.findByRole('button', { name: 'Usar VALE3' }, { timeout: 5000 }));
  expect(screen.getByLabelText('Ticker')).toHaveDisplayValue('VALE3');
});

describe('segmento Sinais', () => {
  const itemWatchlist = {
    ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO' as const, setor: null, moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-10-01T12:00:00Z',
  };

  it('lista os sinais ativos da watchlist com o histórico da condição', async () => {
    const user = userEvent.setup();
    jest.mocked(watchlistApi.listar).mockResolvedValue([itemWatchlist]);
    jest.mocked(ativosApi.sinais).mockResolvedValue([
      {
        id: 's-1',
        ativo_id: 'a-1',
        regra_id: 'a1a1a1a1-0000-0000-0000-000000000001',
        regra_nome: 'Sobrevenda RSI',
        regra_descricao: 'RSI(14) abaixo de 30.',
        data_ativacao: '2026-10-09T13:00:00Z',
        contexto: { valor: '28.4' },
        data_desativacao: null,
      },
    ]);
    jest.mocked(ativosApi.backtest).mockResolvedValue({
      regra_id: 'a1a1a1a1-0000-0000-0000-000000000001',
      ativo_id: 'a-1',
      total_ocorrencias: 4,
      retorno_medio_5_pregoes: '1.2',
      retorno_medio_20_pregoes: null,
      retorno_medio_60_pregoes: '-3',
    });
    await renderizar(<Alertas />);
    await user.press(screen.getByRole('radio', { name: 'Sinais' }));
    expect(await screen.findByText('Sobrevenda RSI')).toBeOnTheScreen();
    expect(screen.getByText('PETR4')).toBeOnTheScreen();
    expect(await screen.findByText('+1,20%')).toBeOnTheScreen();
  });

  it('sem sinais ativos explica em vez de mostrar uma lista vazia', async () => {
    const user = userEvent.setup();
    jest.mocked(watchlistApi.listar).mockResolvedValue([itemWatchlist]);
    await renderizar(<Alertas />);
    await user.press(screen.getByRole('radio', { name: 'Sinais' }));
    expect(await screen.findByText('Nenhum sinal técnico ativo no momento.')).toBeOnTheScreen();
  });

  it('watchlist vazia diz que não há ativos para acompanhar', async () => {
    const user = userEvent.setup();
    await renderizar(<Alertas />);
    await user.press(screen.getByRole('radio', { name: 'Sinais' }));
    expect(await screen.findByText('Sua watchlist está vazia.')).toBeOnTheScreen();
  });
});
```

(Aplicar a edição no `beforeEach` do arquivo exatamente como indicado nos comentários: eles são código a descomentar, não prosa.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/components/alerta.test.tsx __tests__/telas/alertas.test.tsx`
Expected: FAIL (`cotacao` ignorada; sem segmento "Sinais"; sem sugestões).

- [ ] **Step 3: Implementar**

`src/components/ItemAlerta.tsx` (arquivo inteiro):

```tsx
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import type { Alerta, Decimal } from '@/api/tipos';
import { Icone } from '@/components/Icone';
import { Texto } from '@/components/Texto';
import { descreverCondicao, descreverDistancia, distanciaAoAlvo } from '@/dominio/alerta';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { formatarDataHora, formatarMoeda } from '@/utils/formatacao';

interface Props {
  alerta: Alerta;
  /** Cotação atual do ativo, quando já carregou. */
  cotacao?: { preco: Decimal } | null;
  /** A cotação falhou ou não existe: mostra "indisponível" em vez de inventar a distância. */
  cotacaoIndisponivel?: boolean;
  aoAlternar: (habilitado: boolean) => void;
  aoRemover: () => void;
  ocupado: boolean;
}

export function ItemAlerta({ alerta, cotacao, cotacaoIndisponivel = false, aoAlternar, aoRemover, ocupado }: Props) {
  const { cores, sombras } = useTema();
  const ticker = alerta.ativo.ticker;
  const distancia = cotacao ? distanciaAoAlvo(alerta.tipo_condicao, cotacao.preco, alerta.valor_alvo) : null;
  return (
    <View style={[estilos.item, { backgroundColor: cores.superficie, borderColor: cores.borda, boxShadow: sombras.sm }]}>
      <View style={estilos.textos}>
        <Texto negrito>{ticker}</Texto>
        <Texto>{descreverCondicao(alerta.tipo_condicao, alerta.valor_alvo, alerta.moeda_alvo)}</Texto>
        {cotacao ? (
          <Texto variante="legenda" cor="secundario" numerico>
            {`Preço atual ${formatarMoeda(cotacao.preco, alerta.moeda_alvo)}`}
          </Texto>
        ) : null}
        {cotacaoIndisponivel && !cotacao ? (
          <Texto variante="legenda" cor="secundario">
            Preço atual indisponível
          </Texto>
        ) : null}
        {distancia ? (
          <Texto variante="legenda" cor="secundario">
            {descreverDistancia(distancia)}
          </Texto>
        ) : null}
        {alerta.disparado_em ? (
          <Texto variante="legenda" cor="alerta">
            {`Disparado em ${formatarDataHora(alerta.disparado_em)}`}
          </Texto>
        ) : null}
      </View>
      <Switch
        role="switch"
        aria-label={`Alerta de ${ticker} habilitado`}
        value={alerta.habilitado}
        onValueChange={aoAlternar}
        disabled={ocupado}
        trackColor={{ true: cores.primaria, false: cores.bordaForte }}
      />
      <Pressable
        role="button"
        aria-label={`Remover alerta de ${ticker}`}
        aria-disabled={ocupado}
        disabled={ocupado}
        onPress={aoRemover}
        hitSlop={12}
      >
        <Icone nome="lixeira" tamanho={20} cor="negativo" />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    padding: espaco.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: raio.lg,
  },
  textos: { flex: 1, gap: 2 },
});
```

`app/(tabs)/alertas.tsx` (arquivo inteiro):

```tsx
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import type { Alerta, CotacaoAtual, TipoCondicaoAlerta, Uuid } from '@/api/tipos';
import { Botao } from '@/components/Botao';
import { Campo } from '@/components/Campo';
import { Card } from '@/components/Card';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { ItemAlerta } from '@/components/ItemAlerta';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { SinalCard } from '@/components/SinalCard';
import { SugestoesTicker } from '@/components/SugestoesTicker';
import { Texto } from '@/components/Texto';
import { type ErrosAlerta, ROTULO_CONDICAO, validarAlerta } from '@/dominio/alerta';
import { ordenarWatchlist, reunirSinais } from '@/dominio/inicio';
import { useAlertas, useAtualizarAlerta, useCriarAlerta, useRemoverAlerta } from '@/hooks/useAlertas';
import { useBacktestsDosSinais, useCotacoes, useSinaisDosAtivos } from '@/hooks/useAtivo';
import { TAMANHO_MINIMO_BUSCA, useBuscaAtivos, useDebounce } from '@/hooks/useBusca';
import { useWatchlist } from '@/hooks/useWatchlist';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { ehStatus, mensagemDeErro } from '@/utils/erros';

type Secao = 'preco' | 'sinais';

const SECOES: readonly { valor: Secao; rotulo: string }[] = [
  { valor: 'preco', rotulo: 'Preço' },
  { valor: 'sinais', rotulo: 'Sinais' },
];

const CONDICOES: readonly { valor: TipoCondicaoAlerta; rotulo: string }[] = [
  { valor: 'PRECO_MAIOR_IGUAL', rotulo: ROTULO_CONDICAO.PRECO_MAIOR_IGUAL },
  { valor: 'PRECO_MENOR_IGUAL', rotulo: ROTULO_CONDICAO.PRECO_MENOR_IGUAL },
];

const ATRASO_BUSCA_MS = 400;
const SUGESTOES_MAXIMAS = 6;

function FormNovoAlerta() {
  const criar = useCriarAlerta();
  const [ticker, setTicker] = useState('');
  const [tipoCondicao, setTipoCondicao] = useState<TipoCondicaoAlerta>('PRECO_MAIOR_IGUAL');
  const [valorAlvo, setValorAlvo] = useState('');
  const [erros, setErros] = useState<ErrosAlerta>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const termo = useDebounce(ticker.trim(), ATRASO_BUSCA_MS);
  const busca = useBuscaAtivos(termo);
  const digitado = ticker.trim().toUpperCase();
  const sugestoes =
    termo.length >= TAMANHO_MINIMO_BUSCA
      ? (busca.data ?? [])
          .map((ativo) => ativo.ticker)
          .filter((sugerido) => sugerido !== digitado)
          .slice(0, SUGESTOES_MAXIMAS)
      : [];

  async function aoCriar() {
    setErroGeral(null);
    const resultado = validarAlerta({ ticker, tipoCondicao, valorAlvo });
    if (!resultado.ok) {
      setErros(resultado.erros);
      return;
    }
    setErros({});
    try {
      await criar.mutateAsync(resultado.dados);
      setTicker('');
      setValorAlvo('');
    } catch (erro) {
      if (ehStatus(erro, 404)) setErros({ ticker: 'Ativo não encontrado' });
      else setErroGeral(mensagemDeErro(erro));
    }
  }

  return (
    <Card titulo="Novo alerta de preço" icone="sino">
      <Campo
        rotulo="Ticker"
        valor={ticker}
        aoMudar={setTicker}
        erro={erros.ticker}
        autoCapitalize="characters"
        placeholder="Ex.: PETR4"
        icone="busca"
      />
      <SugestoesTicker tickers={sugestoes} aoEscolher={setTicker} />
      <SeletorSegmentado rotulo="Condição do alerta" opcoes={CONDICOES} selecionado={tipoCondicao} aoSelecionar={setTipoCondicao} />
      <Campo
        rotulo="Valor alvo"
        valor={valorAlvo}
        aoMudar={setValorAlvo}
        erro={erros.valorAlvo}
        keyboardType="decimal-pad"
        placeholder="Ex.: 40,00"
      />
      {erroGeral ? (
        <Texto role="alert" cor="negativo">
          {erroGeral}
        </Texto>
      ) : null}
      <Botao titulo="Criar alerta" onPress={aoCriar} carregando={criar.isPending} />
    </Card>
  );
}

function AlertasDePreco() {
  const { cores } = useTema();
  const alertas = useAlertas();
  const atualizar = useAtualizarAlerta();
  const remover = useRemoverAlerta();

  // Uma cotação por ativo, mesmo com vários alertas do mesmo ativo.
  const idsDosAtivos = useMemo(
    () => Array.from(new Set((alertas.data ?? []).map((alerta) => alerta.ativo.id))),
    [alertas.data],
  );
  const consultasCotacao = useCotacoes(idsDosAtivos);
  const cotacaoPorAtivo = new Map<Uuid, (typeof consultasCotacao)[number]>();
  idsDosAtivos.forEach((id, indice) => cotacaoPorAtivo.set(id, consultasCotacao[indice]));

  function alternar(alerta: Alerta, habilitado: boolean) {
    atualizar.mutate(
      { id: alerta.id, dados: { ativo: habilitado } },
      { onError: (erro) => Alert.alert('Não foi possível atualizar', mensagemDeErro(erro)) },
    );
  }

  function confirmarRemocao(alerta: Alerta) {
    Alert.alert('Remover alerta', `Remover o alerta de ${alerta.ativo.ticker}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () =>
          remover.mutate(alerta.id, {
            onError: (erro) => Alert.alert('Não foi possível remover', mensagemDeErro(erro)),
          }),
      },
    ]);
  }

  function listaVazia() {
    if (alertas.isPending) return <Carregando />;
    if (alertas.isError) return <ErroComRetry erro={alertas.error} aoTentarNovamente={() => void alertas.refetch()} />;
    return <EstadoVazio mensagem="Nenhum alerta cadastrado." />;
  }

  return (
    <FlatList
      style={{ backgroundColor: cores.fundo }}
      contentContainerStyle={estilos.lista}
      keyboardShouldPersistTaps="handled"
      data={alertas.data ?? []}
      keyExtractor={(alerta) => alerta.id}
      refreshControl={
        <RefreshControl
          refreshing={alertas.isRefetching}
          onRefresh={() => {
            void alertas.refetch();
            consultasCotacao.forEach((consulta) => void consulta.refetch());
          }}
          tintColor={cores.primaria}
        />
      }
      ListHeaderComponent={
        <View style={estilos.cabecalho}>
          <FormNovoAlerta />
          <Texto variante="subtitulo" role="heading">
            Seus alertas
          </Texto>
        </View>
      }
      ListEmptyComponent={listaVazia()}
      renderItem={({ item }) => {
        const cotacao = cotacaoPorAtivo.get(item.ativo.id);
        const dados: CotacaoAtual | undefined = cotacao?.data;
        return (
          <ItemAlerta
            alerta={item}
            cotacao={dados ? { preco: dados.preco } : null}
            cotacaoIndisponivel={Boolean(cotacao?.isError)}
            ocupado={
              (atualizar.isPending && atualizar.variables?.id === item.id) ||
              (remover.isPending && remover.variables === item.id)
            }
            aoAlternar={(habilitado) => alternar(item, habilitado)}
            aoRemover={() => confirmarRemocao(item)}
          />
        );
      }}
    />
  );
}

function SinaisAtivos() {
  const { cores } = useTema();
  const watchlist = useWatchlist();
  const itens = useMemo(() => ordenarWatchlist(watchlist.data ?? []), [watchlist.data]);
  const ids = itens.map((item) => item.ativo.id);
  const consultasSinais = useSinaisDosAtivos(ids);
  const sinaisPorAtivo = new Map(ids.map((id, indice) => [id, consultasSinais[indice]?.data]));
  const sinais = reunirSinais(itens, sinaisPorAtivo);
  const backtests = useBacktestsDosSinais(
    sinais.map(({ ativo, sinal }) => ({ ativoId: ativo.id, regraId: sinal.regra_id })),
  );

  const carregando = watchlist.isPending || consultasSinais.some((consulta) => consulta.isPending);
  const todosComErro = itens.length > 0 && consultasSinais.every((consulta) => consulta.isError);

  function conteudoVazio() {
    if (carregando) return <Carregando />;
    if (watchlist.isError) {
      return <ErroComRetry erro={watchlist.error} aoTentarNovamente={() => void watchlist.refetch()} />;
    }
    if (itens.length === 0) {
      return (
        <EstadoVazio
          mensagem="Sua watchlist está vazia."
          acao={{ titulo: 'Buscar ativo', onPress: () => router.push('/buscar') }}
        />
      );
    }
    if (todosComErro) {
      return (
        <ErroComRetry
          erro={consultasSinais.find((consulta) => consulta.isError)?.error}
          mensagem="Sinais indisponíveis no momento."
          aoTentarNovamente={() => consultasSinais.forEach((consulta) => void consulta.refetch())}
        />
      );
    }
    return <EstadoVazio mensagem="Nenhum sinal técnico ativo no momento." />;
  }

  return (
    <FlatList
      style={{ backgroundColor: cores.fundo }}
      contentContainerStyle={estilos.lista}
      data={sinais}
      keyExtractor={({ sinal }) => sinal.id}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => {
            void watchlist.refetch();
            consultasSinais.forEach((consulta) => void consulta.refetch());
          }}
          tintColor={cores.primaria}
        />
      }
      ListEmptyComponent={conteudoVazio()}
      renderItem={({ item, index }) => (
        <View style={estilos.sinal}>
          <Pressable
            role="button"
            aria-label={`Abrir ${item.ativo.ticker}`}
            onPress={() =>
              router.push({ pathname: '/ativo/[id]', params: { id: item.ativo.id, ticker: item.ativo.ticker } })
            }
            style={estilos.tituloDoSinal}
          >
            <Texto variante="subtitulo" role="heading">
              {item.ativo.ticker}
            </Texto>
            <Texto variante="legenda" cor="secundario">
              {item.ativo.nome}
            </Texto>
          </Pressable>
          <SinalCard
            sinal={item.sinal}
            backtest={backtests[index]?.data}
            carregandoBacktest={backtests[index]?.isPending ?? true}
          />
        </View>
      )}
    />
  );
}

export default function Alertas() {
  const { cores } = useTema();
  const [secao, setSecao] = useState<Secao>('preco');
  return (
    <View style={[estilos.tela, { backgroundColor: cores.fundo }]}>
      <View style={estilos.seletor}>
        <SeletorSegmentado rotulo="Seção dos alertas" opcoes={SECOES} selecionado={secao} aoSelecionar={setSecao} />
      </View>
      {secao === 'preco' ? <AlertasDePreco /> : <SinaisAtivos />}
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  seletor: { paddingHorizontal: espaco.lg, paddingTop: espaco.lg },
  lista: { padding: espaco.lg, gap: espaco.md, flexGrow: 1 },
  cabecalho: { gap: espaco.lg },
  sinal: { gap: espaco.sm },
  tituloDoSinal: { minHeight: 44, justifyContent: 'center' },
});
```

- [ ] **Step 4: Rodar, verificar e commitar**

Run: `npx jest src/components/alerta.test.tsx __tests__/telas/alertas.test.tsx` → PASS. Run: `npm run verificar` → exit 0.

```bash
git add "app/(tabs)/alertas.tsx" src/components/ItemAlerta.tsx __tests__/telas/alertas.test.tsx src/components/alerta.test.tsx
git commit -m "feat(alertas): aba com Preço (preço atual, distância ao alvo, ticker por busca) e Sinais" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Conferência com o backend real, documentação e PR

**Files:**
- Modify: `README.md`, `docs/PLANO.md`, `docs/MAPEAMENTO.md`, `docs/checkpoint-02.md`

- [ ] **Step 1: Conferir o protocolo com o backend local**

Com o backend em `http://localhost:8000`, rodar um script Node (fora do repositório) que cria um usuário descartável, abre `ws://localhost:8000/api/v1/notificacoes/ws`, envia `{"tipo":"autenticar","token":...}` e confirma: `autenticado`, o `ping` em até 30 s, reautenticação na mesma conexão e fechamento `4401` com token inválido. Registrar o resultado no registro da execução. Nada de token em log.

- [ ] **Step 2: Documentação**

- `README.md`, Funcionalidades: trocar "Notificações in-app, atualizadas a cada 60 s com o app aberto" por `Notificações em tempo real (WebSocket, com banner in-app, badge de não lidas e tela de notificações; polling de 60 s só como reserva)` e a linha de alertas por `Alertas de preço (preço atual e distância ao alvo, ticker por busca) e sinais técnicos ativos`.
- `docs/PLANO.md`, linha da Etapa 5 do §8: acrescentar ao fim do critério ` **Feito em 10/10/2026** (PR da Etapa 5); falta conferir o banner no aparelho com um alerta real.`
- `docs/MAPEAMENTO.md` §8.2: acrescentar `- Marcar todas as notificações como lidas em uma chamada (hoje o app faz uma por notificação).`
- `docs/checkpoint-02.md`, §1: acrescentar `- Notificações em tempo real por WebSocket, com banner in-app, badge de não lidas e tela de notificações.` e na tabela da §3 as linhas de `GET`/`PATCH` de notificações já cobertas; acrescentar `| Tempo real | \`WS /notificacoes/ws\` | Notificações em primeiro plano |`.

- [ ] **Step 3: Verificar, commitar, revisão independente e PR**

Run: `npm run verificar` → exit 0.

```bash
git add README.md docs
git commit -m "docs: tempo real, notificações e alertas no README, no plano e no checkpoint" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

Depois: pacote de revisão da branch inteira, revisor independente (opus, somente leitura), uma rodada de correções com teste RED→GREEN, "Registro da execução" no fim deste plano, `git push -u origin feature/etapa-5-alertas-notificacoes` e `gh pr create --base feature/etapa-4-detalhe-do-ativo` (sem merge, sem trocar bases).
