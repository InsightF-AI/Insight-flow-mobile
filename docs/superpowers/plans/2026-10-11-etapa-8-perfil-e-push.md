# Etapa 8 (parte A): perfil completo e push no cliente — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar tudo da Etapa 8 que não depende da conta Expo/EAS nem do projeto Firebase (decisão D8, em aberto): o Perfil com push ligado/desligado, notificar por ativo, servidor configurado com teste de conexão, e o cliente de push (permissão, canal, token, `POST`/`DELETE /dispositivos`, toque que abre o ativo), tudo desligado com explicação no Expo Go, em simulador e sem `projectId`.

**Architecture:** Regras puras em `src/dominio/push.ts` (ambiente, destino do toque, texto de cada situação). `src/notificacoes/push.ts` é a única fronteira com `expo-notifications` (importado sob demanda: nada é carregado no Expo Go). Uma store Zustand (`src/store/push.ts`) guarda a situação efetiva do push; a preferência do usuário (`pushLigado`) fica em `usePreferencias`. Hooks ligam a store e os toques à sessão ativa; o Perfil só compõe componentes de apresentação.

**Tech Stack:** Expo SDK 57, `expo-notifications` ~57.0.22 e `expo-device` ~57.0.2 (instalados com `npx expo install`), TanStack Query 5, Zustand 5, Expo Router, Jest + React Native Testing Library 14.

**Spec:** `docs/PLANO.md` §7 (push), §8 (Etapa 8) e §9.5; `docs/MAPEAMENTO.md` §6.3 (roteiro do push e requisitos de ambiente) e linhas 32–33 dos endpoints (`POST`/`DELETE /dispositivos`); documentação do Expo SDK 57 (`expo-notifications`).

## Global Constraints

- Repositório `C:\Users\Bruno\Insight-flow-mobile`; branch `feature/etapa-8-perfil-push` a partir de `feature/etapa-7-analise-ia-chat` (PR #8 aberto). Não alterar backend, web nem desktop.
- **Fora desta parte (depende da D8):** `eas init` e `projectId`, chave FCM V1, `eas.json`, `expo-dev-client`, `expo-build-properties` e a build de desenvolvimento. Instalar `expo-dev-client` mudaria o `npx expo start` para development build e quebraria o fluxo atual com Expo Go; fica para depois da D8.
- Contrato do backend: `POST /dispositivos` com `{token}` (`ExponentPushToken[...]` ou `ExpoPushToken[...]`, até 255 caracteres) devolve `201` novo ou `200` já existia, `{token, ativo}`; token de outra conta passa para a atual; `422` "Token de push invalido". `DELETE /dispositivos?token=` (token codificado, tem colchetes) devolve `204`, idempotente. O push traz `data.notificacao_id`, `data.tipo` e `data.ativo_id` (nulo no resumo diário); o backend não manda `channelId`, então existe o canal Android `default`.
- Em primeiro plano o banner do sistema é suprimido (o WebSocket já entrega o banner in-app). Só se pede a permissão sozinho quando ela ainda não foi decidida (`undetermined`); depois de uma negação, só o interruptor do Perfil volta a pedir.
- No logout do usuário, `DELETE /dispositivos` vem **antes** de limpar a sessão (precisa do token de acesso) e nunca bloqueia a saída (limite de 4 s, erro ignorado).
- Nenhum texto de IA novo. Linguagem factual. Fronteiras do `CLAUDE.md`: `app/` só rotas; `src/components/` por props e sem hooks de dados; regras puras em `src/dominio/` com teste ao lado; cores só via `useTema()`; nunca `fontWeight`; alvo de toque ≥ 44 pt; ícones só via `Icone`; erros ao usuário só via `mensagemDeErro`.
- `npm run verificar` verde ao fim de cada tarefa; commits em pt-BR terminando com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` e `Claude-Session: https://claude.ai/code/session_01RRDxY4Beh38T5NvK5ajVZp`; PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)` e a linha da sessão; `gh`/`git push` com `GH_TOKEN="$(gh auth token --user brunoosouza09)"` exportado na mesma chamada. Sem merge e sem trocar a base dos PRs.

## Review Focus

1. **Logout:** o `DELETE /dispositivos` acontece com a sessão ainda válida, uma falha ou demora do servidor não impede sair, e a preferência do usuário (push ligado) não muda por causa do logout.
2. **Permissão negada, bloqueada ou revogada:** estado honesto ("negado"), sem pedir de novo a cada login, com saída para as configurações do sistema; ao voltar do sistema com a permissão liberada o push liga sem reabrir o app.
3. **Ambiente sem push:** Expo Go, simulador e ausência de `projectId` não quebram nada nem carregam `expo-notifications`; o Perfil explica o motivo.
4. **Falha ao registrar** (rede, 422 de token inválido, 5xx): erro visível com "Tentar novamente"; o app segue funcionando; nada repete sozinho em laço.
5. **Toque no push:** dados ausentes ou malformados não derrubam o app; abre o ativo (ou o detalhe, ou a caixa), marca como lida e não trata o mesmo toque duas vezes.
6. **Resultado tardio:** um registro que termina depois de o usuário sair (ou trocar de conta) não escreve estado nem registra o aparelho para a conta errada; um novo login sempre sincroniza (a execução antiga não "ocupa" a vez).
7. **Notificar por ativo e servidor:** a falha do `PATCH` volta o interruptor; "Testar conexão" distingue sem rede, tempo esgotado e erro do servidor.

---

### Task 1: Contrato, regras puras e teste de conexão

**Files:**
- Modify: `src/api/tipos.ts`, `src/config/ambiente.ts`
- Create: `src/api/dispositivos.ts`, `src/api/dispositivos.test.ts`, `src/api/saude.ts`, `src/api/saude.test.ts`, `src/dominio/push.ts`, `src/dominio/push.test.ts`, `src/config/servidor.test.ts`

**Interfaces:**
- Produces (Tarefas 2 a 4):
  - `DispositivoResponse { token: string; ativo: boolean }`
  - `dispositivosApi.registrar(token): Promise<DispositivoResponse>` e `dispositivosApi.remover(token): Promise<void>`
  - `testarConexao(baseUrl, timeoutMs?): Promise<ResultadoDaConexao>`
  - `avaliarAmbiente({ expoGo, aparelhoFisico, projectId }): Suporte`, `lerDadosDoPush(dados: unknown): DadosDoPush`, `destinoDoPush(dados): DestinoDoPush`, `descreverSituacao(situacao, motivo?): { titulo; detalhe }`
  - tipos `SituacaoDoPush`, `MotivoDeIndisponibilidade`, `Suporte`
  - `urlDoServidor(): string` (raiz validada do servidor)

- [ ] **Step 1: Criar a branch e escrever os testes (falham)**

```bash
cd /c/Users/Bruno/Insight-flow-mobile
git status --short
git switch -c feature/etapa-8-perfil-push feature/etapa-7-analise-ia-chat
npx expo install expo-notifications expo-device
```

(Se a branch já existir porque as dependências foram instaladas antes, só confirmar `git branch --show-current`.)

`src/api/dispositivos.test.ts`:

```ts
import { configurarApi } from '@/api/client';
import { dispositivosApi } from '@/api/dispositivos';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ token: 'x', ativo: true }) });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  configurarApi({
    baseUrl: 'http://api',
    obterToken: () => 'tok',
    tokenPertoDeVencer: () => false,
    renovarToken: jest.fn(async () => null),
    geracaoDaSessao: () => 0,
  });
});

it('registrar envia POST /dispositivos com o token', async () => {
  const resposta = await dispositivosApi.registrar('ExponentPushToken[abc]');
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('http://api/api/v1/dispositivos');
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body)).toEqual({ token: 'ExponentPushToken[abc]' });
  expect(resposta).toEqual({ token: 'x', ativo: true });
});

it('remover envia DELETE com o token codificado na query (os colchetes não vão crus)', async () => {
  fetchMock.mockResolvedValue({ ok: true, status: 204 });
  await dispositivosApi.remover('ExponentPushToken[abc]');
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('http://api/api/v1/dispositivos?token=ExponentPushToken%5Babc%5D');
  expect(init.method).toBe('DELETE');
});
```

`src/api/saude.test.ts`:

```ts
import { testarConexao } from '@/api/saude';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
});

it('servidor no ar: ok com o tempo da resposta, sem barra duplicada na URL', async () => {
  fetchMock.mockResolvedValue({ ok: true, status: 200 });
  const resultado = await testarConexao('http://192.168.0.247:8000/');
  expect(fetchMock.mock.calls[0][0]).toBe('http://192.168.0.247:8000/health');
  expect(resultado).toEqual({ ok: true, ms: expect.any(Number) });
});

it('erro do servidor devolve o status', async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 502 });
  expect(await testarConexao('http://api')).toEqual({ ok: false, motivo: 'servidor', status: 502 });
});

it('sem rede', async () => {
  fetchMock.mockRejectedValue(new TypeError('Network request failed'));
  expect(await testarConexao('http://api')).toEqual({ ok: false, motivo: 'rede' });
});

it('tempo esgotado aborta a chamada', async () => {
  jest.useFakeTimers();
  fetchMock.mockImplementation(
    (_url: string, init: { signal: AbortSignal }) =>
      new Promise((_resolver, rejeitar) => {
        init.signal.addEventListener('abort', () => rejeitar(new Error('abortada')));
      }),
  );
  const desfecho = jest.fn();
  void testarConexao('http://api', 5_000).then(desfecho);
  await jest.advanceTimersByTimeAsync(4_999);
  expect(desfecho).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(1);
  expect(desfecho).toHaveBeenCalledWith({ ok: false, motivo: 'tempo' });
});
```

`src/dominio/push.test.ts`:

```ts
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
```

`src/config/servidor.test.ts`:

```ts
import { URL_PADRAO_DA_API, urlDoServidor } from '@/config/ambiente';

const original = process.env.EXPO_PUBLIC_API_URL;

afterEach(() => {
  if (original === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = original;
});

it('devolve a raiz configurada, sem a barra final', () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://192.168.0.247:8000/';
  expect(urlDoServidor()).toBe('http://192.168.0.247:8000');
});

it('sem variável usa o padrão (simulador ou prévia no PC)', () => {
  delete process.env.EXPO_PUBLIC_API_URL;
  expect(urlDoServidor()).toBe(URL_PADRAO_DA_API);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/api/dispositivos.test.ts src/api/saude.test.ts src/dominio/push.test.ts src/config/servidor.test.ts`
Expected: FAIL (módulos e funções não existem).

- [ ] **Step 3: Implementar**

```edit:src/api/tipos.ts
<<<<
/** `GET /ativos/{id}/analise`. */
====
/** `POST /dispositivos`. */
export interface DispositivoResponse {
  token: string;
  ativo: boolean;
}

/** `GET /ativos/{id}/analise`. */
>>>>
```

`src/api/dispositivos.ts`:

```ts
import { request } from '@/api/client';
import type { DispositivoResponse } from '@/api/tipos';

export const dispositivosApi = {
  /** `201` aparelho novo, `200` já existia (e, se era de outra conta, passa para a atual). */
  registrar: (token: string) => request<DispositivoResponse>('/dispositivos', { metodo: 'POST', corpo: { token } }),
  /** Idempotente (`204`). O token tem colchetes: o client o codifica na query. */
  remover: (token: string) => request<void>('/dispositivos', { metodo: 'DELETE', query: { token } }),
};
```

`src/api/saude.ts`:

```ts
// Teste de conexão do Perfil: `/health` fica na raiz do servidor (fora de /api/v1) e não exige login.
export type ResultadoDaConexao =
  | { ok: true; ms: number }
  | { ok: false; motivo: 'rede' | 'tempo' | 'servidor'; status?: number };

export const TIMEOUT_DA_CONEXAO_MS = 5_000;

export async function testarConexao(baseUrl: string, timeoutMs: number = TIMEOUT_DA_CONEXAO_MS): Promise<ResultadoDaConexao> {
  const controlador = new AbortController();
  let esgotou = false;
  const temporizador = setTimeout(() => {
    esgotou = true;
    controlador.abort();
  }, timeoutMs);
  const inicio = Date.now();
  try {
    const resposta = await fetch(`${baseUrl.replace(/\/+$/, '')}/health`, { method: 'GET', signal: controlador.signal });
    if (!resposta.ok) return { ok: false, motivo: 'servidor', status: resposta.status };
    return { ok: true, ms: Date.now() - inicio };
  } catch {
    return { ok: false, motivo: esgotou ? 'tempo' : 'rede' };
  } finally {
    clearTimeout(temporizador);
  }
}
```

`src/dominio/push.ts`:

```ts
import type { Uuid } from '@/api/tipos';

export type MotivoDeIndisponibilidade = 'expo-go' | 'aparelho-fisico' | 'sem-projeto';

/** O que o aparelho está fazendo agora; a preferência do usuário (ligar/desligar) é outra coisa. */
export type SituacaoDoPush = 'verificando' | 'ligado' | 'desligado' | 'negado' | 'indisponivel' | 'erro';

export interface AmbienteDoPush {
  /** Rodando no Expo Go: ele não recebe push remoto (Android, desde o SDK 53). */
  expoGo: boolean;
  /** Falso em simulador e emulador. */
  aparelhoFisico: boolean;
  projectId: string | null;
}

export type Suporte = { suportado: true; projectId: string } | { suportado: false; motivo: MotivoDeIndisponibilidade };

export function avaliarAmbiente({ expoGo, aparelhoFisico, projectId }: AmbienteDoPush): Suporte {
  if (expoGo) return { suportado: false, motivo: 'expo-go' };
  if (!aparelhoFisico) return { suportado: false, motivo: 'aparelho-fisico' };
  if (!projectId) return { suportado: false, motivo: 'sem-projeto' };
  return { suportado: true, projectId };
}

/** `data` do push enviado pelo backend (MAPEAMENTO §6.3). */
export interface DadosDoPush {
  notificacao_id?: Uuid;
  tipo?: string;
  ativo_id?: Uuid;
}

function textoUtil(valor: unknown): string | undefined {
  if (typeof valor !== 'string') return undefined;
  const texto = valor.trim();
  return texto === '' ? undefined : texto;
}

/** O payload vem de fora do app: lê só o que reconhece e ignora o resto. */
export function lerDadosDoPush(dados: unknown): DadosDoPush {
  if (dados === null || typeof dados !== 'object' || Array.isArray(dados)) return {};
  const bruto = dados as Record<string, unknown>;
  const resultado: DadosDoPush = {};
  const notificacaoId = textoUtil(bruto.notificacao_id);
  const tipo = textoUtil(bruto.tipo);
  const ativoId = textoUtil(bruto.ativo_id);
  if (notificacaoId) resultado.notificacao_id = notificacaoId;
  if (tipo) resultado.tipo = tipo;
  if (ativoId) resultado.ativo_id = ativoId;
  return resultado;
}

export type DestinoDoPush =
  | { pathname: '/ativo/[id]' | '/notificacao/[id]'; params: { id: Uuid } }
  | { pathname: '/notificacoes' };

/** Sinal e alerta abrem o ativo; o resumo diário, o detalhe da notificação; sem dados, a caixa. */
export function destinoDoPush(dados: DadosDoPush): DestinoDoPush {
  if (dados.ativo_id) return { pathname: '/ativo/[id]', params: { id: dados.ativo_id } };
  if (dados.notificacao_id) return { pathname: '/notificacao/[id]', params: { id: dados.notificacao_id } };
  return { pathname: '/notificacoes' };
}

const DETALHE_INDISPONIVEL: Record<MotivoDeIndisponibilidade, string> = {
  'expo-go': 'O Expo Go não recebe push: é preciso uma development build do aplicativo. Os avisos seguem na caixa de notificações.',
  'aparelho-fisico': 'Simuladores e emuladores não recebem push: use um aparelho físico.',
  'sem-projeto': 'Falta configurar o projeto Expo (EAS) do aplicativo para registrar este aparelho.',
};

export function descreverSituacao(
  situacao: SituacaoDoPush,
  motivo?: MotivoDeIndisponibilidade | null,
): { titulo: string; detalhe: string } {
  switch (situacao) {
    case 'ligado':
      return {
        titulo: 'Ligadas neste aparelho',
        detalhe: 'Sinais, alertas e o resumo diário chegam mesmo com o aplicativo fechado.',
      };
    case 'desligado':
      return {
        titulo: 'Desligadas neste aparelho',
        detalhe: 'Os avisos continuam na caixa de notificações do aplicativo.',
      };
    case 'negado':
      return {
        titulo: 'Bloqueadas pelo sistema',
        detalhe: 'O sistema não deixa o InsightFlow enviar notificações. Libere nas configurações do aparelho.',
      };
    case 'verificando':
      return { titulo: 'Verificando', detalhe: 'Conferindo a permissão e registrando este aparelho.' };
    case 'erro':
      return {
        titulo: 'Não foi possível registrar este aparelho',
        detalhe: 'O servidor não confirmou o registro. Tente novamente.',
      };
    case 'indisponivel':
      return {
        titulo: 'Indisponíveis neste aparelho',
        detalhe: motivo ? DETALHE_INDISPONIVEL[motivo] : 'Este aparelho não recebe notificações push.',
      };
  }
}
```

```edit:src/config/ambiente.ts
<<<<
/** Endereço do WebSocket de notificações a partir da raiz do servidor: `http` vira `ws` e `https` vira `wss`. */
====
/** Raiz do servidor em uso, a mesma que o app usa nas chamadas (para mostrar no Perfil). */
export function urlDoServidor(): string {
  return lerUrlDaApi(process.env.EXPO_PUBLIC_API_URL);
}

/** Endereço do WebSocket de notificações a partir da raiz do servidor: `http` vira `ws` e `https` vira `wss`. */
>>>>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/api src/dominio/push.test.ts src/config`
Expected: PASS.

- [ ] **Step 5: Verificar e commitar**

```bash
npm run verificar
git add -A
git commit -m "feat(push): contrato de /dispositivos, regras do push e teste de conexão

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RRDxY4Beh38T5NvK5ajVZp"
```

---

### Task 2: Fronteira com `expo-notifications`

**Files:**
- Create: `src/notificacoes/push.ts`, `src/notificacoes/push.test.ts`

**Interfaces:**
- Consumes: `avaliarAmbiente`, `Suporte`.
- Produces (Tarefa 3):
  - `lerSuporte(): Suporte`
  - `prepararPush(projectId, { pedirPermissao }): Promise<Preparo>` com `Preparo = { estado: 'pronto'; token } | { estado: 'negado'; podePedirDeNovo }`
  - `configurarExibicaoEmPrimeiroPlano(): Promise<void>`
  - `observarToques(aoToque: (dados: unknown) => void): Promise<() => void>`
  - `observarMudancaDeToken(aoMudar: () => void): Promise<() => void>`

- [ ] **Step 1: Escrever os testes (falham)**

`src/notificacoes/push.test.ts`:

```ts
import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notificacoes from 'expo-notifications';
import { Platform } from 'react-native';

import {
  configurarExibicaoEmPrimeiroPlano,
  lerSuporte,
  observarMudancaDeToken,
  observarToques,
  prepararPush,
} from '@/notificacoes/push';

jest.mock('expo', () => ({ isRunningInExpoGo: jest.fn(() => false) }));
jest.mock('expo-device', () => ({ __esModule: true, isDevice: true }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'proj-1' } } }, easConfig: null },
}));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  addPushTokenListener: jest.fn(),
}));

const constantes = Constants as unknown as { expoConfig: unknown; easConfig: unknown };
const aparelho = Device as unknown as { isDevice: boolean };

function permissao(status: 'granted' | 'denied' | 'undetermined', canAskAgain = true) {
  return { status, granted: status === 'granted', canAskAgain, expires: 'never' };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(isRunningInExpoGo).mockReturnValue(false);
  aparelho.isDevice = true;
  constantes.expoConfig = { extra: { eas: { projectId: 'proj-1' } } };
  constantes.easConfig = null;
  jest.replaceProperty(Platform, 'OS', 'ios');
  jest.mocked(Notificacoes.getPermissionsAsync).mockResolvedValue(permissao('granted') as never);
  jest.mocked(Notificacoes.getExpoPushTokenAsync).mockResolvedValue({ type: 'expo', data: 'ExponentPushToken[abc]' });
});

describe('lerSuporte', () => {
  it('development build em aparelho físico com projectId', () => {
    expect(lerSuporte()).toEqual({ suportado: true, projectId: 'proj-1' });
  });

  it('projectId vem do easConfig quando não está no expoConfig', () => {
    constantes.expoConfig = { extra: {} };
    constantes.easConfig = { projectId: 'proj-eas' };
    expect(lerSuporte()).toEqual({ suportado: true, projectId: 'proj-eas' });
  });

  it('Expo Go', () => {
    jest.mocked(isRunningInExpoGo).mockReturnValue(true);
    expect(lerSuporte()).toEqual({ suportado: false, motivo: 'expo-go' });
  });

  it('simulador', () => {
    aparelho.isDevice = false;
    expect(lerSuporte()).toEqual({ suportado: false, motivo: 'aparelho-fisico' });
  });

  it('sem projectId', () => {
    constantes.expoConfig = { extra: {} };
    expect(lerSuporte()).toEqual({ suportado: false, motivo: 'sem-projeto' });
  });
});

describe('prepararPush', () => {
  it('permissão já concedida: devolve o token do projeto sem pedir nada', async () => {
    const resultado = await prepararPush('proj-1', { pedirPermissao: false });

    expect(resultado).toEqual({ estado: 'pronto', token: 'ExponentPushToken[abc]' });
    expect(Notificacoes.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notificacoes.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'proj-1' });
  });

  it('Android cria o canal default antes de pedir a permissão (exigência do Android 13+)', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.mocked(Notificacoes.getPermissionsAsync).mockResolvedValue(permissao('undetermined') as never);
    jest.mocked(Notificacoes.requestPermissionsAsync).mockResolvedValue(permissao('granted') as never);

    await prepararPush('proj-1', { pedirPermissao: false });

    expect(Notificacoes.setNotificationChannelAsync).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({ importance: 4 }),
    );
    const canal = jest.mocked(Notificacoes.setNotificationChannelAsync).mock.invocationCallOrder[0];
    const pedido = jest.mocked(Notificacoes.requestPermissionsAsync).mock.invocationCallOrder[0];
    expect(canal).toBeLessThan(pedido);
  });

  it('iOS não cria canal', async () => {
    await prepararPush('proj-1', { pedirPermissao: false });
    expect(Notificacoes.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it('permissão ainda não decidida: pede sozinho, mesmo sem o usuário ter pedido', async () => {
    jest.mocked(Notificacoes.getPermissionsAsync).mockResolvedValue(permissao('undetermined') as never);
    jest.mocked(Notificacoes.requestPermissionsAsync).mockResolvedValue(permissao('granted') as never);

    const resultado = await prepararPush('proj-1', { pedirPermissao: false });

    expect(Notificacoes.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(resultado.estado).toBe('pronto');
  });

  it('negada antes: não pede de novo a cada login', async () => {
    jest.mocked(Notificacoes.getPermissionsAsync).mockResolvedValue(permissao('denied', true) as never);

    const resultado = await prepararPush('proj-1', { pedirPermissao: false });

    expect(Notificacoes.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notificacoes.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(resultado).toEqual({ estado: 'negado', podePedirDeNovo: true });
  });

  it('negada antes, mas o usuário pediu no Perfil: pede de novo', async () => {
    jest.mocked(Notificacoes.getPermissionsAsync).mockResolvedValue(permissao('denied', true) as never);
    jest.mocked(Notificacoes.requestPermissionsAsync).mockResolvedValue(permissao('granted') as never);

    const resultado = await prepararPush('proj-1', { pedirPermissao: true });

    expect(Notificacoes.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(resultado.estado).toBe('pronto');
  });

  it('bloqueada de vez (não pode perguntar): fica negado sem tentar', async () => {
    jest.mocked(Notificacoes.getPermissionsAsync).mockResolvedValue(permissao('denied', false) as never);

    const resultado = await prepararPush('proj-1', { pedirPermissao: true });

    expect(Notificacoes.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(resultado).toEqual({ estado: 'negado', podePedirDeNovo: false });
  });

  it('o usuário nega no diálogo do sistema', async () => {
    jest.mocked(Notificacoes.getPermissionsAsync).mockResolvedValue(permissao('undetermined') as never);
    jest.mocked(Notificacoes.requestPermissionsAsync).mockResolvedValue(permissao('denied', false) as never);

    const resultado = await prepararPush('proj-1', { pedirPermissao: false });

    expect(resultado).toEqual({ estado: 'negado', podePedirDeNovo: false });
    expect(Notificacoes.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('falha ao obter o token propaga o erro (quem chama mostra "tentar novamente")', async () => {
    jest.mocked(Notificacoes.getExpoPushTokenAsync).mockRejectedValue(new Error('offline'));
    await expect(prepararPush('proj-1', { pedirPermissao: false })).rejects.toThrow('offline');
  });
});

describe('configurarExibicaoEmPrimeiroPlano', () => {
  it('suprime o banner do sistema: o WebSocket já mostra o banner do aplicativo', async () => {
    await configurarExibicaoEmPrimeiroPlano();

    const { handleNotification } = jest.mocked(Notificacoes.setNotificationHandler).mock.calls[0][0] as unknown as {
      handleNotification: () => Promise<Record<string, boolean>>;
    };
    expect(await handleNotification()).toEqual({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    });
  });
});

describe('observarToques', () => {
  const resposta = (identificador: string, dados: unknown) => ({
    notification: { request: { identifier: identificador, content: { data: dados } } },
  });

  it('entrega os dados do push tocado e cancela a assinatura', async () => {
    const remover = jest.fn();
    let ouvinte: (r: unknown) => void = () => {};
    jest.mocked(Notificacoes.addNotificationResponseReceivedListener).mockImplementation(((fn: (r: unknown) => void) => {
      ouvinte = fn;
      return { remove: remover };
    }) as never);
    const aoToque = jest.fn();

    const cancelar = await observarToques(aoToque);
    ouvinte(resposta('p-1', { notificacao_id: 'n-1', ativo_id: 'a-1' }));

    expect(aoToque).toHaveBeenCalledWith({ notificacao_id: 'n-1', ativo_id: 'a-1' });
    cancelar();
    expect(remover).toHaveBeenCalledTimes(1);
  });

  it('o toque que abriu o app (partida a frio) é tratado uma vez só', async () => {
    jest.mocked(Notificacoes.addNotificationResponseReceivedListener).mockReturnValue({ remove: jest.fn() } as never);
    jest
      .mocked(Notificacoes.getLastNotificationResponseAsync)
      .mockResolvedValue(resposta('p-frio', { notificacao_id: 'n-9' }) as never);
    const aoToque = jest.fn();

    await observarToques(aoToque);
    await observarToques(aoToque);

    expect(aoToque).toHaveBeenCalledTimes(1);
    expect(aoToque).toHaveBeenCalledWith({ notificacao_id: 'n-9' });
  });

  it('em ambiente sem push não carrega nem assina nada', async () => {
    jest.mocked(isRunningInExpoGo).mockReturnValue(true);

    const cancelar = await observarToques(jest.fn());
    cancelar();

    expect(Notificacoes.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
    expect(Notificacoes.getLastNotificationResponseAsync).not.toHaveBeenCalled();
  });
});

describe('observarMudancaDeToken', () => {
  it('avisa quando o token do aparelho muda', async () => {
    let ouvinte: () => void = () => {};
    const remover = jest.fn();
    jest.mocked(Notificacoes.addPushTokenListener).mockImplementation(((fn: () => void) => {
      ouvinte = fn;
      return { remove: remover };
    }) as never);
    const aoMudar = jest.fn();

    const cancelar = await observarMudancaDeToken(aoMudar);
    ouvinte();

    expect(aoMudar).toHaveBeenCalledTimes(1);
    cancelar();
    expect(remover).toHaveBeenCalledTimes(1);
  });

  it('em ambiente sem push não assina', async () => {
    aparelho.isDevice = false;
    const cancelar = await observarMudancaDeToken(jest.fn());
    cancelar();
    expect(Notificacoes.addPushTokenListener).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/notificacoes/push.test.ts`
Expected: FAIL (`@/notificacoes/push` não existe).

- [ ] **Step 3: Implementar**

`src/notificacoes/push.ts`:

```ts
import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import type { NotificationResponse } from 'expo-notifications';
import { Platform } from 'react-native';

import { avaliarAmbiente, type Suporte } from '@/dominio/push';

// Única fronteira com `expo-notifications`. O módulo só é carregado (require sob demanda) em ambiente que recebe
// push: no Expo Go ele registra avisos de erro e nada funcionaria mesmo.

const CANAL_PADRAO = 'default';

export function lerSuporte(): Suporte {
  const configurado = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  return avaliarAmbiente({
    expoGo: isRunningInExpoGo(),
    aparelhoFisico: Device.isDevice,
    projectId: typeof configurado === 'string' && configurado.trim() !== '' ? configurado.trim() : null,
  });
}

function carregar() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga sob demanda: nada de expo-notifications no Expo Go
  return require('expo-notifications') as typeof import('expo-notifications');
}

export type Preparo = { estado: 'pronto'; token: string } | { estado: 'negado'; podePedirDeNovo: boolean };

/**
 * Canal Android, permissão e token do Expo. A permissão só é pedida quando ainda não foi decidida
 * (`undetermined`) ou quando o usuário pediu no Perfil (`pedirPermissao`): depois de uma negação, o login não pergunta
 * de novo. Falhas de rede ao obter o token propagam: quem chama mostra o erro.
 */
export async function prepararPush(projectId: string, { pedirPermissao }: { pedirPermissao: boolean }): Promise<Preparo> {
  const Notificacoes = await carregar();
  if (Platform.OS === 'android') {
    // O backend não manda `channelId`: sem o canal `default` o Android usa um canal genérico. No Android 13+ o canal
    // precisa existir antes do pedido de permissão, ou o diálogo não aparece.
    await Notificacoes.setNotificationChannelAsync(CANAL_PADRAO, {
      name: 'Avisos do InsightFlow',
      importance: Notificacoes.AndroidImportance.HIGH,
    });
  }

  let permissao = await Notificacoes.getPermissionsAsync();
  const naoDecidida = permissao.status === 'undetermined';
  if (!permissao.granted && permissao.canAskAgain && (naoDecidida || pedirPermissao)) {
    permissao = await Notificacoes.requestPermissionsAsync();
  }
  if (!permissao.granted) return { estado: 'negado', podePedirDeNovo: permissao.canAskAgain };

  const { data } = await Notificacoes.getExpoPushTokenAsync({ projectId });
  return { estado: 'pronto', token: data };
}

/** Com o app aberto o WebSocket já mostra o banner do aplicativo: o do sistema fica suprimido. */
export async function configurarExibicaoEmPrimeiroPlano(): Promise<void> {
  if (!lerSuporte().suportado) return;
  const Notificacoes = await carregar();
  Notificacoes.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

const SEM_ASSINATURA = () => {};
// O toque que abriu o app (partida a frio) continua disponível enquanto o processo vive: não repetir a navegação.
const toquesTratados = new Set<string>();

/** Assina os toques em notificações do sistema e entrega o `data` de cada um. Devolve a função que cancela. */
export async function observarToques(aoToque: (dados: unknown) => void): Promise<() => void> {
  if (!lerSuporte().suportado) return SEM_ASSINATURA;
  const Notificacoes = await carregar();

  function tratar(resposta: NotificationResponse) {
    const identificador = resposta.notification.request.identifier;
    if (toquesTratados.has(identificador)) return;
    toquesTratados.add(identificador);
    aoToque(resposta.notification.request.content.data);
  }

  const assinatura = Notificacoes.addNotificationResponseReceivedListener(tratar);
  const inicial = await Notificacoes.getLastNotificationResponseAsync();
  if (inicial) tratar(inicial);
  return () => assinatura.remove();
}

/** Avisa quando o token do aparelho muda (o app registra de novo no backend). */
export async function observarMudancaDeToken(aoMudar: () => void): Promise<() => void> {
  if (!lerSuporte().suportado) return SEM_ASSINATURA;
  const Notificacoes = await carregar();
  const assinatura = Notificacoes.addPushTokenListener(() => aoMudar());
  return () => assinatura.remove();
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/notificacoes/push.test.ts`
Expected: PASS.

- [ ] **Step 5: Verificar e commitar**

```bash
npm run verificar
git add -A
git commit -m "feat(push): fronteira com expo-notifications (canal, permissão, token, toques)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RRDxY4Beh38T5NvK5ajVZp"
```

---

### Task 3: Store do push, preferência e ligação à sessão

**Files:**
- Modify: `src/store/preferencias.ts`, `app/_layout.tsx`
- Create: `src/store/push.ts`, `src/store/push.test.ts`, `src/store/preferenciasPush.test.ts`, `src/hooks/usePush.ts`, `src/hooks/usePush.test.tsx`, `src/hooks/useSessaoAtiva.ts`, `src/hooks/useSessaoAtiva.test.tsx`

**Interfaces:**
- Consumes: `dispositivosApi`, `lerSuporte`, `prepararPush`, `configurarExibicaoEmPrimeiroPlano`, `observarToques`, `observarMudancaDeToken`, `lerDadosDoPush`, `destinoDoPush`, `useMarcarLida`.
- Produces (Tarefa 4): `usePreferencias().pushLigado` e `definirPushLigado(ligado)`; `usePush` (store) com `situacao`, `motivo`, `token`, `erro`, `sincronizar(opcoes?)`, `ligar()`, `desligar()`, `desregistrar()`, `reiniciar()`; `useSincronizarPush()`, `useToquesDoPush()`, `useSessaoAtiva(urlDoWebSocket)`.

- [ ] **Step 1: Escrever os testes (falham)**

`src/store/preferenciasPush.test.ts`:

```ts
import * as SecureStore from 'expo-secure-store';

import { usePreferencias } from '@/store/preferencias';

const armazenamento = (SecureStore as unknown as { __armazenamento: Map<string, string> }).__armazenamento;

beforeEach(() => {
  armazenamento.clear();
  usePreferencias.setState({ tema: 'escuro', pushLigado: true, hidratado: false });
});

it('o push começa ligado', () => {
  expect(usePreferencias.getState().pushLigado).toBe(true);
});

it('desligar persiste e sobrevive à hidratação', async () => {
  await usePreferencias.getState().definirPushLigado(false);
  expect(armazenamento.get('insightflow.push')).toBe('0');

  usePreferencias.setState({ pushLigado: true });
  await usePreferencias.getState().hidratar();

  expect(usePreferencias.getState().pushLigado).toBe(false);
});

it('ligar persiste', async () => {
  armazenamento.set('insightflow.push', '0');
  await usePreferencias.getState().definirPushLigado(true);
  expect(armazenamento.get('insightflow.push')).toBe('1');
});

it('sem valor guardado a hidratação mantém ligado e o tema', async () => {
  armazenamento.set('insightflow.tema', 'claro');
  await usePreferencias.getState().hidratar();
  expect(usePreferencias.getState()).toMatchObject({ tema: 'claro', pushLigado: true, hidratado: true });
});

it('falha de gravação não derruba: a escolha vale nesta sessão', async () => {
  jest.spyOn(SecureStore, 'setItemAsync').mockRejectedValueOnce(new Error('falha'));
  await usePreferencias.getState().definirPushLigado(false);
  expect(usePreferencias.getState().pushLigado).toBe(false);
});
```

`src/store/push.test.ts`:

```ts
import * as SecureStore from 'expo-secure-store';

import { ApiError } from '@/api/client';
import { dispositivosApi } from '@/api/dispositivos';
import { lerSuporte, prepararPush } from '@/notificacoes/push';
import { usePreferencias } from '@/store/preferencias';
import { usePush } from '@/store/push';
import { useSessao } from '@/store/sessao';

jest.mock('@/api/dispositivos', () => ({ dispositivosApi: { registrar: jest.fn(), remover: jest.fn() } }));
jest.mock('@/api/auth', () => ({ authApi: { sair: jest.fn(async () => undefined), renovar: jest.fn() } }));
jest.mock('@/notificacoes/push', () => ({
  lerSuporte: jest.fn(),
  prepararPush: jest.fn(),
  configurarExibicaoEmPrimeiroPlano: jest.fn(async () => undefined),
}));

const armazenamento = (SecureStore as unknown as { __armazenamento: Map<string, string> }).__armazenamento;
const SUPORTADO = { suportado: true, projectId: 'proj-1' } as const;

function pendente<T>() {
  let resolver: (valor: T) => void = () => {};
  const promessa = new Promise<T>((ok) => {
    resolver = ok;
  });
  return { promessa, resolver };
}

beforeEach(async () => {
  jest.clearAllMocks();
  armazenamento.clear();
  usePreferencias.setState({ pushLigado: true });
  useSessao.setState({ status: 'autenticado', token: 'tok', refreshToken: 'ref', expiraEm: null, email: 'a@b.c' });
  usePush.getState().reiniciar();
  jest.mocked(lerSuporte).mockReturnValue(SUPORTADO);
  jest.mocked(prepararPush).mockResolvedValue({ estado: 'pronto', token: 'ExponentPushToken[abc]' });
  jest.mocked(dispositivosApi.registrar).mockResolvedValue({ token: 'ExponentPushToken[abc]', ativo: true });
  jest.mocked(dispositivosApi.remover).mockResolvedValue(undefined);
});

describe('sincronizar', () => {
  it('registra o aparelho e fica ligado', async () => {
    await usePush.getState().sincronizar();

    expect(prepararPush).toHaveBeenCalledWith('proj-1', { pedirPermissao: false });
    expect(dispositivosApi.registrar).toHaveBeenCalledWith('ExponentPushToken[abc]');
    expect(usePush.getState()).toMatchObject({ situacao: 'ligado', token: 'ExponentPushToken[abc]', erro: null });
  });

  it.each([
    ['expo-go' as const],
    ['aparelho-fisico' as const],
    ['sem-projeto' as const],
  ])('ambiente sem push (%s): indisponível, sem tocar em permissão nem em rede', async (motivo) => {
    jest.mocked(lerSuporte).mockReturnValue({ suportado: false, motivo });

    await usePush.getState().sincronizar();

    expect(usePush.getState()).toMatchObject({ situacao: 'indisponivel', motivo });
    expect(prepararPush).not.toHaveBeenCalled();
    expect(dispositivosApi.registrar).not.toHaveBeenCalled();
  });

  it('preferência desligada: não registra', async () => {
    usePreferencias.setState({ pushLigado: false });

    await usePush.getState().sincronizar();

    expect(usePush.getState().situacao).toBe('desligado');
    expect(prepararPush).not.toHaveBeenCalled();
  });

  it('permissão negada: fica negado e não registra', async () => {
    jest.mocked(prepararPush).mockResolvedValue({ estado: 'negado', podePedirDeNovo: false });

    await usePush.getState().sincronizar();

    expect(usePush.getState().situacao).toBe('negado');
    expect(dispositivosApi.registrar).not.toHaveBeenCalled();
  });

  it('o servidor recusa o token: erro visível, e dá para tentar de novo', async () => {
    const erro = new ApiError(422, 'Token de push invalido');
    jest.mocked(dispositivosApi.registrar).mockRejectedValueOnce(erro);

    await usePush.getState().sincronizar();
    expect(usePush.getState()).toMatchObject({ situacao: 'erro', erro });

    await usePush.getState().sincronizar();
    expect(usePush.getState()).toMatchObject({ situacao: 'ligado', erro: null });
    expect(dispositivosApi.registrar).toHaveBeenCalledTimes(2);
  });

  it('falha ao obter o token também vira erro (nada quebra)', async () => {
    jest.mocked(prepararPush).mockRejectedValueOnce(new Error('offline'));
    await usePush.getState().sincronizar();
    expect(usePush.getState().situacao).toBe('erro');
  });

  it('chamadas simultâneas compartilham a mesma execução', async () => {
    const espera = pendente<{ estado: 'pronto'; token: string }>();
    jest.mocked(prepararPush).mockReturnValue(espera.promessa);

    const a = usePush.getState().sincronizar();
    const b = usePush.getState().sincronizar();
    espera.resolver({ estado: 'pronto', token: 'ExponentPushToken[abc]' });
    await Promise.all([a, b]);

    expect(prepararPush).toHaveBeenCalledTimes(1);
    expect(dispositivosApi.registrar).toHaveBeenCalledTimes(1);
  });
});

describe('resultado tardio e novo login', () => {
  it('um registro que termina depois do logout não escreve estado', async () => {
    const espera = pendente<{ estado: 'pronto'; token: string }>();
    jest.mocked(prepararPush).mockReturnValue(espera.promessa);
    const execucao = usePush.getState().sincronizar();

    await useSessao.getState().sair({ revogarNoServidor: false });
    espera.resolver({ estado: 'pronto', token: 'ExponentPushToken[velho]' });
    await execucao;

    expect(dispositivosApi.registrar).not.toHaveBeenCalled();
    expect(usePush.getState()).toMatchObject({ situacao: 'verificando', token: null });
  });

  it('o login seguinte sincroniza mesmo com a execução antiga ainda pendente', async () => {
    const velha = pendente<{ estado: 'pronto'; token: string }>();
    jest.mocked(prepararPush).mockReturnValueOnce(velha.promessa);
    const execucaoVelha = usePush.getState().sincronizar();
    await useSessao.getState().sair({ revogarNoServidor: false });

    useSessao.setState({ status: 'autenticado', token: 'tok2', refreshToken: 'ref2', expiraEm: null, email: 'b@b.c' });
    jest.mocked(prepararPush).mockResolvedValueOnce({ estado: 'pronto', token: 'ExponentPushToken[novo]' });
    await usePush.getState().sincronizar();
    velha.resolver({ estado: 'pronto', token: 'ExponentPushToken[velho]' });
    await execucaoVelha;

    expect(dispositivosApi.registrar).toHaveBeenCalledTimes(1);
    expect(dispositivosApi.registrar).toHaveBeenCalledWith('ExponentPushToken[novo]');
    expect(usePush.getState()).toMatchObject({ situacao: 'ligado', token: 'ExponentPushToken[novo]' });
  });
});

describe('ligar e desligar', () => {
  it('ligar grava a preferência e pede a permissão (pedido explícito do usuário)', async () => {
    usePreferencias.setState({ pushLigado: false });

    await usePush.getState().ligar();

    expect(usePreferencias.getState().pushLigado).toBe(true);
    expect(armazenamento.get('insightflow.push')).toBe('1');
    expect(prepararPush).toHaveBeenCalledWith('proj-1', { pedirPermissao: true });
    expect(usePush.getState().situacao).toBe('ligado');
  });

  it('desligar remove o aparelho do backend e grava a preferência', async () => {
    await usePush.getState().sincronizar();

    await usePush.getState().desligar();

    expect(dispositivosApi.remover).toHaveBeenCalledWith('ExponentPushToken[abc]');
    expect(usePreferencias.getState().pushLigado).toBe(false);
    expect(armazenamento.get('insightflow.push')).toBe('0');
    expect(usePush.getState()).toMatchObject({ situacao: 'desligado', token: null });
  });

  it('desligar vale mesmo que o servidor não responda', async () => {
    await usePush.getState().sincronizar();
    jest.mocked(dispositivosApi.remover).mockRejectedValue(new ApiError(0, 'Sem conexão', { causa: 'rede' }));

    await expect(usePush.getState().desligar()).resolves.toBeUndefined();

    expect(usePush.getState().situacao).toBe('desligado');
  });
});

describe('desregistrar (antes do logout)', () => {
  it('remove o aparelho sem mexer na preferência', async () => {
    await usePush.getState().sincronizar();

    await usePush.getState().desregistrar();

    expect(dispositivosApi.remover).toHaveBeenCalledWith('ExponentPushToken[abc]');
    expect(usePreferencias.getState().pushLigado).toBe(true);
  });

  it('sem token conhecido não chama o servidor', async () => {
    await usePush.getState().desregistrar();
    expect(dispositivosApi.remover).not.toHaveBeenCalled();
  });

  it('erro do servidor é engolido: sair não pode travar por isso', async () => {
    await usePush.getState().sincronizar();
    jest.mocked(dispositivosApi.remover).mockRejectedValue(new ApiError(500, 'Erro 500'));
    await expect(usePush.getState().desregistrar()).resolves.toBeUndefined();
  });
});

it('sair da conta reinicia a situação e esquece o token', async () => {
  await usePush.getState().sincronizar();
  expect(usePush.getState().token).not.toBeNull();

  await useSessao.getState().sair({ revogarNoServidor: false });

  expect(usePush.getState()).toMatchObject({ situacao: 'verificando', token: null, erro: null });
});
```

`src/hooks/usePush.test.tsx`:

```tsx
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AppState } from 'react-native';

import { notificacoesApi } from '@/api/notificacoes';
import { useSincronizarPush, useToquesDoPush } from '@/hooks/usePush';
import { observarMudancaDeToken, observarToques } from '@/notificacoes/push';
import { usePush } from '@/store/push';
import { criarProvedor } from '@/test/renderizar';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));
jest.mock('@/notificacoes/push', () => ({
  lerSuporte: jest.fn(() => ({ suportado: false, motivo: 'expo-go' })),
  prepararPush: jest.fn(),
  configurarExibicaoEmPrimeiroPlano: jest.fn(async () => undefined),
  observarToques: jest.fn(),
  observarMudancaDeToken: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  usePush.getState().reiniciar();
  jest.mocked(observarToques).mockResolvedValue(() => {});
  jest.mocked(observarMudancaDeToken).mockResolvedValue(() => {});
  jest.mocked(notificacoesApi.marcarComoLida).mockResolvedValue({} as never);
});

describe('useSincronizarPush', () => {
  it('sincroniza ao montar e cancela as assinaturas ao desmontar', async () => {
    const sincronizar = jest.spyOn(usePush.getState(), 'sincronizar').mockResolvedValue();
    const cancelarToken = jest.fn();
    jest.mocked(observarMudancaDeToken).mockResolvedValue(cancelarToken);

    const { unmount } = await renderHook(() => useSincronizarPush());
    await waitFor(() => expect(observarMudancaDeToken).toHaveBeenCalled());

    expect(sincronizar).toHaveBeenCalledTimes(1);
    await unmount();
    await waitFor(() => expect(cancelarToken).toHaveBeenCalledTimes(1));
  });

  it('o token que muda sincroniza de novo', async () => {
    const sincronizar = jest.spyOn(usePush.getState(), 'sincronizar').mockResolvedValue();
    let aoMudar: () => void = () => {};
    jest.mocked(observarMudancaDeToken).mockImplementation(async (fn) => {
      aoMudar = fn;
      return () => {};
    });

    await renderHook(() => useSincronizarPush());
    await waitFor(() => expect(observarMudancaDeToken).toHaveBeenCalled());
    aoMudar();

    expect(sincronizar).toHaveBeenCalledTimes(2);
  });

  it('voltar ao primeiro plano com o push negado ou com erro tenta de novo (permissão liberada nas configurações)', async () => {
    const sincronizar = jest.spyOn(usePush.getState(), 'sincronizar').mockResolvedValue();
    let aoMudarEstado: (estado: string) => void = () => {};
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_tipo: string, fn: (estado: string) => void) => {
      aoMudarEstado = fn;
      return { remove: jest.fn() };
    }) as never);
    usePush.setState({ situacao: 'negado' });

    await renderHook(() => useSincronizarPush());
    await waitFor(() => expect(observarMudancaDeToken).toHaveBeenCalled());
    sincronizar.mockClear();
    await act(async () => {
      aoMudarEstado('active');
    });

    expect(sincronizar).toHaveBeenCalledTimes(1);
  });

  it('voltar ao primeiro plano com o push ligado não refaz o registro', async () => {
    const sincronizar = jest.spyOn(usePush.getState(), 'sincronizar').mockResolvedValue();
    let aoMudarEstado: (estado: string) => void = () => {};
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_tipo: string, fn: (estado: string) => void) => {
      aoMudarEstado = fn;
      return { remove: jest.fn() };
    }) as never);
    usePush.setState({ situacao: 'ligado' });

    await renderHook(() => useSincronizarPush());
    await waitFor(() => expect(observarMudancaDeToken).toHaveBeenCalled());
    sincronizar.mockClear();
    await act(async () => {
      aoMudarEstado('active');
    });

    expect(sincronizar).not.toHaveBeenCalled();
  });
});

describe('useToquesDoPush', () => {
  async function montar() {
    let aoToque: (dados: unknown) => void = () => {};
    jest.mocked(observarToques).mockImplementation(async (fn) => {
      aoToque = fn;
      return () => {};
    });
    await renderHook(() => useToquesDoPush(), { wrapper: criarProvedor() });
    await waitFor(() => expect(observarToques).toHaveBeenCalled());
    return (dados: unknown) =>
      act(async () => {
        aoToque(dados);
      });
  }

  it('toque de sinal ou alerta abre o ativo e marca a notificação como lida', async () => {
    const tocar = await montar();

    await tocar({ notificacao_id: 'n-1', tipo: 'ALERTA_DISPARADO', ativo_id: 'a-1' });

    expect(router.push).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1' } });
    await waitFor(() => expect(notificacoesApi.marcarComoLida).toHaveBeenCalledWith('n-1'));
  });

  it('resumo diário abre o detalhe da notificação', async () => {
    const tocar = await montar();

    await tocar({ notificacao_id: 'n-2', tipo: 'RESUMO_DIARIO', ativo_id: null });

    expect(router.push).toHaveBeenCalledWith({ pathname: '/notificacao/[id]', params: { id: 'n-2' } });
  });

  it('dados ausentes ou malformados levam à caixa, sem erro', async () => {
    const tocar = await montar();

    await tocar(undefined);

    expect(router.push).toHaveBeenCalledWith({ pathname: '/notificacoes' });
    expect(notificacoesApi.marcarComoLida).not.toHaveBeenCalled();
  });

  it('navegação que falha não derruba o app', async () => {
    jest.mocked(router.push).mockImplementationOnce(() => {
      throw new Error('navegação ainda não montada');
    });
    const tocar = await montar();

    await expect(tocar({ notificacao_id: 'n-3', ativo_id: 'a-3' })).resolves.not.toThrow();
  });
});
```

`src/hooks/useSessaoAtiva.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react-native';

import { useBannerNotificacao } from '@/hooks/useBannerNotificacao';
import { useSincronizarPush, useToquesDoPush } from '@/hooks/usePush';
import { useSessaoAtiva } from '@/hooks/useSessaoAtiva';
import { useTempoReal } from '@/hooks/useTempoReal';

jest.mock('@/hooks/useTempoReal', () => ({ useTempoReal: jest.fn() }));
jest.mock('@/hooks/usePush', () => ({ useSincronizarPush: jest.fn(), useToquesDoPush: jest.fn() }));
jest.mock('@/hooks/useBannerNotificacao', () => ({
  useBannerNotificacao: jest.fn(() => ({ banner: null, aoPressionar: jest.fn(), aoDispensar: jest.fn() })),
}));

it('liga o tempo real, o registro do push e os toques à sessão ativa e devolve o banner', async () => {
  const banner = { titulo: 'Alerta de preço · PETR4', mensagem: 'PETR4 atingiu o alvo' };
  const aoPressionar = jest.fn();
  const aoDispensar = jest.fn();
  jest.mocked(useBannerNotificacao).mockReturnValue({ banner, aoPressionar, aoDispensar });

  const { result } = await renderHook(() => useSessaoAtiva('ws://servidor/api/v1/notificacoes/ws'));

  expect(useTempoReal).toHaveBeenCalledWith('ws://servidor/api/v1/notificacoes/ws');
  expect(useSincronizarPush).toHaveBeenCalled();
  expect(useToquesDoPush).toHaveBeenCalled();
  expect(result.current).toEqual({ banner, aoPressionar, aoDispensar });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/store/preferenciasPush.test.ts src/store/push.test.ts src/hooks/usePush.test.tsx src/hooks/useSessaoAtiva.test.tsx`
Expected: FAIL (store, hooks e preferência não existem).

- [ ] **Step 3: Implementar**

```edit:src/store/preferencias.ts
<<<<
const CHAVE_TEMA = 'insightflow.tema';
====
const CHAVE_TEMA = 'insightflow.tema';
const CHAVE_PUSH = 'insightflow.push';
>>>>
<<<<
interface EstadoPreferencias {
  tema: EsquemaTema;
  hidratado: boolean;
  hidratar: () => Promise<void>;
  definirTema: (tema: EsquemaTema) => Promise<void>;
}
====
interface EstadoPreferencias {
  tema: EsquemaTema;
  /** Vontade do usuário de receber push neste aparelho (o que o aparelho consegue fazer é `usePush`). */
  pushLigado: boolean;
  hidratado: boolean;
  hidratar: () => Promise<void>;
  definirTema: (tema: EsquemaTema) => Promise<void>;
  definirPushLigado: (ligado: boolean) => Promise<void>;
}
>>>>
<<<<
  tema: TEMA_PADRAO,
  hidratado: false,

  hidratar: async () => {
    try {
      const salvo = await SecureStore.getItemAsync(CHAVE_TEMA);
      set({ tema: salvo === 'claro' ? 'claro' : TEMA_PADRAO, hidratado: true });
    } catch {
      // Sem leitura, o app abre no tema padrão em vez de travar na splash.
      set({ tema: TEMA_PADRAO, hidratado: true });
    }
  },
====
  tema: TEMA_PADRAO,
  pushLigado: true,
  hidratado: false,

  hidratar: async () => {
    try {
      const [tema, push] = await Promise.all([SecureStore.getItemAsync(CHAVE_TEMA), SecureStore.getItemAsync(CHAVE_PUSH)]);
      set({ tema: tema === 'claro' ? 'claro' : TEMA_PADRAO, pushLigado: push !== '0', hidratado: true });
    } catch {
      // Sem leitura, o app abre no tema padrão em vez de travar na splash.
      set({ tema: TEMA_PADRAO, pushLigado: true, hidratado: true });
    }
  },

  definirPushLigado: async (ligado) => {
    set({ pushLigado: ligado });
    try {
      await SecureStore.setItemAsync(CHAVE_PUSH, ligado ? '1' : '0');
    } catch {
      // A escolha vale nesta sessão mesmo que não persista.
    }
  },
>>>>
```

`src/store/push.ts`:

```ts
import { create } from 'zustand';

import { dispositivosApi } from '@/api/dispositivos';
import type { MotivoDeIndisponibilidade, SituacaoDoPush } from '@/dominio/push';
import { configurarExibicaoEmPrimeiroPlano, lerSuporte, prepararPush } from '@/notificacoes/push';
import { usePreferencias } from '@/store/preferencias';
import { geracaoDaSessao, useSessao } from '@/store/sessao';

interface EstadoPush {
  situacao: SituacaoDoPush;
  motivo: MotivoDeIndisponibilidade | null;
  /** Token Expo registrado nesta sessão; necessário para remover o aparelho. */
  token: string | null;
  /** Erro do último registro (`situacao: 'erro'`). */
  erro: unknown;
  /** `pedirPermissao: true` só quando o usuário acabou de ligar o push no Perfil. */
  sincronizar: (opcoes?: { pedirPermissao?: boolean }) => Promise<void>;
  ligar: () => Promise<void>;
  desligar: () => Promise<void>;
  /** Remove o aparelho do backend sem mexer na preferência (usado antes do logout). Nunca rejeita. */
  desregistrar: () => Promise<void>;
  reiniciar: () => void;
}

const INICIAL = { situacao: 'verificando', motivo: null, token: null, erro: null } as const;

// Uma execução por sessão: a de uma sessão anterior que ainda não terminou não pode ocupar a vez da seguinte.
let emAndamento: { geracao: number; promessa: Promise<void> } | null = null;

export const usePush = create<EstadoPush>()((set, get) => ({
  ...INICIAL,

  sincronizar: (opcoes = {}) => {
    const geracao = geracaoDaSessao();
    if (emAndamento?.geracao === geracao) return emAndamento.promessa;

    const promessa = (async () => {
      const suporte = lerSuporte();
      if (!suporte.suportado) {
        set({ situacao: 'indisponivel', motivo: suporte.motivo, token: null, erro: null });
        return;
      }
      if (!usePreferencias.getState().pushLigado) {
        set({ situacao: 'desligado', motivo: null, token: null, erro: null });
        return;
      }
      set({ situacao: 'verificando', motivo: null, erro: null });
      try {
        await configurarExibicaoEmPrimeiroPlano();
        const preparo = await prepararPush(suporte.projectId, { pedirPermissao: opcoes.pedirPermissao ?? false });
        if (geracaoDaSessao() !== geracao) return;
        if (preparo.estado === 'negado') {
          set({ situacao: 'negado', token: null });
          return;
        }
        await dispositivosApi.registrar(preparo.token);
        if (geracaoDaSessao() !== geracao) return;
        set({ situacao: 'ligado', token: preparo.token, erro: null });
      } catch (erro) {
        if (geracaoDaSessao() !== geracao) return;
        set({ situacao: 'erro', erro });
      }
    })().finally(() => {
      if (emAndamento?.promessa === promessa) emAndamento = null;
    });

    emAndamento = { geracao, promessa };
    return promessa;
  },

  ligar: async () => {
    await usePreferencias.getState().definirPushLigado(true);
    // Uma sincronização automática em curso não pede permissão: espera terminar e refaz já com o pedido do usuário.
    const antiga = emAndamento;
    if (antiga) await antiga.promessa.catch(() => {});
    await get().sincronizar({ pedirPermissao: true });
  },

  desligar: async () => {
    await usePreferencias.getState().definirPushLigado(false);
    const { token } = get();
    set({ situacao: 'desligado', motivo: null, token: null, erro: null });
    if (token) await dispositivosApi.remover(token).catch(() => {});
  },

  desregistrar: async () => {
    const { token } = get();
    if (!token) return;
    set({ token: null });
    await dispositivosApi.remover(token).catch(() => {});
  },

  reiniciar: () => set({ ...INICIAL }),
}));

// Sessão encerrada (logout, refresh recusado): o estado do push era da conta que saiu.
useSessao.subscribe((estado, anterior) => {
  if (anterior.status === 'autenticado' && estado.status !== 'autenticado') usePush.getState().reiniciar();
});
```

`src/hooks/usePush.ts`:

```ts
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { destinoDoPush, lerDadosDoPush } from '@/dominio/push';
import { useMarcarLida } from '@/hooks/useNotificacoes';
import { observarMudancaDeToken, observarToques } from '@/notificacoes/push';
import { usePush } from '@/store/push';

/** Registra o aparelho ao entrar, quando o token muda e quando o app volta com a permissão liberada nas configurações. */
export function useSincronizarPush() {
  useEffect(() => {
    void usePush.getState().sincronizar();

    let ativo = true;
    let cancelarToken: (() => void) | undefined;
    void observarMudancaDeToken(() => void usePush.getState().sincronizar()).then((cancelar) => {
      if (ativo) cancelarToken = cancelar;
      else cancelar();
    });

    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active') return;
      const { situacao } = usePush.getState();
      if (situacao === 'negado' || situacao === 'erro') void usePush.getState().sincronizar();
    });

    return () => {
      ativo = false;
      cancelarToken?.();
      assinatura.remove();
    };
  }, []);
}

/** Toque numa notificação do sistema: marca como lida e abre o ativo (ou o detalhe, ou a caixa). */
export function useToquesDoPush() {
  const { mutate: marcarLida } = useMarcarLida();

  useEffect(() => {
    let ativo = true;
    let cancelar: (() => void) | undefined;
    void observarToques((dados) => {
      const push = lerDadosDoPush(dados);
      if (push.notificacao_id) marcarLida(push.notificacao_id);
      try {
        router.push(destinoDoPush(push));
      } catch {
        // Navegação ainda não montada (partida a frio): a notificação continua na caixa.
      }
    }).then((desfazer) => {
      if (ativo) cancelar = desfazer;
      else desfazer();
    });
    return () => {
      ativo = false;
      cancelar?.();
    };
  }, [marcarLida]);
}
```

`src/hooks/useSessaoAtiva.ts`:

```ts
import { useBannerNotificacao } from '@/hooks/useBannerNotificacao';
import { useSincronizarPush, useToquesDoPush } from '@/hooks/usePush';
import { useTempoReal } from '@/hooks/useTempoReal';

/** Tudo que fica ligado enquanto há sessão: WebSocket, registro do push, toque no push e banner in-app. */
export function useSessaoAtiva(urlDoWebSocket: string | null) {
  useTempoReal(urlDoWebSocket);
  useSincronizarPush();
  useToquesDoPush();
  return useBannerNotificacao();
}
```

```edit:app/_layout.tsx
<<<<
import { useBannerNotificacao } from '@/hooks/useBannerNotificacao';
import { useTempoReal } from '@/hooks/useTempoReal';
====
import { useSessaoAtiva } from '@/hooks/useSessaoAtiva';
>>>>
<<<<
// Com a sessão ativa: mantém o WebSocket de notificações aberto e mostra o banner de cada notificação recebida.
function SessaoAtiva() {
  useTempoReal(erroDeConfiguracao ? null : urlDoWebSocket(baseUrl));
  const { banner, aoPressionar, aoDispensar } = useBannerNotificacao();
====
// Com a sessão ativa: mantém o WebSocket aberto, registra o push e mostra o banner de cada notificação recebida.
function SessaoAtiva() {
  const { banner, aoPressionar, aoDispensar } = useSessaoAtiva(erroDeConfiguracao ? null : urlDoWebSocket(baseUrl));
>>>>
```

Em `src/store/sessao.ts` nada muda: o `usePush` observa `useSessao` por conta própria.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/store src/hooks/usePush.test.tsx src/hooks/useSessaoAtiva.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verificar e commitar**

```bash
npm run verificar
git add -A
git commit -m "feat(push): store do push, preferência e ligação à sessão (registro, token e toque)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RRDxY4Beh38T5NvK5ajVZp"
```

---

### Task 4: Perfil completo

**Files:**
- Modify: `app/(tabs)/perfil.tsx`, `__tests__/telas/perfil.test.tsx`
- Create: `src/components/CardPush.tsx`, `src/components/CardNotificarPorAtivo.tsx`, `src/components/CardServidor.tsx`, `src/components/perfil.test.tsx`, `__tests__/telas/perfilPush.test.tsx`

**Interfaces:**
- Consumes: `usePush`, `usePreferencias().pushLigado`, `useWatchlist`, `useDefinirNotificacao`, `testarConexao`, `urlDoServidor`, `descreverSituacao`, `mensagemDeErro`.
- Produces: `CardPush`, `CardNotificarPorAtivo`, `CardServidor` (apresentação pura).

- [ ] **Step 1: Escrever os testes (falham)**

`src/components/perfil.test.tsx`:

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';

import { ApiError } from '@/api/client';
import type { ItemWatchlist } from '@/api/tipos';
import { CardNotificarPorAtivo } from '@/components/CardNotificarPorAtivo';
import { CardPush } from '@/components/CardPush';
import { CardServidor } from '@/components/CardServidor';

const propsPush = {
  situacao: 'ligado' as const,
  ligado: true,
  ocupado: false,
  aoAlternar: jest.fn(),
  aoTentarNovamente: jest.fn(),
  aoAbrirConfiguracoes: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe('CardPush', () => {
  it('ligado: título, detalhe e interruptor ligado', async () => {
    await render(<CardPush {...propsPush} />);
    expect(screen.getByText('Ligadas neste aparelho')).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Notificações push' })).toBeChecked();
  });

  it('alternar chama aoAlternar com o novo valor', async () => {
    const user = userEvent.setup();
    await render(<CardPush {...propsPush} situacao="desligado" ligado={false} />);

    await user.press(screen.getByRole('switch', { name: 'Notificações push' }));

    expect(propsPush.aoAlternar).toHaveBeenCalledWith(true);
  });

  it('indisponível: explica o motivo e o interruptor fica desabilitado', async () => {
    await render(<CardPush {...propsPush} situacao="indisponivel" motivo="expo-go" ligado={false} />);
    expect(screen.getByText('Indisponíveis neste aparelho')).toBeOnTheScreen();
    expect(screen.getByText(/development build/)).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Notificações push' })).toBeDisabled();
  });

  it('negado: oferece abrir as configurações do sistema', async () => {
    const user = userEvent.setup();
    await render(<CardPush {...propsPush} situacao="negado" ligado={false} />);

    await user.press(screen.getByRole('button', { name: 'Abrir configurações do sistema' }));

    expect(propsPush.aoAbrirConfiguracoes).toHaveBeenCalledTimes(1);
  });

  it('erro: mostra a mensagem legível, o código e tenta de novo', async () => {
    const user = userEvent.setup();
    const erro = new ApiError(422, 'Token de push invalido', { requestId: 'req-9' });
    await render(<CardPush {...propsPush} situacao="erro" erro={erro} />);

    expect(screen.getByText('Não foi possível registrar este aparelho para notificações')).toBeOnTheScreen();
    expect(screen.getByText('Código do erro: req-9')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(propsPush.aoTentarNovamente).toHaveBeenCalledTimes(1);
  });
});

const itens: ItemWatchlist[] = [
  {
    ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: null, moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-09-20T12:00:00Z',
  },
  {
    ativo: { id: 'a-2', ticker: 'VALE3', nome: 'Vale ON', tipo: 'ACAO', setor: null, moeda: 'BRL' },
    notificar: false,
    adicionado_em: '2026-09-21T12:00:00Z',
  },
];

describe('CardNotificarPorAtivo', () => {
  it('lista cada ativo com o interruptor no estado do servidor', async () => {
    await render(<CardNotificarPorAtivo itens={itens} aoAlternar={jest.fn()} aoTentarNovamente={jest.fn()} />);

    expect(screen.getByRole('switch', { name: 'Notificar PETR4' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Notificar VALE3' })).not.toBeChecked();
    expect(screen.getByText('Petrobras PN')).toBeOnTheScreen();
  });

  it('alternar devolve o ativo e o novo valor', async () => {
    const aoAlternar = jest.fn();
    const user = userEvent.setup();
    await render(<CardNotificarPorAtivo itens={itens} aoAlternar={aoAlternar} aoTentarNovamente={jest.fn()} />);

    await user.press(screen.getByRole('switch', { name: 'Notificar VALE3' }));

    expect(aoAlternar).toHaveBeenCalledWith('a-2', true);
  });

  it('watchlist vazia', async () => {
    await render(<CardNotificarPorAtivo itens={[]} aoAlternar={jest.fn()} aoTentarNovamente={jest.fn()} />);
    expect(screen.getByText(/watchlist está vazia/)).toBeOnTheScreen();
  });

  it('falha ao carregar: mensagem e tentar de novo', async () => {
    const aoTentarNovamente = jest.fn();
    const user = userEvent.setup();
    await render(
      <CardNotificarPorAtivo
        erro={new ApiError(500, 'Erro 500')}
        aoAlternar={jest.fn()}
        aoTentarNovamente={aoTentarNovamente}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(aoTentarNovamente).toHaveBeenCalledTimes(1);
  });

  it('carregando mostra o estado de espera', async () => {
    await render(<CardNotificarPorAtivo carregando aoAlternar={jest.fn()} aoTentarNovamente={jest.fn()} />);
    expect(screen.getAllByLabelText('Carregando').length).toBeGreaterThan(0);
  });
});

describe('CardServidor', () => {
  it('mostra o endereço e testa a conexão', async () => {
    const aoTestar = jest.fn();
    const user = userEvent.setup();
    await render(<CardServidor url="http://192.168.0.247:8000" testando={false} aoTestar={aoTestar} />);

    expect(screen.getByText('http://192.168.0.247:8000')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Testar conexão' }));
    expect(aoTestar).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ ok: true as const, ms: 42 }, 'Conectado (42 ms)'],
    [{ ok: false as const, motivo: 'rede' as const }, 'Sem conexão com o servidor. Confira o Wi-Fi e o endereço.'],
    [{ ok: false as const, motivo: 'tempo' as const }, 'O servidor demorou demais para responder.'],
    [{ ok: false as const, motivo: 'servidor' as const, status: 502 }, 'O servidor respondeu com erro 502.'],
  ])('resultado %p', async (resultado, texto) => {
    await render(<CardServidor url="http://api" resultado={resultado} testando={false} aoTestar={jest.fn()} />);
    expect(screen.getByText(texto)).toBeOnTheScreen();
  });

  it('testando: o botão fica ocupado', async () => {
    await render(<CardServidor url="http://api" testando aoTestar={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Testar conexão' })).toBeDisabled();
  });
});
```

`__tests__/telas/perfilPush.test.tsx`:

```tsx
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';

import { authApi } from '@/api/auth';
import { dispositivosApi } from '@/api/dispositivos';
import { testarConexao } from '@/api/saude';
import type { ItemWatchlist } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { usePreferencias } from '@/store/preferencias';
import { usePush } from '@/store/push';
import { useSessao } from '@/store/sessao';
import { renderizar } from '@/test/renderizar';

import Perfil from '../../app/(tabs)/perfil';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/auth', () => ({ authApi: { sair: jest.fn(), renovar: jest.fn() } }));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(async () => []), marcarComoLida: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({
  watchlistApi: { listar: jest.fn(), definirNotificacao: jest.fn(), remover: jest.fn() },
}));
jest.mock('@/api/dispositivos', () => ({ dispositivosApi: { registrar: jest.fn(), remover: jest.fn() } }));
jest.mock('@/api/saude', () => ({ testarConexao: jest.fn() }));
jest.mock('@/notificacoes/push', () => ({
  lerSuporte: jest.fn(() => ({ suportado: true, projectId: 'proj-1' })),
  prepararPush: jest.fn(async () => ({ estado: 'pronto', token: 'ExponentPushToken[abc]' })),
  configurarExibicaoEmPrimeiroPlano: jest.fn(async () => undefined),
}));

const itens: ItemWatchlist[] = [
  {
    ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: null, moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-09-20T12:00:00Z',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  usePreferencias.setState({ tema: 'escuro', pushLigado: true });
  useSessao.setState({ status: 'autenticado', token: 'tok', refreshToken: 'ref', expiraEm: null, email: 'ana@exemplo.com' });
  usePush.setState({ situacao: 'ligado', motivo: null, token: 'ExponentPushToken[abc]', erro: null });
  jest.mocked(watchlistApi.listar).mockResolvedValue(itens);
  jest.mocked(authApi.sair).mockResolvedValue(undefined);
  jest.mocked(dispositivosApi.remover).mockResolvedValue(undefined);
  jest.mocked(dispositivosApi.registrar).mockResolvedValue({ token: 'ExponentPushToken[abc]', ativo: true });
});

describe('push', () => {
  it('mostra o estado e desliga: remove o aparelho no servidor e guarda a preferência', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);

    expect(await screen.findByText('Ligadas neste aparelho')).toBeOnTheScreen();
    await user.press(screen.getByRole('switch', { name: 'Notificações push' }));

    await waitFor(() => expect(dispositivosApi.remover).toHaveBeenCalledWith('ExponentPushToken[abc]'));
    expect(usePreferencias.getState().pushLigado).toBe(false);
    expect(await screen.findByText('Desligadas neste aparelho')).toBeOnTheScreen();
  });

  it('ligar de novo registra o aparelho', async () => {
    const user = userEvent.setup();
    usePreferencias.setState({ pushLigado: false });
    usePush.setState({ situacao: 'desligado', token: null });
    await renderizar(<Perfil />);

    await user.press(await screen.findByRole('switch', { name: 'Notificações push' }));

    await waitFor(() => expect(dispositivosApi.registrar).toHaveBeenCalledWith('ExponentPushToken[abc]'));
    expect(await screen.findByText('Ligadas neste aparelho')).toBeOnTheScreen();
  });

  it('negado: abre as configurações do sistema', async () => {
    const user = userEvent.setup();
    const abrir = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    usePush.setState({ situacao: 'negado', token: null });
    await renderizar(<Perfil />);

    await user.press(await screen.findByRole('button', { name: 'Abrir configurações do sistema' }));

    expect(abrir).toHaveBeenCalledTimes(1);
  });

  it('Expo Go: explica e não deixa ligar', async () => {
    usePush.setState({ situacao: 'indisponivel', motivo: 'expo-go', token: null });
    await renderizar(<Perfil />);

    expect(await screen.findByText(/development build/)).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Notificações push' })).toBeDisabled();
  });
});

describe('notificar por ativo', () => {
  it('altera no servidor e a falha devolve o interruptor', async () => {
    const user = userEvent.setup();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(watchlistApi.definirNotificacao).mockRejectedValue(new Error('falhou'));
    await renderizar(<Perfil />);

    await user.press(await screen.findByRole('switch', { name: 'Notificar PETR4' }));

    await waitFor(() => expect(watchlistApi.definirNotificacao).toHaveBeenCalledWith('a-1', false));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Notificar PETR4' })).toBeChecked());
  });
});

describe('servidor', () => {
  it('mostra o endereço em uso e o resultado do teste de conexão', async () => {
    const user = userEvent.setup();
    jest.mocked(testarConexao).mockResolvedValue({ ok: true, ms: 37 });
    await renderizar(<Perfil />);

    await user.press(await screen.findByRole('button', { name: 'Testar conexão' }));

    expect(await screen.findByText('Conectado (37 ms)')).toBeOnTheScreen();
    expect(testarConexao).toHaveBeenCalledWith(expect.stringMatching(/^https?:\/\//));
  });
});

describe('sair', () => {
  it('remove o aparelho do push ANTES de encerrar a sessão, e a preferência não muda', async () => {
    const user = userEvent.setup();
    let statusNaRemocao: string | undefined;
    jest.mocked(dispositivosApi.remover).mockImplementation(async () => {
      statusNaRemocao = useSessao.getState().status;
    });
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, botoes) => {
      botoes?.find((botao) => botao.style === 'destructive')?.onPress?.();
    });
    await renderizar(<Perfil />);

    await user.press(await screen.findByRole('button', { name: 'Sair' }));

    await waitFor(() => expect(useSessao.getState().status).toBe('anonimo'));
    expect(dispositivosApi.remover).toHaveBeenCalledWith('ExponentPushToken[abc]');
    expect(statusNaRemocao).toBe('autenticado');
    expect(usePreferencias.getState().pushLigado).toBe(true);
  });

  it('um servidor que não responde não segura a saída por mais de 4 s', async () => {
    jest.useFakeTimers();
    try {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      jest.mocked(dispositivosApi.remover).mockReturnValue(new Promise(() => {}));
      jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, botoes) => {
        botoes?.find((botao) => botao.style === 'destructive')?.onPress?.();
      });
      await renderizar(<Perfil />);

      await user.press(await screen.findByRole('button', { name: 'Sair' }));
      expect(useSessao.getState().status).toBe('autenticado');
      await jest.advanceTimersByTimeAsync(4_000);

      await waitFor(() => expect(useSessao.getState().status).toBe('anonimo'));
    } finally {
      jest.useRealTimers();
    }
  });
});
```

Ajustes no teste existente `__tests__/telas/perfil.test.tsx` (o Perfil novo consulta a watchlist e o push):

```edit:__tests__/telas/perfil.test.tsx
<<<<
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));
====
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({
  watchlistApi: { listar: jest.fn(async () => []), definirNotificacao: jest.fn(), remover: jest.fn() },
}));
jest.mock('@/api/dispositivos', () => ({ dispositivosApi: { registrar: jest.fn(), remover: jest.fn() } }));
jest.mock('@/notificacoes/push', () => ({
  lerSuporte: jest.fn(() => ({ suportado: false, motivo: 'expo-go' })),
  prepararPush: jest.fn(),
  configurarExibicaoEmPrimeiroPlano: jest.fn(async () => undefined),
}));
>>>>
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/components/perfil.test.tsx __tests__/telas/perfilPush.test.tsx`
Expected: FAIL (componentes e partes do Perfil não existem).

- [ ] **Step 3: Implementar**

`src/components/CardPush.tsx`:

```tsx
import { StyleSheet, Switch, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { Card } from '@/components/Card';
import { ErroComRetry } from '@/components/ErroComRetry';
import { Texto } from '@/components/Texto';
import { descreverSituacao, type MotivoDeIndisponibilidade, type SituacaoDoPush } from '@/dominio/push';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { mensagemDeErro } from '@/utils/erros';

interface Props {
  situacao: SituacaoDoPush;
  motivo?: MotivoDeIndisponibilidade | null;
  erro?: unknown;
  /** Valor do interruptor: a vontade do usuário, quando o aparelho consegue atendê-la. */
  ligado: boolean;
  ocupado: boolean;
  aoAlternar: (ligar: boolean) => void;
  aoTentarNovamente: () => void;
  aoAbrirConfiguracoes: () => void;
}

export function CardPush({ situacao, motivo, erro, ligado, ocupado, aoAlternar, aoTentarNovamente, aoAbrirConfiguracoes }: Props) {
  const { cores } = useTema();
  const texto = descreverSituacao(situacao, motivo);
  const indisponivel = situacao === 'indisponivel';

  return (
    <Card titulo="Notificações push" icone="sino">
      <View style={estilos.linha}>
        <View style={estilos.textos}>
          <Texto negrito>{texto.titulo}</Texto>
          <Texto variante="legenda" cor="secundario">
            {texto.detalhe}
          </Texto>
        </View>
        <Switch
          role="switch"
          aria-label="Notificações push"
          value={ligado}
          onValueChange={aoAlternar}
          disabled={indisponivel || ocupado}
          trackColor={{ true: cores.primaria, false: cores.bordaForte }}
        />
      </View>
      {situacao === 'negado' ? (
        <Botao titulo="Abrir configurações do sistema" variante="secundario" onPress={aoAbrirConfiguracoes} />
      ) : null}
      {situacao === 'erro' ? (
        <ErroComRetry erro={erro} mensagem={mensagemDeErro(erro)} aoTentarNovamente={aoTentarNovamente} />
      ) : null}
    </Card>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  textos: { flex: 1, gap: espaco.xs },
});
```

`src/components/CardNotificarPorAtivo.tsx`:

```tsx
import { StyleSheet, Switch, View } from 'react-native';

import type { ItemWatchlist, Uuid } from '@/api/tipos';
import { Card } from '@/components/Card';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  itens?: ItemWatchlist[];
  carregando?: boolean;
  erro?: unknown;
  aoAlternar: (ativoId: Uuid, notificar: boolean) => void;
  aoTentarNovamente: () => void;
}

/** Quais ativos da watchlist geram aviso (sinal novo e alerta de preço), no mesmo PATCH do sino do Início. */
export function CardNotificarPorAtivo({ itens, carregando = false, erro, aoAlternar, aoTentarNovamente }: Props) {
  const { cores } = useTema();

  return (
    <Card titulo="Notificar por ativo" icone="sino-desligado" tomIcone="destaque">
      {carregando && !itens ? <Carregando /> : null}
      {erro && !itens ? <ErroComRetry erro={erro} aoTentarNovamente={aoTentarNovamente} /> : null}
      {itens && itens.length === 0 ? (
        <EstadoVazio mensagem="Sua watchlist está vazia. Adicione ativos pela busca no Início." />
      ) : null}
      {itens?.map((item) => (
        <View key={item.ativo.id} style={estilos.linha}>
          <View style={estilos.textos}>
            <Texto negrito>{item.ativo.ticker}</Texto>
            <Texto variante="legenda" cor="secundario" numberOfLines={1}>
              {item.ativo.nome}
            </Texto>
          </View>
          <Switch
            role="switch"
            aria-label={`Notificar ${item.ativo.ticker}`}
            value={item.notificar}
            onValueChange={(valor) => aoAlternar(item.ativo.id, valor)}
            trackColor={{ true: cores.primaria, false: cores.bordaForte }}
          />
        </View>
      ))}
    </Card>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, minHeight: 48 },
  textos: { flex: 1 },
});
```

`src/components/CardServidor.tsx`:

```tsx
import type { ResultadoDaConexao } from '@/api/saude';
import { Botao } from '@/components/Botao';
import { Card } from '@/components/Card';
import { Texto } from '@/components/Texto';

interface Props {
  url: string;
  resultado?: ResultadoDaConexao;
  testando: boolean;
  aoTestar: () => void;
}

function descrever(resultado: ResultadoDaConexao): string {
  if (resultado.ok) return `Conectado (${resultado.ms} ms)`;
  if (resultado.motivo === 'rede') return 'Sem conexão com o servidor. Confira o Wi-Fi e o endereço.';
  if (resultado.motivo === 'tempo') return 'O servidor demorou demais para responder.';
  return `O servidor respondeu com erro ${resultado.status ?? ''}.`.replace(' .', '.');
}

export function CardServidor({ url, resultado, testando, aoTestar }: Props) {
  return (
    <Card titulo="Servidor" icone="atividade" tomIcone="neutro">
      <Texto cor="secundario">Endereço configurado</Texto>
      <Texto negrito selectable>
        {url}
      </Texto>
      {resultado ? (
        <Texto role="status" cor={resultado.ok ? 'positivo' : 'negativo'}>
          {descrever(resultado)}
        </Texto>
      ) : null}
      <Botao titulo="Testar conexão" variante="secundario" onPress={aoTestar} carregando={testando} />
      <Texto variante="legenda" cor="terciario">
        O endereço vem de EXPO_PUBLIC_API_URL: para trocá-lo, reinicie o Metro com `npx expo start -c`.
      </Texto>
    </Card>
  );
}
```

`app/(tabs)/perfil.tsx`:

```tsx
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking } from 'react-native';

import { type ResultadoDaConexao, testarConexao } from '@/api/saude';
import { Botao } from '@/components/Botao';
import { Card } from '@/components/Card';
import { CardNotificarPorAtivo } from '@/components/CardNotificarPorAtivo';
import { CardPush } from '@/components/CardPush';
import { CardServidor } from '@/components/CardServidor';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { urlDoServidor } from '@/config/ambiente';
import { useNaoLidas } from '@/hooks/useNotificacoes';
import { useDefinirNotificacao, useWatchlist } from '@/hooks/useWatchlist';
import { type EsquemaTema, usePreferencias } from '@/store/preferencias';
import { usePush } from '@/store/push';
import { useSessao } from '@/store/sessao';
import { mensagemDeErro } from '@/utils/erros';

const TEMAS: readonly { valor: EsquemaTema; rotulo: string }[] = [
  { valor: 'escuro', rotulo: 'Escuro' },
  { valor: 'claro', rotulo: 'Claro' },
];

/** O servidor pode estar fora do ar: sair não espera mais que isto pelo `DELETE /dispositivos`. */
const LIMITE_DO_DESREGISTRO_MS = 4_000;

async function desregistrarPushSemTravar(): Promise<void> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<void>((resolver) => {
    temporizador = setTimeout(resolver, LIMITE_DO_DESREGISTRO_MS);
  });
  try {
    await Promise.race([usePush.getState().desregistrar(), limite]);
  } finally {
    clearTimeout(temporizador);
  }
}

export default function Perfil() {
  const tema = usePreferencias((estado) => estado.tema);
  const definirTema = usePreferencias((estado) => estado.definirTema);
  const pushLigado = usePreferencias((estado) => estado.pushLigado);
  const email = useSessao((estado) => estado.email);
  const sair = useSessao((estado) => estado.sair);
  const naoLidas = useNaoLidas();

  const situacaoDoPush = usePush((estado) => estado.situacao);
  const motivoDoPush = usePush((estado) => estado.motivo);
  const erroDoPush = usePush((estado) => estado.erro);
  const ligarPush = usePush((estado) => estado.ligar);
  const desligarPush = usePush((estado) => estado.desligar);
  const sincronizarPush = usePush((estado) => estado.sincronizar);

  const watchlist = useWatchlist();
  const definirNotificacao = useDefinirNotificacao();

  const [resultadoDaConexao, setResultadoDaConexao] = useState<ResultadoDaConexao>();
  const [testando, setTestando] = useState(false);

  // Só vale como "ligado" quando o aparelho consegue: negado, indisponível e desligado mostram o interruptor apagado.
  const pushEfetivo = pushLigado && (situacaoDoPush === 'ligado' || situacaoDoPush === 'verificando' || situacaoDoPush === 'erro');

  async function testar() {
    setTestando(true);
    try {
      setResultadoDaConexao(await testarConexao(urlDoServidor()));
    } finally {
      setTestando(false);
    }
  }

  function confirmarSaida() {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        // O aparelho sai do push enquanto a sessão ainda vale (o DELETE precisa do token). `sair` limpa o estado antes
        // de tocar no armazenamento seguro: se ele falhar, a sessão já foi encerrada.
        onPress: () => {
          void desregistrarPushSemTravar().then(() =>
            sair().catch(() => {
              Alert.alert(
                'Não foi possível concluir a saída',
                'A sessão foi encerrada neste aparelho, mas o acesso salvo pode voltar ao reabrir o app.',
              );
            }),
          );
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
      <CardPush
        situacao={situacaoDoPush}
        motivo={motivoDoPush}
        erro={erroDoPush}
        ligado={pushEfetivo}
        ocupado={situacaoDoPush === 'verificando'}
        aoAlternar={(ligar) => void (ligar ? ligarPush() : desligarPush())}
        aoTentarNovamente={() => void sincronizarPush({ pedirPermissao: true })}
        aoAbrirConfiguracoes={() => void Linking.openSettings()}
      />
      <CardNotificarPorAtivo
        itens={watchlist.data}
        carregando={watchlist.isPending}
        erro={watchlist.error}
        aoAlternar={(ativoId, notificar) =>
          definirNotificacao.mutate(
            { ativoId, notificar },
            { onError: (erro) => Alert.alert('Não foi possível alterar as notificações', mensagemDeErro(erro)) },
          )
        }
        aoTentarNovamente={() => void watchlist.refetch()}
      />
      <CardServidor url={urlDoServidor()} resultado={resultadoDaConexao} testando={testando} aoTestar={() => void testar()} />
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

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/components/perfil.test.tsx __tests__/telas/perfilPush.test.tsx __tests__/telas/perfil.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verificar e commitar**

```bash
npm run verificar
git add -A
git commit -m "feat(perfil): push ligado/desligado, notificar por ativo, servidor com teste de conexão e saída que remove o aparelho

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RRDxY4Beh38T5NvK5ajVZp"
```

---

### Task 5: Configuração do app, conferência com o backend, documentação e PR

**Files:**
- Create: `app.config.ts`, `__tests__/appConfig.test.ts`
- Modify: `app.json`, `README.md`, `docs/PLANO.md`, `docs/checkpoint-02.md`, `CLAUDE.md`

- [ ] **Step 1: `app.config.ts` e o plugin do `expo-notifications`**

`__tests__/appConfig.test.ts`:

```ts
import type { ConfigContext } from 'expo/config';

import configurar from '../app.config';

const base = {
  name: 'InsightFlow',
  slug: 'insight-flow-mobile',
  extra: { outro: 'valor' },
} as ConfigContext['config'];

const original = process.env.EAS_PROJECT_ID;

afterEach(() => {
  if (original === undefined) delete process.env.EAS_PROJECT_ID;
  else process.env.EAS_PROJECT_ID = original;
});

it('sem EAS_PROJECT_ID mantém a configuração do app.json como está', () => {
  delete process.env.EAS_PROJECT_ID;
  const config = configurar({ config: base } as ConfigContext);
  expect(config.name).toBe('InsightFlow');
  expect(config.extra).toEqual({ outro: 'valor' });
});

it('com EAS_PROJECT_ID injeta o projectId do EAS sem perder o resto de extra', () => {
  process.env.EAS_PROJECT_ID = ' 11111111-2222-3333-4444-555555555555 ';
  const config = configurar({ config: base } as ConfigContext);
  expect(config.extra).toEqual({
    outro: 'valor',
    eas: { projectId: '11111111-2222-3333-4444-555555555555' },
  });
});
```

`app.config.ts`:

```ts
import type { ConfigContext, ExpoConfig } from 'expo/config';

// Estende o app.json. O `projectId` do EAS (necessário ao push, Etapa 8) vem do ambiente para não ficar no
// repositório: `EAS_PROJECT_ID=<uuid> npx expo start`. Sem ele o app roda normalmente e o Perfil explica que o push
// depende do projeto.
export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId = process.env.EAS_PROJECT_ID?.trim();
  return {
    ...config,
    name: config.name ?? 'InsightFlow',
    slug: config.slug ?? 'insight-flow-mobile',
    extra: {
      ...config.extra,
      ...(projectId ? { eas: { ...config.extra?.eas, projectId } } : {}),
    },
  };
};
```

```edit:app.json
<<<<
      "expo-font",
      "expo-asset"
====
      "expo-font",
      "expo-asset",
      [
        "expo-notifications",
        {
          "color": "#3aa0ff"
        }
      ]
>>>>
```

Conferir: `npx expo config --type public` roda sem erro com e sem `EAS_PROJECT_ID`.

- [ ] **Step 2: Conferir `/dispositivos` e `/health` no backend local**

Com um usuário descartável (token só em memória): `POST /dispositivos` com `ExponentPushToken[...]` → 201; de novo → 200; `DELETE ?token=` com colchetes codificados → 204 (e de novo → 204); token inválido → 422 "Token de push invalido"; o mesmo token por outra conta passa para a atual (200); `GET /health` sem login → 200.

- [ ] **Step 3: Documentação**

- `README.md`: Perfil (push, notificar por ativo, servidor com teste de conexão, tema), push no cliente e o que falta (development build, D8).
- `docs/PLANO.md`: Etapa 8 parte A feita; `expo-notifications` e `expo-device` instalados; o que continua pendente da D8; §9.5 com `EAS_PROJECT_ID`.
- `docs/checkpoint-02.md`: Perfil e push (indisponível no Expo Go, com explicação).
- `CLAUDE.md`: regras do push (única fronteira, preferência × situação, logout).

- [ ] **Step 4: Revisão independente, correções, push e PR empilhado**

`review-package` sobre a branch inteira, subagente revisor (modelo `opus`, somente leitura), uma rodada de correções com RED→GREEN, menores no "Registro da execução". Depois `git push -u origin feature/etapa-8-perfil-push` e `gh pr create --base feature/etapa-7-analise-ia-chat` (com `GH_TOKEN` na mesma chamada), sem merge.
