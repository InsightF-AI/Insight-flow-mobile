# Ciclo 1: base do repositório e sessão completa — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar o app mobile no GitHub, limpar o repositório e trocar a sessão de token único por access + refresh token com renovação automática, mensagens de erro em pt-BR e endereço da API validado (Etapas 1 e 2 do `docs/PLANO.md`).

**Architecture:** O client HTTP (`src/api/client.ts`, sem React Native) ganha tempo limite por chamada, `X-Request-ID`, leitura de `Retry-After` e renovação: antecipada (token perto de vencer) e reativa (401 → renova → repete uma vez). Quem renova é a store de sessão (`src/store/sessao.ts`), que serializa as renovações numa promessa compartilhada e guarda tudo numa única chave do SecureStore. O layout raiz liga os dois por `configurarApi`.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript 6, Zustand 5, TanStack Query 5, expo-secure-store, Jest 29 + jest-expo + React Native Testing Library 14.

**Spec:** `docs/PLANO.md` (§5 Camada de API, §8 Etapas 1 e 2, §9 teste no celular) e `docs/MAPEAMENTO.md` (§2 endpoints, §6.1 fluxo de autenticação).

## Global Constraints

- Repositório: `C:\Users\Bruno\Insight-flow-mobile`. Não alterar `Insight-flow-backend`, `Insight-flow-web` nem `Insight-flow-desktop`.
- Sem dependências novas neste ciclo.
- `app/` só tem rotas; `src/api/` não importa `react-native`; componentes recebem dados por props (regras do `CLAUDE.md`).
- Cores só via `useTema()`; nunca `fontWeight`; ícones só via `Icone`; contraste ≥ 4,5:1.
- Backend: access token de 30 min (`expires_in: 1800`), refresh token de 30 dias, **rotativo**; `POST /auth/refresh {refresh_token}` → novo par; reuso de refresh revoga a sessão inteira; `POST /auth/logout {refresh_token}` → 204.
- Rotas `/auth/*` nunca levam `Authorization`.
- `X-Request-ID`: até 64 caracteres em `[A-Za-z0-9._-]`.
- Tempo limite padrão: 20 s.
- Margem de renovação antecipada: 60 s.
- Mensagens de interface em pt-BR; frase única sem ponto final (padrão atual: "E-mail ou senha incorretos").
- `npm run verificar` (lint + typecheck + testes) verde ao fim de cada tarefa.
- Commits no padrão do repositório (Conventional Commits em pt-BR, ex.: `feat(auth): ...`), terminando com a linha `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- `git push`/`gh` sempre com `GH_TOKEN="$(gh auth token --user brunoosouza09)"`, sem trocar a conta ativa do `gh`.
- Antes de escrever testes de tela, ler `node_modules/@testing-library/react-native/docs/guides/llm-guidelines.md`.

## Review Focus

1. **Duas telas com 401 ao mesmo tempo** (ex.: Início e badge de notificações depois de 30 min) → uma única chamada a `/auth/refresh` e as duas requisições repetem com o token novo. Teste de integração na Tarefa 7 (`sessaoHttp.test.ts`).
2. **App reaberto com o access vencido** → renova antes da primeira requisição, sem passar por um 401. Tarefa 7 (`sessaoHttp.test.ts`).
3. **Refresh expirado ou revogado** (30 dias, logout em outro lugar) → volta ao login sem repetir requisições em laço. Tarefa 7 (`sessaoHttp.test.ts`).
4. **Abrir o app sem rede com sessão salva** → continua autenticado e mostra "Sem conexão com o servidor (endereço)", sem deslogar. Tarefa 7 (`sessaoHttp.test.ts`).
5. **`.env` com `/api/v1` no fim ou sem `http://`** → tela "Endereço do servidor inválido", em vez de "sem conexão" em todas as telas. Tarefa 3 (`ambiente.test.ts`).

---

### Task 1: Publicar as branches existentes e abrir os PRs

**Files:** nenhum arquivo do projeto.

**Interfaces:**
- Consumes: branches locais `main`, `develop`, `feature/app-mobile-mvp`, `feature/redesign-web`.
- Produces: remoto `InsightF-AI/Insight-flow-mobile` com as quatro branches, `main` como padrão, PR "MVP → develop" e PR "redesign → feature/app-mobile-mvp" (empilhado).

- [ ] **Step 1: Conferir o estado local**

```bash
cd /c/Users/Bruno/Insight-flow-mobile
git status --short
git branch -vv
```

Esperado: só arquivos não rastreados de `docs/` (`MAPEAMENTO.md`, `PLANO.md` e este plano); branch atual `feature/redesign-web`; nenhuma branch com upstream.

- [ ] **Step 2: Rodar a verificação na branch atual**

Run: `npm run verificar`
Expected: exit 0, `Test Suites: 42 passed`, `Tests: 372 passed`.

- [ ] **Step 3: Enviar as branches e fixar a branch padrão**

```bash
export GH_TOKEN="$(gh auth token --user brunoosouza09)"
cd /c/Users/Bruno/Insight-flow-mobile
git push -u origin main develop feature/app-mobile-mvp feature/redesign-web
gh repo edit InsightF-AI/Insight-flow-mobile --default-branch main
gh api repos/InsightF-AI/Insight-flow-mobile --jq .default_branch
```

Expected: as quatro branches criadas no remoto; a última linha imprime `main`.

- [ ] **Step 4: Abrir o PR do MVP para `develop`**

```bash
export GH_TOKEN="$(gh auth token --user brunoosouza09)"
gh pr create -R InsightF-AI/Insight-flow-mobile --base develop --head feature/app-mobile-mvp \
  --title "feat: MVP do app mobile (Expo SDK 57)" --body-file - <<'EOF'
## Resumo

- MVP do app mobile (plano em `docs/superpowers/plans/2026-09-25-app-mobile-mvp.md`): login e cadastro, watchlist com cotação, busca, detalhe do ativo (gráfico de fechamento, indicadores e sinais com backtest), alertas de preço, notificações in-app atualizadas a cada 60 s, portfólio simulado e nova operação. Telas de IA prontas com o aviso legal, ainda sem endpoint.
- Expo SDK 57 (React Native 0.86, TypeScript), Expo Router, TanStack Query, Zustand, expo-secure-store e Victory Native. Jest + React Native Testing Library e CI no GitHub Actions.

## Limitações conhecidas

- Feito contra o backend de 25/09/2026: sem refresh token, WebSocket, push e IA real. Esses pontos estão no plano dos próximos ciclos (`docs/PLANO.md`, que entra com o PR do ciclo 1).
- Não foi testado em aparelho nem em emulador.

## Verificação

- O CI deste PR roda lint, typecheck e testes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

Expected: o comando imprime a URL do PR.

- [ ] **Step 5: Abrir o PR do redesign empilhado sobre o MVP**

```bash
export GH_TOKEN="$(gh auth token --user brunoosouza09)"
gh pr create -R InsightF-AI/Insight-flow-mobile --base feature/app-mobile-mvp --head feature/redesign-web \
  --title "feat: identidade visual do cliente web no app mobile" --body-file - <<'EOF'
## Resumo

- Redesign com a identidade do `Insight-flow-web` (spec em `docs/superpowers/specs/2026-09-26-redesign-visual-web-design.md`): tema escuro por padrão e claro alternável no Perfil, Inter + Space Grotesk, ícones lucide, cards com cabeçalho, pills e login com card e logo.
- Valores do tema claro do web que reprovavam contraste AA foram ajustados no mínimo necessário (listados na spec).

## Observações

- PR empilhado: a base é `feature/app-mobile-mvp`. Depois que o PR do MVP entrar, trocar a base para `develop`.
- O CI só roda em PRs para `main` e `develop`; rodará quando a base mudar.
- Não foi testado em aparelho nem em emulador.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

Expected: URL do segundo PR.

- [ ] **Step 6: Conferir o CI do PR do MVP**

Run: `GH_TOKEN="$(gh auth token --user brunoosouza09)" gh run list -R InsightF-AI/Insight-flow-mobile --limit 3`
Expected: uma execução "CI" para `feature/app-mobile-mvp` (em andamento ou concluída). Se falhar, registrar o motivo e avisar antes de seguir.

---

### Task 2: Branch do ciclo, documentos e limpeza do template

**Files:**
- Create (versionar): `docs/MAPEAMENTO.md`, `docs/PLANO.md`, `docs/superpowers/plans/2026-10-10-ciclo-1-base-e-sessao.md`
- Delete: `AGENTS.md`, `LICENSE`, `.claude/settings.json`, `assets/favicon.png`
- Modify: `app.json` (fundo do ícone adaptativo Android), `CLAUDE.md`

**Interfaces:**
- Consumes: `feature/redesign-web`.
- Produces: branch `feature/ciclo-1-base-sessao`, base das tarefas seguintes.

- [ ] **Step 1: Criar a branch do ciclo**

```bash
cd /c/Users/Bruno/Insight-flow-mobile
git switch -c feature/ciclo-1-base-sessao feature/redesign-web
```

Expected: `Switched to a new branch 'feature/ciclo-1-base-sessao'`; os três documentos continuam não rastreados.

- [ ] **Step 2: Versionar o mapeamento e os planos**

```bash
git add docs/MAPEAMENTO.md docs/PLANO.md docs/superpowers/plans/2026-10-10-ciclo-1-base-e-sessao.md
git commit -m "docs: adiciona o mapeamento da organização e o plano do app mobile" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Remover as sobras do template Expo**

```bash
git rm AGENTS.md LICENSE .claude/settings.json assets/favicon.png
```

Expected: quatro `rm '...'`. Nenhum arquivo do projeto referencia `favicon.png` (não há alvo web no `app.json`).

- [ ] **Step 4: Trocar o fundo do ícone adaptativo Android**

Em `app.json`, dentro de `expo.android.adaptiveIcon`, trocar:

```json
        "backgroundColor": "#E6F4FE",
```

por:

```json
        "backgroundColor": "#070b14",
```

- [ ] **Step 5: Levar para o `CLAUDE.md` a regra útil do `AGENTS.md` removido**

Acrescentar ao fim de `CLAUDE.md`:

```markdown

## Expo muda a cada SDK
Antes de usar uma API do Expo, EAS ou React Native, consulte a documentação da versão em uso (`https://docs.expo.dev/versions/v57.0.0/`; índice em `https://docs.expo.dev/llms.txt`) em vez de confiar na memória. Dependências novas entram com `npx expo install <pacote>`.
```

- [ ] **Step 6: Verificar e commitar**

Run: `npm run verificar`
Expected: exit 0, 372 testes passando.

```bash
git add app.json CLAUDE.md
git commit -m "chore: remove sobras do template Expo e ajusta o fundo do ícone Android" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Endereço da API validado

**Files:**
- Create: `src/config/ambiente.ts`, `src/config/ambiente.test.ts`, `src/components/ConfiguracaoInvalida.tsx`, `src/components/configuracao.test.tsx`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Produces:
  - `URL_PADRAO_DA_API: string` (`'http://localhost:8000'`)
  - `class ConfiguracaoInvalidaError extends Error`
  - `lerUrlDaApi(valor: string | undefined): string` → raiz do servidor sem barra final, ou lança `ConfiguracaoInvalidaError`
  - `ConfiguracaoInvalida({ mensagem }: { mensagem: string })`

- [ ] **Step 1: Escrever os testes de `lerUrlDaApi`**

`src/config/ambiente.test.ts`:

```ts
import { ConfiguracaoInvalidaError, lerUrlDaApi, URL_PADRAO_DA_API } from '@/config/ambiente';

describe('lerUrlDaApi', () => {
  it('sem valor usa o padrão', () => {
    expect(lerUrlDaApi(undefined)).toBe(URL_PADRAO_DA_API);
    expect(lerUrlDaApi('   ')).toBe(URL_PADRAO_DA_API);
  });

  it.each([
    ['http://192.168.0.10:8000', 'http://192.168.0.10:8000'],
    ['http://192.168.0.10:8000/', 'http://192.168.0.10:8000'],
    ['  https://api.exemplo.com  ', 'https://api.exemplo.com'],
    ['HTTP://10.0.2.2:8000', 'http://10.0.2.2:8000'],
  ])('aceita %s', (entrada, esperado) => {
    expect(lerUrlDaApi(entrada)).toBe(esperado);
  });

  it.each([
    'http://192.168.0.10:8000/api/v1',
    '192.168.0.10:8000',
    'ftp://servidor',
    'http://usuario:senha@servidor:8000',
    'http://servidor:8000?x=1',
    'http://',
  ])('recusa %s com uma mensagem que mostra o formato certo', (entrada) => {
    expect(() => lerUrlDaApi(entrada)).toThrow(ConfiguracaoInvalidaError);
    expect(() => lerUrlDaApi(entrada)).toThrow('http://192.168.0.10:8000');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/config/ambiente.test.ts`
Expected: FAIL com `Cannot find module '@/config/ambiente'`.

- [ ] **Step 3: Implementar `src/config/ambiente.ts`**

```ts
/** Raiz usada sem EXPO_PUBLIC_API_URL (simulador iOS ou prévia no PC). No celular, use o IP do PC. */
export const URL_PADRAO_DA_API = 'http://localhost:8000';

// Esquema http(s), host com porta opcional e no máximo uma barra final: sem caminho, query, fragmento ou credenciais.
const RAIZ_DO_SERVIDOR = /^(https?):\/\/([^/?#@\s]+)\/?$/i;

export class ConfiguracaoInvalidaError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ConfiguracaoInvalidaError';
  }
}

/** Valida EXPO_PUBLIC_API_URL e devolve a raiz do servidor sem barra final (o client acrescenta /api/v1). */
export function lerUrlDaApi(valor: string | undefined): string {
  const bruto = valor?.trim() || URL_PADRAO_DA_API;
  const partes = RAIZ_DO_SERVIDOR.exec(bruto);
  if (!partes) {
    throw new ConfiguracaoInvalidaError(
      `EXPO_PUBLIC_API_URL precisa ser só a raiz do servidor, como http://192.168.0.10:8000 (sem /api/v1). Valor atual: ${bruto}`,
    );
  }
  return `${partes[1].toLowerCase()}://${partes[2]}`;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/config/ambiente.test.ts`
Expected: PASS (12 testes).

- [ ] **Step 5: Escrever o teste da tela de configuração inválida**

`src/components/configuracao.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';

import { ConfiguracaoInvalida } from '@/components/ConfiguracaoInvalida';

it('explica o problema e como corrigir', async () => {
  await render(<ConfiguracaoInvalida mensagem="EXPO_PUBLIC_API_URL precisa ser só a raiz do servidor" />);
  expect(screen.getByRole('heading', { name: 'Endereço do servidor inválido' })).toBeOnTheScreen();
  expect(screen.getByRole('alert')).toHaveTextContent('EXPO_PUBLIC_API_URL precisa ser só a raiz do servidor');
  expect(screen.getByText('Corrija o arquivo .env do app e reinicie o Metro com "npx expo start -c".')).toBeOnTheScreen();
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx jest src/components/configuracao.test.tsx`
Expected: FAIL com `Cannot find module '@/components/ConfiguracaoInvalida'`.

- [ ] **Step 7: Implementar `src/components/ConfiguracaoInvalida.tsx`**

```tsx
import { StyleSheet, View } from 'react-native';

import { Icone } from '@/components/Icone';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';

interface Props {
  mensagem: string;
}

/** Mostrada no lugar do app quando EXPO_PUBLIC_API_URL é inválida: sem ela não há como falar com o backend. */
export function ConfiguracaoInvalida({ mensagem }: Props) {
  return (
    <Tela areaSegura centralizar>
      <View style={estilos.conteudo}>
        <Icone nome="erro" tamanho={28} cor="negativo" />
        <Texto variante="titulo" role="heading" style={estilos.centro}>
          Endereço do servidor inválido
        </Texto>
        <Texto role="alert" style={estilos.centro}>
          {mensagem}
        </Texto>
        <Texto cor="secundario" style={estilos.centro}>
          Corrija o arquivo .env do app e reinicie o Metro com &quot;npx expo start -c&quot;.
        </Texto>
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: espaco.md, alignItems: 'center', padding: espaco.lg },
  centro: { textAlign: 'center' },
});
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx jest src/components/configuracao.test.tsx`
Expected: PASS.

- [ ] **Step 9: Usar a validação no layout raiz**

Em `app/_layout.tsx`, acrescentar os imports (em ordem alfabética, junto dos demais `@/`):

```ts
import { ConfiguracaoInvalida } from '@/components/ConfiguracaoInvalida';
import { lerUrlDaApi } from '@/config/ambiente';
```

Trocar o início do bloco de configuração:

```ts
configurarApi({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000',
```

por:

```ts
// A URL é embutida no bundle pelo Metro. Inválida, o app mostra como corrigir em vez de "sem conexão" em toda tela.
let erroDeConfiguracao: string | null = null;
let baseUrl = '';
try {
  baseUrl = lerUrlDaApi(process.env.EXPO_PUBLIC_API_URL);
} catch (erro) {
  erroDeConfiguracao = erro instanceof Error ? erro.message : String(erro);
}

configurarApi({
  baseUrl,
```

E, logo depois de `if (!pronto) return null;`, acrescentar:

```tsx
  if (erroDeConfiguracao) {
    return (
      <SafeAreaProvider>
        <ConfiguracaoInvalida mensagem={erroDeConfiguracao} />
      </SafeAreaProvider>
    );
  }
```

- [ ] **Step 10: Verificar e commitar**

Run: `npm run verificar`
Expected: exit 0.

```bash
git add src/config/ambiente.ts src/config/ambiente.test.ts src/components/ConfiguracaoInvalida.tsx src/components/configuracao.test.tsx app/_layout.tsx
git commit -m "feat(config): valida o endereço da API e mostra como corrigir quando é inválido" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Primeiro teste em aparelho (manual, com o usuário)

**Files:** nenhum (o `.env` é local e ignorado pelo git).

**Interfaces:** nenhuma. Objetivo: provar celular → backend local pelo IP antes de mexer na sessão.

- [ ] **Step 1: Subir o backend**

```bash
cd /c/Users/Bruno/Insight-flow-backend
docker compose up -d
curl -s http://localhost:8000/health
```

Expected: `{"status":"ok"}`. Se o Docker Desktop estiver desligado, pedir ao usuário para abri-lo.

- [ ] **Step 2: Descobrir o IP e liberar a porta**

Pedir ao usuário para rodar `ipconfig` e informar o "Endereço IPv4" do Wi-Fi. Depois, num PowerShell **como administrador**:

```powershell
New-NetFirewallRule -DisplayName "InsightFlow API 8000" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow -Profile Private
```

Conferir que a rede do Windows está como "Privada". No navegador do celular (mesmo Wi-Fi), abrir `http://<IP>:8000/health`.
Expected: `{"status":"ok"}` no celular.

- [ ] **Step 3: Configurar e abrir o app**

```bash
cd /c/Users/Bruno/Insight-flow-mobile
printf 'EXPO_PUBLIC_API_URL=http://<IP>:8000\n' > .env
npx expo start -c
```

(trocar `<IP>` pelo IP informado). O usuário abre o QR code no Expo Go (SDK 57).

- [ ] **Step 4: Roteiro mínimo**

O usuário cria uma conta, adiciona `PETR4` e `BTC` pela busca e abre o detalhe de `PETR4`.
Expected: watchlist com cotação, detalhe com gráfico e indicadores. Registrar no resumo do ciclo o que funcionou e o que apareceu de estranho (teclado, datas, fontes, gráfico Skia, sombras, alvo do "olho" da senha).

- [ ] **Step 5: Testar a tela de URL inválida**

Trocar o `.env` para `EXPO_PUBLIC_API_URL=http://<IP>:8000/api/v1`, reiniciar com `npx expo start -c` e reabrir.
Expected: tela "Endereço do servidor inválido". Voltar o `.env` ao valor correto e reiniciar.

---

### Task 5: Tipos alinhados ao backend atual

**Files:**
- Modify: `src/api/tipos.ts`, `src/dominio/rotulos.ts`, `app/(tabs)/perfil.tsx`
- Modify (fixtures): `src/components/notificacao.test.tsx`, `src/hooks/hooks.test.tsx`, `__tests__/telas/perfil.test.tsx`, `__tests__/telas/login.test.tsx`, `__tests__/telas/cadastro.test.tsx`

**Interfaces:**
- Produces:
  - `TipoAtivo` inclui `'INDICE'`; `TipoNotificacao` inclui `'RESUMO_DIARIO'`
  - `TokenResponse { access_token: string; refresh_token: string; token_type: string; expires_in: number }`
  - `RefreshRequest { refresh_token: string }`
  - `Notificacao.ativo_id: Uuid | null` e `Notificacao.contexto: Record<string, unknown>`

- [ ] **Step 1: Escrever o teste do resumo diário no Perfil**

Em `__tests__/telas/perfil.test.tsx`, acrescentar `contexto: {},` aos dois objetos de exemplo (`naoLida` e `lidaDeAtivoRemovido`), logo depois de `mensagem`. Depois, acrescentar o teste, logo após o teste `'mostra o e-mail e as notificações, com ticker quando conhecido'`:

```tsx
it('resumo diário aparece com o título do tipo e o toque só marca como lida', async () => {
  const user = userEvent.setup();
  const resumo: Notificacao = {
    id: 'n-3',
    ativo_id: null,
    tipo: 'RESUMO_DIARIO',
    mensagem: 'Resumo diario da carteira',
    contexto: { texto: 'A carteira fechou o dia estável.', aviso_legal: 'Análise gerada por IA.' },
    lida: false,
    criado_em: '2026-10-09T21:30:00Z',
  };
  jest.mocked(notificacoesApi.listar).mockResolvedValue([resumo]);
  jest.mocked(notificacoesApi.marcarComoLida).mockResolvedValue({ ...resumo, lida: true });
  await renderizar(<Perfil />);
  await user.press(await screen.findByRole('button', { name: /Resumo diário/ }));
  await waitFor(() => expect(notificacoesApi.marcarComoLida).toHaveBeenCalledWith('n-3'));
  expect(router.push).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Rodar o typecheck e ver falhar**

Run: `npm run typecheck`
Expected: FAIL. `'RESUMO_DIARIO'` não é atribuível a `TipoNotificacao`, `null` não é atribuível a `Uuid` e `contexto` não existe em `Notificacao`.

- [ ] **Step 3: Atualizar `src/api/tipos.ts`**

Trocar:

```ts
export type TipoAtivo = 'ACAO' | 'FII' | 'ETF' | 'BDR' | 'CRIPTO';
```

por:

```ts
/** INDICE é interno do backend (Ibovespa, usado no benchmark): não aparece na busca nem na watchlist. */
export type TipoAtivo = 'ACAO' | 'FII' | 'ETF' | 'BDR' | 'CRIPTO' | 'INDICE';
```

Trocar:

```ts
export type TipoNotificacao = 'SINAL_ATIVADO' | 'ALERTA_DISPARADO';
```

por:

```ts
export type TipoNotificacao = 'SINAL_ATIVADO' | 'ALERTA_DISPARADO' | 'RESUMO_DIARIO';
```

Trocar:

```ts
export interface TokenResponse {
  access_token: string;
  token_type: string;
}
```

por:

```ts
export interface TokenResponse {
  access_token: string;
  /** Opaco, 30 dias, rotativo: cada /auth/refresh devolve um novo e invalida o anterior. */
  refresh_token: string;
  token_type: string;
  /** Validade do access token em segundos (1800 por padrão). */
  expires_in: number;
}

export interface RefreshRequest {
  refresh_token: string;
}
```

Trocar:

```ts
export interface Notificacao {
  id: Uuid;
  ativo_id: Uuid;
  tipo: TipoNotificacao;
  mensagem: string;
  lida: boolean;
  criado_em: DataHoraISO;
}
```

por:

```ts
export interface Notificacao {
  id: Uuid;
  /** null no RESUMO_DIARIO. */
  ativo_id: Uuid | null;
  tipo: TipoNotificacao;
  /** No RESUMO_DIARIO é só o título; o texto completo vem em contexto.texto. */
  mensagem: string;
  /** SINAL_ATIVADO: {sinal_id, regra_id}; ALERTA_DISPARADO: {alerta_id, preco}; RESUMO_DIARIO: {texto, aviso_legal, ...}. */
  contexto: Record<string, unknown>;
  lida: boolean;
  criado_em: DataHoraISO;
}
```

- [ ] **Step 4: Completar os rótulos em `src/dominio/rotulos.ts`**

Acrescentar `INDICE: 'Índice',` ao fim de `ROTULO_TIPO_ATIVO`, `INDICE: 'Índices',` ao fim de `ROTULO_CLASSE_PLURAL` e `RESUMO_DIARIO: 'Resumo diário',` ao fim de `ROTULO_TIPO_NOTIFICACAO`.

- [ ] **Step 5: Tratar notificação sem ativo no Perfil**

Em `app/(tabs)/perfil.tsx`, trocar a função `abrir`:

```ts
  function abrir(notificacao: Notificacao) {
    if (!notificacao.lida) marcarLida.mutate(notificacao.id);
    const ticker = ativos.get(notificacao.ativo_id)?.ticker;
    router.push({
      pathname: '/ativo/[id]',
      params: ticker ? { id: notificacao.ativo_id, ticker } : { id: notificacao.ativo_id },
    });
  }
```

por:

```ts
  function abrir(notificacao: Notificacao) {
    if (!notificacao.lida) marcarLida.mutate(notificacao.id);
    // Resumo diário não tem ativo: por ora só marca como lida (a tela do resumo vem na etapa de notificações).
    if (!notificacao.ativo_id) return;
    const ticker = ativos.get(notificacao.ativo_id)?.ticker;
    router.push({
      pathname: '/ativo/[id]',
      params: ticker ? { id: notificacao.ativo_id, ticker } : { id: notificacao.ativo_id },
    });
  }
```

E, no `renderItem`, trocar:

```tsx
          ticker={ativos.get(item.ativo_id)?.ticker ?? null}
```

por:

```tsx
          ticker={item.ativo_id ? (ativos.get(item.ativo_id)?.ticker ?? null) : null}
```

- [ ] **Step 6: Atualizar as fixtures que o typecheck aponta**

Em `src/components/notificacao.test.tsx`, acrescentar `contexto: {},` ao objeto `notificacao`, depois de `mensagem`.

Em `src/hooks/hooks.test.tsx`, nos dois objetos de `useNaoLidas`, acrescentar `contexto: {},` depois de `mensagem: 'x',` e de `mensagem: 'y',`.

Em `__tests__/telas/login.test.tsx` (três ocorrências) e `__tests__/telas/cadastro.test.tsx` (duas ocorrências), trocar `{ access_token: 'tok', token_type: 'bearer' }` por:

```ts
{ access_token: 'tok', refresh_token: 'ref', token_type: 'bearer', expires_in: 1800 }
```

e `{ access_token: 'novo', token_type: 'bearer' }` por:

```ts
{ access_token: 'novo', refresh_token: 'ref', token_type: 'bearer', expires_in: 1800 }
```

- [ ] **Step 7: Rodar o teste novo e a verificação**

Run: `npx jest __tests__/telas/perfil.test.tsx` → PASS, incluindo `resumo diário aparece com o título do tipo e o toque só marca como lida`.
Run: `npm run verificar` → exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/api/tipos.ts src/dominio/rotulos.ts "app/(tabs)/perfil.tsx" src/components/notificacao.test.tsx src/hooks/hooks.test.tsx __tests__/telas/perfil.test.tsx __tests__/telas/login.test.tsx __tests__/telas/cadastro.test.tsx
git commit -m "fix(tipos): alinha os tipos ao backend atual e não navega em notificação sem ativo" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Cliente HTTP com renovação de sessão, tempo limite por chamada e metadados de erro

**Files:**
- Modify (reescrita): `src/api/client.ts`, `src/api/client.test.ts`
- Modify: `src/api/recursos.test.ts` (configuração do client), `app/_layout.tsx` (configuração temporária)

**Interfaces:**
- Consumes: nada de tarefas anteriores além dos tipos.
- Produces (usado pelas Tarefas 7 e 8):
  - `type CausaFalha = 'rede' | 'tempo'`
  - `interface DetalhesErro { requestId?: string; retryAfterSegundos?: number; causa?: CausaFalha }`
  - `class ApiError extends Error { status: number; requestId?: string; retryAfterSegundos?: number; causa?: CausaFalha; constructor(status: number, mensagem: string, detalhes?: DetalhesErro) }`
  - `TIMEOUT_PADRAO_MS = 20_000`
  - `configurarApi(config: { baseUrl: string; obterToken: () => string | null; tokenPertoDeVencer: () => boolean; renovarToken: () => Promise<string | null>; timeoutMs?: number }): void`
  - `request<T>(caminho: string, opcoes?: { metodo?; corpo?; query?; timeoutMs?: number }): Promise<T>`
  - Contrato de `renovarToken`: resolve com o novo access token; resolve com `null` quando a sessão acabou; rejeita quando não deu para renovar (rede). Quem implementa garante uma renovação por vez.

- [ ] **Step 1: Reescrever `src/api/client.test.ts` com os comportamentos novos**

```ts
import { ApiError, configurarApi, request } from '@/api/client';

type RespostaFalsa = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  headers: { get: (nome: string) => string | null };
};

function resposta(status: number, corpo?: unknown, cabecalhos: Record<string, string> = {}): RespostaFalsa {
  const porNome = new Map(Object.entries(cabecalhos).map(([nome, valor]) => [nome.toLowerCase(), valor]));
  return {
    ok: status >= 200 && status < 300,
    status,
    json: corpo === undefined ? () => Promise.reject(new SyntaxError('sem corpo')) : () => Promise.resolve(corpo),
    headers: { get: (nome) => porNome.get(nome.toLowerCase()) ?? null },
  };
}

/** fetch que só termina quando o client aborta (para testar o tempo limite). */
function pendurado(_url: string, init: RequestInit): Promise<never> {
  return new Promise((_resolver, rejeitar) => {
    init.signal?.addEventListener('abort', () => rejeitar(new Error('abortado')));
  });
}

const fetchMock = jest.fn();
const renovarToken = jest.fn<Promise<string | null>, []>();
let token: string | null = null;
let pertoDeVencer = false;

beforeEach(() => {
  fetchMock.mockReset();
  renovarToken.mockReset();
  token = null;
  pertoDeVencer = false;
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  configurarApi({
    baseUrl: 'http://api.teste/',
    obterToken: () => token,
    tokenPertoDeVencer: () => pertoDeVencer,
    renovarToken,
  });
});

function autorizacaoDaChamada(indice: number): string | undefined {
  return fetchMock.mock.calls[indice][1].headers.Authorization;
}

describe('montagem da requisição', () => {
  it('monta a URL com /api/v1 e query string codificada, ignorando undefined', async () => {
    fetchMock.mockResolvedValue(resposta(200, []));
    await request('/ativos/buscar', { query: { termo: 'petr 4', vazio: undefined } });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.teste/api/v1/ativos/buscar?termo=petr%204',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('envia Authorization quando há token', async () => {
    token = 'abc';
    fetchMock.mockResolvedValue(resposta(200, {}));
    await request('/watchlist');
    expect(autorizacaoDaChamada(0)).toBe('Bearer abc');
  });

  it('não envia Authorization sem token', async () => {
    fetchMock.mockResolvedValue(resposta(200, {}));
    await request('/watchlist');
    expect(autorizacaoDaChamada(0)).toBeUndefined();
  });

  it('nunca envia Authorization nas rotas /auth/, mesmo com sessão', async () => {
    token = 'abc';
    fetchMock.mockResolvedValue(resposta(200, {}));
    await request('/auth/refresh', { metodo: 'POST', corpo: { refresh_token: 'r' } });
    expect(autorizacaoDaChamada(0)).toBeUndefined();
  });

  it('serializa o corpo como JSON', async () => {
    fetchMock.mockResolvedValue(resposta(201, { ok: true }));
    await request('/watchlist', { metodo: 'POST', corpo: { ticker: 'PETR4' } });
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"ticker":"PETR4"}');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('envia um X-Request-ID no formato aceito pelo backend', async () => {
    fetchMock.mockResolvedValue(resposta(200, {}));
    await request('/watchlist');
    expect(fetchMock.mock.calls[0][1].headers['X-Request-ID']).toMatch(/^[A-Za-z0-9._-]{1,64}$/);
  });
});

describe('respostas de sucesso', () => {
  it('devolve o JSON em 2xx', async () => {
    fetchMock.mockResolvedValue(resposta(200, [{ id: 1 }]));
    await expect(request('/watchlist')).resolves.toEqual([{ id: 1 }]);
  });

  it('204 devolve undefined', async () => {
    fetchMock.mockResolvedValue(resposta(204));
    await expect(request('/watchlist/x', { metodo: 'DELETE' })).resolves.toBeUndefined();
  });

  it('2xx com corpo que não é JSON vira ApiError de status 0', async () => {
    fetchMock.mockResolvedValue(resposta(200));
    const erro = await request('/x').catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro).toMatchObject({ status: 0, message: 'Resposta inválida do servidor' });
  });
});

describe('erros', () => {
  it('detail string vira a mensagem do erro', async () => {
    fetchMock.mockResolvedValue(resposta(409, { detail: 'Ativo ja esta na watchlist' }));
    await expect(request('/watchlist')).rejects.toMatchObject({ status: 409, message: 'Ativo ja esta na watchlist' });
  });

  it('detail lista (422 do Pydantic) une as mensagens', async () => {
    fetchMock.mockResolvedValue(
      resposta(422, {
        detail: [
          { loc: ['body', 'quantidade'], msg: 'Input should be greater than 0', type: 'greater_than' },
          { loc: ['body', 'data'], msg: 'Field required', type: 'missing' },
        ],
      }),
    );
    await expect(request('/operacoes')).rejects.toMatchObject({
      status: 422,
      message: 'Input should be greater than 0; Field required',
    });
  });

  it('corpo sem detail usa mensagem padrão', async () => {
    fetchMock.mockResolvedValue(resposta(500, {}));
    await expect(request('/x')).rejects.toMatchObject({ status: 500, message: 'Erro 500' });
  });

  it('corpo que não é JSON usa mensagem padrão', async () => {
    fetchMock.mockResolvedValue(resposta(502));
    await expect(request('/x')).rejects.toMatchObject({ status: 502, message: 'Erro 502' });
  });

  it('o erro guarda o X-Request-ID devolvido pelo servidor', async () => {
    fetchMock.mockResolvedValue(resposta(500, {}, { 'X-Request-ID': 'srv-123' }));
    await expect(request('/x')).rejects.toMatchObject({ requestId: 'srv-123' });
  });

  it('sem o header na resposta, o erro guarda o id enviado', async () => {
    fetchMock.mockResolvedValue(resposta(404, { detail: 'x' }));
    const erro = (await request('/x').catch((e: unknown) => e)) as ApiError;
    expect(erro.requestId).toBe(fetchMock.mock.calls[0][1].headers['X-Request-ID']);
  });

  it('Retry-After em segundos vira retryAfterSegundos', async () => {
    fetchMock.mockResolvedValue(resposta(503, { detail: 'Cota do provedor de IA excedida' }, { 'Retry-After': '42' }));
    await expect(request('/chat')).rejects.toMatchObject({ status: 503, retryAfterSegundos: 42 });
  });

  it('Retry-After que não é um número de segundos é ignorado', async () => {
    fetchMock.mockResolvedValue(resposta(503, {}, { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' }));
    const erro = (await request('/chat').catch((e: unknown) => e)) as ApiError;
    expect(erro.retryAfterSegundos).toBeUndefined();
  });

  it('falha de rede vira status 0 com causa rede e o endereço do servidor', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const erro = await request('/x').catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro).toMatchObject({ status: 0, causa: 'rede', message: 'Sem conexão com o servidor (http://api.teste)' });
  });
});

describe('tempo limite', () => {
  it('o padrão de 20 s aborta e vira causa tempo', async () => {
    jest.useFakeTimers();
    try {
      fetchMock.mockImplementation(pendurado);
      const promessa = request('/lento');
      jest.advanceTimersByTime(20_000);
      await expect(promessa).rejects.toMatchObject({
        status: 0,
        causa: 'tempo',
        message: 'O servidor demorou demais para responder',
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('timeoutMs da chamada substitui o padrão', async () => {
    jest.useFakeTimers();
    try {
      fetchMock.mockImplementation(pendurado);
      let terminou = false;
      const promessa = request('/ativos/a-1/analise', { timeoutMs: 70_000 }).finally(() => {
        terminou = true;
      });
      await jest.advanceTimersByTimeAsync(20_000);
      expect(terminou).toBe(false);
      await jest.advanceTimersByTimeAsync(50_000);
      await expect(promessa).rejects.toMatchObject({ causa: 'tempo' });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('renovação de sessão', () => {
  it('401 renova e repete uma vez com o token novo', async () => {
    token = 'velho';
    fetchMock.mockResolvedValueOnce(resposta(401, { detail: 'Token invalido' })).mockResolvedValueOnce(resposta(200, { ok: true }));
    renovarToken.mockImplementation(async () => {
      token = 'novo';
      return 'novo';
    });
    await expect(request('/watchlist')).resolves.toEqual({ ok: true });
    expect(renovarToken).toHaveBeenCalledTimes(1);
    expect(autorizacaoDaChamada(1)).toBe('Bearer novo');
  });

  it('um segundo 401 depois de renovar vai para quem chamou', async () => {
    token = 'velho';
    fetchMock.mockResolvedValue(resposta(401, { detail: 'Usuario nao encontrado' }));
    renovarToken.mockImplementation(async () => {
      token = 'novo';
      return 'novo';
    });
    await expect(request('/watchlist')).rejects.toMatchObject({ status: 401, message: 'Usuario nao encontrado' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(renovarToken).toHaveBeenCalledTimes(1);
  });

  it('renovação recusada (sessão acabou) não repete e devolve o 401', async () => {
    token = 'velho';
    fetchMock.mockResolvedValue(resposta(401, { detail: 'Token invalido' }));
    renovarToken.mockResolvedValue(null);
    await expect(request('/watchlist')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falha de rede ao renovar vira o erro da requisição', async () => {
    token = 'velho';
    fetchMock.mockResolvedValue(resposta(401, { detail: 'Token invalido' }));
    renovarToken.mockRejectedValue(new ApiError(0, 'Sem conexão com o servidor (http://api.teste)', { causa: 'rede' }));
    await expect(request('/watchlist')).rejects.toMatchObject({ status: 0, causa: 'rede' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('401 quando outra requisição já renovou repete com o token vigente, sem renovar de novo', async () => {
    token = 'velho';
    fetchMock
      .mockImplementationOnce(async () => {
        token = 'novo';
        return resposta(401, { detail: 'Token invalido' });
      })
      .mockResolvedValueOnce(resposta(200, []));
    await expect(request('/watchlist')).resolves.toEqual([]);
    expect(renovarToken).not.toHaveBeenCalled();
    expect(autorizacaoDaChamada(1)).toBe('Bearer novo');
  });

  it('401 depois do logout não repete', async () => {
    token = 'tok';
    fetchMock.mockImplementationOnce(async () => {
      token = null;
      return resposta(401, { detail: 'Token invalido' });
    });
    await expect(request('/watchlist')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(renovarToken).not.toHaveBeenCalled();
  });

  it('401 numa rota /auth/ não renova', async () => {
    token = 'tok';
    fetchMock.mockResolvedValue(resposta(401, { detail: 'Credenciais inválidas' }));
    await expect(request('/auth/login', { metodo: 'POST', corpo: {} })).rejects.toMatchObject({ status: 401 });
    expect(renovarToken).not.toHaveBeenCalled();
  });

  it('token perto de vencer é renovado antes de enviar', async () => {
    token = 'velho';
    pertoDeVencer = true;
    renovarToken.mockImplementation(async () => {
      token = 'novo';
      return 'novo';
    });
    fetchMock.mockResolvedValue(resposta(200, []));
    await request('/watchlist');
    expect(renovarToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(autorizacaoDaChamada(0)).toBe('Bearer novo');
  });

  it('renovação antecipada sem rede segue com o token atual', async () => {
    token = 'velho';
    pertoDeVencer = true;
    renovarToken.mockRejectedValue(new ApiError(0, 'Sem conexão', { causa: 'rede' }));
    fetchMock.mockResolvedValue(resposta(200, []));
    await expect(request('/watchlist')).resolves.toEqual([]);
    expect(autorizacaoDaChamada(0)).toBe('Bearer velho');
  });

  it('renovação antecipada recusada encerra sem enviar a requisição', async () => {
    token = 'velho';
    pertoDeVencer = true;
    renovarToken.mockResolvedValue(null);
    await expect(request('/watchlist')).rejects.toMatchObject({ status: 401, message: 'Sessão encerrada. Entre novamente.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/api/client.test.ts`
Expected: FAIL. O typecheck do ts-jest não é usado (Babel), então as falhas são de comportamento: `Authorization` enviado em `/auth/refresh`, `X-Request-ID` ausente, `causa`/`requestId`/`retryAfterSegundos` indefinidos, tempo limite de 15 s e `renovarToken` nunca chamado.

- [ ] **Step 3: Reescrever `src/api/client.ts`**

```ts
// Camada HTTP sem dependência de React Native: pode ser copiada pelo cliente web.

export type CausaFalha = 'rede' | 'tempo';

export interface DetalhesErro {
  /** X-Request-ID da chamada: localiza a requisição nos logs do backend. */
  requestId?: string;
  /** Segundos do header Retry-After (ex.: cota da IA excedida). */
  retryAfterSegundos?: number;
  /** Só com status 0: sem conexão ou tempo esgotado. */
  causa?: CausaFalha;
}

export class ApiError extends Error {
  readonly status: number;
  readonly requestId?: string;
  readonly retryAfterSegundos?: number;
  readonly causa?: CausaFalha;

  constructor(status: number, mensagem: string, detalhes: DetalhesErro = {}) {
    super(mensagem);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = detalhes.requestId;
    this.retryAfterSegundos = detalhes.retryAfterSegundos;
    this.causa = detalhes.causa;
  }
}

interface ConfigApi {
  /** Raiz do servidor, sem /api/v1 (ver src/config/ambiente.ts). */
  baseUrl: string;
  obterToken: () => string | null;
  /** Verdadeiro quando o access token vence logo: o client renova antes de usar. */
  tokenPertoDeVencer: () => boolean;
  /**
   * Resolve com o novo access token, ou com null quando a sessão acabou (refresh recusado).
   * Rejeita quando não deu para renovar (ex.: sem rede). Quem implementa garante uma renovação por vez.
   */
  renovarToken: () => Promise<string | null>;
  timeoutMs?: number;
}

type Metodo = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type ValorQuery = string | number | boolean | undefined;

interface OpcoesRequest {
  metodo?: Metodo;
  corpo?: unknown;
  query?: Record<string, ValorQuery>;
  /** Tempo limite desta chamada (IA e a primeira coleta da watchlist demoram mais que o padrão). */
  timeoutMs?: number;
}

interface Enviada {
  resposta: Response;
  requestId: string;
}

export const TIMEOUT_PADRAO_MS = 20_000;

let config: ConfigApi | null = null;

export function configurarApi(novaConfig: ConfigApi): void {
  config = { ...novaConfig, baseUrl: novaConfig.baseUrl.replace(/\/+$/, '') };
}

/** Login, refresh e logout nunca levam Authorization nem disparam renovação. */
function rotaDeSessao(caminho: string): boolean {
  return caminho.startsWith('/auth/');
}

function montarUrl(baseUrl: string, caminho: string, query?: Record<string, ValorQuery>): string {
  const base = `${baseUrl}/api/v1${caminho}`;
  if (!query) return base;
  const partes = Object.entries(query)
    .filter((par): par is [string, string | number | boolean] => par[1] !== undefined)
    .map(([chave, valor]) => `${encodeURIComponent(chave)}=${encodeURIComponent(String(valor))}`);
  return partes.length > 0 ? `${base}?${partes.join('&')}` : base;
}

// O backend aceita até 64 caracteres em [A-Za-z0-9._-]; o prefixo identifica o cliente mobile nos logs.
function novoRequestId(): string {
  return `mob-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function lerCabecalho(resposta: Response, nome: string): string | null {
  // Respostas falsas de teste (e alguns polyfills de fetch) não trazem headers.
  return resposta.headers?.get(nome) ?? null;
}

function lerRetryAfter(resposta: Response): number | undefined {
  const valor = lerCabecalho(resposta, 'Retry-After')?.trim();
  return valor && /^\d+$/.test(valor) ? Number(valor) : undefined;
}

async function extrairMensagem(resposta: Response): Promise<string> {
  const padrao = `Erro ${resposta.status}`;
  let corpo: unknown;
  try {
    corpo = await resposta.json();
  } catch {
    return padrao;
  }
  const detail = (corpo as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const mensagens = detail
      .map((item: unknown) =>
        item !== null && typeof item === 'object' && 'msg' in item ? String((item as { msg: unknown }).msg) : null,
      )
      .filter((mensagem): mensagem is string => mensagem !== null);
    if (mensagens.length > 0) return mensagens.join('; ');
  }
  return padrao;
}

async function enviar(atual: ConfigApi, caminho: string, opcoes: OpcoesRequest, token: string | null): Promise<Enviada> {
  const requestId = novoRequestId();
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Request-ID': requestId };
  if (opcoes.corpo !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const controlador = new AbortController();
  let esgotou = false;
  const temporizador = setTimeout(
    () => {
      esgotou = true;
      controlador.abort();
    },
    opcoes.timeoutMs ?? atual.timeoutMs ?? TIMEOUT_PADRAO_MS,
  );

  try {
    const resposta = await fetch(montarUrl(atual.baseUrl, caminho, opcoes.query), {
      method: opcoes.metodo ?? 'GET',
      headers,
      body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
      signal: controlador.signal,
    });
    return { resposta, requestId };
  } catch {
    throw esgotou
      ? new ApiError(0, 'O servidor demorou demais para responder', { causa: 'tempo', requestId })
      : new ApiError(0, `Sem conexão com o servidor (${atual.baseUrl})`, { causa: 'rede', requestId });
  } finally {
    clearTimeout(temporizador);
  }
}

async function interpretar<T>({ resposta, requestId }: Enviada): Promise<T> {
  const id = lerCabecalho(resposta, 'X-Request-ID') ?? requestId;
  if (!resposta.ok) {
    throw new ApiError(resposta.status, await extrairMensagem(resposta), {
      requestId: id,
      retryAfterSegundos: lerRetryAfter(resposta),
    });
  }
  if (resposta.status === 204) return undefined as T;
  try {
    return (await resposta.json()) as T;
  } catch {
    throw new ApiError(0, 'Resposta inválida do servidor', { requestId: id });
  }
}

/** Renovação antes de enviar. Sem rede, tenta com o token atual: o servidor decide se ainda vale. */
async function renovarAntesDeEnviar(atual: ConfigApi, token: string): Promise<string> {
  let novo: string | null;
  try {
    novo = await atual.renovarToken();
  } catch {
    return token;
  }
  if (novo === null) throw new ApiError(401, 'Sessão encerrada. Entre novamente.');
  return novo;
}

/** Depois de um 401: se outra requisição já renovou (ou a sessão acabou), usa o token vigente; senão renova agora. */
async function tokenParaRepetir(atual: ConfigApi, tokenUsado: string): Promise<string | null> {
  const vigente = atual.obterToken();
  if (vigente !== tokenUsado) return vigente;
  return atual.renovarToken();
}

export async function request<T>(caminho: string, opcoes: OpcoesRequest = {}): Promise<T> {
  if (!config) throw new Error('configurarApi() precisa ser chamada antes de request()');
  const atual = config;

  let token = rotaDeSessao(caminho) ? null : atual.obterToken();
  if (token && atual.tokenPertoDeVencer()) token = await renovarAntesDeEnviar(atual, token);

  let enviada = await enviar(atual, caminho, opcoes, token);
  if (enviada.resposta.status === 401 && token) {
    // Uma única repetição: um segundo 401, já com o token novo, vai direto para quem chamou.
    const novo = await tokenParaRepetir(atual, token);
    if (novo) enviada = await enviar(atual, caminho, opcoes, novo);
  }
  return interpretar<T>(enviada);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/api/client.test.ts`
Expected: PASS (todos os testes do arquivo).

- [ ] **Step 5: Ajustar quem chama `configurarApi`**

Em `src/api/recursos.test.ts`, trocar:

```ts
  configurarApi({ baseUrl: 'http://api', obterToken: () => 'tok', aoNaoAutorizado: jest.fn() });
```

por:

```ts
  configurarApi({
    baseUrl: 'http://api',
    obterToken: () => 'tok',
    tokenPertoDeVencer: () => false,
    renovarToken: jest.fn(async () => null),
  });
```

Em `app/_layout.tsx`, trocar o restante da chamada `configurarApi` (a partir de `obterToken`):

```ts
  obterToken: () => useSessao.getState().token,
  // Token vencido ou inválido: volta ao login (não há refresh token no backend).
  // `sair` propaga falhas do SecureStore e vários 401 podem disparar em paralelo: sem o `.catch` haveria rejeição não tratada.
  aoNaoAutorizado: () => {
    void useSessao
      .getState()
      .sair()
      .catch(() => {});
  },
});
```

por (provisório; a Tarefa 7 liga a renovação de verdade):

```ts
  obterToken: () => useSessao.getState().token,
  // Provisório até a sessão guardar o refresh token (Tarefa 7): 401 continua levando ao login.
  tokenPertoDeVencer: () => false,
  renovarToken: async () => {
    await useSessao
      .getState()
      .sair()
      .catch(() => {});
    return null;
  },
});
```

- [ ] **Step 6: Verificar e commitar**

Run: `npm run verificar`
Expected: exit 0.

```bash
git add src/api/client.ts src/api/client.test.ts src/api/recursos.test.ts app/_layout.tsx
git commit -m "feat(api): renova a sessão no client e adiciona tempo limite por chamada, X-Request-ID e Retry-After" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Sessão com refresh token, renovação serializada e logout no servidor

**Files:**
- Modify: `src/api/auth.ts`, `src/store/sessao.ts` (reescrita), `src/store/sessao.test.ts` (reescrita), `app/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/cadastro.tsx`, `src/api/recursos.test.ts`, `__tests__/telas/login.test.tsx`, `__tests__/telas/cadastro.test.tsx`, `__tests__/telas/perfil.test.tsx`
- Create: `src/store/sessaoHttp.test.ts`

**Interfaces:**
- Consumes: `request`, `configurarApi`, `ApiError` (Tarefa 6); `TokenResponse`, `RefreshRequest` (Tarefa 5).
- Produces:
  - `authApi.renovar(refreshToken: string): Promise<TokenResponse>` e `authApi.sair(refreshToken: string): Promise<void>`
  - `MARGEM_RENOVACAO_MS = 60_000`
  - `pertoDeVencer(expiraEm: number | null, agora?: number): boolean`
  - `useSessao` com estado `{ status, token, refreshToken, expiraEm, email }` e ações `hidratar()`, `entrar(tokens: TokenResponse, email: string)`, `renovar(): Promise<string | null>`, `sair(opcoes?: { revogarNoServidor?: boolean })`
  - SecureStore: chave única `insightflow.sessao` com JSON `{ accessToken, refreshToken, expiraEm, email }`

- [ ] **Step 1: Acrescentar os casos de `renovar` e `sair` em `src/api/recursos.test.ts`**

Logo depois da linha do caso `'auth.cadastrar'` em `casos`, acrescentar:

```ts
  ['auth.renovar', () => authApi.renovar('ref-1'), 'POST', '/auth/refresh', { refresh_token: 'ref-1' }],
  ['auth.sair', () => authApi.sair('ref-1'), 'POST', '/auth/logout', { refresh_token: 'ref-1' }],
```

- [ ] **Step 2: Reescrever `src/store/sessao.test.ts`**

```ts
import * as SecureStore from 'expo-secure-store';

import { authApi } from '@/api/auth';
import { ApiError } from '@/api/client';
import type { TokenResponse } from '@/api/tipos';
import { queryClient } from '@/hooks/queryClient';
import { pertoDeVencer, useSessao } from '@/store/sessao';

jest.mock('@/api/auth', () => ({ authApi: { renovar: jest.fn(), sair: jest.fn() } }));

const armazenamento = (SecureStore as unknown as { __armazenamento: Map<string, string> }).__armazenamento;
const CHAVE = 'insightflow.sessao';

function tokens(sufixo: string): TokenResponse {
  return { access_token: `acc-${sufixo}`, refresh_token: `ref-${sufixo}`, token_type: 'bearer', expires_in: 1800 };
}

function sessaoSalva(): unknown {
  const bruto = armazenamento.get(CHAVE);
  return bruto === undefined ? undefined : JSON.parse(bruto);
}

const AUTENTICADO = {
  status: 'autenticado',
  token: 'acc-1',
  refreshToken: 'ref-1',
  expiraEm: 0,
  email: 'ana@exemplo.com',
} as const;

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  armazenamento.clear();
  useSessao.setState({ status: 'carregando', token: null, refreshToken: null, expiraEm: null, email: null });
  // authApi.sair é chamado sem await e com .catch: o mock precisa devolver uma promessa.
  jest.mocked(authApi.sair).mockResolvedValue(undefined);
});

describe('hidratar', () => {
  it('sem sessão salva fica anônimo', async () => {
    await useSessao.getState().hidratar();
    expect(useSessao.getState().status).toBe('anonimo');
  });

  it('com sessão salva fica autenticado com os dois tokens', async () => {
    armazenamento.set(
      CHAVE,
      JSON.stringify({ accessToken: 'acc-1', refreshToken: 'ref-1', expiraEm: 123, email: 'ana@exemplo.com' }),
    );
    await useSessao.getState().hidratar();
    expect(useSessao.getState()).toMatchObject({
      status: 'autenticado',
      token: 'acc-1',
      refreshToken: 'ref-1',
      expiraEm: 123,
      email: 'ana@exemplo.com',
    });
  });

  it('sessão do MVP antigo (só access token) fica anônima e as chaves antigas são apagadas', async () => {
    armazenamento.set('insightflow.token', 'tok-antigo');
    armazenamento.set('insightflow.email', 'ana@exemplo.com');
    await useSessao.getState().hidratar();
    expect(useSessao.getState().status).toBe('anonimo');
    expect(armazenamento.has('insightflow.token')).toBe(false);
    expect(armazenamento.has('insightflow.email')).toBe(false);
  });

  it.each(['{nao é json', JSON.stringify({ accessToken: 1 }), JSON.stringify(null)])(
    'sessão salva inválida (%s) fica anônima',
    async (bruto) => {
      armazenamento.set(CHAVE, bruto);
      await useSessao.getState().hidratar();
      expect(useSessao.getState().status).toBe('anonimo');
    },
  );

  it('falha de leitura fica anônimo', async () => {
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('keystore indisponível'));
    await useSessao.getState().hidratar();
    expect(useSessao.getState().status).toBe('anonimo');
  });
});

describe('entrar', () => {
  it('grava a sessão numa única chave, com o vencimento calculado, e autentica', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    await useSessao.getState().entrar(tokens('1'), 'ana@exemplo.com');
    expect(sessaoSalva()).toEqual({
      accessToken: 'acc-1',
      refreshToken: 'ref-1',
      expiraEm: 2_800_000,
      email: 'ana@exemplo.com',
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    expect(useSessao.getState()).toMatchObject({ status: 'autenticado', token: 'acc-1', refreshToken: 'ref-1', expiraEm: 2_800_000 });
  });

  it('falha ao gravar mantém anônimo e repassa o erro', async () => {
    useSessao.setState({ status: 'anonimo' });
    const falha = new Error('keystore cheio');
    jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(falha);
    await expect(useSessao.getState().entrar(tokens('1'), 'ana@exemplo.com')).rejects.toBe(falha);
    expect(armazenamento.size).toBe(0);
    expect(useSessao.getState()).toMatchObject({ status: 'anonimo', token: null, refreshToken: null });
  });
});

describe('renovar', () => {
  beforeEach(() => useSessao.setState(AUTENTICADO));

  it('troca o par, guarda o refresh novo e devolve o access novo', async () => {
    jest.mocked(authApi.renovar).mockResolvedValue(tokens('2'));
    await expect(useSessao.getState().renovar()).resolves.toBe('acc-2');
    expect(authApi.renovar).toHaveBeenCalledWith('ref-1');
    expect(useSessao.getState()).toMatchObject({ token: 'acc-2', refreshToken: 'ref-2' });
    expect(sessaoSalva()).toMatchObject({ accessToken: 'acc-2', refreshToken: 'ref-2', email: 'ana@exemplo.com' });
  });

  it('chamadas simultâneas fazem uma única renovação', async () => {
    let liberar: (valor: TokenResponse) => void = () => {};
    jest.mocked(authApi.renovar).mockReturnValue(new Promise<TokenResponse>((resolver) => (liberar = resolver)));
    const primeira = useSessao.getState().renovar();
    const segunda = useSessao.getState().renovar();
    liberar(tokens('2'));
    await expect(Promise.all([primeira, segunda])).resolves.toEqual(['acc-2', 'acc-2']);
    expect(authApi.renovar).toHaveBeenCalledTimes(1);
  });

  it('depois de terminar, a próxima renovação usa o refresh novo', async () => {
    jest.mocked(authApi.renovar).mockResolvedValueOnce(tokens('2')).mockResolvedValueOnce(tokens('3'));
    await useSessao.getState().renovar();
    await useSessao.getState().renovar();
    expect(authApi.renovar).toHaveBeenNthCalledWith(1, 'ref-1');
    expect(authApi.renovar).toHaveBeenNthCalledWith(2, 'ref-2');
  });

  it('refresh recusado (401) encerra a sessão sem pedir logout ao servidor', async () => {
    armazenamento.set(CHAVE, 'qualquer');
    jest.mocked(authApi.renovar).mockRejectedValue(new ApiError(401, 'Refresh token invalido'));
    await expect(useSessao.getState().renovar()).resolves.toBeNull();
    expect(useSessao.getState().status).toBe('anonimo');
    expect(armazenamento.has(CHAVE)).toBe(false);
    expect(authApi.sair).not.toHaveBeenCalled();
  });

  it('falha de rede rejeita e mantém a sessão', async () => {
    const semRede = new ApiError(0, 'Sem conexão com o servidor (http://api)', { causa: 'rede' });
    jest.mocked(authApi.renovar).mockRejectedValue(semRede);
    await expect(useSessao.getState().renovar()).rejects.toBe(semRede);
    expect(useSessao.getState()).toMatchObject({ status: 'autenticado', token: 'acc-1', refreshToken: 'ref-1' });
  });

  it('logout durante a renovação não ressuscita a sessão', async () => {
    let liberar: (valor: TokenResponse) => void = () => {};
    jest.mocked(authApi.renovar).mockReturnValue(new Promise<TokenResponse>((resolver) => (liberar = resolver)));
    const renovacao = useSessao.getState().renovar();
    await useSessao.getState().sair();
    liberar(tokens('2'));
    await expect(renovacao).resolves.toBeNull();
    expect(useSessao.getState().status).toBe('anonimo');
    expect(armazenamento.has(CHAVE)).toBe(false);
  });

  it('falha ao gravar a sessão renovada mantém os tokens novos em memória', async () => {
    jest.mocked(authApi.renovar).mockResolvedValue(tokens('2'));
    jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('keystore cheio'));
    await expect(useSessao.getState().renovar()).resolves.toBe('acc-2');
    expect(useSessao.getState()).toMatchObject({ status: 'autenticado', token: 'acc-2', refreshToken: 'ref-2' });
  });

  it('sem refresh token devolve null sem chamar o servidor', async () => {
    useSessao.setState({ status: 'anonimo', token: null, refreshToken: null, expiraEm: null, email: null });
    await expect(useSessao.getState().renovar()).resolves.toBeNull();
    expect(authApi.renovar).not.toHaveBeenCalled();
  });
});

describe('sair', () => {
  it('revoga no servidor, apaga a sessão, limpa o cache e fica anônimo', async () => {
    const limpar = jest.spyOn(queryClient, 'clear');
    armazenamento.set(CHAVE, 'qualquer');
    useSessao.setState(AUTENTICADO);
    await useSessao.getState().sair();
    expect(authApi.sair).toHaveBeenCalledWith('ref-1');
    expect(armazenamento.size).toBe(0);
    expect(limpar).toHaveBeenCalled();
    expect(useSessao.getState()).toMatchObject({ status: 'anonimo', token: null, refreshToken: null, expiraEm: null, email: null });
  });

  it('falha ao revogar no servidor não impede a saída', async () => {
    jest.mocked(authApi.sair).mockRejectedValue(new ApiError(0, 'Sem conexão', { causa: 'rede' }));
    useSessao.setState(AUTENTICADO);
    await expect(useSessao.getState().sair()).resolves.toBeUndefined();
    expect(useSessao.getState().status).toBe('anonimo');
  });

  it('revogarNoServidor: false não chama o servidor', async () => {
    useSessao.setState(AUTENTICADO);
    await useSessao.getState().sair({ revogarNoServidor: false });
    expect(authApi.sair).not.toHaveBeenCalled();
  });

  it('duas saídas seguidas não quebram e revogam uma vez só', async () => {
    useSessao.setState(AUTENTICADO);
    await Promise.all([useSessao.getState().sair(), useSessao.getState().sair()]);
    expect(useSessao.getState().status).toBe('anonimo');
    expect(authApi.sair).toHaveBeenCalledTimes(1);
  });
});

describe('pertoDeVencer', () => {
  it.each([
    [null, false],
    [60_000, false],
    [59_999, true],
    [-1, true],
  ])('expiraEm %p com agora = 0 → %p', (expiraEm, esperado) => {
    expect(pertoDeVencer(expiraEm, 0)).toBe(esperado);
  });
});
```

- [ ] **Step 3: Escrever o teste de integração client + sessão**

`src/store/sessaoHttp.test.ts`:

```ts
import * as SecureStore from 'expo-secure-store';

import { configurarApi, request } from '@/api/client';
import { pertoDeVencer, useSessao } from '@/store/sessao';

// Integração real: client HTTP + store de sessão + authApi, só o fetch é falso.
const armazenamento = (SecureStore as unknown as { __armazenamento: Map<string, string> }).__armazenamento;
const fetchMock = jest.fn();

function resposta(status: number, corpo?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => (corpo === undefined ? Promise.reject(new SyntaxError('sem corpo')) : Promise.resolve(corpo)),
    headers: { get: () => null },
  };
}

const PAR_NOVO = { access_token: 'acc-2', refresh_token: 'ref-2', token_type: 'bearer', expires_in: 1800 };

function comSessao(expiraEm: number): void {
  useSessao.setState({ status: 'autenticado', token: 'acc-1', refreshToken: 'ref-1', expiraEm, email: 'ana@exemplo.com' });
}

function urlsChamadas(): string[] {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

beforeEach(() => {
  fetchMock.mockReset();
  armazenamento.clear();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  configurarApi({
    baseUrl: 'http://api',
    obterToken: () => useSessao.getState().token,
    tokenPertoDeVencer: () => pertoDeVencer(useSessao.getState().expiraEm),
    renovarToken: () => useSessao.getState().renovar(),
  });
});

it('dois 401 simultâneos fazem uma única renovação e as duas requisições repetem com o token novo', async () => {
  comSessao(Date.now() + 1_800_000);
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    if (url.endsWith('/auth/refresh')) return resposta(200, PAR_NOVO);
    const autorizacao = (init.headers as Record<string, string>).Authorization;
    return autorizacao === 'Bearer acc-2' ? resposta(200, { url }) : resposta(401, { detail: 'Token invalido' });
  });
  const [watchlist, alertas] = await Promise.all([request('/watchlist'), request('/alertas')]);
  expect(watchlist).toEqual({ url: 'http://api/api/v1/watchlist' });
  expect(alertas).toEqual({ url: 'http://api/api/v1/alertas' });
  expect(urlsChamadas().filter((url) => url.endsWith('/auth/refresh'))).toHaveLength(1);
  expect(useSessao.getState()).toMatchObject({ token: 'acc-2', refreshToken: 'ref-2' });
});

it('access vencido (app reaberto) renova antes da primeira requisição, sem passar por 401', async () => {
  comSessao(Date.now() - 1_000);
  fetchMock.mockImplementation(async (url: string) =>
    url.endsWith('/auth/refresh') ? resposta(200, PAR_NOVO) : resposta(200, []),
  );
  await expect(request('/watchlist')).resolves.toEqual([]);
  expect(urlsChamadas()).toEqual(['http://api/api/v1/auth/refresh', 'http://api/api/v1/watchlist']);
});

it('refresh recusado encerra a sessão e não repete a requisição', async () => {
  comSessao(Date.now() + 1_800_000);
  fetchMock.mockImplementation(async (url: string) =>
    url.endsWith('/auth/refresh')
      ? resposta(401, { detail: 'Refresh token invalido' })
      : resposta(401, { detail: 'Token invalido' }),
  );
  await expect(request('/watchlist')).rejects.toMatchObject({ status: 401 });
  expect(useSessao.getState().status).toBe('anonimo');
  expect(urlsChamadas()).toEqual(['http://api/api/v1/watchlist', 'http://api/api/v1/auth/refresh']);
});

it('sem rede ao abrir o app mantém a sessão e mostra o endereço do servidor', async () => {
  comSessao(Date.now() - 1_000);
  fetchMock.mockRejectedValue(new TypeError('Network request failed'));
  await expect(request('/watchlist')).rejects.toMatchObject({
    status: 0,
    causa: 'rede',
    message: 'Sem conexão com o servidor (http://api)',
  });
  expect(useSessao.getState().status).toBe('autenticado');
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npx jest src/store src/api/recursos.test.ts`
Expected: FAIL. `pertoDeVencer` não é exportado, `authApi.renovar is not a function` e o estado não tem `refreshToken`.

- [ ] **Step 5: Completar `src/api/auth.ts`**

```ts
import { request } from '@/api/client';
import type { CadastroRequest, LoginRequest, RefreshRequest, TokenResponse } from '@/api/tipos';

export const authApi = {
  login: (dados: LoginRequest) => request<TokenResponse>('/auth/login', { metodo: 'POST', corpo: dados }),
  cadastrar: (dados: CadastroRequest) => request<TokenResponse>('/usuarios', { metodo: 'POST', corpo: dados }),
  renovar: (refreshToken: string) =>
    request<TokenResponse>('/auth/refresh', {
      metodo: 'POST',
      corpo: { refresh_token: refreshToken } satisfies RefreshRequest,
    }),
  sair: (refreshToken: string) =>
    request<void>('/auth/logout', { metodo: 'POST', corpo: { refresh_token: refreshToken } satisfies RefreshRequest }),
};
```

- [ ] **Step 6: Reescrever `src/store/sessao.ts`**

```ts
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { authApi } from '@/api/auth';
import { ApiError } from '@/api/client';
import type { TokenResponse } from '@/api/tipos';
import { queryClient } from '@/hooks/queryClient';

const CHAVE_SESSAO = 'insightflow.sessao';
/** Chaves do MVP antigo (token de 24 h, sem refresh): apagadas ao hidratar. */
const CHAVES_ANTIGAS = ['insightflow.token', 'insightflow.email'] as const;

/** Renova quando faltar menos que isto para o access token vencer (como o cliente desktop). */
export const MARGEM_RENOVACAO_MS = 60_000;

export type StatusSessao = 'carregando' | 'autenticado' | 'anonimo';

interface SessaoSalva {
  accessToken: string;
  refreshToken: string;
  /** Epoch em ms em que o access token vence. */
  expiraEm: number;
  email: string;
}

interface EstadoSessao {
  status: StatusSessao;
  token: string | null;
  refreshToken: string | null;
  expiraEm: number | null;
  email: string | null;
  hidratar: () => Promise<void>;
  entrar: (tokens: TokenResponse, email: string) => Promise<void>;
  /** Novo access token; null se a sessão acabou (refresh recusado). Rejeita sem rede. Uma renovação por vez. */
  renovar: () => Promise<string | null>;
  sair: (opcoes?: { revogarNoServidor?: boolean }) => Promise<void>;
}

const ANONIMO = { status: 'anonimo', token: null, refreshToken: null, expiraEm: null, email: null } as const;

export function pertoDeVencer(expiraEm: number | null, agora: number = Date.now()): boolean {
  return expiraEm !== null && expiraEm - agora < MARGEM_RENOVACAO_MS;
}

function paraSessao(tokens: TokenResponse, email: string): SessaoSalva {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiraEm: Date.now() + tokens.expires_in * 1000,
    email,
  };
}

function lerSessao(bruto: string | null): SessaoSalva | null {
  if (!bruto) return null;
  try {
    const dados = JSON.parse(bruto) as Partial<SessaoSalva> | null;
    if (
      typeof dados?.accessToken === 'string' &&
      typeof dados.refreshToken === 'string' &&
      typeof dados.expiraEm === 'number' &&
      typeof dados.email === 'string'
    ) {
      return dados as SessaoSalva;
    }
  } catch {
    // Conteúdo corrompido: trata como sessão ausente.
  }
  return null;
}

function autenticado(sessao: SessaoSalva) {
  return {
    status: 'autenticado' as const,
    token: sessao.accessToken,
    refreshToken: sessao.refreshToken,
    expiraEm: sessao.expiraEm,
    email: sessao.email,
  };
}

// Duas renovações com o mesmo refresh token são tratadas pelo backend como roubo e revogam a sessão inteira.
let renovacaoEmAndamento: Promise<string | null> | null = null;

export const useSessao = create<EstadoSessao>()((set, get) => ({
  ...ANONIMO,
  status: 'carregando',

  hidratar: async () => {
    try {
      const sessao = lerSessao(await SecureStore.getItemAsync(CHAVE_SESSAO));
      set(sessao ? autenticado(sessao) : ANONIMO);
    } catch {
      set(ANONIMO);
    }
    await Promise.allSettled(CHAVES_ANTIGAS.map((chave) => SecureStore.deleteItemAsync(chave)));
  },

  // Uma única chave: a gravação é atômica e não deixa credencial parcial.
  entrar: async (tokens, email) => {
    const sessao = paraSessao(tokens, email);
    await SecureStore.setItemAsync(CHAVE_SESSAO, JSON.stringify(sessao));
    set(autenticado(sessao));
  },

  renovar: () => {
    renovacaoEmAndamento ??= (async () => {
      const { refreshToken, email } = get();
      if (!refreshToken || !email) return null;

      let tokens: TokenResponse;
      try {
        tokens = await authApi.renovar(refreshToken);
      } catch (erro) {
        if (erro instanceof ApiError && erro.status === 401) {
          // Refresh expirado, revogado ou já usado: não há o que revogar no servidor.
          await get()
            .sair({ revogarNoServidor: false })
            .catch(() => {});
          return null;
        }
        throw erro;
      }

      // Logout (ou outro login) durante a renovação: não ressuscita a sessão antiga.
      if (get().refreshToken !== refreshToken) return null;
      const sessao = paraSessao(tokens, email);
      set(autenticado(sessao));
      // Se gravar falhar, a sessão segue em memória; ao reabrir o app o refresh antigo será recusado e pedirá login.
      await SecureStore.setItemAsync(CHAVE_SESSAO, JSON.stringify(sessao)).catch(() => {});
      return sessao.accessToken;
    })().finally(() => {
      renovacaoEmAndamento = null;
    });
    return renovacaoEmAndamento;
  },

  // Idempotente: limpa o estado antes de qualquer espera, então só a primeira chamada vê o refresh token.
  sair: async ({ revogarNoServidor = true } = {}) => {
    const { refreshToken } = get();
    set(ANONIMO);
    queryClient.clear();
    if (revogarNoServidor && refreshToken) void authApi.sair(refreshToken).catch(() => {});
    await SecureStore.deleteItemAsync(CHAVE_SESSAO);
  },
}));
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npx jest src/store src/api/recursos.test.ts`
Expected: PASS em `sessao.test.ts`, `sessaoHttp.test.ts` e `recursos.test.ts`.

- [ ] **Step 8: Ligar a renovação no layout raiz**

Em `app/_layout.tsx`, trocar o import `import { useSessao } from '@/store/sessao';` por:

```ts
import { pertoDeVencer, useSessao } from '@/store/sessao';
```

E trocar o bloco provisório da Tarefa 6:

```ts
  obterToken: () => useSessao.getState().token,
  // Provisório até a sessão guardar o refresh token (Tarefa 7): 401 continua levando ao login.
  tokenPertoDeVencer: () => false,
  renovarToken: async () => {
    await useSessao
      .getState()
      .sair()
      .catch(() => {});
    return null;
  },
});
```

por:

```ts
  obterToken: () => useSessao.getState().token,
  tokenPertoDeVencer: () => pertoDeVencer(useSessao.getState().expiraEm),
  // A store serializa as renovações e, se o refresh for recusado, encerra a sessão (o app volta ao login).
  renovarToken: () => useSessao.getState().renovar(),
});
```

- [ ] **Step 9: Entrar com o par de tokens no login e no cadastro**

Em `app/(auth)/login.tsx`, trocar:

```ts
      const { access_token } = await login.mutateAsync({ email: email.trim(), senha });
      await entrar(access_token, email.trim());
```

por:

```ts
      const tokens = await login.mutateAsync({ email: email.trim(), senha });
      await entrar(tokens, email.trim());
```

Em `app/(auth)/cadastro.tsx`, trocar:

```ts
      const { access_token } = await cadastro.mutateAsync({ nome: nome.trim(), email: email.trim(), senha });
      await entrar(access_token, email.trim());
```

por:

```ts
      const tokens = await cadastro.mutateAsync({ nome: nome.trim(), email: email.trim(), senha });
      await entrar(tokens, email.trim());
```

- [ ] **Step 10: Atualizar os testes de tela**

Em `__tests__/telas/login.test.tsx` e `__tests__/telas/cadastro.test.tsx`, trocar no `beforeEach`:

```ts
  useSessao.setState({ status: 'anonimo', token: null, email: null });
```

por:

```ts
  useSessao.setState({ status: 'anonimo', token: null, refreshToken: null, expiraEm: null, email: null });
```

Em `__tests__/telas/login.test.tsx`, no fim do teste `'login com sucesso inicia a sessão com o e-mail sem espaços'`, acrescentar:

```ts
  expect(JSON.parse(armazenamento.get('insightflow.sessao') ?? '{}')).toMatchObject({
    accessToken: 'tok',
    refreshToken: 'ref',
    email: 'ana@exemplo.com',
  });
```

Em `__tests__/telas/perfil.test.tsx`:

1. Acrescentar o import `import { authApi } from '@/api/auth';` junto dos demais `@/api/...`.
2. Acrescentar, junto dos outros `jest.mock`:

   ```ts
   jest.mock('@/api/auth', () => ({ authApi: { sair: jest.fn(), renovar: jest.fn() } }));
   ```

3. No `beforeEach`, trocar `useSessao.setState({ status: 'autenticado', token: 'tok', email: 'ana@exemplo.com' });` por:

   ```ts
   useSessao.setState({ status: 'autenticado', token: 'tok', refreshToken: 'ref', expiraEm: null, email: 'ana@exemplo.com' });
   jest.mocked(authApi.sair).mockResolvedValue(undefined);
   ```

4. No teste `'sair pede confirmação e encerra a sessão'`, acrescentar ao fim:

   ```ts
   expect(authApi.sair).toHaveBeenCalledWith('ref');
   ```

- [ ] **Step 11: Verificar e commitar**

Run: `npm run verificar`
Expected: exit 0.

```bash
git add src/api/auth.ts src/store/sessao.ts src/store/sessao.test.ts src/store/sessaoHttp.test.ts src/api/recursos.test.ts app/_layout.tsx "app/(auth)/login.tsx" "app/(auth)/cadastro.tsx" __tests__/telas/login.test.tsx __tests__/telas/cadastro.test.tsx __tests__/telas/perfil.test.tsx
git commit -m "feat(auth): sessão com refresh token, renovação serializada e logout revogado no servidor" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Mensagens de erro em pt-BR e código do erro na tela

**Files:**
- Modify: `src/utils/erros.ts`, `src/utils/erros.test.ts`, `src/components/ErroComRetry.tsx`, `src/components/base.test.tsx`

**Interfaces:**
- Consumes: `ApiError` com `requestId` (Tarefa 6).
- Produces: `mensagemDeErro(erro: unknown): string` (mesma assinatura, com tradução) e `codigoDoErro(erro: unknown): string | null`.

- [ ] **Step 1: Escrever os testes**

Em `src/utils/erros.test.ts`, trocar o import por:

```ts
import { ApiError } from '@/api/client';
import { codigoDoErro, ehStatus, mensagemDeErro } from '@/utils/erros';
```

e acrescentar, dentro de `describe('mensagemDeErro', ...)`:

```ts
  it.each([
    ['Ativo ja esta na watchlist', 'Este ativo já está na sua watchlist'],
    ['Item nao encontrado na watchlist', 'Este ativo não está mais na sua watchlist'],
    ['Cotacao nao encontrada para o ativo', 'Cotação indisponível para este ativo'],
    ['Provedor de IA indisponivel', 'A análise por IA está indisponível no momento'],
    ['Resposta da IA bloqueada pelo guardrail', 'A IA não conseguiu gerar um texto dentro das regras de linguagem. Tente novamente.'],
  ])('traduz "%s"', (doBackend, esperado) => {
    expect(mensagemDeErro(new ApiError(404, doBackend))).toBe(esperado);
  });

  it('503 sem mensagem conhecida vira serviço indisponível', () => {
    expect(mensagemDeErro(new ApiError(503, 'Erro 503'))).toBe('Serviço indisponível no momento. Tente novamente em instantes.');
  });

  it('500 genérico vira erro no servidor', () => {
    expect(mensagemDeErro(new ApiError(500, 'Erro 500'))).toBe('Erro no servidor. Tente novamente em instantes.');
  });

  it('mensagem que não está no dicionário passa como veio', () => {
    expect(mensagemDeErro(new ApiError(422, 'data nao pode ser futura'))).toBe('data nao pode ser futura');
  });
```

e um novo bloco:

```ts
describe('codigoDoErro', () => {
  it('devolve o requestId do ApiError', () => {
    expect(codigoDoErro(new ApiError(500, 'x', { requestId: 'srv-42' }))).toBe('srv-42');
  });

  it('é null sem requestId ou para outros erros', () => {
    expect(codigoDoErro(new ApiError(500, 'x'))).toBeNull();
    expect(codigoDoErro(new Error('x'))).toBeNull();
  });
});
```

Em `src/components/base.test.tsx`, dentro de `describe('ErroComRetry', ...)`, acrescentar:

```tsx
  it('mostra o código do erro quando há requestId', async () => {
    await render(<ErroComRetry erro={new ApiError(500, 'x', { requestId: 'srv-42' })} aoTentarNovamente={jest.fn()} />);
    expect(screen.getByText('Código do erro: srv-42')).toBeOnTheScreen();
  });

  it('não mostra código quando não há requestId', async () => {
    await render(<ErroComRetry erro={new ApiError(0, 'Sem conexão com o servidor')} aoTentarNovamente={jest.fn()} />);
    expect(screen.queryByText(/Código do erro/)).not.toBeOnTheScreen();
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/utils/erros.test.ts src/components/base.test.tsx`
Expected: FAIL (`codigoDoErro is not a function`; traduções e código ausentes).

- [ ] **Step 3: Reescrever `src/utils/erros.ts`**

```ts
import { ApiError } from '@/api/client';

/** Mensagens do backend (muitas sem acento) reescritas para a interface. As que não estão aqui passam como vieram. */
const MENSAGENS: Record<string, string> = {
  'Ativo nao encontrado': 'Ativo não encontrado',
  'Ativo ja esta na watchlist': 'Este ativo já está na sua watchlist',
  'Item nao encontrado na watchlist': 'Este ativo não está mais na sua watchlist',
  'Cotacao nao encontrada para o ativo': 'Cotação indisponível para este ativo',
  'Historico nao encontrado para o ativo': 'Histórico indisponível para este ativo',
  'Alerta nao encontrado': 'Alerta não encontrado',
  'Operacao nao encontrada': 'Operação não encontrada',
  'Notificacao nao encontrada': 'Notificação não encontrada',
  'Nenhuma operacao registrada': 'Nenhuma operação registrada',
  'Regra nao encontrada': 'Regra de sinal não encontrada',
  'Fonte de dados de mercado indisponivel': 'Fonte de dados de mercado indisponível. Tente novamente em instantes.',
  'Provedor de IA indisponivel': 'A análise por IA está indisponível no momento',
  'Cota do provedor de IA excedida': 'O limite de uso da IA foi atingido. Tente novamente mais tarde.',
  'Resposta da IA bloqueada pelo guardrail':
    'A IA não conseguiu gerar um texto dentro das regras de linguagem. Tente novamente.',
  'Dados insuficientes para gerar a analise': 'Ainda não há dados suficientes para analisar este ativo',
  'Token de push invalido': 'Não foi possível registrar este aparelho para notificações',
};

export function ehStatus(erro: unknown, status: number): boolean {
  return erro instanceof ApiError && erro.status === status;
}

export function mensagemDeErro(erro: unknown): string {
  if (!(erro instanceof ApiError)) return 'Algo deu errado. Tente novamente.';
  const traduzida = MENSAGENS[erro.message];
  if (traduzida) return traduzida;
  if (erro.status === 503) return 'Serviço indisponível no momento. Tente novamente em instantes.';
  if (erro.status >= 500) return 'Erro no servidor. Tente novamente em instantes.';
  return erro.message;
}

/** X-Request-ID da chamada que falhou: com ele a equipe do backend acha a requisição nos logs. */
export function codigoDoErro(erro: unknown): string | null {
  return erro instanceof ApiError && erro.requestId ? erro.requestId : null;
}
```

- [ ] **Step 4: Mostrar o código no `ErroComRetry`**

`src/components/ErroComRetry.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { Icone } from '@/components/Icone';
import { Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';
import { codigoDoErro, mensagemDeErro } from '@/utils/erros';

interface Props {
  erro: unknown;
  aoTentarNovamente: () => void;
  mensagem?: string;
}

export function ErroComRetry({ erro, aoTentarNovamente, mensagem }: Props) {
  const codigo = codigoDoErro(erro);
  return (
    <View style={estilos.container}>
      <Icone nome="erro" tamanho={22} cor="negativo" />
      <Texto role="alert" cor="negativo" style={estilos.texto}>
        {mensagem ?? mensagemDeErro(erro)}
      </Texto>
      {codigo ? (
        <Texto variante="legenda" cor="terciario" selectable style={estilos.texto}>
          {`Código do erro: ${codigo}`}
        </Texto>
      ) : null}
      <Botao titulo="Tentar novamente" variante="secundario" onPress={aoTentarNovamente} />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { padding: espaco.lg, gap: espaco.md, alignItems: 'center' },
  texto: { textAlign: 'center' },
});
```

- [ ] **Step 5: Rodar e ver passar; depois a verificação completa**

Run: `npx jest src/utils/erros.test.ts src/components/base.test.tsx` → PASS.
Run: `npm run verificar` → exit 0. Se algum teste de tela que comparava a mensagem crua do backend falhar, trocar a expectativa pela tradução do dicionário (é o comportamento desejado) e registrar no commit.

- [ ] **Step 6: Commit**

```bash
git add src/utils/erros.ts src/utils/erros.test.ts src/components/ErroComRetry.tsx src/components/base.test.tsx
git commit -m "feat(erros): traduz as mensagens do backend e mostra o código do erro" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Documentação, teste de sessão em aparelho e PR do ciclo

**Files:**
- Modify: `README.md`, `CLAUDE.md`

**Interfaces:** nenhuma nova.

- [ ] **Step 1: Atualizar o `README.md`**

Trocar o primeiro item de "Funcionalidades":

```markdown
- Cadastro e login (token JWT guardado no SecureStore; token vencido volta ao login)
```

por:

```markdown
- Cadastro e login com sessão renovada automaticamente (access token de 30 min e refresh token de 30 dias no SecureStore); sair revoga a sessão no servidor
```

Trocar:

```markdown
- Telas de IA (análise do ativo e chat) prontas com o aviso legal, aguardando os endpoints de IA do backend
```

por:

```markdown
- Telas de IA (análise do ativo e chat) prontas com o aviso legal; a integração com os endpoints do backend é a etapa 7 do [plano](docs/PLANO.md)
```

No fim do passo 3 de "Como rodar" (depois do parágrafo sobre `http://`), acrescentar:

```markdown

   Se o endereço for inválido (por exemplo, terminando em `/api/v1`), o app abre numa tela que explica como corrigir. Passo a passo para testar no celular, incluindo firewall e IP: [`docs/PLANO.md` §9](docs/PLANO.md#9-como-testar-no-celular-ou-no-emulador).
```

Trocar a seção "Fora do escopo desta versão" inteira por:

```markdown
## Próximas etapas

O roteiro está em [`docs/PLANO.md`](docs/PLANO.md): dashboard e watchlist, gráfico de candles, alertas com WebSocket, portfólio, IA e push. Recuperação de senha não existe no backend.
```

- [ ] **Step 2: Registrar as regras de sessão no `CLAUDE.md`**

Acrescentar ao fim da seção "## Regras de domínio":

```markdown
- Sessão só via `useSessao` (`src/store/sessao.ts`): uma chave `insightflow.sessao` no SecureStore com access, refresh, vencimento e e-mail. O client renova sozinho (antes de vencer e no 401); telas nunca chamam `/auth/refresh`.
- Rotas `/auth/*` não levam `Authorization`. Chamadas lentas passam `timeoutMs` ao `request` (padrão 20 s).
- Mensagem de erro para o usuário só via `mensagemDeErro`; o `requestId` aparece como "Código do erro" no `ErroComRetry`.
```

- [ ] **Step 3: Verificação completa**

Run: `npm run verificar`
Expected: exit 0, com mais testes que os 372 iniciais (os novos de `ambiente`, `configuracao`, `client`, `sessao`, `sessaoHttp`, `erros`, `base`, `perfil` e `recursos`).

```bash
git add README.md CLAUDE.md
git commit -m "docs: atualiza README e CLAUDE.md com a sessão renovada e o teste no celular" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Teste de sessão em aparelho (manual, com o usuário)**

1. Pedir ao usuário para pôr `JWT_EXPIRATION_MINUTES=2` no `.env` local do backend (arquivo não versionado; não é mudança de código) e rodar `docker compose up -d` no `Insight-flow-backend`.
2. `npx expo start -c` no mobile; o usuário entra no app pelo Expo Go.
3. O usuário navega por Início, Portfólio e Alertas, espera 3 minutos e navega de novo.
   Expected: nada volta ao login; os dados carregam.
4. O usuário fecha o app pelo multitarefa, espera 3 minutos e reabre.
   Expected: entra direto, sem login.
5. O usuário toca em "Sair".
   Expected: volta ao login.
6. Pedir ao usuário para remover `JWT_EXPIRATION_MINUTES` do `.env` do backend e rodar `docker compose up -d`.
7. Registrar no PR o que foi conferido no aparelho e o que não foi.

- [ ] **Step 5: Enviar a branch e abrir o PR do ciclo**

Base: `develop` se os PRs do MVP e do redesign já tiverem entrado; senão, `feature/redesign-web` (PR empilhado, trocar a base depois).

```bash
export GH_TOKEN="$(gh auth token --user brunoosouza09)"
cd /c/Users/Bruno/Insight-flow-mobile
git push -u origin feature/ciclo-1-base-sessao
gh pr create -R InsightF-AI/Insight-flow-mobile --base develop --head feature/ciclo-1-base-sessao \
  --title "feat: ciclo 1 — base do repositório e sessão com refresh token" --body-file - <<'EOF'
## Resumo

- Mapeamento da organização (`docs/MAPEAMENTO.md`) e plano do app (`docs/PLANO.md`).
- Limpeza do template Expo e fundo do ícone Android no tema escuro.
- Endereço da API validado, com tela explicando como corrigir quando é inválido.
- Sessão com access e refresh token numa chave do SecureStore. O client renova antes de vencer e no 401 (uma repetição), sempre uma renovação por vez; sair revoga a sessão no servidor.
- `X-Request-ID` em toda requisição, tempo limite por chamada (padrão 20 s) e `Retry-After`. Mensagens do backend traduzidas para pt-BR, com "Código do erro" na tela.
- Tipos alinhados ao backend atual (`INDICE`, `RESUMO_DIARIO`, notificação sem ativo).

## Verificação

- `npm run verificar` verde.
- Em aparelho: <preencher com o resultado das Tarefas 4 e 9>.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

(Se a base for `feature/redesign-web`, trocar `--base develop` por `--base feature/redesign-web`. Antes de executar, substituir a linha "Em aparelho" pelo que foi conferido.)

- [ ] **Step 6: Resumo do ciclo para o usuário**

Responder com: o que foi feito (tarefas e PRs), o que foi e o que não foi testado em aparelho, problemas encontrados, o rascunho do status para a issue #9 do backend (para o usuário revisar e publicar) e o próximo passo (plano detalhado da Etapa 3 e o documento do Checkpoint 02).
