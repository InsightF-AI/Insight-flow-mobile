# Etapa 7: análise por IA e chat — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar os dois "em breve" de IA por recursos reais: o card de análise sob demanda no detalhe do ativo (`GET /ativos/{id}/analise`, 70 s) e o chat como quinta aba (`POST /chat`, 90 s), com aviso legal em todo texto de IA e estados legíveis para IA desligada, cota excedida (`Retry-After`) e bloqueio do guardrail.

**Architecture:** Contrato e chamadas em `src/api/ia.ts`; regras puras (aviso legal, procedência da análise, validação da pergunta, montagem do corpo do `/chat` dentro dos limites do backend) em `src/dominio/ia.ts`; a análise é uma consulta TanStack **desligada** (`enabled: false`) disparada só pelo botão, sem repetição automática; a conversa fica numa store Zustand em memória (o backend não guarda histórico), limpa ao sair da conta, que descarta respostas tardias por "época". Componentes recebem tudo por props; as telas compõem hooks e store.

**Tech Stack:** Expo SDK 57, React Native 0.86, TanStack Query 5, Zustand 5, Expo Router, `expo-clipboard` (única dependência nova), Jest + React Native Testing Library 14.

**Spec:** `docs/PLANO.md` §8 (Etapa 7) e D5; `docs/MAPEAMENTO.md` §2.2 (linhas 12 e 13 dos endpoints), §2.5 (IA lenta, cota, guardrail, `desatualizada`), §7 (análise e chat) e RN-05; cliente web `Insight-flow-web/src/pages/Chat.jsx` (sugestões, limpar, copiar, aviso).

## Global Constraints

- Repositório `C:\Users\Bruno\Insight-flow-mobile`; branch `feature/etapa-7-analise-ia-chat` a partir de `feature/etapa-6-carteira-operacoes` (PR #7 aberto). Não alterar backend, web nem desktop. Única dependência nova: `expo-clipboard`, via `npx expo install`.
- Limites do `POST /chat` (conferidos no backend, `chat_max_mensagens` e `chat_max_caracteres_mensagem`): 1 a 20 mensagens, a última do usuário, texto não vazio e com no máximo 2000 caracteres **em todas as mensagens, inclusive as da IA**. O backend não guarda a conversa: o app manda o histórico inteiro.
- Timeouts: análise 70 s, chat 90 s. Consultas e mutações de IA **nunca** repetem sozinhas (cada chamada gasta cota do provedor).
- RN-05: nenhum texto de IA sem o aviso legal. Preferir o `aviso_legal` da API; se vier vazio, o texto fixo de `AVISO_IA`. RN-01: nenhum texto estático do app com "compre", "venda", "invista".
- Fronteiras do `CLAUDE.md`: `app/` só rotas; `src/components/` por props e sem hooks de dados; regras puras em `src/dominio/` com teste ao lado; cores só via `useTema()`; nunca `fontWeight`; alvo de toque ≥ 44 pt; ícones só via `Icone`.
- Mensagem de erro ao usuário só via `mensagemDeErro` / `mensagemDeErroDaIA`; o `requestId` aparece como "Código do erro" no `ErroComRetry`.
- `npm run verificar` verde ao fim de cada tarefa; commits em pt-BR terminando com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` e `Claude-Session: https://claude.ai/code/session_01RRDxY4Beh38T5NvK5ajVZp`; PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)` e a linha da sessão; `gh`/`git push` com `GH_TOKEN="$(gh auth token --user brunoosouza09)"` exportado na mesma chamada. Sem merge e sem trocar a base dos PRs.

## Review Focus

1. **IA desligada, cota e guardrail:** 503 "Provedor de IA indisponivel" (também é o que o backend responde com `AI_HABILITADA=false`), 503 de cota com `Retry-After`, 502 do guardrail e tempo esgotado: tela legível, nenhum recurso quebra, nenhuma repetição automática, o botão continua disponível. Tarefas 1, 3 e 5.
2. **Resposta tardia:** limpar a conversa ou sair da conta enquanto o `/chat` está a caminho não pode fazer a resposta aparecer na conversa seguinte (nem na de outra conta). Tarefa 4.
3. **Histórico fora dos limites do backend:** mais de 20 mensagens, resposta da IA com mais de 2000 caracteres (o backend responde 422 "Mensagem excede 2000 caracteres" para qualquer mensagem do histórico), janela que começa por resposta da IA, pergunta que falhou ainda na lista, corte no meio de um par substituto (emoji). O corpo enviado tem de ser válido. Tarefas 2 e 4.
4. **Aviso legal:** presente em todo estado com texto de IA (ocioso, gerando, erro, resposta), mesmo com `aviso_legal` vazio, e na cópia da resposta (o texto sai do app). Tarefas 2, 3 e 5.
5. **Cota da análise:** abrir o ativo, voltar ao primeiro plano ou reabrir a tela não dispara nova análise; só o botão. Tarefa 3.
6. **Linguagem:** os textos estáticos das telas de IA não recomendam compra ou venda. Tarefas 3 e 5.

---

### Task 1: Contrato, chamadas da IA e mensagens de erro

**Files:**
- Modify: `src/api/tipos.ts`, `src/utils/formatacao.ts`, `src/utils/erros.ts`, `src/utils/erros.test.ts`
- Create: `src/api/ia.ts`, `src/api/ia.test.ts`, `src/utils/errosIA.test.ts`

**Interfaces:**
- Produces (Tarefas 3 a 5):
  - tipos `AnaliseIA`, `PapelMensagem`, `MensagemChatApi`, `ChatRequest`, `ChatResponse`
  - `iaApi.analisar(ativoId): Promise<AnaliseIA>` (70 s) e `iaApi.conversar(mensagens): Promise<ChatResponse>` (90 s)
  - `TIMEOUT_ANALISE_MS = 70_000`, `TIMEOUT_CHAT_MS = 90_000`
  - `formatarEspera(segundos): string`
  - `mensagemDeErroDaIA(erro, contexto: 'analise' | 'chat'): string`; `mensagemDeErro` passa a incluir a espera da cota

- [ ] **Step 1: Criar a branch e escrever os testes (falham)**

```bash
cd /c/Users/Bruno/Insight-flow-mobile
git status --short
git switch -c feature/etapa-7-analise-ia-chat feature/etapa-6-carteira-operacoes
```

`src/api/ia.test.ts`:

```ts
import { configurarApi } from '@/api/client';
import { iaApi } from '@/api/ia';

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

afterEach(() => {
  jest.useRealTimers();
});

// Uma chamada que só termina quando o app a aborta (o tempo limite do client).
function chamadaPendurada() {
  fetchMock.mockImplementation(
    (_url: string, init: { signal: AbortSignal }) =>
      new Promise((_resolver, rejeitar) => {
        init.signal.addEventListener('abort', () => rejeitar(new Error('abortada')));
      }),
  );
}

describe('iaApi', () => {
  it('analisar pede GET /ativos/{id}/analise', async () => {
    await iaApi.analisar('a-1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api/api/v1/ativos/a-1/analise');
    expect(init.method).toBe('GET');
  });

  it('conversar envia POST /chat com as mensagens', async () => {
    const mensagens = [{ papel: 'usuario' as const, texto: 'Qual foi o resultado?' }];
    await iaApi.conversar(mensagens);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api/api/v1/chat');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ mensagens });
  });

  it('a análise espera 70 s antes de desistir', async () => {
    jest.useFakeTimers();
    chamadaPendurada();
    const desfecho = jest.fn();
    void iaApi.analisar('a-1').catch(desfecho);
    await jest.advanceTimersByTimeAsync(69_999);
    expect(desfecho).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(desfecho).toHaveBeenCalledWith(expect.objectContaining({ status: 0, causa: 'tempo' }));
  });

  it('o chat espera 90 s antes de desistir', async () => {
    jest.useFakeTimers();
    chamadaPendurada();
    const desfecho = jest.fn();
    void iaApi.conversar([{ papel: 'usuario', texto: 'Oi' }]).catch(desfecho);
    await jest.advanceTimersByTimeAsync(89_999);
    expect(desfecho).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(desfecho).toHaveBeenCalledWith(expect.objectContaining({ status: 0, causa: 'tempo' }));
  });
});
```

`src/utils/errosIA.test.ts`:

```ts
import { ApiError } from '@/api/client';
import { mensagemDeErro, mensagemDeErroDaIA } from '@/utils/erros';
import { formatarEspera } from '@/utils/formatacao';

describe('formatarEspera', () => {
  it.each([
    [1, '1 s'],
    [1.2, '2 s'],
    [30, '30 s'],
    [59, '59 s'],
    [60, 'cerca de 1 min'],
    [61, 'cerca de 2 min'],
    [120, 'cerca de 2 min'],
    [3600, 'cerca de 1 h'],
    [7300, 'cerca de 3 h'],
  ])('%d s vira "%s"', (segundos, esperado) => {
    expect(formatarEspera(segundos)).toBe(esperado);
  });

  it.each([[0], [-5], [Number.NaN], [Number.POSITIVE_INFINITY]])('%d vira "alguns instantes"', (segundos) => {
    expect(formatarEspera(segundos)).toBe('alguns instantes');
  });
});

describe('mensagens de erro da IA', () => {
  it('cota com Retry-After diz quanto esperar', () => {
    const erro = new ApiError(503, 'Cota do provedor de IA excedida', { retryAfterSegundos: 90 });
    expect(mensagemDeErro(erro)).toBe('O limite de uso da IA foi atingido. Tente novamente em cerca de 2 min.');
  });

  it('cota sem Retry-After pede para tentar mais tarde', () => {
    const erro = new ApiError(503, 'Cota do provedor de IA excedida');
    expect(mensagemDeErro(erro)).toBe('O limite de uso da IA foi atingido. Tente novamente mais tarde.');
  });

  it('provedor indisponível (inclui a IA desligada no servidor)', () => {
    expect(mensagemDeErro(new ApiError(503, 'Provedor de IA indisponivel'))).toBe(
      'A IA está indisponível no momento. Tente novamente em instantes.',
    );
  });

  it('tempo esgotado tem texto próprio na análise e no chat', () => {
    const erro = new ApiError(0, 'O servidor demorou demais para responder (http://api)', { causa: 'tempo' });
    expect(mensagemDeErroDaIA(erro, 'analise')).toBe(
      'A IA demorou mais que o esperado. A análise pode já estar pronta no servidor: tente novamente.',
    );
    expect(mensagemDeErroDaIA(erro, 'chat')).toBe(
      'A IA demorou mais que o esperado para responder. Tente enviar a pergunta de novo.',
    );
  });

  it('os demais erros seguem mensagemDeErro', () => {
    const rede = new ApiError(0, 'Sem conexão com o servidor (http://api)', { causa: 'rede' });
    expect(mensagemDeErroDaIA(rede, 'chat')).toBe(mensagemDeErro(rede));
    const guardrail = new ApiError(502, 'Resposta da IA bloqueada pelo guardrail');
    expect(mensagemDeErroDaIA(guardrail, 'analise')).toBe(
      'A IA não conseguiu gerar um texto dentro das regras de linguagem. Tente novamente.',
    );
  });
});
```

```edit:src/utils/erros.test.ts
<<<<
    ['Provedor de IA indisponivel', 'A análise por IA está indisponível no momento'],
====
    ['Provedor de IA indisponivel', 'A IA está indisponível no momento. Tente novamente em instantes.'],
>>>>
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/api/ia.test.ts src/utils/errosIA.test.ts src/utils/erros.test.ts`
Expected: FAIL (`@/api/ia` e `formatarEspera` não existem; texto antigo do provedor indisponível).

- [ ] **Step 3: Implementar**

```edit:src/api/tipos.ts
<<<<
export interface TokenResponse {
====
/** `GET /ativos/{id}/analise`. */
export interface AnaliseIA {
  ativo_id: Uuid;
  texto: string;
  gerado_em: DataHoraISO;
  modelo: string;
  /** O backend reaproveitou a última análise porque os dados do ativo não mudaram. */
  em_cache: boolean;
  /** O provedor falhou e o backend devolveu a última análise (sempre com `em_cache: true`). */
  desatualizada: boolean;
  aviso_legal: string;
}

export type PapelMensagem = 'usuario' | 'assistente';

export interface MensagemChatApi {
  papel: PapelMensagem;
  texto: string;
}

export interface ChatRequest {
  mensagens: MensagemChatApi[];
}

export interface ChatResponse {
  texto: string;
  modelo: string;
  aviso_legal: string;
}

export interface TokenResponse {
>>>>
```

`src/api/ia.ts`:

```ts
import { request } from '@/api/client';
import type { AnaliseIA, ChatRequest, ChatResponse, MensagemChatApi, Uuid } from '@/api/tipos';

// O servidor tenta o Gemini até 2 vezes (30 s cada) e o guardrail pode pedir uma segunda geração; o chat ainda pode
// encadear ferramentas. Se o app desistir antes, o servidor continua e a análise fica em cache.
export const TIMEOUT_ANALISE_MS = 70_000;
export const TIMEOUT_CHAT_MS = 90_000;

export const iaApi = {
  analisar: (ativoId: Uuid) => request<AnaliseIA>(`/ativos/${ativoId}/analise`, { timeoutMs: TIMEOUT_ANALISE_MS }),
  conversar: (mensagens: MensagemChatApi[]) => {
    const corpo: ChatRequest = { mensagens };
    return request<ChatResponse>('/chat', { metodo: 'POST', corpo, timeoutMs: TIMEOUT_CHAT_MS });
  },
};
```

```edit:src/utils/formatacao.ts
<<<<
export function dataParaISOLocal(data: Date): DataISO {
====
/** Espera sugerida pelo servidor (Retry-After, em segundos) em linguagem corrente: "30 s", "cerca de 2 min". */
export function formatarEspera(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos <= 0) return 'alguns instantes';
  const inteiros = Math.ceil(segundos);
  if (inteiros < 60) return `${inteiros} s`;
  if (inteiros < 3600) return `cerca de ${Math.ceil(inteiros / 60)} min`;
  return `cerca de ${Math.ceil(inteiros / 3600)} h`;
}

export function dataParaISOLocal(data: Date): DataISO {
>>>>
```

```edit:src/utils/erros.ts
<<<<
import { ApiError } from '@/api/client';
====
import { ApiError } from '@/api/client';
import { formatarEspera } from '@/utils/formatacao';
>>>>
<<<<
  'Provedor de IA indisponivel': 'A análise por IA está indisponível no momento',
  'Cota do provedor de IA excedida': 'O limite de uso da IA foi atingido. Tente novamente mais tarde.',
====
  'Provedor de IA indisponivel': 'A IA está indisponível no momento. Tente novamente em instantes.',
>>>>
<<<<
export function ehStatus(erro: unknown, status: number): boolean {
====
const COTA_DA_IA = 'Cota do provedor de IA excedida';

function mensagemDaCota(erro: ApiError): string {
  const quando = erro.retryAfterSegundos === undefined ? 'mais tarde' : `em ${formatarEspera(erro.retryAfterSegundos)}`;
  return `O limite de uso da IA foi atingido. Tente novamente ${quando}.`;
}

export function ehStatus(erro: unknown, status: number): boolean {
>>>>
<<<<
  if (!(erro instanceof ApiError)) return 'Algo deu errado. Tente novamente.';
  const traduzida = MENSAGENS[erro.message];
====
  if (!(erro instanceof ApiError)) return 'Algo deu errado. Tente novamente.';
  if (erro.message === COTA_DA_IA) return mensagemDaCota(erro);
  const traduzida = MENSAGENS[erro.message];
>>>>
<<<<
/** X-Request-ID da chamada que falhou: com ele a equipe do backend acha a requisição nos logs. */
====
/** Como `mensagemDeErro`, com texto próprio para o tempo esgotado (a IA é a chamada mais lenta do app). */
export function mensagemDeErroDaIA(erro: unknown, contexto: 'analise' | 'chat'): string {
  if (erro instanceof ApiError && erro.causa === 'tempo') {
    return contexto === 'analise'
      ? 'A IA demorou mais que o esperado. A análise pode já estar pronta no servidor: tente novamente.'
      : 'A IA demorou mais que o esperado para responder. Tente enviar a pergunta de novo.';
  }
  return mensagemDeErro(erro);
}

/** X-Request-ID da chamada que falhou: com ele a equipe do backend acha a requisição nos logs. */
>>>>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/api/ia.test.ts src/utils`
Expected: PASS.

- [ ] **Step 5: Verificar e commitar**

```bash
npm run verificar
git add -A
git commit -m "feat(ia): chamadas de análise e chat, espera da cota e mensagens de erro da IA

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RRDxY4Beh38T5NvK5ajVZp"
```

---

### Task 2: Regras puras da IA

**Files:**
- Create: `src/dominio/ia.ts`, `src/dominio/ia.test.ts`

**Interfaces:**
- Consumes: `AVISO_IA` (`src/dominio/regulatorio.ts`), `formatarDataHora`, tipos da Tarefa 1.
- Produces (Tarefas 3 a 5):
  - `MAXIMO_DE_MENSAGENS = 20`, `MAXIMO_DE_CARACTERES = 2000`, `SUGESTOES_DO_CHAT: readonly string[]`
  - `interface MensagemLocal { id; papel; texto; modelo?; avisoLegal?; falhou? }`
  - `avisoLegalDe(aviso): string`
  - `descreverProcedencia(analise): string`
  - `validarPergunta(entrada): { valida: true; texto } | { valida: false; motivo }`
  - `montarMensagensDaApi(mensagens): MensagemChatApi[]`
  - `textoParaCopiar(mensagem): string`

- [ ] **Step 1: Escrever os testes (falham)**

`src/dominio/ia.test.ts`:

```ts
import { AVISO_IA } from '@/dominio/regulatorio';
import {
  avisoLegalDe,
  descreverProcedencia,
  MAXIMO_DE_CARACTERES,
  MAXIMO_DE_MENSAGENS,
  type MensagemLocal,
  montarMensagensDaApi,
  SUGESTOES_DO_CHAT,
  textoParaCopiar,
  validarPergunta,
} from '@/dominio/ia';
import { formatarDataHora } from '@/utils/formatacao';

function mensagem(papel: 'usuario' | 'assistente', texto: string, extra: Partial<MensagemLocal> = {}): MensagemLocal {
  return { id: `${papel}-${texto.slice(0, 12)}`, papel, texto, ...extra };
}

describe('avisoLegalDe', () => {
  it('usa o aviso que veio da API', () => {
    expect(avisoLegalDe('Aviso do servidor.')).toBe('Aviso do servidor.');
  });

  it.each([[''], ['   '], [null], [undefined]])('cai no texto fixo com %p', (vazio) => {
    expect(avisoLegalDe(vazio)).toBe(AVISO_IA);
  });
});

describe('descreverProcedencia', () => {
  const geradoEm = '2026-10-11T15:30:00Z';
  const quando = formatarDataHora(geradoEm);

  it('análise nova', () => {
    expect(descreverProcedencia({ gerado_em: geradoEm, em_cache: false, desatualizada: false })).toBe(
      `Gerada em ${quando}.`,
    );
  });

  it('análise reaproveitada porque os dados não mudaram', () => {
    expect(descreverProcedencia({ gerado_em: geradoEm, em_cache: true, desatualizada: false })).toBe(
      `Reaproveitada de ${quando}: os dados do ativo não mudaram desde então.`,
    );
  });

  it('desatualizada tem prioridade sobre o cache', () => {
    expect(descreverProcedencia({ gerado_em: geradoEm, em_cache: true, desatualizada: true })).toBe(
      `Análise de ${quando}. Pode estar desatualizada: o provedor de IA não respondeu agora.`,
    );
  });
});

describe('validarPergunta', () => {
  it.each([[''], ['   '], ['\n\t']])('recusa %p', (vazia) => {
    expect(validarPergunta(vazia)).toEqual({ valida: false, motivo: 'Escreva uma pergunta.' });
  });

  it('tira os espaços das pontas', () => {
    expect(validarPergunta('  Qual foi o resultado?  ')).toEqual({ valida: true, texto: 'Qual foi o resultado?' });
  });

  it('aceita exatamente o limite e recusa um caractere a mais', () => {
    expect(validarPergunta('a'.repeat(MAXIMO_DE_CARACTERES)).valida).toBe(true);
    expect(validarPergunta('a'.repeat(MAXIMO_DE_CARACTERES + 1))).toEqual({
      valida: false,
      motivo: 'A pergunta tem 2001 caracteres; o limite é 2000.',
    });
  });
});

describe('montarMensagensDaApi', () => {
  it('mantém a ordem e só leva papel e texto', () => {
    const resultado = montarMensagensDaApi([
      mensagem('usuario', 'Oi'),
      mensagem('assistente', 'Olá', { modelo: 'gemini', avisoLegal: 'x' }),
      mensagem('usuario', 'Qual o resultado?'),
    ]);
    expect(resultado).toEqual([
      { papel: 'usuario', texto: 'Oi' },
      { papel: 'assistente', texto: 'Olá' },
      { papel: 'usuario', texto: 'Qual o resultado?' },
    ]);
  });

  it('não leva a pergunta que falhou nem textos em branco', () => {
    const resultado = montarMensagensDaApi([
      mensagem('usuario', 'Pergunta sem resposta', { falhou: true }),
      mensagem('assistente', '   '),
      mensagem('usuario', 'Nova pergunta'),
    ]);
    expect(resultado).toEqual([{ papel: 'usuario', texto: 'Nova pergunta' }]);
  });

  it('leva só as últimas 20 mensagens', () => {
    const muitas = Array.from({ length: 31 }, (_, i) =>
      mensagem(i % 2 === 0 ? 'usuario' : 'assistente', `mensagem ${String(i).padStart(2, '0')}`),
    );
    const resultado = montarMensagensDaApi(muitas);
    expect(resultado.length).toBeLessThanOrEqual(MAXIMO_DE_MENSAGENS);
    expect(resultado[resultado.length - 1]).toEqual({ papel: 'usuario', texto: 'mensagem 30' });
  });

  it('a janela nunca começa por uma resposta da IA', () => {
    // 21 mensagens alternadas (usuario, assistente, ..., usuario): os últimos 20 começam pela resposta de índice 1.
    const alternadas = Array.from({ length: 21 }, (_, i) =>
      mensagem(i % 2 === 0 ? 'usuario' : 'assistente', `mensagem ${String(i).padStart(2, '0')}`),
    );
    const resultado = montarMensagensDaApi(alternadas);
    expect(resultado).toHaveLength(19);
    expect(resultado[0].papel).toBe('usuario');
    expect(resultado[resultado.length - 1].papel).toBe('usuario');
  });

  it('corta a resposta da IA que passa de 2000 caracteres (o backend recusaria o histórico)', () => {
    const longa = 'r'.repeat(MAXIMO_DE_CARACTERES + 500);
    const resultado = montarMensagensDaApi([
      mensagem('usuario', 'Explique a carteira'),
      mensagem('assistente', longa),
      mensagem('usuario', 'E o setor?'),
    ]);
    expect(resultado[1].texto).toHaveLength(MAXIMO_DE_CARACTERES);
  });

  it('não deixa meio emoji no fim do texto cortado', () => {
    const texto = `${'a'.repeat(MAXIMO_DE_CARACTERES - 1)}😀 fim`;
    const resultado = montarMensagensDaApi([mensagem('usuario', 'Oi'), mensagem('assistente', texto), mensagem('usuario', 'E?')]);
    const cortado = resultado[1].texto;
    expect(cortado).toHaveLength(MAXIMO_DE_CARACTERES - 1);
    expect(/[\ud800-\udbff]$/.test(cortado)).toBe(false);
  });
});

describe('textoParaCopiar', () => {
  it('leva o aviso legal junto da resposta', () => {
    expect(textoParaCopiar({ texto: 'A carteira rendeu 2%.', avisoLegal: 'Aviso do servidor.' })).toBe(
      'A carteira rendeu 2%.\n\nAviso do servidor.',
    );
  });

  it('sem aviso guardado usa o texto fixo', () => {
    expect(textoParaCopiar({ texto: 'Resposta.' })).toBe(`Resposta.\n\n${AVISO_IA}`);
  });
});

describe('SUGESTOES_DO_CHAT', () => {
  it('são as seis do cliente web, todas dentro do limite e sem linguagem de recomendação', () => {
    expect(SUGESTOES_DO_CHAT).toHaveLength(6);
    for (const sugestao of SUGESTOES_DO_CHAT) {
      expect(validarPergunta(sugestao).valida).toBe(true);
      expect(sugestao).not.toMatch(/\b(compre|comprar|venda|vender|invista|investir)\b/i);
    }
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/dominio/ia.test.ts`
Expected: FAIL (`@/dominio/ia` não existe).

- [ ] **Step 3: Implementar**

`src/dominio/ia.ts`:

```ts
import type { AnaliseIA, MensagemChatApi, PapelMensagem } from '@/api/tipos';
import { AVISO_IA } from '@/dominio/regulatorio';
import { formatarDataHora } from '@/utils/formatacao';

/** Limites do `POST /chat` no backend (`chat_max_mensagens` e `chat_max_caracteres_mensagem`). */
export const MAXIMO_DE_MENSAGENS = 20;
export const MAXIMO_DE_CARACTERES = 2000;

/** As mesmas sugestões do cliente web: perguntas que o assistente responde com as ferramentas da carteira. */
export const SUGESTOES_DO_CHAT: readonly string[] = [
  'Qual foi meu ativo mais rentável?',
  'Como está minha exposição por setor?',
  'A carteira está acima do CDI?',
  'Quais sinais estão ativos agora?',
  'Qual é o resultado da carteira?',
  'Quais foram minhas últimas operações?',
];

export interface MensagemLocal {
  id: string;
  papel: PapelMensagem;
  texto: string;
  /** Só nas respostas da IA. */
  modelo?: string;
  avisoLegal?: string;
  /** Pergunta que não obteve resposta (rede, cota, guardrail...). Não entra no histórico enviado. */
  falhou?: boolean;
}

/** RN-05: o aviso da API quando veio preenchido; o texto fixo caso contrário. */
export function avisoLegalDe(aviso: string | null | undefined): string {
  const texto = aviso?.trim();
  return texto ? texto : AVISO_IA;
}

export function descreverProcedencia(analise: Pick<AnaliseIA, 'gerado_em' | 'em_cache' | 'desatualizada'>): string {
  const quando = formatarDataHora(analise.gerado_em);
  if (analise.desatualizada) {
    return `Análise de ${quando}. Pode estar desatualizada: o provedor de IA não respondeu agora.`;
  }
  if (analise.em_cache) return `Reaproveitada de ${quando}: os dados do ativo não mudaram desde então.`;
  return `Gerada em ${quando}.`;
}

export type ValidacaoDaPergunta = { valida: true; texto: string } | { valida: false; motivo: string };

export function validarPergunta(entrada: string): ValidacaoDaPergunta {
  const texto = entrada.trim();
  if (texto === '') return { valida: false, motivo: 'Escreva uma pergunta.' };
  if (texto.length > MAXIMO_DE_CARACTERES) {
    return {
      valida: false,
      motivo: `A pergunta tem ${texto.length} caracteres; o limite é ${MAXIMO_DE_CARACTERES}.`,
    };
  }
  return { valida: true, texto };
}

/** Corta em `maximo` unidades sem deixar a primeira metade de um par substituto (emoji) no fim. */
function cortar(texto: string, maximo: number): string {
  if (texto.length <= maximo) return texto;
  const corte = texto.slice(0, maximo);
  const ultimo = corte.charCodeAt(corte.length - 1);
  return ultimo >= 0xd800 && ultimo <= 0xdbff ? corte.slice(0, -1) : corte;
}

/**
 * Corpo do `POST /chat` a partir da conversa exibida. O backend valida o histórico inteiro (até 20 mensagens, nenhuma
 * em branco, nenhuma com mais de 2000 caracteres, a última do usuário), então o app o deixa válido: sem pergunta que
 * falhou, resposta longa cortada e janela que não começa por resposta da IA.
 */
export function montarMensagensDaApi(mensagens: readonly MensagemLocal[]): MensagemChatApi[] {
  const validas = mensagens
    .filter((m) => !m.falhou && m.texto.trim() !== '')
    .map((m): MensagemChatApi => ({ papel: m.papel, texto: cortar(m.texto, MAXIMO_DE_CARACTERES) }));
  const recentes = validas.slice(-MAXIMO_DE_MENSAGENS);
  while (recentes[0]?.papel === 'assistente') recentes.shift();
  return recentes;
}

/** O texto sai do app na área de transferência: o aviso legal vai junto (RN-05). */
export function textoParaCopiar(mensagem: Pick<MensagemLocal, 'texto' | 'avisoLegal'>): string {
  return `${mensagem.texto}\n\n${avisoLegalDe(mensagem.avisoLegal)}`;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/dominio/ia.test.ts`
Expected: PASS.

- [ ] **Step 5: Verificar e commitar**

```bash
npm run verificar
git add -A
git commit -m "feat(ia): regras puras do aviso legal, da procedência da análise e do corpo do chat

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RRDxY4Beh38T5NvK5ajVZp"
```

---

### Task 3: Análise por IA sob demanda no detalhe do ativo

**Files:**
- Modify: `src/hooks/chaves.ts`, `src/components/CardAnaliseIA.tsx`, `app/ativo/[id].tsx`, `src/components/dominio.test.tsx`
- Create: `src/hooks/useAnaliseIA.ts`, `src/hooks/useAnaliseIA.test.tsx`, `src/components/analiseIA.test.tsx`, `__tests__/telas/ativoAnaliseIA.test.tsx`

**Interfaces:**
- Consumes: `iaApi.analisar`, `mensagemDeErroDaIA`, `avisoLegalDe`, `descreverProcedencia`.
- Produces: `chaves.analiseIA(ativoId)`, `useAnaliseIA(ativoId): { analise, gerando, erro, gerar }`, `CardAnaliseIA({ analise?, gerando, erro?, aoGerar })`.

- [ ] **Step 1: Escrever os testes (falham)**

`src/hooks/useAnaliseIA.test.tsx`:

```tsx
import { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/api/client';
import { iaApi } from '@/api/ia';
import type { AnaliseIA } from '@/api/tipos';
import { useAnaliseIA } from '@/hooks/useAnaliseIA';
import { criarProvedor } from '@/test/renderizar';

jest.mock('@/api/ia', () => ({ iaApi: { analisar: jest.fn(), conversar: jest.fn() } }));

const analise: AnaliseIA = {
  ativo_id: 'a-1',
  texto: 'O RSI(14) está em 28,4.',
  gerado_em: '2026-10-11T15:30:00Z',
  modelo: 'gemini-3.5-flash',
  em_cache: false,
  desatualizada: false,
  aviso_legal: 'Análise gerada por IA. Não constitui recomendação de investimento.',
};

// Padrões do app em produção: repetição de 5xx ligada. A IA não pode repetir sozinha (cada chamada gasta cota).
function clienteComRepeticao() {
  // gcTime infinito: o padrão (5 min) deixa um timer aberto e o Jest não encerra o processo.
  return new QueryClient({ defaultOptions: { queries: { retry: 3, retryDelay: 1, gcTime: Infinity } } });
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('abrir o ativo não pede a análise (cota do provedor)', async () => {
  await renderHook(() => useAnaliseIA('a-1'), { wrapper: criarProvedor(clienteComRepeticao()) });
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 20));
  });
  expect(iaApi.analisar).not.toHaveBeenCalled();
});

it('gerar pede a análise uma vez e expõe o resultado', async () => {
  jest.mocked(iaApi.analisar).mockResolvedValue(analise);
  const { result } = await renderHook(() => useAnaliseIA('a-1'), { wrapper: criarProvedor(clienteComRepeticao()) });

  await act(async () => {
    result.current.gerar();
  });

  await waitFor(() => expect(result.current.analise).toEqual(analise));
  expect(iaApi.analisar).toHaveBeenCalledTimes(1);
  expect(iaApi.analisar).toHaveBeenCalledWith('a-1');
  expect(result.current.gerando).toBe(false);
});

it('gerar de novo atualiza a análise', async () => {
  jest.mocked(iaApi.analisar).mockResolvedValueOnce(analise).mockResolvedValueOnce({ ...analise, texto: 'Texto novo.' });
  const { result } = await renderHook(() => useAnaliseIA('a-1'), { wrapper: criarProvedor(clienteComRepeticao()) });

  await act(async () => {
    result.current.gerar();
  });
  await waitFor(() => expect(result.current.analise?.texto).toBe(analise.texto));
  await act(async () => {
    result.current.gerar();
  });

  await waitFor(() => expect(result.current.analise?.texto).toBe('Texto novo.'));
  expect(iaApi.analisar).toHaveBeenCalledTimes(2);
});

it('falha do servidor não é repetida sozinha', async () => {
  jest.mocked(iaApi.analisar).mockRejectedValue(new ApiError(503, 'Provedor de IA indisponivel'));
  const { result } = await renderHook(() => useAnaliseIA('a-1'), { wrapper: criarProvedor(clienteComRepeticao()) });

  await act(async () => {
    result.current.gerar();
  });

  await waitFor(() => expect(result.current.erro).toBeInstanceOf(ApiError));
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 50));
  });
  expect(iaApi.analisar).toHaveBeenCalledTimes(1);
});

it('voltar à tela mostra a análise do cache sem nova chamada', async () => {
  jest.mocked(iaApi.analisar).mockResolvedValue(analise);
  const cliente = clienteComRepeticao();
  const primeira = await renderHook(() => useAnaliseIA('a-1'), { wrapper: criarProvedor(cliente) });
  await act(async () => {
    primeira.result.current.gerar();
  });
  await waitFor(() => expect(primeira.result.current.analise).toEqual(analise));
  await primeira.unmount();

  const segunda = await renderHook(() => useAnaliseIA('a-1'), { wrapper: criarProvedor(cliente) });

  expect(segunda.result.current.analise).toEqual(analise);
  expect(iaApi.analisar).toHaveBeenCalledTimes(1);
});
```

`src/components/analiseIA.test.tsx`:

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';

import { ApiError } from '@/api/client';
import type { AnaliseIA } from '@/api/tipos';
import { CardAnaliseIA } from '@/components/CardAnaliseIA';
import { AVISO_IA } from '@/dominio/regulatorio';
import { formatarDataHora } from '@/utils/formatacao';

const analise: AnaliseIA = {
  ativo_id: 'a-1',
  texto: 'O RSI(14) está em 28,4, na zona de sobrevenda.',
  gerado_em: '2026-10-11T15:30:00Z',
  modelo: 'gemini-3.5-flash',
  em_cache: false,
  desatualizada: false,
  aviso_legal: 'Aviso legal vindo do servidor.',
};

const RECOMENDACAO = /\b(compre|comprar|venda|vender|invista|investir)\b/i;

function textoDaTela(): string {
  return JSON.stringify(screen.toJSON());
}

describe('CardAnaliseIA', () => {
  it('ocioso: explica que é sob demanda, oferece o botão e traz o aviso fixo', async () => {
    const aoGerar = jest.fn();
    const user = userEvent.setup();
    await render(<CardAnaliseIA gerando={false} aoGerar={aoGerar} />);

    expect(screen.getByText(/gerada sob demanda/)).toBeOnTheScreen();
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Gerar análise por IA' }));
    expect(aoGerar).toHaveBeenCalledTimes(1);
    expect(textoDaTela()).not.toMatch(RECOMENDACAO);
  });

  it('gerando: avisa que pode levar até 1 minuto e esconde o botão', async () => {
    await render(<CardAnaliseIA gerando aoGerar={jest.fn()} />);

    expect(screen.getByText('Gerando análise… pode levar até 1 minuto.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Gerar análise por IA' })).not.toBeOnTheScreen();
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
  });

  it('com análise: texto, procedência, modelo, aviso da API e botão de atualizar', async () => {
    await render(<CardAnaliseIA analise={analise} gerando={false} aoGerar={jest.fn()} />);

    expect(screen.getByText(analise.texto)).toBeOnTheScreen();
    expect(screen.getByText(`Gerada em ${formatarDataHora(analise.gerado_em)}.`)).toBeOnTheScreen();
    expect(screen.getByText('Modelo: gemini-3.5-flash')).toBeOnTheScreen();
    expect(screen.getByText('Aviso legal vindo do servidor.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Atualizar análise' })).toBeOnTheScreen();
  });

  it('reaproveitada do cache do servidor', async () => {
    await render(<CardAnaliseIA analise={{ ...analise, em_cache: true }} gerando={false} aoGerar={jest.fn()} />);
    expect(screen.getByText(/Reaproveitada de/)).toBeOnTheScreen();
  });

  it('desatualizada avisa que pode estar velha', async () => {
    await render(
      <CardAnaliseIA analise={{ ...analise, em_cache: true, desatualizada: true }} gerando={false} aoGerar={jest.fn()} />,
    );
    expect(screen.getByText(/Pode estar desatualizada/)).toBeOnTheScreen();
  });

  it('aviso_legal vazio na resposta cai no texto fixo (RN-05)', async () => {
    await render(<CardAnaliseIA analise={{ ...analise, aviso_legal: '' }} gerando={false} aoGerar={jest.fn()} />);
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
  });

  it('atualizando: mantém o texto anterior e mostra o progresso', async () => {
    await render(<CardAnaliseIA analise={analise} gerando aoGerar={jest.fn()} />);

    expect(screen.getByText(analise.texto)).toBeOnTheScreen();
    expect(screen.getByText('Gerando análise… pode levar até 1 minuto.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Atualizar análise' })).not.toBeOnTheScreen();
  });

  it('erro sem análise: mensagem, código do erro, tentar de novo e aviso', async () => {
    const aoGerar = jest.fn();
    const user = userEvent.setup();
    const erro = new ApiError(503, 'Provedor de IA indisponivel', { requestId: 'req-123' });
    await render(<CardAnaliseIA gerando={false} erro={erro} aoGerar={aoGerar} />);

    expect(screen.getByText('A IA está indisponível no momento. Tente novamente em instantes.')).toBeOnTheScreen();
    expect(screen.getByText('Código do erro: req-123')).toBeOnTheScreen();
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(aoGerar).toHaveBeenCalledTimes(1);
  });

  it('cota excedida diz quanto esperar', async () => {
    const erro = new ApiError(503, 'Cota do provedor de IA excedida', { retryAfterSegundos: 120 });
    await render(<CardAnaliseIA gerando={false} erro={erro} aoGerar={jest.fn()} />);
    expect(
      screen.getByText('O limite de uso da IA foi atingido. Tente novamente em cerca de 2 min.'),
    ).toBeOnTheScreen();
  });

  it('tempo esgotado tem texto próprio', async () => {
    const erro = new ApiError(0, 'O servidor demorou demais para responder (http://api)', { causa: 'tempo' });
    await render(<CardAnaliseIA gerando={false} erro={erro} aoGerar={jest.fn()} />);
    expect(screen.getByText(/A análise pode já estar pronta no servidor/)).toBeOnTheScreen();
  });

  it('erro depois de uma análise: a análise anterior continua na tela', async () => {
    const erro = new ApiError(502, 'Resposta da IA bloqueada pelo guardrail');
    await render(<CardAnaliseIA analise={analise} gerando={false} erro={erro} aoGerar={jest.fn()} />);

    expect(screen.getByText(analise.texto)).toBeOnTheScreen();
    expect(
      screen.getByText('A IA não conseguiu gerar um texto dentro das regras de linguagem. Tente novamente.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Aviso legal vindo do servidor.')).toBeOnTheScreen();
  });
});
```

`__tests__/telas/ativoAnaliseIA.test.tsx`:

```tsx
import { screen, userEvent } from '@testing-library/react-native';

import { ativosApi } from '@/api/ativos';
import { ApiError } from '@/api/client';
import { iaApi } from '@/api/ia';
import type { AnaliseIA, ItemWatchlist } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { AVISO_IA } from '@/dominio/regulatorio';
import { renderizar } from '@/test/renderizar';

import DetalheAtivo from '../../app/ativo/[id]';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'a-1', ticker: 'PETR4' }),
  router: { back: jest.fn() },
  Stack: { Screen: () => null },
}));
jest.mock('@/components/PainelTecnico', () => ({ PainelTecnico: () => null }));
jest.mock('@/api/ativos', () => ({
  ativosApi: { cotacao: jest.fn(), historico: jest.fn(), indicadores: jest.fn(), sinais: jest.fn(), backtest: jest.fn() },
}));
jest.mock('@/api/watchlist', () => ({
  watchlistApi: { listar: jest.fn(), remover: jest.fn(), definirNotificacao: jest.fn() },
}));
jest.mock('@/api/ia', () => ({ iaApi: { analisar: jest.fn(), conversar: jest.fn() } }));

const item: ItemWatchlist = {
  ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: null, moeda: 'BRL' },
  notificar: true,
  adicionado_em: '2026-09-20T12:00:00Z',
};

const analise: AnaliseIA = {
  ativo_id: 'a-1',
  texto: 'O preço fechou acima da média de 20 pregões.',
  gerado_em: '2026-10-11T15:30:00Z',
  modelo: 'gemini-3.5-flash',
  em_cache: false,
  desatualizada: false,
  aviso_legal: AVISO_IA,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(watchlistApi.listar).mockResolvedValue([item]);
  jest.mocked(ativosApi.cotacao).mockRejectedValue(new ApiError(404, 'Cotacao nao encontrada para o ativo'));
  jest.mocked(ativosApi.historico).mockResolvedValue([]);
  jest.mocked(ativosApi.indicadores).mockResolvedValue([]);
  jest.mocked(ativosApi.sinais).mockResolvedValue([]);
});

it('abrir o ativo não gasta cota: a análise só vem do botão', async () => {
  await renderizar(<DetalheAtivo />);

  expect(await screen.findByRole('button', { name: 'Gerar análise por IA' })).toBeOnTheScreen();
  expect(iaApi.analisar).not.toHaveBeenCalled();
});

it('o botão pede a análise do ativo e mostra o texto com o aviso legal', async () => {
  const user = userEvent.setup();
  jest.mocked(iaApi.analisar).mockResolvedValue(analise);
  await renderizar(<DetalheAtivo />);

  await user.press(await screen.findByRole('button', { name: 'Gerar análise por IA' }));

  expect(await screen.findByText(analise.texto)).toBeOnTheScreen();
  expect(iaApi.analisar).toHaveBeenCalledWith('a-1');
  expect(screen.getByText('Modelo: gemini-3.5-flash')).toBeOnTheScreen();
  expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
});

it('IA desligada ou sem cota: mensagem legível e o resto da tela segue inteiro', async () => {
  const user = userEvent.setup();
  jest.mocked(iaApi.analisar).mockRejectedValue(new ApiError(503, 'Cota do provedor de IA excedida', { retryAfterSegundos: 45 }));
  await renderizar(<DetalheAtivo />);

  await user.press(await screen.findByRole('button', { name: 'Gerar análise por IA' }));

  expect(
    await screen.findByText('O limite de uso da IA foi atingido. Tente novamente em 45 s.'),
  ).toBeOnTheScreen();
  expect(screen.getByText('Indicadores técnicos')).toBeOnTheScreen();
  expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
  expect(iaApi.analisar).toHaveBeenCalledTimes(1);
});
```

```edit:src/components/dominio.test.tsx
<<<<
    await render(<CardAnaliseIA />);
    expect(screen.getByText('Análise textual por IA — disponível em breve.')).toBeOnTheScreen();
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
====
    await render(<CardAnaliseIA gerando={false} aoGerar={jest.fn()} />);
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
>>>>
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/hooks/useAnaliseIA.test.tsx src/components/analiseIA.test.tsx src/components/dominio.test.tsx __tests__/telas/ativoAnaliseIA.test.tsx`
Expected: FAIL (`useAnaliseIA` não existe; o card ainda é o "em breve").

- [ ] **Step 3: Implementar**

```edit:src/hooks/chaves.ts
<<<<
  busca: (termo: string) => ['busca', termo] as const,
====
  busca: (termo: string) => ['busca', termo] as const,
  analiseIA: (ativoId: Uuid) => ['ia', 'analise', ativoId] as const,
>>>>
```

`src/hooks/useAnaliseIA.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { ApiError } from '@/api/client';
import { iaApi } from '@/api/ia';
import type { AnaliseIA, Uuid } from '@/api/tipos';
import { chaves } from '@/hooks/chaves';

/**
 * Análise por IA sob demanda. Cada chamada gasta cota do provedor, então a consulta fica desligada: só `gerar` a
 * dispara (primeira vez e "Atualizar"), sem repetição automática. Voltar à tela dentro do tempo de cache mostra a
 * última análise sem nova chamada.
 */
export function useAnaliseIA(ativoId: Uuid | undefined) {
  const consulta = useQuery<AnaliseIA, ApiError>({
    queryKey: chaves.analiseIA(ativoId ?? ''),
    queryFn: () => iaApi.analisar(ativoId as Uuid),
    enabled: false,
    retry: false,
  });
  const { refetch } = consulta;

  const gerar = useCallback(() => {
    if (ativoId) void refetch();
  }, [ativoId, refetch]);

  return { analise: consulta.data, gerando: consulta.isFetching, erro: consulta.error, gerar };
}
```

`src/components/CardAnaliseIA.tsx`:

```tsx
import type { AnaliseIA } from '@/api/tipos';
import { AvisoIA } from '@/components/AvisoIA';
import { Botao } from '@/components/Botao';
import { Card } from '@/components/Card';
import { ErroComRetry } from '@/components/ErroComRetry';
import { Skeleton } from '@/components/Skeleton';
import { Texto } from '@/components/Texto';
import { avisoLegalDe, descreverProcedencia } from '@/dominio/ia';
import { mensagemDeErroDaIA } from '@/utils/erros';

interface Props {
  analise?: AnaliseIA;
  gerando: boolean;
  erro?: unknown;
  aoGerar: () => void;
}

/** Análise textual por IA sob demanda. Todo texto de IA vem com o aviso legal (RN-05), em qualquer estado. */
export function CardAnaliseIA({ analise, gerando, erro, aoGerar }: Props) {
  // Enquanto uma nova tentativa corre, o erro anterior fica guardado pela consulta: só aparece quando parou.
  const falhou = Boolean(erro) && !gerando;

  return (
    <Card titulo="Análise por IA" icone="brilho" tomIcone="ia">
      {analise ? (
        <>
          <Texto selectable>{analise.texto}</Texto>
          <Texto variante="legenda" cor="secundario">
            {descreverProcedencia(analise)}
          </Texto>
          <Texto variante="legenda" cor="terciario">
            {`Modelo: ${analise.modelo}`}
          </Texto>
        </>
      ) : null}

      {!analise && !gerando && !falhou ? (
        <Texto cor="secundario">
          A análise é gerada sob demanda, a partir dos indicadores e dos sinais deste ativo. Pode levar até 1 minuto.
        </Texto>
      ) : null}

      {gerando ? (
        <>
          {!analise ? (
            <>
              <Skeleton />
              <Skeleton />
              <Skeleton largura="60%" />
            </>
          ) : null}
          <Texto cor="secundario" role="status">
            Gerando análise… pode levar até 1 minuto.
          </Texto>
        </>
      ) : null}

      {falhou ? (
        <ErroComRetry erro={erro} mensagem={mensagemDeErroDaIA(erro, 'analise')} aoTentarNovamente={aoGerar} />
      ) : null}

      {!gerando && !falhou ? (
        <Botao
          titulo={analise ? 'Atualizar análise' : 'Gerar análise por IA'}
          variante={analise ? 'secundario' : 'primario'}
          onPress={aoGerar}
        />
      ) : null}

      <AvisoIA texto={avisoLegalDe(analise?.aviso_legal)} />
    </Card>
  );
}
```

```edit:app/ativo/[id].tsx
<<<<
import { useBacktests, useCotacao, useHistorico, useIndicadores, useSinais } from '@/hooks/useAtivo';
====
import { useAnaliseIA } from '@/hooks/useAnaliseIA';
import { useBacktests, useCotacao, useHistorico, useIndicadores, useSinais } from '@/hooks/useAtivo';
>>>>
<<<<
  const item = useItemWatchlist(id);
  const ativo = item?.ativo;
====
  const item = useItemWatchlist(id);
  const analiseIA = useAnaliseIA(id);
  const ativo = item?.ativo;
>>>>
<<<<
        <CardAnaliseIA />
====
        <CardAnaliseIA
          analise={analiseIA.analise}
          gerando={analiseIA.gerando}
          erro={analiseIA.erro}
          aoGerar={analiseIA.gerar}
        />
>>>>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/hooks/useAnaliseIA.test.tsx src/components src/dominio __tests__/telas/ativoAnaliseIA.test.tsx __tests__/telas/ativo.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verificar e commitar**

```bash
npm run verificar
git add -A
git commit -m "feat(ia): análise por IA sob demanda no detalhe do ativo

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RRDxY4Beh38T5NvK5ajVZp"
```

---

### Task 4: Conversa do chat (store em memória)

**Files:**
- Modify: `package.json`, `package-lock.json` (via `npx expo install`), `jest.setup.ts`, `src/store/sessao.ts`
- Create: `src/store/conversa.ts`, `src/store/conversa.test.ts`, `src/store/conversaSessao.test.ts`

**Interfaces:**
- Consumes: `iaApi.conversar`, `montarMensagensDaApi`, `validarPergunta`, `avisoLegalDe`, `MensagemLocal`.
- Produces (Tarefa 5): `useConversa` com `mensagens`, `enviando`, `erro`, `enviar(texto): Promise<boolean>`, `tentarNovamente(): Promise<boolean>`, `limpar()`; `useSessao.sair()` limpa a conversa.

- [ ] **Step 1: Dependência e mock da área de transferência**

```bash
cd /c/Users/Bruno/Insight-flow-mobile
npx expo install expo-clipboard
git diff --stat package.json package-lock.json
```

```edit:jest.setup.ts
<<<<
// O VirtualizedList agenda um setTimeout (updateCellsBatchingPeriod, 50 ms) a cada atualização de dados. Se ele dispara
====
// Área de transferência sem nativo: os testes inspecionam `setStringAsync`.
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));

// O VirtualizedList agenda um setTimeout (updateCellsBatchingPeriod, 50 ms) a cada atualização de dados. Se ele dispara
>>>>
```

- [ ] **Step 2: Escrever os testes (falham)**

`src/store/conversa.test.ts`:

```ts
import { ApiError } from '@/api/client';
import { iaApi } from '@/api/ia';
import type { ChatResponse } from '@/api/tipos';
import { AVISO_IA } from '@/dominio/regulatorio';
import { useConversa } from '@/store/conversa';

jest.mock('@/api/ia', () => ({ iaApi: { analisar: jest.fn(), conversar: jest.fn() } }));

const resposta = (texto: string, extra: Partial<ChatResponse> = {}): ChatResponse => ({
  texto,
  modelo: 'gemini-3.5-flash',
  aviso_legal: 'Aviso do servidor.',
  ...extra,
});

function pendente<T>() {
  let resolver: (valor: T) => void = () => {};
  let rejeitar: (erro: unknown) => void = () => {};
  const promessa = new Promise<T>((ok, erro) => {
    resolver = ok;
    rejeitar = erro;
  });
  return { promessa, resolver, rejeitar };
}

beforeEach(() => {
  jest.clearAllMocks();
  useConversa.getState().limpar();
});

describe('enviar', () => {
  it('guarda a pergunta e a resposta com modelo e aviso legal', async () => {
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('A carteira rendeu 2%.'));

    const ok = await useConversa.getState().enviar('  Qual o resultado?  ');

    expect(ok).toBe(true);
    expect(iaApi.conversar).toHaveBeenCalledWith([{ papel: 'usuario', texto: 'Qual o resultado?' }]);
    const { mensagens, enviando, erro } = useConversa.getState();
    expect(mensagens.map((m) => [m.papel, m.texto])).toEqual([
      ['usuario', 'Qual o resultado?'],
      ['assistente', 'A carteira rendeu 2%.'],
    ]);
    expect(mensagens[1]).toMatchObject({ modelo: 'gemini-3.5-flash', avisoLegal: 'Aviso do servidor.' });
    expect(enviando).toBe(false);
    expect(erro).toBeNull();
  });

  it('aviso legal vazio na resposta vira o texto fixo (RN-05)', async () => {
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('Resposta.', { aviso_legal: '' }));
    await useConversa.getState().enviar('Oi');
    expect(useConversa.getState().mensagens[1].avisoLegal).toBe(AVISO_IA);
  });

  it('a segunda pergunta leva o histórico inteiro', async () => {
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('Primeira resposta.'));
    await useConversa.getState().enviar('Primeira');
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('Segunda resposta.'));

    await useConversa.getState().enviar('Segunda');

    expect(iaApi.conversar).toHaveBeenLastCalledWith([
      { papel: 'usuario', texto: 'Primeira' },
      { papel: 'assistente', texto: 'Primeira resposta.' },
      { papel: 'usuario', texto: 'Segunda' },
    ]);
  });

  it('pergunta em branco ou acima do limite nem chega ao servidor', async () => {
    expect(await useConversa.getState().enviar('   ')).toBe(false);
    expect(await useConversa.getState().enviar('x'.repeat(2001))).toBe(false);
    expect(iaApi.conversar).not.toHaveBeenCalled();
    expect(useConversa.getState().mensagens).toEqual([]);
  });

  it('ignora um segundo envio enquanto espera a resposta', async () => {
    const espera = pendente<ChatResponse>();
    jest.mocked(iaApi.conversar).mockReturnValue(espera.promessa);
    const primeiro = useConversa.getState().enviar('Primeira');

    expect(useConversa.getState().enviando).toBe(true);
    expect(await useConversa.getState().enviar('Segunda')).toBe(false);
    espera.resolver(resposta('Ok'));
    await primeiro;

    expect(iaApi.conversar).toHaveBeenCalledTimes(1);
    expect(useConversa.getState().mensagens).toHaveLength(2);
  });
});

describe('falha', () => {
  it('a pergunta fica marcada, o erro fica guardado e nada é repetido sozinho', async () => {
    const erro = new ApiError(503, 'Provedor de IA indisponivel');
    jest.mocked(iaApi.conversar).mockRejectedValue(erro);

    const ok = await useConversa.getState().enviar('Qual o resultado?');

    expect(ok).toBe(false);
    const estado = useConversa.getState();
    expect(estado.mensagens).toHaveLength(1);
    expect(estado.mensagens[0]).toMatchObject({ papel: 'usuario', falhou: true });
    expect(estado.erro).toBe(erro);
    expect(estado.enviando).toBe(false);
    expect(iaApi.conversar).toHaveBeenCalledTimes(1);
  });

  it('tentarNovamente reenvia a mesma pergunta sem duplicá-la', async () => {
    jest.mocked(iaApi.conversar).mockRejectedValueOnce(new ApiError(502, 'Resposta da IA bloqueada pelo guardrail'));
    await useConversa.getState().enviar('Qual o resultado?');
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('Rendeu 2%.'));

    const ok = await useConversa.getState().tentarNovamente();

    expect(ok).toBe(true);
    expect(iaApi.conversar).toHaveBeenLastCalledWith([{ papel: 'usuario', texto: 'Qual o resultado?' }]);
    const { mensagens, erro } = useConversa.getState();
    expect(mensagens.map((m) => [m.papel, m.texto, m.falhou ?? false])).toEqual([
      ['usuario', 'Qual o resultado?', false],
      ['assistente', 'Rendeu 2%.', false],
    ]);
    expect(erro).toBeNull();
  });

  it('uma pergunta nova descarta a que falhou: o servidor nunca recebe duas do usuário seguidas', async () => {
    jest.mocked(iaApi.conversar).mockRejectedValueOnce(new ApiError(503, 'Cota do provedor de IA excedida'));
    await useConversa.getState().enviar('Pergunta que falhou');
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('Resposta.'));

    await useConversa.getState().enviar('Pergunta nova');

    expect(iaApi.conversar).toHaveBeenLastCalledWith([{ papel: 'usuario', texto: 'Pergunta nova' }]);
    expect(useConversa.getState().mensagens.map((m) => m.texto)).toEqual(['Pergunta nova', 'Resposta.']);
  });

  it('tentarNovamente sem pergunta falha pendente não faz nada', async () => {
    expect(await useConversa.getState().tentarNovamente()).toBe(false);
    expect(iaApi.conversar).not.toHaveBeenCalled();
  });
});

describe('limpar e resposta tardia', () => {
  it('limpar durante o envio descarta a resposta que chegar depois', async () => {
    const espera = pendente<ChatResponse>();
    jest.mocked(iaApi.conversar).mockReturnValue(espera.promessa);
    const envio = useConversa.getState().enviar('Pergunta antiga');

    useConversa.getState().limpar();
    espera.resolver(resposta('Resposta antiga'));
    const ok = await envio;

    expect(ok).toBe(false);
    expect(useConversa.getState().mensagens).toEqual([]);
    expect(useConversa.getState().enviando).toBe(false);
  });

  it('o erro tardio de uma conversa apagada também some', async () => {
    const espera = pendente<ChatResponse>();
    jest.mocked(iaApi.conversar).mockReturnValue(espera.promessa);
    const envio = useConversa.getState().enviar('Pergunta antiga');

    useConversa.getState().limpar();
    espera.rejeitar(new ApiError(503, 'Provedor de IA indisponivel'));
    await envio;

    expect(useConversa.getState()).toMatchObject({ mensagens: [], erro: null, enviando: false });
  });

  it('a resposta tardia não se mistura com a pergunta da conversa nova', async () => {
    const antiga = pendente<ChatResponse>();
    jest.mocked(iaApi.conversar).mockReturnValueOnce(antiga.promessa);
    const envioAntigo = useConversa.getState().enviar('Pergunta antiga');
    useConversa.getState().limpar();
    const nova = pendente<ChatResponse>();
    jest.mocked(iaApi.conversar).mockReturnValueOnce(nova.promessa);
    const envioNovo = useConversa.getState().enviar('Pergunta nova');

    antiga.resolver(resposta('Resposta antiga'));
    await envioAntigo;
    expect(useConversa.getState().mensagens.map((m) => m.texto)).toEqual(['Pergunta nova']);
    expect(useConversa.getState().enviando).toBe(true);

    nova.resolver(resposta('Resposta nova'));
    await envioNovo;
    expect(useConversa.getState().mensagens.map((m) => m.texto)).toEqual(['Pergunta nova', 'Resposta nova']);
  });
});
```

`src/store/conversaSessao.test.ts`:

```ts
import { iaApi } from '@/api/ia';
import type { ChatResponse } from '@/api/tipos';
import { useConversa } from '@/store/conversa';
import { useSessao } from '@/store/sessao';

jest.mock('@/api/ia', () => ({ iaApi: { analisar: jest.fn(), conversar: jest.fn() } }));
jest.mock('@/api/auth', () => ({ authApi: { sair: jest.fn(async () => undefined), renovar: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  useConversa.getState().limpar();
});

it('sair da conta apaga a conversa', async () => {
  jest.mocked(iaApi.conversar).mockResolvedValue({ texto: 'Resposta.', modelo: 'm', aviso_legal: 'a' });
  await useConversa.getState().enviar('Pergunta');
  expect(useConversa.getState().mensagens).toHaveLength(2);

  await useSessao.getState().sair({ revogarNoServidor: false });

  expect(useConversa.getState().mensagens).toEqual([]);
});

it('a resposta que chega depois do logout não entra na conversa da próxima conta', async () => {
  let resolver: (resposta: ChatResponse) => void = () => {};
  jest.mocked(iaApi.conversar).mockReturnValue(
    new Promise<ChatResponse>((ok) => {
      resolver = ok;
    }),
  );
  const envio = useConversa.getState().enviar('Pergunta da conta A');

  await useSessao.getState().sair({ revogarNoServidor: false });
  resolver({ texto: 'Resposta para a conta A', modelo: 'm', aviso_legal: 'a' });
  await envio;

  expect(useConversa.getState().mensagens).toEqual([]);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx jest src/store/conversa.test.ts src/store/conversaSessao.test.ts`
Expected: FAIL (`@/store/conversa` não existe).

- [ ] **Step 4: Implementar**

`src/store/conversa.ts`:

```ts
import { create } from 'zustand';

import { iaApi } from '@/api/ia';
import { avisoLegalDe, type MensagemLocal, montarMensagensDaApi, validarPergunta } from '@/dominio/ia';

interface EstadoConversa {
  mensagens: MensagemLocal[];
  enviando: boolean;
  /** Erro do último envio; a pergunta que falhou continua na lista, marcada. `null` quando não há. */
  erro: unknown;
  /** `true` quando a resposta da IA chegou. */
  enviar: (texto: string) => Promise<boolean>;
  /** Reenvia a pergunta que falhou, sem duplicá-la. */
  tentarNovamente: () => Promise<boolean>;
  limpar: () => void;
}

// O backend não guarda a conversa e o app só a mantém em memória: ela some ao fechar o app e ao sair da conta
// (`useSessao.sair`). Limpar também invalida a resposta que ainda estiver a caminho: ela é de uma conversa que já
// não existe e não pode aparecer na seguinte.
let epoca = 0;
let contador = 0;

function novoId(): string {
  contador += 1;
  return `m-${contador}`;
}

function semPerguntaPendente(mensagens: MensagemLocal[]): MensagemLocal[] {
  const ultima = mensagens[mensagens.length - 1];
  return ultima?.falhou ? mensagens.slice(0, -1) : mensagens;
}

function marcarFalha(mensagens: MensagemLocal[]): MensagemLocal[] {
  const ultima = mensagens[mensagens.length - 1];
  if (!ultima || ultima.papel !== 'usuario') return mensagens;
  return [...mensagens.slice(0, -1), { ...ultima, falhou: true }];
}

export const useConversa = create<EstadoConversa>()((set, get) => {
  async function pedirResposta(): Promise<boolean> {
    const minhaEpoca = epoca;
    try {
      const resposta = await iaApi.conversar(montarMensagensDaApi(get().mensagens));
      if (epoca !== minhaEpoca) return false;
      const mensagem: MensagemLocal = {
        id: novoId(),
        papel: 'assistente',
        texto: resposta.texto,
        modelo: resposta.modelo,
        avisoLegal: avisoLegalDe(resposta.aviso_legal),
      };
      set((estado) => ({ mensagens: [...estado.mensagens, mensagem], enviando: false, erro: null }));
      return true;
    } catch (erro) {
      if (epoca !== minhaEpoca) return false;
      set((estado) => ({ mensagens: marcarFalha(estado.mensagens), enviando: false, erro }));
      return false;
    }
  }

  return {
    mensagens: [],
    enviando: false,
    erro: null,

    enviar: async (texto) => {
      if (get().enviando) return false;
      const validacao = validarPergunta(texto);
      if (!validacao.valida) return false;
      set((estado) => ({
        mensagens: [...semPerguntaPendente(estado.mensagens), { id: novoId(), papel: 'usuario', texto: validacao.texto }],
        enviando: true,
        erro: null,
      }));
      return pedirResposta();
    },

    tentarNovamente: async () => {
      const { mensagens, enviando } = get();
      const ultima = mensagens[mensagens.length - 1];
      if (enviando || !ultima?.falhou) return false;
      set({ mensagens: [...mensagens.slice(0, -1), { ...ultima, falhou: false }], enviando: true, erro: null });
      return pedirResposta();
    },

    limpar: () => {
      epoca += 1;
      set({ mensagens: [], enviando: false, erro: null });
    },
  };
});
```

```edit:src/store/sessao.ts
<<<<
import { queryClient } from '@/hooks/queryClient';
====
import { queryClient } from '@/hooks/queryClient';
import { useConversa } from '@/store/conversa';
>>>>
<<<<
    set(ANONIMO);
    queryClient.clear();
====
    set(ANONIMO);
    queryClient.clear();
    // A conversa com a IA é da conta que saiu: some junto, e a resposta que ainda vier é descartada.
    useConversa.getState().limpar();
>>>>
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx jest src/store`
Expected: PASS.

- [ ] **Step 6: Verificar e commitar**

```bash
npm run verificar
git add -A
git commit -m "feat(chat): conversa em memória com descarte de resposta tardia e limpeza ao sair da conta

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RRDxY4Beh38T5NvK5ajVZp"
```

---

### Task 5: Chat como quinta aba

**Files:**
- Modify: `app/(tabs)/_layout.tsx`, `app/_layout.tsx`, `src/components/Icone.tsx`, `__tests__/telas/chat.test.tsx`
- Create: `app/(tabs)/chat.tsx`, `src/components/BalaoMensagem.tsx`, `src/components/SugestoesChat.tsx`, `src/components/chat.test.tsx`
- Delete: `app/chat.tsx`

**Interfaces:**
- Consumes: `useConversa`, `SUGESTOES_DO_CHAT`, `MAXIMO_DE_CARACTERES`, `validarPergunta`, `textoParaCopiar`, `mensagemDeErroDaIA`, `expo-clipboard`.
- Produces: aba `chat` (entre Carteira e Alertas), `BalaoMensagem`, `SugestoesChat`, ícone `copiar`.

- [ ] **Step 1: Escrever os testes (falham)**

`src/components/chat.test.tsx`:

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';

import { BalaoMensagem } from '@/components/BalaoMensagem';
import { SugestoesChat } from '@/components/SugestoesChat';

describe('BalaoMensagem', () => {
  it('pergunta do usuário não tem botão de copiar', async () => {
    await render(<BalaoMensagem papel="usuario" texto="Qual o resultado?" />);
    expect(screen.getByText('Qual o resultado?')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Copiar resposta' })).not.toBeOnTheScreen();
  });

  it('resposta da IA copia pelo botão', async () => {
    const aoCopiar = jest.fn();
    const user = userEvent.setup();
    await render(<BalaoMensagem papel="assistente" texto="Rendeu 2%." aoCopiar={aoCopiar} />);

    await user.press(screen.getByRole('button', { name: 'Copiar resposta' }));

    expect(aoCopiar).toHaveBeenCalledTimes(1);
  });

  it('depois de copiar mostra a confirmação', async () => {
    await render(<BalaoMensagem papel="assistente" texto="Rendeu 2%." aoCopiar={jest.fn()} copiado />);
    expect(screen.getByRole('button', { name: 'Resposta copiada' })).toBeOnTheScreen();
    expect(screen.getByText('Copiado')).toBeOnTheScreen();
  });

  it('pergunta que falhou diz que não foi enviada', async () => {
    await render(<BalaoMensagem papel="usuario" texto="Qual o resultado?" falhou />);
    expect(screen.getByText('Não enviada')).toBeOnTheScreen();
  });
});

describe('SugestoesChat', () => {
  it('toque numa sugestão devolve o texto dela', async () => {
    const aoEscolher = jest.fn();
    const user = userEvent.setup();
    await render(<SugestoesChat sugestoes={['A carteira está acima do CDI?', 'Qual foi meu ativo mais rentável?']} aoEscolher={aoEscolher} />);

    await user.press(screen.getByRole('button', { name: 'A carteira está acima do CDI?' }));

    expect(aoEscolher).toHaveBeenCalledWith('A carteira está acima do CDI?');
  });

  it('desabilitadas não respondem ao toque', async () => {
    const aoEscolher = jest.fn();
    const user = userEvent.setup();
    await render(<SugestoesChat sugestoes={['A carteira está acima do CDI?']} aoEscolher={aoEscolher} desabilitado />);

    await user.press(screen.getByRole('button', { name: 'A carteira está acima do CDI?' }));

    expect(aoEscolher).not.toHaveBeenCalled();
  });
});
```

`__tests__/telas/chat.test.tsx`:

```tsx
import * as Clipboard from 'expo-clipboard';
import { act, fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { ApiError } from '@/api/client';
import { iaApi } from '@/api/ia';
import type { ChatResponse } from '@/api/tipos';
import { AVISO_IA } from '@/dominio/regulatorio';
import { SUGESTOES_DO_CHAT } from '@/dominio/ia';
import { renderizar } from '@/test/renderizar';
import { useConversa } from '@/store/conversa';

import Chat from '../../app/(tabs)/chat';

jest.mock('@/api/ia', () => ({ iaApi: { analisar: jest.fn(), conversar: jest.fn() } }));

const resposta = (texto: string, extra: Partial<ChatResponse> = {}): ChatResponse => ({
  texto,
  modelo: 'gemini-3.5-flash',
  aviso_legal: AVISO_IA,
  ...extra,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  useConversa.getState().limpar();
});

async function digitar(user: ReturnType<typeof userEvent.setup>, texto: string) {
  await user.type(screen.getByLabelText('Mensagem para a IA'), texto);
}

describe('estado inicial', () => {
  it('boas-vindas, as seis sugestões, aviso legal e Enviar desabilitado', async () => {
    await renderizar(<Chat />);

    expect(screen.getByText(/Posso responder sobre a sua carteira simulada/)).toBeOnTheScreen();
    for (const sugestao of SUGESTOES_DO_CHAT) {
      expect(screen.getByRole('button', { name: sugestao })).toBeOnTheScreen();
    }
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Limpar conversa' })).not.toBeOnTheScreen();
    expect(iaApi.conversar).not.toHaveBeenCalled();
  });

  it('os textos estáticos não recomendam compra nem venda (RN-01)', async () => {
    await renderizar(<Chat />);
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/\b(compre|comprar|venda|vender|invista|investir)\b/i);
  });
});

describe('conversa', () => {
  it('envia a pergunta, mostra a resposta e limpa o campo', async () => {
    const user = userEvent.setup();
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('A carteira rendeu 2% no mês.'));
    await renderizar(<Chat />);

    await digitar(user, 'Qual o resultado da carteira?');
    await user.press(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByText('A carteira rendeu 2% no mês.')).toBeOnTheScreen();
    expect(screen.getByText('Qual o resultado da carteira?')).toBeOnTheScreen();
    expect(iaApi.conversar).toHaveBeenCalledWith([{ papel: 'usuario', texto: 'Qual o resultado da carteira?' }]);
    expect(screen.getByLabelText('Mensagem para a IA')).toHaveDisplayValue('');
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
  });

  it('toque numa sugestão envia direto e as sugestões saem da tela', async () => {
    const user = userEvent.setup();
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('Está acima do CDI.'));
    await renderizar(<Chat />);

    await user.press(screen.getByRole('button', { name: 'A carteira está acima do CDI?' }));

    expect(await screen.findByText('Está acima do CDI.')).toBeOnTheScreen();
    expect(iaApi.conversar).toHaveBeenCalledWith([{ papel: 'usuario', texto: 'A carteira está acima do CDI?' }]);
    expect(screen.queryByRole('button', { name: 'Quais sinais estão ativos agora?' })).not.toBeOnTheScreen();
  });

  it('enquanto espera, mostra o progresso e trava o envio', async () => {
    const user = userEvent.setup();
    let concluir: (r: ChatResponse) => void = () => {};
    jest.mocked(iaApi.conversar).mockReturnValue(
      new Promise<ChatResponse>((ok) => {
        concluir = ok;
      }),
    );
    await renderizar(<Chat />);

    await digitar(user, 'Qual o resultado?');
    await user.press(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByText('Consultando os dados da carteira… pode levar até 1 minuto.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
    concluir(resposta('Pronto.'));
    expect(await screen.findByText('Pronto.')).toBeOnTheScreen();
  });

  it('pergunta acima de 2000 caracteres mostra o limite e não envia', async () => {
    await renderizar(<Chat />);

    // Digitar 2001 caracteres um a um estoura o tempo do teste: o evento de texto entra de uma vez.
    await fireEvent.changeText(screen.getByLabelText('Mensagem para a IA'), 'x'.repeat(2001));

    expect(screen.getByText('A pergunta tem 2001 caracteres; o limite é 2000.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });
});

describe('falhas da IA', () => {
  it.each([
    [new ApiError(503, 'Provedor de IA indisponivel'), 'A IA está indisponível no momento. Tente novamente em instantes.'],
    [
      new ApiError(503, 'Cota do provedor de IA excedida', { retryAfterSegundos: 90 }),
      'O limite de uso da IA foi atingido. Tente novamente em cerca de 2 min.',
    ],
    [
      new ApiError(502, 'Resposta da IA bloqueada pelo guardrail'),
      'A IA não conseguiu gerar um texto dentro das regras de linguagem. Tente novamente.',
    ],
    [
      new ApiError(0, 'O servidor demorou demais para responder (http://api)', { causa: 'tempo' }),
      'A IA demorou mais que o esperado para responder. Tente enviar a pergunta de novo.',
    ],
  ])('mostra a mensagem legível e deixa tentar de novo (%#)', async (erro, mensagem) => {
    const user = userEvent.setup();
    jest.mocked(iaApi.conversar).mockRejectedValueOnce(erro);
    await renderizar(<Chat />);

    await digitar(user, 'Qual o resultado?');
    await user.press(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByText(mensagem)).toBeOnTheScreen();
    expect(screen.getByText('Não enviada')).toBeOnTheScreen();
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
    expect(iaApi.conversar).toHaveBeenCalledTimes(1);

    jest.mocked(iaApi.conversar).mockResolvedValueOnce(resposta('Rendeu 2%.'));
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Rendeu 2%.')).toBeOnTheScreen();
    expect(screen.queryByText('Não enviada')).not.toBeOnTheScreen();
    expect(screen.getAllByText('Qual o resultado?')).toHaveLength(1);
  });
});

describe('copiar e limpar', () => {
  it('copiar leva o texto da resposta com o aviso legal e confirma', async () => {
    const user = userEvent.setup();
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('A carteira rendeu 2%.', { aviso_legal: 'Aviso do servidor.' }));
    await renderizar(<Chat />);
    await digitar(user, 'Qual o resultado?');
    await user.press(screen.getByRole('button', { name: 'Enviar' }));
    await screen.findByText('A carteira rendeu 2%.');

    await user.press(screen.getByRole('button', { name: 'Copiar resposta' }));

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('A carteira rendeu 2%.\n\nAviso do servidor.');
    expect(await screen.findByText('Copiado')).toBeOnTheScreen();
  });

  it('falha ao copiar avisa em vez de fingir que copiou', async () => {
    const user = userEvent.setup();
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(Clipboard.setStringAsync).mockRejectedValueOnce(new Error('sem acesso'));
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('Resposta.'));
    await renderizar(<Chat />);
    await digitar(user, 'Oi');
    await user.press(screen.getByRole('button', { name: 'Enviar' }));
    await screen.findByText('Resposta.');

    await user.press(screen.getByRole('button', { name: 'Copiar resposta' }));

    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Não foi possível copiar', expect.any(String)));
    expect(screen.queryByText('Copiado')).not.toBeOnTheScreen();
  });

  it('limpar pede confirmação e volta ao estado inicial', async () => {
    const user = userEvent.setup();
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('Resposta.'));
    await renderizar(<Chat />);
    await digitar(user, 'Oi');
    await user.press(screen.getByRole('button', { name: 'Enviar' }));
    await screen.findByText('Resposta.');

    await user.press(screen.getByRole('button', { name: 'Limpar conversa' }));

    expect(alerta).toHaveBeenCalledWith('Limpar conversa', expect.any(String), expect.any(Array));
    // Cancelar não apaga.
    expect(screen.getByText('Resposta.')).toBeOnTheScreen();

    const botoes = alerta.mock.calls[0][2] ?? [];
    await act(async () => {
      botoes.find((b) => b.text === 'Limpar')?.onPress?.();
    });

    await waitFor(() => expect(screen.queryByText('Resposta.')).not.toBeOnTheScreen());
    expect(screen.getByRole('button', { name: SUGESTOES_DO_CHAT[0] })).toBeOnTheScreen();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/components/chat.test.tsx __tests__/telas/chat.test.tsx`
Expected: FAIL (componentes e a tela da aba não existem).

- [ ] **Step 3: Implementar**

```edit:src/components/Icone.tsx
<<<<
  CirclePlus,
  Eye,
====
  CirclePlus,
  Copy,
  Eye,
>>>>
<<<<
  confirmado: Check,
====
  confirmado: Check,
  copiar: Copy,
>>>>
```

`src/components/BalaoMensagem.tsx`:

```tsx
import { Pressable, StyleSheet, View } from 'react-native';

import type { PapelMensagem } from '@/api/tipos';
import { Icone } from '@/components/Icone';
import { IconeChip } from '@/components/IconeChip';
import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  papel: PapelMensagem;
  texto: string;
  /** Pergunta que não obteve resposta. */
  falhou?: boolean;
  /** Balão de "consultando…": enquanto a resposta da IA não chega. */
  pendente?: boolean;
  /** Só nas respostas da IA. */
  aoCopiar?: () => void;
  copiado?: boolean;
}

export function BalaoMensagem({ papel, texto, falhou = false, pendente = false, aoCopiar, copiado = false }: Props) {
  const { cores } = useTema();
  const doUsuario = papel === 'usuario';
  const cor = doUsuario ? { backgroundColor: cores.primaria, borderColor: cores.primaria } : null;

  return (
    <View style={[estilos.linha, doUsuario && estilos.linhaDoUsuario]}>
      {doUsuario ? null : <IconeChip nome="brilho" tom="ia" tamanho={28} />}
      <View style={[estilos.coluna, doUsuario && estilos.colunaDoUsuario]}>
        <View
          aria-busy={pendente}
          style={[
            estilos.balao,
            cor ?? { backgroundColor: cores.superficieElevada, borderColor: cores.borda },
            falhou && { borderColor: cores.negativo },
          ]}
        >
          <Texto selectable cor={doUsuario ? 'sobrePrimaria' : pendente ? 'secundario' : 'padrao'}>
            {texto}
          </Texto>
        </View>
        {falhou ? (
          <Texto variante="legenda" cor="negativo">
            Não enviada
          </Texto>
        ) : null}
        {aoCopiar ? (
          <Pressable
            role="button"
            aria-label={copiado ? 'Resposta copiada' : 'Copiar resposta'}
            onPress={aoCopiar}
            style={estilos.copiar}
          >
            <Icone nome={copiado ? 'confirmado' : 'copiar'} tamanho={14} cor="textoSecundario" />
            <Texto variante="legenda" cor="secundario">
              {copiado ? 'Copiado' : 'Copiar'}
            </Texto>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'flex-start', gap: espaco.sm },
  linhaDoUsuario: { justifyContent: 'flex-end' },
  coluna: { flexShrink: 1, maxWidth: '85%', gap: espaco.xs },
  colunaDoUsuario: { alignItems: 'flex-end' },
  balao: { borderWidth: 1, borderRadius: raio.lg, paddingHorizontal: espaco.md, paddingVertical: espaco.sm },
  copiar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: espaco.xs },
});
```

`src/components/SugestoesChat.tsx`:

```tsx
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  sugestoes: readonly string[];
  aoEscolher: (sugestao: string) => void;
  desabilitado?: boolean;
}

export function SugestoesChat({ sugestoes, aoEscolher, desabilitado = false }: Props) {
  const { cores } = useTema();
  return (
    <View style={estilos.grade}>
      {sugestoes.map((sugestao) => (
        <Pressable
          key={sugestao}
          role="button"
          aria-label={sugestao}
          aria-disabled={desabilitado}
          disabled={desabilitado}
          onPress={() => aoEscolher(sugestao)}
          style={[
            estilos.chip,
            { borderColor: cores.bordaForte, backgroundColor: cores.superficieElevada, opacity: desabilitado ? 0.5 : 1 },
          ]}
        >
          <Texto variante="legenda" cor="secundario">
            {sugestao}
          </Texto>
        </Pressable>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: raio.lg,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.xs,
  },
});
```

`app/(tabs)/chat.tsx`:

```tsx
import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AvisoIA } from '@/components/AvisoIA';
import { BalaoMensagem } from '@/components/BalaoMensagem';
import { Botao } from '@/components/Botao';
import { ErroComRetry } from '@/components/ErroComRetry';
import { Icone } from '@/components/Icone';
import { SugestoesChat } from '@/components/SugestoesChat';
import { Texto } from '@/components/Texto';
import {
  MAXIMO_DE_CARACTERES,
  type MensagemLocal,
  SUGESTOES_DO_CHAT,
  textoParaCopiar,
  validarPergunta,
} from '@/dominio/ia';
import { useConversa } from '@/store/conversa';
import { espaco, fonte, raio } from '@/theme/escala';
import { familia } from '@/theme/familias';
import { useTema } from '@/theme/useTema';
import { mensagemDeErroDaIA } from '@/utils/erros';

const BOAS_VINDAS =
  'Posso responder sobre a sua carteira simulada consultando os dados registrados: rentabilidade, exposição por classe e setor, comparativo com CDI e Ibovespa, histórico de operações e sinais ativos.';
const TEMPO_DO_COPIADO_MS = 1500;

export default function Chat() {
  const { cores } = useTema();
  const mensagens = useConversa((estado) => estado.mensagens);
  const enviando = useConversa((estado) => estado.enviando);
  const erro = useConversa((estado) => estado.erro);
  const enviar = useConversa((estado) => estado.enviar);
  const tentarNovamente = useConversa((estado) => estado.tentarNovamente);
  const limpar = useConversa((estado) => estado.limpar);

  const [rascunho, setRascunho] = useState('');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const rolagem = useRef<ScrollView>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  const validacao = validarPergunta(rascunho);
  const caracteres = rascunho.trim().length;
  const excedeu = caracteres > MAXIMO_DE_CARACTERES;
  const podeEnviar = validacao.valida && !enviando;
  const falhaPendente = Boolean(mensagens[mensagens.length - 1]?.falhou) && !enviando;

  function enviarRascunho() {
    if (!podeEnviar) return;
    const pergunta = rascunho;
    setRascunho('');
    void enviar(pergunta);
  }

  async function copiar(mensagem: MensagemLocal) {
    try {
      await Clipboard.setStringAsync(textoParaCopiar(mensagem));
    } catch {
      Alert.alert('Não foi possível copiar', 'Selecione o texto da resposta e copie manualmente.');
      return;
    }
    setCopiadoId(mensagem.id);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setCopiadoId(null), TEMPO_DO_COPIADO_MS);
  }

  function confirmarLimpeza() {
    Alert.alert('Limpar conversa', 'Apagar as mensagens desta conversa?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpar', style: 'destructive', onPress: limpar },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={[estilos.tela, { backgroundColor: cores.fundo }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={rolagem}
        contentContainerStyle={estilos.conversa}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => rolagem.current?.scrollToEnd({ animated: true })}
      >
        {mensagens.length > 0 ? (
          <Pressable role="button" aria-label="Limpar conversa" onPress={confirmarLimpeza} style={estilos.limpar}>
            <Icone nome="lixeira" tamanho={16} cor="textoSecundario" />
            <Texto variante="legenda" cor="secundario">
              Limpar conversa
            </Texto>
          </Pressable>
        ) : null}

        <BalaoMensagem papel="assistente" texto={BOAS_VINDAS} />

        {mensagens.length === 0 ? (
          <SugestoesChat sugestoes={SUGESTOES_DO_CHAT} aoEscolher={(sugestao) => void enviar(sugestao)} desabilitado={enviando} />
        ) : null}

        {mensagens.map((mensagem) => (
          <BalaoMensagem
            key={mensagem.id}
            papel={mensagem.papel}
            texto={mensagem.texto}
            falhou={mensagem.falhou}
            aoCopiar={mensagem.papel === 'assistente' ? () => void copiar(mensagem) : undefined}
            copiado={copiadoId === mensagem.id}
          />
        ))}

        {enviando ? (
          <BalaoMensagem papel="assistente" texto="Consultando os dados da carteira… pode levar até 1 minuto." pendente />
        ) : null}

        {falhaPendente ? (
          <ErroComRetry
            erro={erro}
            mensagem={mensagemDeErroDaIA(erro, 'chat')}
            aoTentarNovamente={() => void tentarNovamente()}
          />
        ) : null}
      </ScrollView>

      <View style={[estilos.rodape, { borderColor: cores.borda, backgroundColor: cores.superficie }]}>
        <AvisoIA />
        <View style={estilos.entrada}>
          <TextInput
            aria-label="Mensagem para a IA"
            multiline
            value={rascunho}
            onChangeText={setRascunho}
            placeholder="Pergunte sobre a sua carteira…"
            placeholderTextColor={cores.textoTerciario}
            style={[
              estilos.campo,
              {
                color: cores.texto,
                borderColor: excedeu ? cores.negativo : cores.bordaForte,
                backgroundColor: cores.superficieElevada,
              },
            ]}
          />
          <Botao titulo="Enviar" onPress={enviarRascunho} desabilitado={!podeEnviar} />
        </View>
        {excedeu && !validacao.valida ? (
          <Texto variante="legenda" cor="negativo">
            {validacao.motivo}
          </Texto>
        ) : (
          <Texto variante="legenda" cor="terciario">{`${caracteres}/${MAXIMO_DE_CARACTERES}`}</Texto>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conversa: { padding: espaco.lg, gap: espaco.md, flexGrow: 1 },
  limpar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: espaco.xs, alignSelf: 'flex-end' },
  rodape: { borderTopWidth: StyleSheet.hairlineWidth, padding: espaco.md, gap: espaco.sm },
  entrada: { flexDirection: 'row', alignItems: 'flex-end', gap: espaco.sm },
  campo: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: raio.sm,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    fontSize: fonte.corpo,
    fontFamily: familia.corpo,
  },
});
```

```edit:app/(tabs)/_layout.tsx
<<<<
          title: 'Carteira',
          tabBarIcon: ({ color, size }) => <Icone nome="grafico-pizza" corExata={color} tamanho={size} />,
          headerRight: () => (
            <BotaoCabecalho icone="mensagem" rotulo="Perguntar à IA" onPress={() => router.push('/chat')} />
          ),
        }}
      />
====
          title: 'Carteira',
          tabBarIcon: ({ color, size }) => <Icone nome="grafico-pizza" corExata={color} tamanho={size} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          headerTitle: 'Chat com IA',
          tabBarIcon: ({ color, size }) => <Icone nome="mensagem" corExata={color} tamanho={size} />,
        }}
      />
>>>>
```

```edit:app/_layout.tsx
<<<<
                <Stack.Screen name="chat" options={{ title: 'Perguntar à IA' }} />
                <Stack.Screen name="notificacoes" options={{ title: 'Notificações' }} />
====
                <Stack.Screen name="notificacoes" options={{ title: 'Notificações' }} />
>>>>
```

```bash
git rm -f app/chat.tsx
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/components __tests__/telas/chat.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verificar e commitar**

```bash
npm run verificar
git add -A
git commit -m "feat(chat): chat com IA como quinta aba, com sugestões, cópia com aviso legal e limpeza

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RRDxY4Beh38T5NvK5ajVZp"
```

---

### Task 6: Conferência com o backend real, documentação e PR

**Files:**
- Modify: `README.md`, `docs/PLANO.md`, `docs/checkpoint-02.md`
- Create (fora do repositório, no scratchpad): servidor falso do Gemini e script de conferência

- [ ] **Step 1: Conferir os contratos no backend local sem chave de IA**

Com o backend local (`AI_HABILITADA` desligado, sem `GEMINI_API_KEY`), com usuário descartável:
- `GET /ativos/{id}/analise` e `POST /chat` respondem **503** `Provedor de IA indisponivel` (a IA desligada);
- `POST /chat` valida: lista vazia, mais de 20, última do assistente, texto em branco, texto de 2001 caracteres (422 com as mensagens do contrato).

- [ ] **Step 2: Conferir 200, 429 e guardrail com um Gemini falso**

Subir um servidor HTTP local que imita `POST /v1beta/models/{modelo}:generateContent` (resposta `candidates[0].content.parts[0].text`; 429 com `Retry-After`; texto com "compre" para o guardrail) e apontar a API (no container, por arquivo de override fora do repositório) com `AI_HABILITADA=true`, `GEMINI_API_KEY` de mentira e `GEMINI_BASE_URL` para o servidor falso. Conferir: análise 200 (`em_cache` falso e depois verdadeiro), chat 200 com `aviso_legal`, 503 de cota com `Retry-After`, 502 do guardrail, histórico com resposta de 2001 caracteres recusado (422) e aceito depois de cortado. Restaurar o container original ao fim.

- [ ] **Step 3: Documentação**

- `README.md`: recursos da Etapa 7 (análise sob demanda, chat na aba, limites, aviso legal, o que depende da IA do backend).
- `docs/PLANO.md`: `expo-clipboard` instalado; "Como ficou na Etapa 7" (consulta desligada, conversa em memória, corte de 2000 caracteres); estrutura de pastas com `(tabs)/chat.tsx` pronto.
- `docs/checkpoint-02.md`: onde IA e chat aparecem e o que fazer com a IA do backend desligada.

- [ ] **Step 4: Revisão independente, correções, push e PR empilhado**

`review-package` sobre a branch inteira, subagente revisor (modelo `opus`, somente leitura), uma rodada de correções com RED→GREEN, menores no "Registro da execução". Depois `git push -u origin feature/etapa-7-analise-ia-chat` e `gh pr create --base feature/etapa-6-carteira-operacoes` (com `GH_TOKEN` na mesma chamada), sem merge.

## Registro da execução (11/10/2026)

Tarefas 1 a 6 executadas inline, na ordem, com RED antes de cada implementação e `npm run verificar` verde em cada commit (81 suítes / 886 testes ao fim).

### Desvios do plano
- Teste "pergunta acima de 2000 caracteres": digitar 2001 caracteres um a um estourava o tempo do teste; passou a usar `fireEvent.changeText`.
- Teste de "limpar conversa": o callback do alerta roda dentro de `act` (a store atualiza a tela).
- Teste do hook `useAnaliseIA`: o cliente com repetição ligada usa `gcTime: Infinity`; o padrão de 5 min deixava um timer aberto ("worker failed to exit gracefully").
- A tela do chat passou a usar `useHeaderHeight` (`expo-router/react-navigation`) e a aba `chat` ganhou `tabBarHideOnKeyboard` (ver "Revisão independente"). Teste novo `__tests__/telas/abas.test.tsx` fixa a ordem das cinco abas (D5) e essa opção.

### Conferência com o backend local
- IA desligada (sem `AI_HABILITADA` e sem chave): análise e chat respondem 503 "Provedor de IA indisponivel"; sem token, 401.
- Com um Gemini falso num container descartável, apontado por um arquivo de override fora do repositório (ambiente restaurado ao fim): análise 200 (`em_cache` falso e depois verdadeiro, e a segunda não chamou o provedor), chat 200 com `aviso_legal` e modelo, chat com histórico de 3 e de 20 mensagens, 422 do `/chat` (lista vazia, 21 mensagens, última do assistente, texto em branco, 2001 caracteres, resposta da IA de 2001 caracteres no histórico; aceito com 2000), 503 de cota com `Retry-After: 37` e 502 do guardrail. O provedor tentou 2 vezes na cota e 2 vezes (original e reescrita) no guardrail.

### Revisão independente (opus, branch inteira)
Sem Critical. Pesos re-graduados pelo efeito:
- **Important, corrigido (RED→GREEN):** no iOS o `KeyboardAvoidingView` da aba não recebia deslocamento e o teclado cobria o campo e o botão Enviar (a tela começa abaixo do cabeçalho). Corrigido com `keyboardVerticalOffset={useHeaderHeight()}`; teste: `teclado › desloca o rodapé pela altura do cabeçalho…`. Junto, `tabBarHideOnKeyboard: true` na aba Chat (a documentação do Expo indica essa opção para a barra de abas subir com o teclado no Android); teste: `abas › o teclado do chat não empurra a barra de abas…`. **Nenhum dos dois foi visto em aparelho.**
- Documentação: o `CLAUDE.md` dizia que todo texto de IA usa `avisoLegalDe`; o rodapé do chat usa o aviso fixo (igual ao do backend hoje). Texto corrigido.

### Rulings
- Histórico do chat só em memória, limpo ao sair da conta (dados financeiros em claro no disco e uma dependência a mais não compensam; o web também não persiste). Custo se errado: a conversa some ao fechar o app.
- Resposta da IA com mais de 2000 caracteres é cortada ao reenviar o histórico (o backend valida todas as mensagens). Custo: a IA perde o fim da própria resposta anterior.
- "Provedor de IA indisponivel" com texto neutro ("A IA está indisponível no momento…"): vale para a análise e para o chat, e o backend usa a mesma mensagem com a IA desligada.
- Adotado `tabBarHideOnKeyboard` só na aba Chat, em vez de `softwareKeyboardLayoutMode: pan` global (mudaria todas as telas sem aparelho para conferir).

### Menores adiados
1. Dois `gerar()` no mesmo quadro, com análise já na tela, fazem duas chamadas ao backend (`refetch` cancela e refaz; sugerido `refetch({ cancelRefetch: false })`). Improvável: o botão some assim que `gerando` fica verdadeiro.
2. A espera da cota ("em 37 s") envelhece na tela: a consulta guarda o erro por 5 min e o chat mantém o texto até a próxima ação.
3. Leitores de tela não anunciam "Gerando…" nem a chegada da resposta (`role="status"` e `aria-busy` não criam região viva no iOS; sugerido `aria-live` no Android e `AccessibilityInfo.announceForAccessibility`).
4. A seleção manual do texto (e o alerta de falha ao copiar, que manda copiar manualmente) sai sem o aviso legal; só o botão Copiar o leva.
5. Corpo do `/chat`: resposta que começa com 2000 espaços vira mensagem em branco depois do corte (422 "Mensagem vazia"); `trim()` do JS não remove ``–`` e ``, que o `strip()` do Python remove.
6. Latente: `queryClient.refetchQueries()` sem filtro (ou `invalidateQueries({ refetchType: 'all' })`) refaria a análise em cache e gastaria cota; nenhum código faz isso hoje.
7. Textos: `formatarEspera` devolve "cerca de 60 min" entre 3541 e 3599 s; "pode levar até 1 minuto" com limites de 70 s e 90 s; "o provedor de IA não respondeu agora" também vale quando o backend marca `desatualizada` por guardrail ou cota.
8. A tela do chat re-renderiza todos os balões a cada tecla (sem memoização, lista sem limite em memória).
9. Observação para o aparelho: `Tela.tsx` também não passa deslocamento ao `KeyboardAvoidingView`; formulários com cabeçalho (nova operação, alertas) podem ter o mesmo problema do teclado no iOS.
10. Prévia web (o projeto não tem alvo web): `Alert.alert` não faz nada (limpar não funciona) e a cópia que devolve `false` mostra "Copiado".

### Não verificado
Teclado e rolagem da aba Chat em Android e iOS (inclui o deslocamento e a barra de abas), a cópia real para a área de transferência, a leitura com TalkBack e VoiceOver e o texto real do Gemini (a chave real não está no backend local; o tempo de resposta do provedor pode passar de 1 minuto).
