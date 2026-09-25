# App Mobile (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o app mobile React Native (Expo SDK 57) do InsightFlow cobrindo tudo que o backend já expõe — autenticação, watchlist, detalhe do ativo com gráfico/indicadores/sinais/backtest, alertas de preço, notificações in-app e portfólio simulado — com telas de IA preparadas e aviso legal.

**Architecture:** Cliente fino sobre a API REST do backend. Rotas por arquivo com Expo Router (`app/`); telas só falam com hooks TanStack Query (`src/hooks/`); hooks só falam com a camada `src/api/` (fetch + tipos, sem React Native); regras puras em `src/dominio/`; componentes de apresentação em `src/components/` recebem dados por props. Sessão em Zustand + SecureStore.

**Tech Stack:** Expo SDK 57 (React Native 0.86.3, React 19.2.3, TypeScript ~6.0), expo-router 57, @tanstack/react-query 5, zustand 5, expo-secure-store, victory-native 42 + @shopify/react-native-skia, @react-native-community/datetimepicker, jest-expo 57 + @testing-library/react-native 14 (+ test-renderer), eslint-config-expo.

**Spec:** `docs/superpowers/specs/2026-09-25-app-mobile-mvp-design.md`

**Repositório:** `C:\Users\Bruno\Insight-flow-mobile` (remoto `InsightF-AI/Insight-flow-mobile`, privado). Todos os caminhos deste plano são relativos a essa pasta. Comandos de shell usam Git Bash.

## Global Constraints

- Expo SDK 57: `expo ~57.0.25`, `react-native 0.86.3`, `react 19.2.3`, `typescript ~6.0.3`. Dependência nativa só entra via `npx expo install <pacote>`.
- Node aceito: `^20.19.4 || ^22.13.0 || ^24.3.0 || >= 25.0.0`. CI usa Node 24 (`.nvmrc` = `24`).
- Imports internos sempre pelo alias `@/` (→ `src/`). Nada de `../../src/...`.
- Todo arquivo dentro de `app/` vira rota: **nunca** coloque testes, helpers ou componentes compartilhados em `app/`. Testes de tela ficam em `__tests__/telas/`; testes de unidade ficam ao lado do código em `src/` como `*.test.ts(x)`; helpers de teste em `src/test/`.
- Componentes de `src/components/` não chamam hooks de dados (`useQuery`, `useMutation` nem nada de `src/hooks/`). Podem chamar `useTema()` e `useSafeAreaInsets()`.
- Campos `Decimal` da API são `string` (alias `Decimal = string`). Nunca faça conta com a string crua: use `paraNumero()`.
- `formatarPercentual(valor, escala)` sempre com escala explícita: `'pontos'` para `CotacaoAtual.variacao_percentual` e `ResultadoBacktest.retorno_medio_*`; `'fracao'` para `Rentabilidade.percentual`, `Comparativo.*_percentual` e `Distribuicao.*`.
- Datas: nunca use `toISOString()` para gerar `DataISO` (use `dataParaISOLocal`) e nunca `new Date('AAAA-MM-DD')` para exibir (use `formatarData`).
- RN-01: nenhum texto de análise, indicador, sinal, alerta ou chamada para ação usa "compre", "venda", "invista" (nem infinitivos "comprar", "vender", "investir"). "Compra"/"Venda" só como rótulo do **tipo** de operação simulada.
- RN-05: o texto exato `Análise gerada por IA. Não constitui recomendação de investimento.` (constante `AVISO_IA`) aparece em `CardAnaliseIA` e na tela `chat`.
- Cores só via tokens de `useTema()` (única exceção: `shadowColor: '#000'`). Todo texto visível em pt-BR.
- `queryFn`/`mutationFn` sempre envolvem a chamada de API numa arrow function (`() => api.x()`, `(dados) => api.y(dados)`): o TanStack passa argumentos de contexto extras que quebrariam funções com parâmetro opcional.
- RNTL v14: `render`, `renderHook`, `fireEvent.*` e `userEvent.*` são assíncronos — sempre `await`. Antes de escrever testes, leia `node_modules/@testing-library/react-native/docs/guides/llm-guidelines.md`. Matchers (`toBeOnTheScreen`, `toBeDisabled`, `toBeChecked`, `toHaveTextContent`) já vêm ativos ao importar a biblioteca.
- `Intl.NumberFormat('pt-BR', { style: 'currency' })` separa símbolo e número com espaço não separável (`\u00a0`). Asserções de moeda usam `\u00a0`.
- Commits em Conventional Commits, em português, na branch `feature/app-mobile-mvp`, terminando com a linha `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Review Focus

1. **Data de operação registrada depois das 21h** (UTC−3): deve gravar o dia local, não o dia seguinte em UTC, e "hoje" não pode ser rejeitado como data futura — testes em Task 2 (`dataParaISOLocal`) e Task 13 (`validarOperacao` com `hoje` às 23:30).
2. **422 do backend com `detail` = só o UUID do ativo** (venda sem saldo, remoção que deixaria venda sem saldo): o usuário precisa ver uma frase legível, não um UUID — testes em Task 13 (`mensagemErroOperacao` e tela de nova operação).
3. **Token vencido no meio do uso** (401 em chamada autenticada): o app volta ao login e limpa o cache; o 401 do próprio login não pode derrubar a sessão nem entrar em loop — testes em Task 3 (`request`) e Task 4 (`sair`).
4. **Ticker digitado em minúsculas ou com espaços** (`"  petr4 "`): deve casar com o item da watchlist em vez de tentar adicionar de novo (e cair em 409) — testes em Task 7 (`resolverAtivoId`) e Task 13 (`validarOperacao`).
5. **Escala de percentual trocada** (fração × pontos): rentabilidade `0.05` deve aparecer `+5,00%`, nunca `+0,05%`; Ibovespa `0.02` como `+2,00%` — testes em Task 2 (`formatarPercentual`) e Task 12 (tela do portfólio).

## File Structure

```
.env.example                      # EXPO_PUBLIC_API_URL de exemplo
.nvmrc                            # 24
.github/workflows/ci.yml          # lint + typecheck + testes
CLAUDE.md                         # convenções para agentes (RNTL v14, fronteiras)
app.json / package.json / tsconfig.json / eslint.config.js / expo-env.d.ts
jest.global-setup.js              # fixa TZ=America/Sao_Paulo
jest.setup.ts                     # mocks globais (safe-area, SecureStore)
app/
  _layout.tsx                     # providers, configurarApi, hidratação, Stack.Protected
  (auth)/_layout.tsx, login.tsx, cadastro.tsx
  (tabs)/_layout.tsx              # abas + badge de não lidas
  (tabs)/index.tsx                # Watchlist
  (tabs)/portfolio.tsx, alertas.tsx, perfil.tsx
  ativo/[id].tsx, buscar.tsx, operacao/nova.tsx, chat.tsx
src/
  api/tipos.ts                    # espelho dos schemas Pydantic
  api/client.ts                   # request<T>, ApiError, configurarApi
  api/auth.ts, watchlist.ts, ativos.ts, alertas.ts, notificacoes.ts, portfolio.ts
  hooks/queryClient.ts            # QueryClient + deveRepetir
  hooks/chaves.ts                 # chaves de cache
  hooks/useAuth.ts, useWatchlist.ts, useAtivo.ts, useBusca.ts, useAlertas.ts,
        useNotificacoes.ts, usePortfolio.ts, useResolverAtivo.ts
  store/sessao.ts                 # Zustand + SecureStore
  dominio/regulatorio.ts          # AVISO_IA
  dominio/rotulos.ts              # rótulos pt-BR de enums
  dominio/indicadores.ts          # descrição factual dos indicadores
  dominio/resolverAtivoId.ts      # ticker → ativo_id (via watchlist)
  dominio/credenciais.ts          # validação de login/cadastro
  dominio/graficos.ts             # série do gráfico de preço
  dominio/portfolio.ts            # mapa de ativos + fatias da distribuição
  dominio/operacao.ts             # validação e mensagens da nova operação
  dominio/alerta.ts               # validação e descrição de alertas
  components/                     # Texto, Botao, Campo, Card, Linha, Tela, Carregando,
                                  # EstadoVazio, ErroComRetry, EstadoConsulta, SeletorSegmentado,
                                  # VariacaoBadge, AvisoIA, CardAnaliseIA, IndicadorItem, SinalCard,
                                  # BotaoCabecalho, BotaoFlutuante, LinhaAtivo, LinhaResultadoBusca,
                                  # GraficoPreco, GraficoDistribuicao, ItemPosicao, ItemOperacao,
                                  # CampoData, SugestoesTicker, ItemAlerta, ItemNotificacao
  theme/cores.ts, escala.ts, useTema.ts
  utils/formatacao.ts, erros.ts
  test/renderizar.tsx             # render com QueryClientProvider
__tests__/ambiente.test.tsx
__tests__/telas/*.test.tsx
```

---

### Task 1: Scaffold Expo SDK 57 e ferramentas

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `assets/*` (do template), `.gitignore` (do template, ajustado)
- Create: `expo-env.d.ts`, `eslint.config.js`, `jest.global-setup.js`, `jest.setup.ts`, `.env.example`, `.nvmrc`, `CLAUDE.md`, `.github/workflows/ci.yml`
- Create: `app/_layout.tsx`, `app/index.tsx` (provisórios — `app/index.tsx` é movido na Task 9)
- Test: `__tests__/ambiente.test.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: scripts `npm run lint | typecheck | test | test:ci | verificar`; alias `@/*` → `src/*` no TS e no Jest; mock global de `expo-secure-store` que expõe `__armazenamento: Map<string, string>`; mock global de `react-native-safe-area-context` (`SafeAreaProvider`, `SafeAreaView`, `useSafeAreaInsets` com insets zero); fuso dos testes `America/Sao_Paulo`.

- [ ] **Step 1: Criar as branches do Git Flow**

```bash
cd /c/Users/Bruno/Insight-flow-mobile
git checkout main
git checkout -b develop
git checkout -b feature/app-mobile-mvp
```

- [ ] **Step 2: Gerar o template blank-typescript do SDK 57 numa pasta temporária e copiar para o repositório**

O `create-expo-app` recusa pastas com arquivos, e o repositório já tem `README.md` e `docs/`.

```bash
TMP_SCAFFOLD="$(mktemp -d)"
npx --yes create-expo-app@latest "$TMP_SCAFFOLD/app" --template blank-typescript@sdk-57 --no-install
ls -la "$TMP_SCAFFOLD/app"
```

Expected: `App.tsx`, `index.ts`, `app.json`, `package.json`, `tsconfig.json`, `assets/`, `.gitignore`.

```bash
(cd "$TMP_SCAFFOLD/app" && tar --exclude=.git --exclude=README.md -cf - .) | (cd /c/Users/Bruno/Insight-flow-mobile && tar -xf -)
cd /c/Users/Bruno/Insight-flow-mobile
rm -f App.tsx index.ts
rm -rf "$TMP_SCAFFOLD"
grep -E '"(expo|react|react-native|typescript)"' package.json
```

Expected: `"expo": "~57.0.x"`, `"react": "19.2.3"`, `"react-native": "0.86.3"`, `"typescript": "~6.0.x"`.

- [ ] **Step 3: Ajustar `package.json` (entry do Expo Router, scripts e Jest) e `app.json`**

```bash
node -e '
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
pkg.name = "insight-flow-mobile";
pkg.version = "0.1.0";
pkg.private = true;
pkg.main = "expo-router/entry";
pkg.scripts = {
  start: "expo start",
  android: "expo start --android",
  ios: "expo start --ios",
  lint: "expo lint",
  typecheck: "tsc --noEmit",
  test: "jest",
  "test:ci": "jest --ci",
  verificar: "npm run lint && npm run typecheck && npm run test:ci"
};
pkg.jest = {
  preset: "jest-expo",
  globalSetup: "<rootDir>/jest.global-setup.js",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testPathIgnorePatterns: ["/node_modules/", "/.expo/", "/dist/"]
};
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");

const app = JSON.parse(fs.readFileSync("app.json", "utf8"));
app.expo.name = "InsightFlow";
app.expo.slug = "insight-flow-mobile";
app.expo.scheme = "insightflow";
app.expo.version = "0.1.0";
app.expo.userInterfaceStyle = "automatic";
app.expo.plugins = [...(app.expo.plugins ?? []).filter((p) => p !== "expo-router"), "expo-router"];
fs.writeFileSync("app.json", JSON.stringify(app, null, 2) + "\n");
'
```

`userInterfaceStyle: "automatic"` é obrigatório: sem ele `useColorScheme()` sempre devolve `light` e o tema escuro nunca aparece.

- [ ] **Step 4: Instalar dependências**

```bash
npm install
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar expo-splash-screen expo-system-ui expo-secure-store @expo/vector-icons react-native-reanimated react-native-worklets react-native-gesture-handler @shopify/react-native-skia @react-native-community/datetimepicker
npm install @tanstack/react-query zustand victory-native
npx expo install jest-expo jest @types/jest eslint eslint-config-expo -- --save-dev
npm install --save-dev @testing-library/react-native test-renderer @react-native/jest-preset@~0.86.3
npx expo install --check
```

Expected (último comando): "Dependencies are up to date" (ou equivalente, sem pacotes incompatíveis). `expo-system-ui` é necessário para o `userInterfaceStyle` funcionar no Android.

- [ ] **Step 5: Escrever `tsconfig.json` e `expo-env.d.ts`**

`tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "types": ["jest"],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

`expo-env.d.ts` (versionado — o CI roda `tsc` sem ter executado `expo start`):

```ts
/// <reference types="expo/types" />
```

Ajuste o `.gitignore` do template para versionar `expo-env.d.ts` e ignorar `.env`, `dist/` e `coverage/`:

```bash
sed -i '/^expo-env\.d\.ts$/d' .gitignore
for linha in ".env" "dist/" "coverage/"; do grep -qxF "$linha" .gitignore || echo "$linha" >> .gitignore; done
```

- [ ] **Step 6: Configurar ESLint, Jest e arquivos de ambiente**

`eslint.config.js`:

```js
// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'coverage/*'],
  },
]);
```

`jest.global-setup.js`:

```js
// Fixa o fuso dos testes: as regras de data (DataISO local vs. UTC) dependem dele.
module.exports = async () => {
  process.env.TZ = 'America/Sao_Paulo';
};
```

`jest.setup.ts`:

```ts
import type { ReactNode } from 'react';

// Safe area sem nativo: insets zerados e SafeAreaView como View comum.
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }: { children: ReactNode }) => children,
    SafeAreaView: View,
    useSafeAreaInsets: () => insets,
  };
});

// SecureStore em memória: os testes inspecionam `__armazenamento` diretamente.
jest.mock('expo-secure-store', () => {
  const armazenamento = new Map<string, string>();
  return {
    __armazenamento: armazenamento,
    getItemAsync: jest.fn(async (chave: string) => armazenamento.get(chave) ?? null),
    setItemAsync: jest.fn(async (chave: string, valor: string) => {
      armazenamento.set(chave, valor);
    }),
    deleteItemAsync: jest.fn(async (chave: string) => {
      armazenamento.delete(chave);
    }),
  };
});
```

`.env.example`:

```bash
# Endereço do backend (sem barra no final).
# Celular físico com Expo Go: IP do PC na rede local, ex.: http://192.168.0.10:8000
# Emulador Android: http://10.0.2.2:8000
# Simulador iOS: http://localhost:8000
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000
```

`.nvmrc`:

```
24
```

`CLAUDE.md`:

```md
# Insight Flow — Mobile

App Expo SDK 57 (React Native 0.86, TypeScript). Spec: `docs/superpowers/specs/2026-09-25-app-mobile-mvp-design.md`.

## Fronteiras
- `app/`: só rotas do Expo Router. Nada de testes ou helpers aqui (todo arquivo vira rota).
- Telas falam com `src/hooks/`; hooks falam com `src/api/`; `src/api/` não importa React Native.
- `src/components/` recebe dados por props e não chama hooks de dados.
- Regras puras ficam em `src/dominio/`, com teste ao lado.

## Regras de domínio
- Decimais da API chegam como string; converta com `paraNumero`.
- `formatarPercentual` exige escala: `'pontos'` (cotação, backtest) ou `'fracao'` (rentabilidade, benchmark, distribuição).
- RN-01: sem "compre", "venda", "invista" em textos de análise. RN-05: `AvisoIA` em toda tela com conteúdo de IA.

## React Native Testing Library in this project

This project uses `@testing-library/react-native`. Its APIs and testing conventions can differ from your training data.
Before writing or changing RNTL tests, read the relevant guide in
`node_modules/@testing-library/react-native/docs/`, starting with
`node_modules/@testing-library/react-native/docs/guides/llm-guidelines.md`.
Prefer those package docs over stale assumptions, and follow deprecation notices.
```

`.github/workflows/ci.yml` (mesmo estilo do CI do backend):

```yaml
# CI: lint + typecheck + testes em todo push/PR pra main e develop
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  verificar:
    name: Lint, typecheck e testes
    runs-on: ubuntu-latest
    steps:
      - name: Checkout do código
        uses: actions/checkout@v4

      - name: Configurar Node
        uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm

      - name: Instalar dependências
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Testes
        run: npm run test:ci
```

- [ ] **Step 7: Criar as rotas provisórias**

`app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack />;
}
```

`app/index.tsx`:

```tsx
import { Text, View } from 'react-native';

export default function Inicio() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>InsightFlow</Text>
    </View>
  );
}
```

- [ ] **Step 8: Escrever o teste de fumaça do ambiente**

`__tests__/ambiente.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

test('RNTL renderiza componentes nativos', async () => {
  await render(<Text>InsightFlow</Text>);
  expect(screen.getByText('InsightFlow')).toBeOnTheScreen();
});

test('testes rodam no fuso de São Paulo', () => {
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Sao_Paulo');
});
```

- [ ] **Step 9: Rodar a verificação completa**

Run: `npm run verificar`
Expected: lint sem erros, `tsc` sem erros, `2 passed`.

Se o `tsc` acusar `Cannot find name 'process'` ou `Cannot find name 'require'`, instale os tipos do Node e inclua-os em `types`:

```bash
npm install --save-dev @types/node
node -e 'const fs=require("fs");const t=JSON.parse(fs.readFileSync("tsconfig.json","utf8"));t.compilerOptions.types=["jest","node"];fs.writeFileSync("tsconfig.json",JSON.stringify(t,null,2)+"\n")'
npm run verificar
```

- [ ] **Step 10: Validar o projeto Expo e o bundle Android**

```bash
npx expo-doctor
npx expo export --platform android --output-dir dist
rm -rf dist
```

Expected: `expo-doctor` sem falhas; `expo export` termina com "Exported: dist" (prova que o Metro empacota o app com o Expo Router).

- [ ] **Step 11: Commit**

```bash
git add -A
git status --short
git commit -m "chore: cria projeto Expo SDK 57 com expo-router, jest e eslint

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Tipos da API e formatação

**Files:**
- Create: `src/api/tipos.ts`
- Create: `src/utils/formatacao.ts`
- Test: `src/utils/formatacao.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces (`src/api/tipos.ts`): `Decimal`, `Uuid`, `DataHoraISO`, `DataISO`, `TipoAtivo`, `TipoIndicador`, `TipoOperacao`, `TipoBenchmark`, `TipoCondicaoAlerta`, `TipoNotificacao`, `PeriodoHistorico`, `TokenResponse`, `LoginRequest`, `CadastroRequest`, `Ativo`, `ItemWatchlist`, `AtivoEncontrado`, `CotacaoAtual`, `PontoHistorico`, `IndicadorTecnico`, `Sinal`, `ResultadoBacktest`, `Alerta`, `CriarAlertaRequest`, `AtualizarAlertaRequest`, `Notificacao`, `Operacao`, `RegistrarOperacaoRequest`, `Posicao`, `Rentabilidade`, `Comparativo`, `Distribuicao`.
- Produces (`src/utils/formatacao.ts`): `type EscalaPercentual = 'pontos' | 'fracao'`; `paraNumero(valor: Decimal | number): number`; `formatarNumero(valor: Decimal | number, casas = 2): string`; `formatarQuantidade(valor: Decimal | number): string`; `formatarMoeda(valor: Decimal | number, moeda?: string): string`; `formatarPercentual(valor: Decimal | number, escala: EscalaPercentual): string`; `formatarData(iso: string): string`; `formatarDataHora(iso: string): string`; `dataParaISOLocal(data: Date): DataISO`; `normalizarDecimal(entrada: string): Decimal | null`.

- [ ] **Step 1: Escrever os tipos da API**

`src/api/tipos.ts` (espelho de `src/app/api/v1/schemas/` do backend):

```ts
// Espelho dos schemas Pydantic do backend (src/app/api/v1/schemas/).
// O Pydantic v2 serializa Decimal como string em JSON, por isso Decimal = string.

export type Decimal = string;
export type Uuid = string;
export type DataHoraISO = string;
export type DataISO = string;

export type TipoAtivo = 'ACAO' | 'FII' | 'ETF' | 'BDR' | 'CRIPTO';
export type TipoIndicador = 'SMA' | 'RSI' | 'MACD' | 'BOLLINGER' | 'VOLUME_RELATIVO';
export type TipoOperacao = 'COMPRA' | 'VENDA';
export type TipoBenchmark = 'CDI' | 'IBOVESPA';
export type TipoCondicaoAlerta = 'PRECO_MAIOR_IGUAL' | 'PRECO_MENOR_IGUAL';
export type TipoNotificacao = 'SINAL_ATIVADO' | 'ALERTA_DISPARADO';
export type PeriodoHistorico = '1D' | '1S' | '1M' | '3M' | '1A' | '5A';

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface CadastroRequest {
  nome: string;
  email: string;
  senha: string;
}

export interface Ativo {
  id: Uuid;
  ticker: string;
  nome: string;
  tipo: TipoAtivo;
  setor: string | null;
  moeda: string;
}

export interface ItemWatchlist {
  ativo: Ativo;
  notificar: boolean;
  adicionado_em: DataHoraISO;
}

export interface AtivoEncontrado {
  ticker: string;
  nome: string;
  tipo: TipoAtivo;
  moeda: string;
  setor: string | null;
}

export interface CotacaoAtual {
  ticker: string;
  preco: Decimal;
  variacao: Decimal;
  /** Pontos percentuais: "1.23" = 1,23%. */
  variacao_percentual: Decimal;
  maxima_dia: Decimal;
  minima_dia: Decimal;
  volume: Decimal;
}

export interface PontoHistorico {
  data: DataHoraISO;
  abertura: Decimal;
  maxima: Decimal;
  minima: Decimal;
  fechamento: Decimal;
  volume: Decimal;
}

export interface IndicadorTecnico {
  tipo: TipoIndicador;
  parametros: Record<string, number>;
  data_calculo: DataHoraISO;
  valor: Decimal;
  /** Valores complementares como números JSON (ex.: banda_superior, linha_sinal). */
  valores_auxiliares: Record<string, number> | null;
}

export interface Sinal {
  id: Uuid;
  ativo_id: Uuid;
  regra_id: Uuid;
  regra_nome: string;
  regra_descricao: string;
  data_ativacao: DataHoraISO;
  contexto: Record<string, unknown>;
  data_desativacao: DataHoraISO | null;
}

export interface ResultadoBacktest {
  regra_id: Uuid;
  ativo_id: Uuid;
  total_ocorrencias: number;
  /** Pontos percentuais: "-2.5" = −2,5%. */
  retorno_medio_5_pregoes: Decimal | null;
  retorno_medio_20_pregoes: Decimal | null;
  retorno_medio_60_pregoes: Decimal | null;
}

export interface Alerta {
  id: Uuid;
  ativo: Ativo;
  tipo_condicao: TipoCondicaoAlerta;
  valor_alvo: Decimal;
  moeda_alvo: string;
  habilitado: boolean;
  ultimo_estado: boolean;
  disparado_em: DataHoraISO | null;
  criado_em: DataHoraISO;
  atualizado_em: DataHoraISO;
}

export interface CriarAlertaRequest {
  ticker: string;
  tipo_condicao: TipoCondicaoAlerta;
  valor_alvo: Decimal;
}

export interface AtualizarAlertaRequest {
  tipo_condicao?: TipoCondicaoAlerta;
  valor_alvo?: Decimal;
  ativo?: boolean;
}

export interface Notificacao {
  id: Uuid;
  ativo_id: Uuid;
  tipo: TipoNotificacao;
  mensagem: string;
  lida: boolean;
  criado_em: DataHoraISO;
}

export interface Operacao {
  id: Uuid;
  ativo_id: Uuid;
  tipo: TipoOperacao;
  quantidade: Decimal;
  preco_unitario: Decimal;
  data: DataISO;
  criado_em: DataHoraISO;
}

export interface RegistrarOperacaoRequest {
  ativo_id: Uuid;
  tipo: TipoOperacao;
  quantidade: Decimal;
  preco_unitario: Decimal;
  data: DataISO;
}

export interface Posicao {
  ativo_id: Uuid;
  ticker: string;
  quantidade: Decimal;
  preco_medio: Decimal;
  cotacao_atual: Decimal;
  valor_mercado: Decimal;
  valor_mercado_brl: Decimal;
  lucro_nao_realizado: Decimal;
  lucro_realizado: Decimal;
}

export interface Rentabilidade {
  custo_base_brl: Decimal;
  valor_mercado_brl: Decimal;
  lucro_nao_realizado_brl: Decimal;
  lucro_realizado_brl: Decimal;
  /** Fração: "0.05" = 5%. */
  percentual: Decimal;
}

export interface Comparativo {
  benchmark: TipoBenchmark;
  /** Fração. */
  rentabilidade_carteira_percentual: Decimal;
  /** Fração; null quando a fonte do benchmark está indisponível. */
  rentabilidade_benchmark_percentual: Decimal | null;
}

export interface Distribuicao {
  /** Frações por classe (chaves são valores de TipoAtivo). */
  por_classe: Record<string, Decimal>;
  /** Frações por setor; "N/A" quando o ativo não tem setor. */
  por_setor: Record<string, Decimal>;
  por_moeda: Record<string, Decimal>;
}
```

- [ ] **Step 2: Escrever o teste de formatação (falhando)**

`src/utils/formatacao.test.ts`:

```ts
import {
  dataParaISOLocal,
  formatarData,
  formatarDataHora,
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
  formatarQuantidade,
  normalizarDecimal,
  paraNumero,
} from '@/utils/formatacao';

const NBSP = '\u00a0';

describe('paraNumero', () => {
  it('converte a string decimal do backend', () => {
    expect(paraNumero('123.45')).toBe(123.45);
  });

  it('mantém number', () => {
    expect(paraNumero(7)).toBe(7);
  });
});

describe('formatarNumero', () => {
  it('usa separadores pt-BR com 2 casas', () => {
    expect(formatarNumero('1234.5')).toBe('1.234,50');
  });

  it('respeita a quantidade de casas', () => {
    expect(formatarNumero(28.456, 1)).toBe('28,5');
  });
});

describe('formatarQuantidade', () => {
  it('não mostra casas em inteiros', () => {
    expect(formatarQuantidade('1500')).toBe('1.500');
  });

  it('preserva frações de cripto', () => {
    expect(formatarQuantidade('0.00123')).toBe('0,00123');
  });
});

describe('formatarMoeda', () => {
  it('formata BRL', () => {
    expect(formatarMoeda('1234.5', 'BRL')).toBe(`R$${NBSP}1.234,50`);
  });

  it('formata USD', () => {
    expect(formatarMoeda(10, 'USD')).toBe(`US$${NBSP}10,00`);
  });

  it('sem moeda formata só o número', () => {
    expect(formatarMoeda('3.5')).toBe('3,50');
  });

  it('código de moeda inválido não quebra a tela', () => {
    expect(formatarMoeda(1, 'XX')).toBe('XX 1,00');
  });
});

describe('formatarPercentual', () => {
  it('pontos percentuais positivos ganham +', () => {
    expect(formatarPercentual('1.23', 'pontos')).toBe('+1,23%');
  });

  it('fração vira percentual', () => {
    expect(formatarPercentual('0.05', 'fracao')).toBe('+5,00%');
  });

  it('negativo mostra -', () => {
    expect(formatarPercentual('-2.5', 'pontos')).toBe('-2,50%');
  });

  it('zero não tem sinal', () => {
    expect(formatarPercentual('0', 'fracao')).toBe('0,00%');
  });

  it('valor que arredonda para zero não tem sinal', () => {
    expect(formatarPercentual(-0.001, 'pontos')).toBe('0,00%');
  });

  it('a mesma entrada difere 100x entre as escalas', () => {
    expect(formatarPercentual('0.4', 'fracao')).toBe('+40,00%');
    expect(formatarPercentual('0.4', 'pontos')).toBe('+0,40%');
  });
});

describe('datas', () => {
  it('data sem hora não sofre deslocamento de fuso', () => {
    expect(formatarData('2026-09-25')).toBe('25/09/2026');
  });

  it('data e hora são exibidas no fuso local', () => {
    expect(formatarDataHora('2026-09-25T15:30:00Z')).toBe('25/09/2026 12:30');
  });

  it('dataParaISOLocal usa o dia local, não o dia UTC', () => {
    // 23:30 em São Paulo já é 26/09 em UTC.
    expect(dataParaISOLocal(new Date(2026, 8, 25, 23, 30))).toBe('2026-09-25');
  });
});

describe('normalizarDecimal', () => {
  it('aceita vírgula decimal', () => {
    expect(normalizarDecimal(' 10,5 ')).toBe('10.5');
  });

  it('aceita ponto decimal', () => {
    expect(normalizarDecimal('3.25')).toBe('3.25');
  });

  it('aceita inteiro', () => {
    expect(normalizarDecimal('100')).toBe('100');
  });

  it.each(['', 'abc', '1.234,56', '-1', '1e3'])('rejeita %p', (entrada) => {
    expect(normalizarDecimal(entrada)).toBeNull();
  });
});
```

- [ ] **Step 3: Rodar o teste e ver falhar**

Run: `npx jest src/utils/formatacao.test.ts`
Expected: FAIL — `Cannot find module '@/utils/formatacao'`.

- [ ] **Step 4: Implementar a formatação**

`src/utils/formatacao.ts`:

```ts
import type { DataISO, Decimal } from '@/api/tipos';

export type EscalaPercentual = 'pontos' | 'fracao';

type Numerico = Decimal | number;

export function paraNumero(valor: Numerico): number {
  return typeof valor === 'number' ? valor : Number(valor);
}

const formatadoresDecimais = new Map<number, Intl.NumberFormat>();

function formatadorDecimal(casas: number): Intl.NumberFormat {
  let formatador = formatadoresDecimais.get(casas);
  if (!formatador) {
    formatador = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
    });
    formatadoresDecimais.set(casas, formatador);
  }
  return formatador;
}

const formatadorQuantidade = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 8,
});

export function formatarNumero(valor: Numerico, casas = 2): string {
  return formatadorDecimal(casas).format(paraNumero(valor));
}

export function formatarQuantidade(valor: Numerico): string {
  return formatadorQuantidade.format(paraNumero(valor));
}

export function formatarMoeda(valor: Numerico, moeda?: string): string {
  const numero = paraNumero(valor);
  if (!moeda) return formatarNumero(numero);
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda }).format(numero);
  } catch {
    return `${moeda} ${formatarNumero(numero)}`;
  }
}

export function formatarPercentual(valor: Numerico, escala: EscalaPercentual): string {
  const pontos = escala === 'fracao' ? paraNumero(valor) * 100 : paraNumero(valor);
  const absoluto = formatarNumero(Math.abs(pontos));
  if (absoluto === '0,00') return '0,00%';
  return `${pontos > 0 ? '+' : '-'}${absoluto}%`;
}

function doisDigitos(numero: number): string {
  return String(numero).padStart(2, '0');
}

export function formatarData(iso: string): string {
  const soData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (soData) return `${soData[3]}/${soData[2]}/${soData[1]}`;
  const data = new Date(iso);
  return `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}/${data.getFullYear()}`;
}

export function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  return `${formatarData(iso)} ${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`;
}

export function dataParaISOLocal(data: Date): DataISO {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

export function normalizarDecimal(entrada: string): Decimal | null {
  const texto = entrada.trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(texto) ? texto : null;
}
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `npx jest src/utils/formatacao.test.ts`
Expected: PASS (todos os casos).

- [ ] **Step 6: Commit**

```bash
git add src/api/tipos.ts src/utils/formatacao.ts src/utils/formatacao.test.ts
git commit -m "feat: adiciona tipos da API e formatação pt-BR

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Client HTTP, recursos da API e mensagens de erro

**Files:**
- Create: `src/api/client.ts`, `src/api/auth.ts`, `src/api/watchlist.ts`, `src/api/ativos.ts`, `src/api/alertas.ts`, `src/api/notificacoes.ts`, `src/api/portfolio.ts`
- Create: `src/utils/erros.ts`
- Test: `src/api/client.test.ts`, `src/api/recursos.test.ts`, `src/utils/erros.test.ts`

**Interfaces:**
- Consumes: tipos de `@/api/tipos` (Task 2).
- Produces:
  - `class ApiError extends Error { readonly status: number }` — `new ApiError(status, mensagem)`; `status 0` = sem conexão/timeout.
  - `configurarApi(config: { baseUrl: string; obterToken: () => string | null; aoNaoAutorizado: () => void; timeoutMs?: number }): void`
  - `request<T>(caminho: string, opcoes?: { metodo?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; corpo?: unknown; query?: Record<string, string | number | boolean | undefined> }): Promise<T>`
  - `authApi.login(dados: LoginRequest): Promise<TokenResponse>`; `authApi.cadastrar(dados: CadastroRequest): Promise<TokenResponse>`
  - `watchlistApi.listar(): Promise<ItemWatchlist[]>`; `.adicionar(ticker: string): Promise<ItemWatchlist>`; `.remover(ativoId: Uuid): Promise<void>`; `.definirNotificacao(ativoId: Uuid, notificar: boolean): Promise<ItemWatchlist>`
  - `ativosApi.buscar(termo: string): Promise<AtivoEncontrado[]>`; `.cotacao(ativoId)`; `.historico(ativoId, periodo: PeriodoHistorico)`; `.indicadores(ativoId)`; `.sinais(ativoId)`; `.backtest(ativoId, regraId)`
  - `alertasApi.listar()`; `.criar(dados: CriarAlertaRequest)`; `.atualizar(alertaId, dados: AtualizarAlertaRequest)`; `.remover(alertaId)`
  - `notificacoesApi.listar(apenasNaoLidas?: boolean)`; `.marcarComoLida(notificacaoId)`
  - `portfolioApi.listarOperacoes()`; `.registrarOperacao(dados: RegistrarOperacaoRequest)`; `.removerOperacao(operacaoId)`; `.posicoes()`; `.rentabilidade()`; `.benchmark(benchmark: TipoBenchmark)`; `.distribuicao()`
  - `mensagemDeErro(erro: unknown): string`; `ehStatus(erro: unknown, status: number): boolean`

- [ ] **Step 1: Escrever o teste do client (falhando)**

`src/api/client.test.ts`:

```ts
import { ApiError, configurarApi, request } from '@/api/client';

type RespostaFalsa = { ok: boolean; status: number; json: () => Promise<unknown> };

function resposta(status: number, corpo?: unknown): RespostaFalsa {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: corpo === undefined ? () => Promise.reject(new SyntaxError('sem corpo')) : () => Promise.resolve(corpo),
  };
}

const fetchMock = jest.fn();
const aoNaoAutorizado = jest.fn();
let token: string | null = null;

beforeEach(() => {
  fetchMock.mockReset();
  aoNaoAutorizado.mockReset();
  token = null;
  global.fetch = fetchMock as unknown as typeof fetch;
  configurarApi({ baseUrl: 'http://api.teste/', obterToken: () => token, aoNaoAutorizado });
});

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
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc');
});

it('não envia Authorization sem token', async () => {
  fetchMock.mockResolvedValue(resposta(200, {}));
  await request('/auth/login', { metodo: 'POST', corpo: {} });
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
});

it('serializa o corpo como JSON', async () => {
  fetchMock.mockResolvedValue(resposta(201, { ok: true }));
  await request('/watchlist', { metodo: 'POST', corpo: { ticker: 'PETR4' } });
  const init = fetchMock.mock.calls[0][1];
  expect(init.method).toBe('POST');
  expect(init.body).toBe('{"ticker":"PETR4"}');
  expect(init.headers['Content-Type']).toBe('application/json');
});

it('devolve o JSON em 2xx', async () => {
  fetchMock.mockResolvedValue(resposta(200, [{ id: 1 }]));
  await expect(request('/watchlist')).resolves.toEqual([{ id: 1 }]);
});

it('204 devolve undefined', async () => {
  fetchMock.mockResolvedValue(resposta(204));
  await expect(request('/watchlist/x', { metodo: 'DELETE' })).resolves.toBeUndefined();
});

it('detail string vira a mensagem do erro', async () => {
  fetchMock.mockResolvedValue(resposta(409, { detail: 'Ativo ja esta na watchlist' }));
  await expect(request('/watchlist')).rejects.toMatchObject({
    status: 409,
    message: 'Ativo ja esta na watchlist',
  });
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

it('falha de rede vira status 0', async () => {
  fetchMock.mockRejectedValue(new TypeError('Network request failed'));
  const erro = await request('/x').catch((e: unknown) => e);
  expect(erro).toBeInstanceOf(ApiError);
  expect(erro).toMatchObject({ status: 0, message: 'Sem conexão com o servidor' });
});

it('timeout aborta a requisição e vira status 0', async () => {
  jest.useFakeTimers();
  try {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolver, rejeitar) => {
          init.signal?.addEventListener('abort', () => rejeitar(new Error('abortado')));
        }),
    );
    const promessa = request('/lento');
    jest.advanceTimersByTime(15_000);
    await expect(promessa).rejects.toMatchObject({ status: 0 });
  } finally {
    jest.useRealTimers();
  }
});

it('401 em requisição autenticada chama aoNaoAutorizado', async () => {
  token = 'vencido';
  fetchMock.mockResolvedValue(resposta(401, { detail: 'Token invalido' }));
  await expect(request('/watchlist')).rejects.toMatchObject({ status: 401 });
  expect(aoNaoAutorizado).toHaveBeenCalledTimes(1);
});

it('401 sem token (login) não chama aoNaoAutorizado', async () => {
  fetchMock.mockResolvedValue(resposta(401, { detail: 'Credenciais inválidas' }));
  await expect(request('/auth/login', { metodo: 'POST', corpo: {} })).rejects.toMatchObject({ status: 401 });
  expect(aoNaoAutorizado).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/api/client.test.ts`
Expected: FAIL — `Cannot find module '@/api/client'`.

- [ ] **Step 3: Implementar o client**

`src/api/client.ts`:

```ts
// Camada HTTP sem dependência de React Native: pode ser copiada pelo cliente web.

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface ConfigApi {
  baseUrl: string;
  obterToken: () => string | null;
  aoNaoAutorizado: () => void;
  timeoutMs?: number;
}

type Metodo = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type ValorQuery = string | number | boolean | undefined;

interface OpcoesRequest {
  metodo?: Metodo;
  corpo?: unknown;
  query?: Record<string, ValorQuery>;
}

const TIMEOUT_PADRAO_MS = 15_000;

let config: ConfigApi | null = null;

export function configurarApi(novaConfig: ConfigApi): void {
  config = novaConfig;
}

function montarUrl(baseUrl: string, caminho: string, query?: Record<string, ValorQuery>): string {
  const base = `${baseUrl.replace(/\/+$/, '')}/api/v1${caminho}`;
  if (!query) return base;
  const partes = Object.entries(query)
    .filter((par): par is [string, string | number | boolean] => par[1] !== undefined)
    .map(([chave, valor]) => `${encodeURIComponent(chave)}=${encodeURIComponent(String(valor))}`);
  return partes.length > 0 ? `${base}?${partes.join('&')}` : base;
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

export async function request<T>(caminho: string, opcoes: OpcoesRequest = {}): Promise<T> {
  if (!config) throw new Error('configurarApi() precisa ser chamada antes de request()');
  const { baseUrl, obterToken, aoNaoAutorizado, timeoutMs = TIMEOUT_PADRAO_MS } = config;

  const token = obterToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opcoes.corpo !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);

  const resposta = await fetch(montarUrl(baseUrl, caminho, opcoes.query), {
    method: opcoes.metodo ?? 'GET',
    headers,
    body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
    signal: controlador.signal,
  })
    .catch(() => {
      throw new ApiError(0, 'Sem conexão com o servidor');
    })
    .finally(() => clearTimeout(temporizador));

  if (resposta.status === 401 && token) aoNaoAutorizado();
  if (!resposta.ok) throw new ApiError(resposta.status, await extrairMensagem(resposta));
  if (resposta.status === 204) return undefined as T;
  return (await resposta.json()) as T;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/api/client.test.ts`
Expected: PASS.

- [ ] **Step 5: Escrever o teste dos recursos (falhando)**

`src/api/recursos.test.ts`:

```ts
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
  global.fetch = fetchMock as unknown as typeof fetch;
  configurarApi({ baseUrl: 'http://api', obterToken: () => 'tok', aoNaoAutorizado: jest.fn() });
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
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx jest src/api/recursos.test.ts`
Expected: FAIL — `Cannot find module '@/api/alertas'`.

- [ ] **Step 7: Implementar os módulos de recurso**

`src/api/auth.ts`:

```ts
import { request } from '@/api/client';
import type { CadastroRequest, LoginRequest, TokenResponse } from '@/api/tipos';

export const authApi = {
  login: (dados: LoginRequest) => request<TokenResponse>('/auth/login', { metodo: 'POST', corpo: dados }),
  cadastrar: (dados: CadastroRequest) => request<TokenResponse>('/usuarios', { metodo: 'POST', corpo: dados }),
};
```

`src/api/watchlist.ts`:

```ts
import { request } from '@/api/client';
import type { ItemWatchlist, Uuid } from '@/api/tipos';

export const watchlistApi = {
  listar: () => request<ItemWatchlist[]>('/watchlist'),
  adicionar: (ticker: string) => request<ItemWatchlist>('/watchlist', { metodo: 'POST', corpo: { ticker } }),
  remover: (ativoId: Uuid) => request<void>(`/watchlist/${ativoId}`, { metodo: 'DELETE' }),
  definirNotificacao: (ativoId: Uuid, notificar: boolean) =>
    request<ItemWatchlist>(`/watchlist/${ativoId}/notificacao`, { metodo: 'PATCH', corpo: { notificar } }),
};
```

`src/api/ativos.ts`:

```ts
import { request } from '@/api/client';
import type {
  AtivoEncontrado,
  CotacaoAtual,
  IndicadorTecnico,
  PeriodoHistorico,
  PontoHistorico,
  ResultadoBacktest,
  Sinal,
  Uuid,
} from '@/api/tipos';

export const ativosApi = {
  buscar: (termo: string) => request<AtivoEncontrado[]>('/ativos/buscar', { query: { termo } }),
  cotacao: (ativoId: Uuid) => request<CotacaoAtual>(`/ativos/${ativoId}/cotacao`),
  historico: (ativoId: Uuid, periodo: PeriodoHistorico) =>
    request<PontoHistorico[]>(`/ativos/${ativoId}/historico`, { query: { periodo } }),
  indicadores: (ativoId: Uuid) => request<IndicadorTecnico[]>(`/ativos/${ativoId}/indicadores`),
  sinais: (ativoId: Uuid) => request<Sinal[]>(`/ativos/${ativoId}/sinais`),
  backtest: (ativoId: Uuid, regraId: Uuid) =>
    request<ResultadoBacktest>(`/ativos/${ativoId}/sinais/${regraId}/backtest`),
};
```

`src/api/alertas.ts`:

```ts
import { request } from '@/api/client';
import type { Alerta, AtualizarAlertaRequest, CriarAlertaRequest, Uuid } from '@/api/tipos';

export const alertasApi = {
  listar: () => request<Alerta[]>('/alertas'),
  criar: (dados: CriarAlertaRequest) => request<Alerta>('/alertas', { metodo: 'POST', corpo: dados }),
  atualizar: (alertaId: Uuid, dados: AtualizarAlertaRequest) =>
    request<Alerta>(`/alertas/${alertaId}`, { metodo: 'PATCH', corpo: dados }),
  remover: (alertaId: Uuid) => request<void>(`/alertas/${alertaId}`, { metodo: 'DELETE' }),
};
```

`src/api/notificacoes.ts`:

```ts
import { request } from '@/api/client';
import type { Notificacao, Uuid } from '@/api/tipos';

export const notificacoesApi = {
  listar: (apenasNaoLidas = false) =>
    request<Notificacao[]>('/notificacoes', {
      query: apenasNaoLidas ? { apenas_nao_lidas: true } : undefined,
    }),
  marcarComoLida: (notificacaoId: Uuid) =>
    request<Notificacao>(`/notificacoes/${notificacaoId}/lida`, { metodo: 'PATCH' }),
};
```

`src/api/portfolio.ts`:

```ts
import { request } from '@/api/client';
import type {
  Comparativo,
  Distribuicao,
  Operacao,
  Posicao,
  RegistrarOperacaoRequest,
  Rentabilidade,
  TipoBenchmark,
  Uuid,
} from '@/api/tipos';

export const portfolioApi = {
  listarOperacoes: () => request<Operacao[]>('/operacoes'),
  registrarOperacao: (dados: RegistrarOperacaoRequest) =>
    request<Operacao>('/operacoes', { metodo: 'POST', corpo: dados }),
  removerOperacao: (operacaoId: Uuid) => request<void>(`/operacoes/${operacaoId}`, { metodo: 'DELETE' }),
  posicoes: () => request<Posicao[]>('/portfolio/posicoes'),
  rentabilidade: () => request<Rentabilidade>('/portfolio/rentabilidade'),
  benchmark: (benchmark: TipoBenchmark) =>
    request<Comparativo>('/portfolio/benchmark', { query: { benchmark } }),
  distribuicao: () => request<Distribuicao>('/portfolio/distribuicao'),
};
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx jest src/api`
Expected: PASS (client + 26 casos de recursos).

- [ ] **Step 9: Escrever o teste de mensagens de erro (falhando)**

`src/utils/erros.test.ts`:

```ts
import { ApiError } from '@/api/client';
import { ehStatus, mensagemDeErro } from '@/utils/erros';

describe('mensagemDeErro', () => {
  it('usa a mensagem do ApiError', () => {
    expect(mensagemDeErro(new ApiError(0, 'Sem conexão com o servidor'))).toBe('Sem conexão com o servidor');
  });

  it('503 vira mensagem sobre a fonte de dados', () => {
    expect(mensagemDeErro(new ApiError(503, 'Fonte de dados de mercado indisponivel'))).toBe(
      'Fonte de dados de mercado indisponível. Tente novamente em instantes.',
    );
  });

  it('erro desconhecido vira mensagem genérica', () => {
    expect(mensagemDeErro(new Error('boom'))).toBe('Algo deu errado. Tente novamente.');
  });
});

describe('ehStatus', () => {
  it('reconhece o status de um ApiError', () => {
    expect(ehStatus(new ApiError(404, 'x'), 404)).toBe(true);
    expect(ehStatus(new ApiError(409, 'x'), 404)).toBe(false);
  });

  it('é falso para outros erros e para null', () => {
    expect(ehStatus(new Error('x'), 404)).toBe(false);
    expect(ehStatus(null, 404)).toBe(false);
  });
});
```

- [ ] **Step 10: Rodar e ver falhar**

Run: `npx jest src/utils/erros.test.ts`
Expected: FAIL — `Cannot find module '@/utils/erros'`.

- [ ] **Step 11: Implementar**

`src/utils/erros.ts`:

```ts
import { ApiError } from '@/api/client';

export function ehStatus(erro: unknown, status: number): boolean {
  return erro instanceof ApiError && erro.status === status;
}

export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ApiError) {
    if (erro.status === 503) return 'Fonte de dados de mercado indisponível. Tente novamente em instantes.';
    return erro.message;
  }
  return 'Algo deu errado. Tente novamente.';
}
```

- [ ] **Step 12: Rodar e ver passar**

Run: `npx jest src/utils`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add src/api src/utils/erros.ts src/utils/erros.test.ts
git commit -m "feat: adiciona client HTTP e módulos de recurso da API

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: QueryClient e sessão

**Files:**
- Create: `src/hooks/queryClient.ts`, `src/store/sessao.ts`
- Test: `src/hooks/queryClient.test.ts`, `src/store/sessao.test.ts`

**Interfaces:**
- Consumes: `ApiError` (Task 3); mock global de `expo-secure-store` com `__armazenamento` (Task 1).
- Produces:
  - `deveRepetir(falhas: number, erro: unknown): boolean` — repete só `status 0` e `>= 500`, no máximo 2 vezes.
  - `criarQueryClient(): QueryClient`; `queryClient: QueryClient` (singleton do app).
  - `useSessao` (store Zustand) com estado `{ status: 'carregando' | 'autenticado' | 'anonimo'; token: string | null; email: string | null }` e ações `hidratar(): Promise<void>`, `entrar(token: string, email: string): Promise<void>`, `sair(): Promise<void>` (esta também chama `queryClient.clear()`).
  - Chaves do SecureStore: `insightflow.token`, `insightflow.email`.

- [ ] **Step 1: Escrever o teste do QueryClient (falhando)**

`src/hooks/queryClient.test.ts`:

```ts
import { ApiError } from '@/api/client';
import { deveRepetir } from '@/hooks/queryClient';

it.each([
  ['sem conexão, 1ª falha', 0, new ApiError(0, 'x'), true],
  ['503, 2ª falha', 1, new ApiError(503, 'x'), true],
  ['503, 3ª falha', 2, new ApiError(503, 'x'), false],
  ['404', 0, new ApiError(404, 'x'), false],
  ['401', 0, new ApiError(401, 'x'), false],
  ['422', 0, new ApiError(422, 'x'), false],
  ['erro que não é da API', 0, new Error('x'), false],
])('%s → %p', (_caso, falhas, erro, esperado) => {
  expect(deveRepetir(falhas as number, erro)).toBe(esperado);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/hooks/queryClient.test.ts`
Expected: FAIL — `Cannot find module '@/hooks/queryClient'`.

- [ ] **Step 3: Implementar o QueryClient**

`src/hooks/queryClient.ts`:

```ts
import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';

const MAXIMO_DE_REPETICOES = 2;

/** Repete só falhas transitórias (rede/timeout e 5xx); 4xx nunca se resolve repetindo. */
export function deveRepetir(falhas: number, erro: unknown): boolean {
  if (falhas >= MAXIMO_DE_REPETICOES) return false;
  return erro instanceof ApiError && (erro.status === 0 || erro.status >= 500);
}

export function criarQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: deveRepetir, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
}

export const queryClient = criarQueryClient();
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/hooks/queryClient.test.ts`
Expected: PASS.

- [ ] **Step 5: Escrever o teste da sessão (falhando)**

`src/store/sessao.test.ts`:

```ts
import * as SecureStore from 'expo-secure-store';

import { queryClient } from '@/hooks/queryClient';
import { useSessao } from '@/store/sessao';

const armazenamento = (SecureStore as unknown as { __armazenamento: Map<string, string> }).__armazenamento;

beforeEach(() => {
  armazenamento.clear();
  useSessao.setState({ status: 'carregando', token: null, email: null });
});

it('hidratar sem token salvo fica anônimo', async () => {
  await useSessao.getState().hidratar();
  expect(useSessao.getState().status).toBe('anonimo');
});

it('hidratar com token salvo fica autenticado', async () => {
  armazenamento.set('insightflow.token', 'tok');
  armazenamento.set('insightflow.email', 'ana@exemplo.com');
  await useSessao.getState().hidratar();
  expect(useSessao.getState()).toMatchObject({ status: 'autenticado', token: 'tok', email: 'ana@exemplo.com' });
});

it('hidratar com falha de leitura fica anônimo', async () => {
  jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('keystore indisponível'));
  await useSessao.getState().hidratar();
  expect(useSessao.getState().status).toBe('anonimo');
});

it('entrar grava no SecureStore e autentica', async () => {
  await useSessao.getState().entrar('tok', 'ana@exemplo.com');
  expect(armazenamento.get('insightflow.token')).toBe('tok');
  expect(armazenamento.get('insightflow.email')).toBe('ana@exemplo.com');
  expect(useSessao.getState()).toMatchObject({ status: 'autenticado', token: 'tok' });
});

it('sair apaga o SecureStore, limpa o cache e fica anônimo', async () => {
  const limpar = jest.spyOn(queryClient, 'clear');
  armazenamento.set('insightflow.token', 'tok');
  armazenamento.set('insightflow.email', 'ana@exemplo.com');
  useSessao.setState({ status: 'autenticado', token: 'tok', email: 'ana@exemplo.com' });

  await useSessao.getState().sair();

  expect(armazenamento.size).toBe(0);
  expect(limpar).toHaveBeenCalled();
  expect(useSessao.getState()).toMatchObject({ status: 'anonimo', token: null, email: null });
});

it('sair duas vezes seguidas (vários 401 em paralelo) não quebra', async () => {
  useSessao.setState({ status: 'autenticado', token: 'tok', email: 'ana@exemplo.com' });
  await Promise.all([useSessao.getState().sair(), useSessao.getState().sair()]);
  expect(useSessao.getState().status).toBe('anonimo');
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx jest src/store/sessao.test.ts`
Expected: FAIL — `Cannot find module '@/store/sessao'`.

- [ ] **Step 7: Implementar a sessão**

`src/store/sessao.ts`:

```ts
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { queryClient } from '@/hooks/queryClient';

const CHAVE_TOKEN = 'insightflow.token';
const CHAVE_EMAIL = 'insightflow.email';

export type StatusSessao = 'carregando' | 'autenticado' | 'anonimo';

interface EstadoSessao {
  status: StatusSessao;
  token: string | null;
  email: string | null;
  hidratar: () => Promise<void>;
  entrar: (token: string, email: string) => Promise<void>;
  sair: () => Promise<void>;
}

const ANONIMO = { status: 'anonimo', token: null, email: null } as const;

export const useSessao = create<EstadoSessao>()((set) => ({
  status: 'carregando',
  token: null,
  email: null,

  hidratar: async () => {
    try {
      const [token, email] = await Promise.all([
        SecureStore.getItemAsync(CHAVE_TOKEN),
        SecureStore.getItemAsync(CHAVE_EMAIL),
      ]);
      set(token ? { status: 'autenticado', token, email } : ANONIMO);
    } catch {
      set(ANONIMO);
    }
  },

  entrar: async (token, email) => {
    await SecureStore.setItemAsync(CHAVE_TOKEN, token);
    await SecureStore.setItemAsync(CHAVE_EMAIL, email);
    set({ status: 'autenticado', token, email });
  },

  sair: async () => {
    set(ANONIMO);
    queryClient.clear();
    await Promise.all([SecureStore.deleteItemAsync(CHAVE_TOKEN), SecureStore.deleteItemAsync(CHAVE_EMAIL)]);
  },
}));
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx jest src/store src/hooks`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/hooks/queryClient.ts src/hooks/queryClient.test.ts src/store
git commit -m "feat: adiciona QueryClient com política de retry e sessão com SecureStore

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Tema e componentes base

**Files:**
- Create: `src/theme/cores.ts`, `src/theme/escala.ts`, `src/theme/useTema.ts`
- Create: `src/components/Texto.tsx`, `Botao.tsx`, `Campo.tsx`, `Card.tsx`, `Linha.tsx`, `Tela.tsx`, `Carregando.tsx`, `EstadoVazio.tsx`, `ErroComRetry.tsx`, `EstadoConsulta.tsx`, `SeletorSegmentado.tsx` (todos em `src/components/`)
- Test: `src/theme/cores.test.ts`, `src/components/base.test.tsx`

**Interfaces:**
- Consumes: `mensagemDeErro` (Task 3); `ApiError` (Task 3, só nos testes).
- Produces:
  - `interface Cores { fundo; superficie; superficieElevada; texto; textoSecundario; borda; primaria; textoSobrePrimaria; positivo; negativo; alerta }` (todos `string`); `coresClaro`, `coresEscuro`, `paletaClaro`, `paletaEscuro` (`readonly string[]` com 6 cores de série).
  - `espaco = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }`, `raio = { sm: 6, md: 10, lg: 16, pilula: 999 }`, `fonte = { legenda: 12, corpo: 15, subtitulo: 17, titulo: 22, destaque: 28 }`.
  - `interface Tema { esquema: 'claro' | 'escuro'; cores: Cores; serie: readonly string[] }`; `useTema(): Tema`.
  - `Texto` — props de `Text` + `variante?: 'destaque' | 'titulo' | 'subtitulo' | 'corpo' | 'legenda'`, `cor?: CorTexto`, `negrito?: boolean`; `type CorTexto = 'padrao' | 'secundario' | 'primaria' | 'positivo' | 'negativo' | 'alerta' | 'sobrePrimaria'`.
  - `Botao({ titulo, onPress, variante?: 'primario' | 'secundario' | 'perigo', carregando?, desabilitado? })` — `role="button"`, nome acessível = `titulo`.
  - `Campo({ rotulo, valor, aoMudar, erro?, placeholder?, secureTextEntry?, keyboardType?, autoCapitalize?, autoComplete?, editable? })` — o `TextInput` tem `aria-label={rotulo}`.
  - `Card({ titulo?, acao?, children })`; `Linha({ rotulo, valor: ReactNode, cor?: CorTexto })`.
  - `Tela({ children, areaSegura?, aoAtualizar?, atualizando? })` — ScrollView com padding/gap, teclado e pull-to-refresh opcional.
  - `Carregando({ mensagem? })` — `ActivityIndicator` com `aria-label="Carregando"`.
  - `EstadoVazio({ mensagem, acao?: { titulo, onPress } })`; `ErroComRetry({ erro: unknown, aoTentarNovamente, mensagem? })` — texto com `role="alert"`.
  - `EstadoConsulta<T>({ consulta: { isPending; isError; error; data: T | undefined; refetch }, children: (dados: T) => ReactNode, mensagemErro?: (erro: unknown) => string | undefined })`.
  - `SeletorSegmentado<T extends string>({ rotulo, opcoes: readonly { valor: T; rotulo: string }[], selecionado: T, aoSelecionar: (valor: T) => void })` — grupo `role="radiogroup"`, opções `role="radio"` com `aria-checked`.

- [ ] **Step 1: Escrever o teste de contraste do tema (falhando)**

`src/theme/cores.test.ts`:

```ts
import { type Cores, coresClaro, coresEscuro } from '@/theme/cores';

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((inicio) => {
    const canal = parseInt(hex.slice(inicio, inicio + 2), 16) / 255;
    return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [clara, escura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (clara + 0.05) / (escura + 0.05);
}

const TEXTOS: (keyof Cores)[] = ['texto', 'textoSecundario', 'primaria', 'positivo', 'negativo', 'alerta'];
const FUNDOS: (keyof Cores)[] = ['fundo', 'superficie', 'superficieElevada'];
const PARES = TEXTOS.flatMap((texto) => FUNDOS.map((fundo) => [texto, fundo] as [keyof Cores, keyof Cores]));

describe.each([
  ['claro', coresClaro],
  ['escuro', coresEscuro],
])('tema %s', (_nome, cores) => {
  it.each(PARES)('%s sobre %s atinge contraste AA (≥ 4,5)', (texto, fundo) => {
    expect(contraste(cores[texto], cores[fundo])).toBeGreaterThanOrEqual(4.5);
  });

  it('texto sobre a cor primária atinge contraste AA', () => {
    expect(contraste(cores.textoSobrePrimaria, cores.primaria)).toBeGreaterThanOrEqual(4.5);
  });
});

it('os dois temas têm as mesmas chaves', () => {
  expect(Object.keys(coresEscuro).sort()).toEqual(Object.keys(coresClaro).sort());
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/theme`
Expected: FAIL — `Cannot find module '@/theme/cores'`.

- [ ] **Step 3: Implementar os tokens e o hook de tema**

`src/theme/cores.ts`:

```ts
export interface Cores {
  fundo: string;
  superficie: string;
  superficieElevada: string;
  texto: string;
  textoSecundario: string;
  borda: string;
  primaria: string;
  textoSobrePrimaria: string;
  positivo: string;
  negativo: string;
  alerta: string;
}

export const coresClaro: Cores = {
  fundo: '#F5F7FA',
  superficie: '#FFFFFF',
  superficieElevada: '#EEF2F7',
  texto: '#0F172A',
  textoSecundario: '#475569',
  borda: '#D8DEE8',
  primaria: '#1D4ED8',
  textoSobrePrimaria: '#FFFFFF',
  positivo: '#047857',
  negativo: '#B91C1C',
  alerta: '#92400E',
};

export const coresEscuro: Cores = {
  fundo: '#0B1120',
  superficie: '#131C2E',
  superficieElevada: '#1C2740',
  texto: '#E6EDF7',
  textoSecundario: '#94A3B8',
  borda: '#26324A',
  primaria: '#60A5FA',
  textoSobrePrimaria: '#0B1120',
  positivo: '#34D399',
  negativo: '#F87171',
  alerta: '#FBBF24',
};

/** Cores de série para gráficos categóricos (a legenda sempre traz rótulo e valor). */
export const paletaClaro: readonly string[] = ['#1D4ED8', '#0E7490', '#7C3AED', '#BE185D', '#C2410C', '#4D7C0F'];
export const paletaEscuro: readonly string[] = ['#60A5FA', '#22D3EE', '#A78BFA', '#F472B6', '#FB923C', '#A3E635'];
```

`src/theme/escala.ts`:

```ts
export const espaco = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const raio = { sm: 6, md: 10, lg: 16, pilula: 999 } as const;
export const fonte = { legenda: 12, corpo: 15, subtitulo: 17, titulo: 22, destaque: 28 } as const;
```

`src/theme/useTema.ts`:

```ts
import { useColorScheme } from 'react-native';

import { type Cores, coresClaro, coresEscuro, paletaClaro, paletaEscuro } from '@/theme/cores';

export interface Tema {
  esquema: 'claro' | 'escuro';
  cores: Cores;
  serie: readonly string[];
}

const temaClaro: Tema = { esquema: 'claro', cores: coresClaro, serie: paletaClaro };
const temaEscuro: Tema = { esquema: 'escuro', cores: coresEscuro, serie: paletaEscuro };

export function useTema(): Tema {
  return useColorScheme() === 'dark' ? temaEscuro : temaClaro;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/theme`
Expected: PASS (36 pares + 2 + 1).

- [ ] **Step 5: Escrever o teste dos componentes base (falhando)**

`src/components/base.test.tsx`:

```tsx
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ApiError } from '@/api/client';
import { Botao } from '@/components/Botao';
import { Campo } from '@/components/Campo';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoConsulta } from '@/components/EstadoConsulta';
import { EstadoVazio } from '@/components/EstadoVazio';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';

describe('Botao', () => {
  it('dispara onPress', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Botao titulo="Entrar" onPress={onPress} />);
    await user.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('carregando fica desabilitado e não dispara', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Botao titulo="Entrar" onPress={onPress} carregando />);
    const botao = screen.getByRole('button', { name: 'Entrar' });
    expect(botao).toBeDisabled();
    await user.press(botao);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Campo', () => {
  it('repassa o texto digitado', async () => {
    const aoMudar = jest.fn();
    await render(<Campo rotulo="Ticker" valor="" aoMudar={aoMudar} />);
    await fireEvent.changeText(screen.getByLabelText('Ticker'), 'VALE3');
    expect(aoMudar).toHaveBeenCalledWith('VALE3');
  });

  it('mostra a mensagem de erro', async () => {
    await render(<Campo rotulo="E-mail" valor="" aoMudar={jest.fn()} erro="Informe um e-mail válido" />);
    expect(screen.getByText('Informe um e-mail válido')).toBeOnTheScreen();
  });
});

describe('ErroComRetry', () => {
  it('mostra a mensagem do ApiError e tenta de novo', async () => {
    const user = userEvent.setup();
    const tentar = jest.fn();
    await render(<ErroComRetry erro={new ApiError(0, 'Sem conexão com o servidor')} aoTentarNovamente={tentar} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Sem conexão com o servidor');
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(tentar).toHaveBeenCalledTimes(1);
  });

  it('mensagem explícita tem prioridade', async () => {
    await render(<ErroComRetry erro={new ApiError(404, 'x')} mensagem="Sem cotação" aoTentarNovamente={jest.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Sem cotação');
  });
});

describe('EstadoVazio', () => {
  it('mostra a mensagem e a ação', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<EstadoVazio mensagem="Nada aqui." acao={{ titulo: 'Buscar ativo', onPress }} />);
    expect(screen.getByText('Nada aqui.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Buscar ativo' }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('SeletorSegmentado', () => {
  const opcoes = [
    { valor: '1M', rotulo: '1M' },
    { valor: '3M', rotulo: '3M' },
  ] as const;

  it('marca a opção selecionada e avisa a troca', async () => {
    const user = userEvent.setup();
    const aoSelecionar = jest.fn();
    await render(<SeletorSegmentado rotulo="Período" opcoes={opcoes} selecionado="1M" aoSelecionar={aoSelecionar} />);
    expect(screen.getByRole('radio', { name: '1M' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '3M' })).not.toBeChecked();
    await user.press(screen.getByRole('radio', { name: '3M' }));
    expect(aoSelecionar).toHaveBeenCalledWith('3M');
  });
});

describe('EstadoConsulta', () => {
  const base = { isPending: false, isError: false, error: null, data: undefined, refetch: jest.fn() };

  it('mostra carregando enquanto pendente', async () => {
    await render(<EstadoConsulta consulta={{ ...base, isPending: true }}>{() => <Text>dados</Text>}</EstadoConsulta>);
    expect(screen.getByLabelText('Carregando')).toBeOnTheScreen();
  });

  it('mostra erro com retry', async () => {
    const user = userEvent.setup();
    const refetch = jest.fn();
    await render(
      <EstadoConsulta
        consulta={{ ...base, isError: true, error: new ApiError(404, 'x'), refetch }}
        mensagemErro={() => 'Sem cotação disponível para este ativo.'}
      >
        {() => <Text>dados</Text>}
      </EstadoConsulta>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Sem cotação disponível para este ativo.');
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('entrega os dados ao children', async () => {
    await render(
      <EstadoConsulta consulta={{ ...base, data: 'PETR4' }}>{(dados) => <Text>{`ativo ${dados}`}</Text>}</EstadoConsulta>,
    );
    expect(screen.getByText('ativo PETR4')).toBeOnTheScreen();
  });
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx jest src/components/base.test.tsx`
Expected: FAIL — `Cannot find module '@/components/Botao'`.

- [ ] **Step 7: Implementar os componentes base**

`src/components/Texto.tsx`:

```tsx
import { Text, type TextProps, type TextStyle } from 'react-native';

import type { Cores } from '@/theme/cores';
import { fonte } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

export type VarianteTexto = 'destaque' | 'titulo' | 'subtitulo' | 'corpo' | 'legenda';
export type CorTexto = 'padrao' | 'secundario' | 'primaria' | 'positivo' | 'negativo' | 'alerta' | 'sobrePrimaria';

const TOKEN_DA_COR: Record<CorTexto, keyof Cores> = {
  padrao: 'texto',
  secundario: 'textoSecundario',
  primaria: 'primaria',
  positivo: 'positivo',
  negativo: 'negativo',
  alerta: 'alerta',
  sobrePrimaria: 'textoSobrePrimaria',
};

const ESTILO_DA_VARIANTE: Record<VarianteTexto, TextStyle> = {
  destaque: { fontSize: fonte.destaque, fontWeight: '700' },
  titulo: { fontSize: fonte.titulo, fontWeight: '700' },
  subtitulo: { fontSize: fonte.subtitulo, fontWeight: '600' },
  corpo: { fontSize: fonte.corpo },
  legenda: { fontSize: fonte.legenda },
};

const NEGRITO: TextStyle = { fontWeight: '700' };

interface Props extends TextProps {
  variante?: VarianteTexto;
  cor?: CorTexto;
  negrito?: boolean;
}

export function Texto({ variante = 'corpo', cor = 'padrao', negrito = false, style, ...resto }: Props) {
  const { cores } = useTema();
  return (
    <Text
      style={[ESTILO_DA_VARIANTE[variante], { color: cores[TOKEN_DA_COR[cor]] }, negrito && NEGRITO, style]}
      {...resto}
    />
  );
}
```

`src/components/Botao.tsx`:

```tsx
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { type CorTexto, Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

type VarianteBotao = 'primario' | 'secundario' | 'perigo';

interface Props {
  titulo: string;
  onPress: () => void;
  variante?: VarianteBotao;
  carregando?: boolean;
  desabilitado?: boolean;
}

const COR_DO_TEXTO: Record<VarianteBotao, CorTexto> = {
  primario: 'sobrePrimaria',
  secundario: 'primaria',
  perigo: 'negativo',
};

export function Botao({ titulo, onPress, variante = 'primario', carregando = false, desabilitado = false }: Props) {
  const { cores } = useTema();
  const inativo = desabilitado || carregando;
  const fundo = variante === 'primario' ? cores.primaria : 'transparent';
  const borda = variante === 'perigo' ? cores.negativo : cores.primaria;

  return (
    <Pressable
      role="button"
      aria-label={titulo}
      aria-disabled={inativo}
      aria-busy={carregando}
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        { backgroundColor: fundo, borderColor: borda, opacity: inativo ? 0.6 : pressed ? 0.85 : 1 },
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={variante === 'primario' ? cores.textoSobrePrimaria : cores.primaria} />
      ) : (
        <Texto negrito cor={COR_DO_TEXTO[variante]}>
          {titulo}
        </Texto>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: raio.md,
    borderWidth: 1,
    paddingHorizontal: espaco.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
});
```

`src/components/Campo.tsx`:

```tsx
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { espaco, fonte, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

type PropsRepassadas = Pick<
  TextInputProps,
  'placeholder' | 'secureTextEntry' | 'keyboardType' | 'autoCapitalize' | 'autoComplete' | 'editable'
>;

interface Props extends PropsRepassadas {
  rotulo: string;
  valor: string;
  aoMudar: (texto: string) => void;
  erro?: string;
}

export function Campo({ rotulo, valor, aoMudar, erro, ...resto }: Props) {
  const { cores } = useTema();
  return (
    <View style={estilos.container}>
      <Texto variante="legenda" cor="secundario" negrito>
        {rotulo}
      </Texto>
      <TextInput
        aria-label={rotulo}
        value={valor}
        onChangeText={aoMudar}
        placeholderTextColor={cores.textoSecundario}
        style={[
          estilos.entrada,
          { color: cores.texto, backgroundColor: cores.superficie, borderColor: erro ? cores.negativo : cores.borda },
        ]}
        {...resto}
      />
      {erro ? (
        <Texto variante="legenda" cor="negativo">
          {erro}
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { gap: espaco.xs },
  entrada: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    fontSize: fonte.corpo,
  },
});
```

`src/components/Card.tsx`:

```tsx
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  titulo?: string;
  acao?: ReactNode;
  children: ReactNode;
}

export function Card({ titulo, acao, children }: Props) {
  const { cores } = useTema();
  return (
    <View style={[estilos.card, { backgroundColor: cores.superficie, borderColor: cores.borda }]}>
      {titulo || acao ? (
        <View style={estilos.cabecalho}>
          {titulo ? (
            <Texto variante="subtitulo" role="heading" style={estilos.titulo}>
              {titulo}
            </Texto>
          ) : (
            <View />
          )}
          {acao}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: raio.lg, padding: espaco.lg, gap: espaco.md },
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco.sm },
  titulo: { flexShrink: 1 },
});
```

`src/components/Linha.tsx`:

```tsx
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { type CorTexto, Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';

interface Props {
  rotulo: string;
  valor: ReactNode;
  cor?: CorTexto;
}

export function Linha({ rotulo, valor, cor = 'padrao' }: Props) {
  return (
    <View style={estilos.linha}>
      <Texto cor="secundario" style={estilos.rotulo}>
        {rotulo}
      </Texto>
      {typeof valor === 'string' ? (
        <Texto negrito cor={cor}>
          {valor}
        </Texto>
      ) : (
        valor
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: espaco.md },
  rotulo: { flexShrink: 1 },
});
```

`src/components/Tela.tsx`:

```tsx
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  children: ReactNode;
  /** Use em telas sem cabeçalho (login/cadastro). */
  areaSegura?: boolean;
  aoAtualizar?: () => void;
  atualizando?: boolean;
}

export function Tela({ children, areaSegura = false, aoAtualizar, atualizando = false }: Props) {
  const { cores } = useTema();
  const conteudo = (
    <KeyboardAvoidingView style={estilos.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={[estilos.flex, { backgroundColor: cores.fundo }]}
        contentContainerStyle={estilos.conteudo}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          aoAtualizar ? (
            <RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} tintColor={cores.primaria} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (!areaSegura) return conteudo;
  return <SafeAreaView style={[estilos.flex, { backgroundColor: cores.fundo }]}>{conteudo}</SafeAreaView>;
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  conteudo: { padding: espaco.lg, gap: espaco.lg, flexGrow: 1 },
});
```

`src/components/Carregando.tsx`:

```tsx
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

export function Carregando({ mensagem }: { mensagem?: string }) {
  const { cores } = useTema();
  return (
    <View style={estilos.container}>
      <ActivityIndicator aria-label="Carregando" color={cores.primaria} />
      {mensagem ? <Texto cor="secundario">{mensagem}</Texto> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { padding: espaco.lg, alignItems: 'center', justifyContent: 'center', gap: espaco.sm },
});
```

`src/components/EstadoVazio.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';

interface Props {
  mensagem: string;
  acao?: { titulo: string; onPress: () => void };
}

export function EstadoVazio({ mensagem, acao }: Props) {
  return (
    <View style={estilos.container}>
      <Texto cor="secundario" style={estilos.texto}>
        {mensagem}
      </Texto>
      {acao ? <Botao titulo={acao.titulo} variante="secundario" onPress={acao.onPress} /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { padding: espaco.lg, gap: espaco.md },
  texto: { textAlign: 'center' },
});
```

`src/components/ErroComRetry.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';
import { mensagemDeErro } from '@/utils/erros';

interface Props {
  erro: unknown;
  aoTentarNovamente: () => void;
  mensagem?: string;
}

export function ErroComRetry({ erro, aoTentarNovamente, mensagem }: Props) {
  return (
    <View style={estilos.container}>
      <Texto role="alert" cor="negativo" style={estilos.texto}>
        {mensagem ?? mensagemDeErro(erro)}
      </Texto>
      <Botao titulo="Tentar novamente" variante="secundario" onPress={aoTentarNovamente} />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { padding: espaco.lg, gap: espaco.md },
  texto: { textAlign: 'center' },
});
```

`src/components/EstadoConsulta.tsx`:

```tsx
import type { ReactNode } from 'react';

import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';

/** Subconjunto de UseQueryResult que o componente usa (recebido por props, sem chamar hooks). */
interface Consulta<T> {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: T | undefined;
  refetch: () => unknown;
}

interface Props<T> {
  consulta: Consulta<T>;
  children: (dados: T) => ReactNode;
  mensagemErro?: (erro: unknown) => string | undefined;
}

export function EstadoConsulta<T>({ consulta, children, mensagemErro }: Props<T>) {
  if (consulta.isPending) return <Carregando />;
  if (consulta.isError || consulta.data === undefined) {
    return (
      <ErroComRetry
        erro={consulta.error}
        mensagem={mensagemErro?.(consulta.error)}
        aoTentarNovamente={() => {
          void consulta.refetch();
        }}
      />
    );
  }
  return <>{children(consulta.data)}</>;
}
```

`src/components/SeletorSegmentado.tsx`:

```tsx
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Opcao<T extends string> {
  valor: T;
  rotulo: string;
}

interface Props<T extends string> {
  rotulo: string;
  opcoes: readonly Opcao<T>[];
  selecionado: T;
  aoSelecionar: (valor: T) => void;
}

export function SeletorSegmentado<T extends string>({ rotulo, opcoes, selecionado, aoSelecionar }: Props<T>) {
  const { cores } = useTema();
  return (
    <View
      role="radiogroup"
      aria-label={rotulo}
      style={[estilos.grupo, { borderColor: cores.borda, backgroundColor: cores.superficieElevada }]}
    >
      {opcoes.map((opcao) => {
        const ativo = opcao.valor === selecionado;
        return (
          <Pressable
            key={opcao.valor}
            role="radio"
            aria-checked={ativo}
            aria-label={opcao.rotulo}
            onPress={() => aoSelecionar(opcao.valor)}
            style={[estilos.opcao, ativo && { backgroundColor: cores.primaria }]}
          >
            <Texto variante="legenda" negrito cor={ativo ? 'sobrePrimaria' : 'padrao'}>
              {opcao.rotulo}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { flexDirection: 'row', borderWidth: 1, borderRadius: raio.md, padding: 2 },
  opcao: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: raio.sm },
});
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx jest src/components src/theme`
Expected: PASS.

- [ ] **Step 9: Lint e typecheck**

Run: `npm run lint && npm run typecheck`
Expected: sem erros.

- [ ] **Step 10: Commit**

```bash
git add src/theme src/components
git commit -m "feat: adiciona tema claro/escuro e componentes base

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Descrição de indicadores e componentes de domínio

**Files:**
- Create: `src/dominio/regulatorio.ts`, `src/dominio/indicadores.ts`
- Create: `src/components/VariacaoBadge.tsx`, `AvisoIA.tsx`, `CardAnaliseIA.tsx`, `IndicadorItem.tsx`, `SinalCard.tsx`
- Test: `src/dominio/indicadores.test.ts`, `src/components/dominio.test.tsx`

**Interfaces:**
- Consumes: `IndicadorTecnico`, `Sinal`, `ResultadoBacktest`, `Decimal` (Task 2); `formatarNumero`, `formatarPercentual`, `formatarDataHora`, `paraNumero`, `EscalaPercentual` (Task 2); `Card`, `Linha`, `Texto`, `Carregando`, `useTema`, `fonte`, `espaco`, `raio` (Task 5).
- Produces:
  - `AVISO_IA = 'Análise gerada por IA. Não constitui recomendação de investimento.'`
  - `interface IndicadorDescrito { chave: string; titulo: string; valor: string; descricao: string }`; `descreverIndicadores(indicadores: IndicadorTecnico[], precoAtual: number | null): IndicadorDescrito[]` — ordem SMA (por período) → RSI → MACD → Bollinger → Volume relativo.
  - `VariacaoBadge({ valor: Decimal | number, escala: EscalaPercentual })` — texto `▲ +1,23%` / `▼ -2,50%` / `• 0,00%`.
  - `AvisoIA()`; `CardAnaliseIA()`; `IndicadorItem({ indicador: IndicadorDescrito })`; `SinalCard({ sinal: Sinal, backtest?: ResultadoBacktest, carregandoBacktest: boolean })`.

- [ ] **Step 1: Escrever o teste de indicadores (falhando)**

`src/dominio/indicadores.test.ts`:

```ts
import type { IndicadorTecnico, TipoIndicador } from '@/api/tipos';
import { descreverIndicadores } from '@/dominio/indicadores';

function indicador(
  tipo: TipoIndicador,
  valor: string,
  parametros: Record<string, number>,
  valoresAuxiliares: Record<string, number> | null = null,
): IndicadorTecnico {
  return { tipo, valor, parametros, valores_auxiliares: valoresAuxiliares, data_calculo: '2026-09-25T12:00:00Z' };
}

describe('RSI', () => {
  it('abaixo de 30 descreve sobrevenda', () => {
    const [rsi] = descreverIndicadores([indicador('RSI', '28.44', { periodo: 14 })], 10);
    expect(rsi).toMatchObject({ titulo: 'RSI 14', valor: '28,4', descricao: 'Zona de sobrevenda (abaixo de 30)' });
  });

  it('acima de 70 descreve sobrecompra', () => {
    const [rsi] = descreverIndicadores([indicador('RSI', '75', { periodo: 14 })], 10);
    expect(rsi.descricao).toBe('Zona de sobrecompra (acima de 70)');
  });

  it.each(['30', '50', '70'])('%s é zona neutra (limiares estritos, como no backend)', (valor) => {
    const [rsi] = descreverIndicadores([indicador('RSI', valor, { periodo: 14 })], 10);
    expect(rsi.descricao).toBe('Zona neutra (entre 30 e 70)');
  });
});

describe('SMA', () => {
  const sma20 = indicador('SMA', '20', { periodo: 20 });

  it('compara com o preço atual', () => {
    expect(descreverIndicadores([sma20], 25)[0].descricao).toBe('Preço atual acima da média');
    expect(descreverIndicadores([sma20], 15)[0].descricao).toBe('Preço atual abaixo da média');
    expect(descreverIndicadores([sma20], 20)[0].descricao).toBe('Preço atual no nível da média');
  });

  it('sem cotação avisa que não há comparação', () => {
    expect(descreverIndicadores([sma20], null)[0].descricao).toBe('Sem cotação atual para comparar');
  });
});

it('MACD mostra sinal, histograma e a relação entre as linhas', () => {
  const [macd] = descreverIndicadores(
    [indicador('MACD', '0.3', { rapida: 12, lenta: 26, sinal: 9 }, { linha_sinal: 0.5, histograma: -0.2 })],
    10,
  );
  expect(macd).toMatchObject({
    titulo: 'MACD 12/26/9',
    valor: '0,30',
    descricao: 'Sinal 0,50 · Histograma -0,20 — linha MACD abaixo da linha de sinal',
  });
});

it('Bollinger posiciona o preço em relação às bandas', () => {
  const bollinger = indicador('BOLLINGER', '35', { periodo: 20, desvios: 2 }, { banda_superior: 40, banda_inferior: 30 });
  expect(descreverIndicadores([bollinger], 29)[0]).toMatchObject({
    titulo: 'Bollinger 20/2',
    descricao: 'Superior 40,00 · Inferior 30,00 — preço abaixo da banda inferior',
  });
  expect(descreverIndicadores([bollinger], 41)[0].descricao).toContain('preço acima da banda superior');
  expect(descreverIndicadores([bollinger], 35)[0].descricao).toContain('preço dentro das bandas');
});

it('volume relativo em múltiplos da média', () => {
  const [volume] = descreverIndicadores([indicador('VOLUME_RELATIVO', '1.8', { periodo: 20 })], 10);
  expect(volume).toMatchObject({
    titulo: 'Volume relativo 20',
    valor: '1,80×',
    descricao: 'Volume 1,80× a média de 20 pregões',
  });
});

it('ordena SMAs por período antes dos demais indicadores', () => {
  const titulos = descreverIndicadores(
    [
      indicador('VOLUME_RELATIVO', '1', { periodo: 20 }),
      indicador('RSI', '50', { periodo: 14 }),
      indicador('SMA', '10', { periodo: 200 }),
      indicador('SMA', '10', { periodo: 20 }),
    ],
    10,
  ).map((item) => item.titulo);
  expect(titulos).toEqual(['SMA 20', 'SMA 200', 'RSI 14', 'Volume relativo 20']);
});

it('nenhum texto usa verbo de recomendação (RN-01)', () => {
  const todos = [
    indicador('SMA', '20', { periodo: 20 }),
    indicador('RSI', '20', { periodo: 14 }),
    indicador('RSI', '80', { periodo: 14 }),
    indicador('MACD', '1', { rapida: 12, lenta: 26, sinal: 9 }, { linha_sinal: 0.5, histograma: 0.5 }),
    indicador('BOLLINGER', '35', { periodo: 20, desvios: 2 }, { banda_superior: 40, banda_inferior: 30 }),
    indicador('VOLUME_RELATIVO', '2', { periodo: 20 }),
  ];
  for (const preco of [null, 10, 35, 50]) {
    for (const item of descreverIndicadores(todos, preco)) {
      expect(`${item.titulo} ${item.descricao}`).not.toMatch(/\b(compre|comprar|venda|vender|invista|investir)\b/i);
    }
  }
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/dominio/indicadores.test.ts`
Expected: FAIL — `Cannot find module '@/dominio/indicadores'`.

- [ ] **Step 3: Implementar o domínio**

`src/dominio/regulatorio.ts`:

```ts
/** RN-05 / RF-16: texto obrigatório em toda tela com conteúdo gerado por IA. */
export const AVISO_IA = 'Análise gerada por IA. Não constitui recomendação de investimento.';
```

`src/dominio/indicadores.ts`:

```ts
import type { IndicadorTecnico, TipoIndicador } from '@/api/tipos';
import { formatarNumero, paraNumero } from '@/utils/formatacao';

export interface IndicadorDescrito {
  chave: string;
  titulo: string;
  valor: string;
  descricao: string;
}

const ORDEM: Record<TipoIndicador, number> = { SMA: 0, RSI: 1, MACD: 2, BOLLINGER: 3, VOLUME_RELATIVO: 4 };

// Mesmos limiares das regras padrão do backend (menor_que 30 / maior_que 70).
const RSI_SOBREVENDA = 30;
const RSI_SOBRECOMPRA = 70;

function auxiliar(indicador: IndicadorTecnico, chave: string): number | null {
  const valor = indicador.valores_auxiliares?.[chave];
  return typeof valor === 'number' ? valor : null;
}

function posicaoFrenteMedia(preco: number | null, media: number): string {
  if (preco === null) return 'Sem cotação atual para comparar';
  if (preco > media) return 'Preço atual acima da média';
  if (preco < media) return 'Preço atual abaixo da média';
  return 'Preço atual no nível da média';
}

function descrever(indicador: IndicadorTecnico, preco: number | null): IndicadorDescrito {
  const valor = paraNumero(indicador.valor);
  const p = indicador.parametros;
  const chave = `${indicador.tipo}-${Object.values(p).join('-')}`;

  switch (indicador.tipo) {
    case 'SMA':
      return { chave, titulo: `SMA ${p.periodo}`, valor: formatarNumero(valor), descricao: posicaoFrenteMedia(preco, valor) };

    case 'RSI': {
      const descricao =
        valor < RSI_SOBREVENDA
          ? 'Zona de sobrevenda (abaixo de 30)'
          : valor > RSI_SOBRECOMPRA
            ? 'Zona de sobrecompra (acima de 70)'
            : 'Zona neutra (entre 30 e 70)';
      return { chave, titulo: `RSI ${p.periodo}`, valor: formatarNumero(valor, 1), descricao };
    }

    case 'MACD': {
      const sinal = auxiliar(indicador, 'linha_sinal');
      const histograma = auxiliar(indicador, 'histograma');
      const partes = [
        sinal !== null ? `Sinal ${formatarNumero(sinal)}` : null,
        histograma !== null ? `Histograma ${formatarNumero(histograma)}` : null,
      ].filter((parte): parte is string => parte !== null);
      const relacao =
        histograma === null || histograma === 0
          ? ''
          : histograma > 0
            ? ' — linha MACD acima da linha de sinal'
            : ' — linha MACD abaixo da linha de sinal';
      return {
        chave,
        titulo: `MACD ${p.rapida}/${p.lenta}/${p.sinal}`,
        valor: formatarNumero(valor),
        descricao: `${partes.join(' · ')}${relacao}`,
      };
    }

    case 'BOLLINGER': {
      const superior = auxiliar(indicador, 'banda_superior');
      const inferior = auxiliar(indicador, 'banda_inferior');
      if (superior === null || inferior === null) {
        return { chave, titulo: `Bollinger ${p.periodo}/${p.desvios}`, valor: formatarNumero(valor), descricao: 'Bandas indisponíveis' };
      }
      const faixa = `Superior ${formatarNumero(superior)} · Inferior ${formatarNumero(inferior)}`;
      const posicao =
        preco === null
          ? ''
          : preco > superior
            ? ' — preço acima da banda superior'
            : preco < inferior
              ? ' — preço abaixo da banda inferior'
              : ' — preço dentro das bandas';
      return { chave, titulo: `Bollinger ${p.periodo}/${p.desvios}`, valor: formatarNumero(valor), descricao: `${faixa}${posicao}` };
    }

    case 'VOLUME_RELATIVO':
      return {
        chave,
        titulo: `Volume relativo ${p.periodo}`,
        valor: `${formatarNumero(valor)}×`,
        descricao: `Volume ${formatarNumero(valor)}× a média de ${p.periodo} pregões`,
      };
  }
}

export function descreverIndicadores(indicadores: IndicadorTecnico[], precoAtual: number | null): IndicadorDescrito[] {
  return [...indicadores]
    .sort((a, b) => ORDEM[a.tipo] - ORDEM[b.tipo] || (a.parametros.periodo ?? 0) - (b.parametros.periodo ?? 0))
    .map((indicador) => descrever(indicador, precoAtual));
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/dominio/indicadores.test.ts`
Expected: PASS.

- [ ] **Step 5: Escrever o teste dos componentes de domínio (falhando)**

`src/components/dominio.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';

import type { ResultadoBacktest, Sinal } from '@/api/tipos';
import { AvisoIA } from '@/components/AvisoIA';
import { CardAnaliseIA } from '@/components/CardAnaliseIA';
import { IndicadorItem } from '@/components/IndicadorItem';
import { SinalCard } from '@/components/SinalCard';
import { VariacaoBadge } from '@/components/VariacaoBadge';
import { AVISO_IA } from '@/dominio/regulatorio';
import { coresClaro } from '@/theme/cores';

describe('VariacaoBadge', () => {
  it('alta mostra seta para cima em verde', async () => {
    await render(<VariacaoBadge valor="1.23" escala="pontos" />);
    expect(screen.getByText('▲ +1,23%')).toHaveStyle({ color: coresClaro.positivo });
  });

  it('baixa mostra seta para baixo em vermelho', async () => {
    await render(<VariacaoBadge valor="-0.025" escala="fracao" />);
    expect(screen.getByText('▼ -2,50%')).toHaveStyle({ color: coresClaro.negativo });
  });

  it('zero é neutro', async () => {
    await render(<VariacaoBadge valor="0" escala="pontos" />);
    expect(screen.getByText('• 0,00%')).toHaveStyle({ color: coresClaro.textoSecundario });
  });
});

describe('aviso de IA (RN-05)', () => {
  it('AvisoIA mostra o texto exato', async () => {
    await render(<AvisoIA />);
    expect(screen.getByText('Análise gerada por IA. Não constitui recomendação de investimento.')).toBeOnTheScreen();
  });

  it('CardAnaliseIA sempre traz o aviso', async () => {
    await render(<CardAnaliseIA />);
    expect(screen.getByText('Análise textual por IA — disponível em breve.')).toBeOnTheScreen();
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
  });
});

it('IndicadorItem mostra título, valor e descrição', async () => {
  await render(
    <IndicadorItem indicador={{ chave: 'RSI-14', titulo: 'RSI 14', valor: '28,4', descricao: 'Zona de sobrevenda (abaixo de 30)' }} />,
  );
  expect(screen.getByText('RSI 14')).toBeOnTheScreen();
  expect(screen.getByText('28,4')).toBeOnTheScreen();
  expect(screen.getByText('Zona de sobrevenda (abaixo de 30)')).toBeOnTheScreen();
});

describe('SinalCard (RN-03: sinal sempre com histórico)', () => {
  const sinal: Sinal = {
    id: 's-1',
    ativo_id: 'a-1',
    regra_id: 'r-1',
    regra_nome: 'Sobrevenda RSI',
    regra_descricao: 'RSI(14) abaixo de 30 — condição técnica de sobrevenda.',
    data_ativacao: '2026-09-25T15:30:00Z',
    contexto: {},
    data_desativacao: null,
  };
  const backtest: ResultadoBacktest = {
    regra_id: 'r-1',
    ativo_id: 'a-1',
    total_ocorrencias: 3,
    retorno_medio_5_pregoes: '1.5',
    retorno_medio_20_pregoes: null,
    retorno_medio_60_pregoes: '-2',
  };

  it('mostra regra, ativação e estatísticas em pontos percentuais', async () => {
    await render(<SinalCard sinal={sinal} backtest={backtest} carregandoBacktest={false} />);
    expect(screen.getByText('Sobrevenda RSI')).toBeOnTheScreen();
    expect(screen.getByText('Ativo desde 25/09/2026 12:30')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
    expect(screen.getByText('+1,50%')).toBeOnTheScreen();
    expect(screen.getByText('—')).toBeOnTheScreen();
    expect(screen.getByText('-2,00%')).toBeOnTheScreen();
  });

  it('zero ocorrências tem mensagem própria', async () => {
    await render(<SinalCard sinal={sinal} backtest={{ ...backtest, total_ocorrencias: 0 }} carregandoBacktest={false} />);
    expect(screen.getByText('Sem ocorrências nos últimos 24 meses')).toBeOnTheScreen();
  });

  it('backtest indisponível não quebra o card', async () => {
    await render(<SinalCard sinal={sinal} carregandoBacktest={false} />);
    expect(screen.getByText('Histórico indisponível no momento')).toBeOnTheScreen();
  });
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx jest src/components/dominio.test.tsx`
Expected: FAIL — `Cannot find module '@/components/AvisoIA'`.

- [ ] **Step 7: Implementar os componentes de domínio**

`src/components/VariacaoBadge.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native';

import type { Decimal } from '@/api/tipos';
import { espaco, fonte, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { type EscalaPercentual, formatarPercentual } from '@/utils/formatacao';

interface Props {
  valor: Decimal | number;
  escala: EscalaPercentual;
}

export function VariacaoBadge({ valor, escala }: Props) {
  const { cores } = useTema();
  const texto = formatarPercentual(valor, escala);
  const alta = texto.startsWith('+');
  const baixa = texto.startsWith('-');
  const cor = alta ? cores.positivo : baixa ? cores.negativo : cores.textoSecundario;
  const seta = alta ? '▲' : baixa ? '▼' : '•';

  return (
    <View aria-label={`Variação ${texto}`} style={[estilos.badge, { borderColor: cor }]}>
      <Text style={[estilos.texto, { color: cor }]}>{`${seta} ${texto}`}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: raio.pilula,
    paddingHorizontal: espaco.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  texto: { fontSize: fonte.legenda, fontWeight: '700' },
});
```

`src/components/AvisoIA.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { AVISO_IA } from '@/dominio/regulatorio';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

export function AvisoIA() {
  const { cores } = useTema();
  return (
    <View style={[estilos.aviso, { backgroundColor: cores.superficieElevada, borderColor: cores.alerta }]}>
      <Ionicons name="information-circle-outline" size={16} color={cores.alerta} />
      <Texto variante="legenda" cor="secundario" style={estilos.texto}>
        {AVISO_IA}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    borderWidth: 1,
    borderRadius: raio.md,
    padding: espaco.sm,
  },
  texto: { flex: 1 },
});
```

`src/components/CardAnaliseIA.tsx`:

```tsx
import { AvisoIA } from '@/components/AvisoIA';
import { Card } from '@/components/Card';
import { Texto } from '@/components/Texto';

export function CardAnaliseIA() {
  return (
    <Card titulo="Análise por IA">
      <Texto cor="secundario">Análise textual por IA — disponível em breve.</Texto>
      <AvisoIA />
    </Card>
  );
}
```

`src/components/IndicadorItem.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import type { IndicadorDescrito } from '@/dominio/indicadores';
import { espaco } from '@/theme/escala';

export function IndicadorItem({ indicador }: { indicador: IndicadorDescrito }) {
  return (
    <View style={estilos.linha}>
      <View style={estilos.textos}>
        <Texto negrito>{indicador.titulo}</Texto>
        <Texto variante="legenda" cor="secundario">
          {indicador.descricao}
        </Texto>
      </View>
      <Texto negrito>{indicador.valor}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco.md },
  textos: { flex: 1, gap: 2 },
});
```

`src/components/SinalCard.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';

import type { Decimal, ResultadoBacktest, Sinal } from '@/api/tipos';
import { Card } from '@/components/Card';
import { Carregando } from '@/components/Carregando';
import { Linha } from '@/components/Linha';
import { Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';
import { formatarDataHora, formatarPercentual } from '@/utils/formatacao';

interface Props {
  sinal: Sinal;
  backtest?: ResultadoBacktest;
  carregandoBacktest: boolean;
}

function formatarRetorno(valor: Decimal | null): string {
  return valor === null ? '—' : formatarPercentual(valor, 'pontos');
}

function HistoricoDaCondicao({ backtest, carregando }: { backtest?: ResultadoBacktest; carregando: boolean }) {
  if (carregando) return <Carregando />;
  if (!backtest) {
    return (
      <Texto variante="legenda" cor="secundario">
        Histórico indisponível no momento
      </Texto>
    );
  }
  if (backtest.total_ocorrencias === 0) {
    return (
      <Texto variante="legenda" cor="secundario">
        Sem ocorrências nos últimos 24 meses
      </Texto>
    );
  }
  return (
    <>
      <Linha rotulo="Ocorrências" valor={String(backtest.total_ocorrencias)} />
      <Linha rotulo="Retorno médio em 5 pregões" valor={formatarRetorno(backtest.retorno_medio_5_pregoes)} />
      <Linha rotulo="Retorno médio em 20 pregões" valor={formatarRetorno(backtest.retorno_medio_20_pregoes)} />
      <Linha rotulo="Retorno médio em 60 pregões" valor={formatarRetorno(backtest.retorno_medio_60_pregoes)} />
    </>
  );
}

export function SinalCard({ sinal, backtest, carregandoBacktest }: Props) {
  return (
    <Card titulo={sinal.regra_nome}>
      <Texto cor="secundario">{sinal.regra_descricao}</Texto>
      <Texto variante="legenda" cor="secundario">
        {`Ativo desde ${formatarDataHora(sinal.data_ativacao)}`}
      </Texto>
      <View style={estilos.historico}>
        <Texto variante="legenda" negrito>
          Histórico da condição (24 meses)
        </Texto>
        <HistoricoDaCondicao backtest={backtest} carregando={carregandoBacktest} />
      </View>
    </Card>
  );
}

const estilos = StyleSheet.create({
  historico: { gap: espaco.sm },
});
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx jest src/components src/dominio`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/dominio src/components
git commit -m "feat: descreve indicadores de forma factual e adiciona componentes de sinal e aviso de IA

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Resolução de ticker para `ativo_id`

**Files:**
- Create: `src/dominio/resolverAtivoId.ts`
- Test: `src/dominio/resolverAtivoId.test.ts`

**Interfaces:**
- Consumes: `ApiError` (Task 3); `ItemWatchlist`, `Uuid` (Task 2).
- Produces: `interface DepsResolverAtivo { listarWatchlist: () => Promise<ItemWatchlist[]>; adicionarWatchlist: (ticker: string) => Promise<ItemWatchlist> }`; `interface AtivoResolvido { ativoId: Uuid; adicionouNaWatchlist: boolean }`; `resolverAtivoId(ticker: string, deps: DepsResolverAtivo): Promise<AtivoResolvido>`.

- [ ] **Step 1: Escrever o teste (falhando)**

`src/dominio/resolverAtivoId.test.ts`:

```ts
import { ApiError } from '@/api/client';
import type { ItemWatchlist } from '@/api/tipos';
import { resolverAtivoId } from '@/dominio/resolverAtivoId';

function item(id: string, ticker: string): ItemWatchlist {
  return {
    ativo: { id, ticker, nome: ticker, tipo: 'ACAO', setor: null, moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-09-25T12:00:00Z',
  };
}

function criarDeps() {
  return {
    listarWatchlist: jest.fn<Promise<ItemWatchlist[]>, []>(),
    adicionarWatchlist: jest.fn<Promise<ItemWatchlist>, [string]>(),
  };
}

it('usa o ativo que já está na watchlist, ignorando caixa e espaços', async () => {
  const deps = criarDeps();
  deps.listarWatchlist.mockResolvedValue([item('a-1', 'PETR4')]);
  await expect(resolverAtivoId('  petr4 ', deps)).resolves.toEqual({ ativoId: 'a-1', adicionouNaWatchlist: false });
  expect(deps.adicionarWatchlist).not.toHaveBeenCalled();
});

it('adiciona à watchlist quando o ativo ainda não está lá', async () => {
  const deps = criarDeps();
  deps.listarWatchlist.mockResolvedValue([item('a-1', 'PETR4')]);
  deps.adicionarWatchlist.mockResolvedValue(item('a-2', 'VALE3'));
  await expect(resolverAtivoId('vale3', deps)).resolves.toEqual({ ativoId: 'a-2', adicionouNaWatchlist: true });
  expect(deps.adicionarWatchlist).toHaveBeenCalledWith('VALE3');
});

it('409 na adição (corrida) busca de novo e usa o item existente', async () => {
  const deps = criarDeps();
  deps.listarWatchlist.mockResolvedValueOnce([]).mockResolvedValueOnce([item('a-3', 'ITUB4')]);
  deps.adicionarWatchlist.mockRejectedValue(new ApiError(409, 'Ativo ja esta na watchlist'));
  await expect(resolverAtivoId('ITUB4', deps)).resolves.toEqual({ ativoId: 'a-3', adicionouNaWatchlist: false });
  expect(deps.listarWatchlist).toHaveBeenCalledTimes(2);
});

it('409 sem o item na nova busca vira erro', async () => {
  const deps = criarDeps();
  deps.listarWatchlist.mockResolvedValue([]);
  deps.adicionarWatchlist.mockRejectedValue(new ApiError(409, 'Ativo ja esta na watchlist'));
  await expect(resolverAtivoId('ITUB4', deps)).rejects.toMatchObject({ status: 409 });
});

it('404 na adição propaga o erro', async () => {
  const deps = criarDeps();
  deps.listarWatchlist.mockResolvedValue([]);
  deps.adicionarWatchlist.mockRejectedValue(new ApiError(404, 'Ativo nao encontrado'));
  await expect(resolverAtivoId('XPTO3', deps)).rejects.toMatchObject({ status: 404 });
});

it('ticker vazio é rejeitado sem chamar a API', async () => {
  const deps = criarDeps();
  await expect(resolverAtivoId('   ', deps)).rejects.toThrow('Ticker vazio');
  expect(deps.listarWatchlist).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/dominio/resolverAtivoId.test.ts`
Expected: FAIL — `Cannot find module '@/dominio/resolverAtivoId'`.

- [ ] **Step 3: Implementar**

`src/dominio/resolverAtivoId.ts`:

```ts
import { ApiError } from '@/api/client';
import type { ItemWatchlist, Uuid } from '@/api/tipos';

export interface DepsResolverAtivo {
  listarWatchlist: () => Promise<ItemWatchlist[]>;
  adicionarWatchlist: (ticker: string) => Promise<ItemWatchlist>;
}

export interface AtivoResolvido {
  ativoId: Uuid;
  adicionouNaWatchlist: boolean;
}

/**
 * POST /operacoes exige ativo_id, que só existe para ativos já persistidos.
 * A watchlist é o único caminho da API para persistir um ativo a partir do ticker.
 */
export async function resolverAtivoId(ticker: string, deps: DepsResolverAtivo): Promise<AtivoResolvido> {
  const alvo = ticker.trim().toUpperCase();
  if (!alvo) throw new Error('Ticker vazio');

  const procurar = (itens: ItemWatchlist[]) => itens.find((item) => item.ativo.ticker.toUpperCase() === alvo);

  const existente = procurar(await deps.listarWatchlist());
  if (existente) return { ativoId: existente.ativo.id, adicionouNaWatchlist: false };

  try {
    const adicionado = await deps.adicionarWatchlist(alvo);
    return { ativoId: adicionado.ativo.id, adicionouNaWatchlist: true };
  } catch (erro) {
    if (!(erro instanceof ApiError) || erro.status !== 409) throw erro;
    const aposCorrida = procurar(await deps.listarWatchlist());
    if (aposCorrida) return { ativoId: aposCorrida.ativo.id, adicionouNaWatchlist: false };
    throw new ApiError(409, 'O ativo já está na watchlist, mas não foi encontrado. Tente novamente.');
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/dominio/resolverAtivoId.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/dominio/resolverAtivoId.ts src/dominio/resolverAtivoId.test.ts
git commit -m "feat: resolve ativo_id a partir do ticker usando a watchlist

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Hooks de dados (TanStack Query)

**Files:**
- Create: `src/hooks/chaves.ts`, `useAuth.ts`, `useWatchlist.ts`, `useAtivo.ts`, `useBusca.ts`, `useAlertas.ts`, `useNotificacoes.ts`, `usePortfolio.ts`, `useResolverAtivo.ts` (todos em `src/hooks/`)
- Create: `src/test/renderizar.tsx`
- Test: `src/hooks/hooks.test.tsx`

**Interfaces:**
- Consumes: todos os `*Api` (Task 3); `ApiError` (Task 3); `resolverAtivoId`, `AtivoResolvido` (Task 7); tipos (Task 2).
- Produces:
  - `chaves` — `watchlist`, `cotacao(id)`, `historico(id, periodo)`, `indicadores(id)`, `sinais(id)`, `backtest(id, regraId)`, `busca(termo)`, `alertas`, `notificacoes`, `operacoes`, `portfolio`, `posicoes`, `rentabilidade`, `distribuicao`, `benchmark(b)`. Toda chave de portfólio começa com `'portfolio'`.
  - `useLogin()`, `useCadastro()` — `UseMutationResult<TokenResponse, ApiError, LoginRequest | CadastroRequest>`.
  - `useWatchlist()`; `useItemWatchlist(ativoId: Uuid | undefined): ItemWatchlist | undefined`; `useRemoverWatchlist()` (variável `Uuid`); `useDefinirNotificacao()` (variável `{ ativoId: Uuid; notificar: boolean }`).
  - `useCotacao(ativoId: Uuid | undefined)` (desligado sem id, `staleTime` 60 s); `useCotacoes(ativoIds: Uuid[])` (array na mesma ordem); `useHistorico(ativoId, periodo)` (mantém dados anteriores ao trocar período); `useIndicadores(ativoId)`; `useSinais(ativoId)`; `useBacktests(ativoId, regraIds: Uuid[])` (array na mesma ordem).
  - `useDebounce<T>(valor: T, atrasoMs: number): T`; `TAMANHO_MINIMO_BUSCA = 2`; `useBuscaAtivos(termo: string)` (só busca com ≥ 2 caracteres após `trim`).
  - `useAlertas()`; `useCriarAlerta()` (variável `CriarAlertaRequest`); `useAtualizarAlerta()` (variável `{ id: Uuid; dados: AtualizarAlertaRequest }`); `useRemoverAlerta()` (variável `Uuid`).
  - `INTERVALO_NOTIFICACOES_MS = 60_000`; `useNotificacoes()` (polling); `useNaoLidas(): number`; `useMarcarLida()` (variável `Uuid`).
  - `useOperacoes()`; `usePosicoes()`; `useRentabilidade()`; `useDistribuicao()`; `useBenchmark(benchmark: TipoBenchmark)`; `useRegistrarOperacao()` (variável `RegistrarOperacaoRequest`); `useRemoverOperacao()` (variável `Uuid`).
  - `useResolverAtivo()` — `UseMutationResult<AtivoResolvido, ApiError, string>`; invalida `['watchlist']` só quando adicionou.
  - `src/test/renderizar.tsx`: `criarQueryClientDeTeste()`, `criarProvedor(queryClient?)`, `renderizar(ui, queryClient?)`.

- [ ] **Step 1: Escrever o helper de render para testes**

`src/test/renderizar.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

export function criarQueryClientDeTeste(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

export function criarProvedor(queryClient: QueryClient = criarQueryClientDeTeste()) {
  return function ProvedorConsultas({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

export function renderizar(ui: ReactElement, queryClient: QueryClient = criarQueryClientDeTeste()) {
  return render(ui, { wrapper: criarProvedor(queryClient) });
}
```

- [ ] **Step 2: Escrever o teste dos hooks (falhando)**

`src/hooks/hooks.test.tsx`:

```tsx
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { notificacoesApi } from '@/api/notificacoes';
import { portfolioApi } from '@/api/portfolio';
import type { ItemWatchlist, Notificacao, Operacao } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { chaves } from '@/hooks/chaves';
import { useDebounce } from '@/hooks/useBusca';
import { useNaoLidas } from '@/hooks/useNotificacoes';
import { useRegistrarOperacao } from '@/hooks/usePortfolio';
import { useResolverAtivo } from '@/hooks/useResolverAtivo';
import { criarProvedor, criarQueryClientDeTeste } from '@/test/renderizar';

// jest.mock é içado pelo babel-jest para antes dos imports.
jest.mock('@/api/portfolio', () => ({ portfolioApi: { registrarOperacao: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn(), adicionar: jest.fn() } }));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));

function itemWatchlist(id: string, ticker: string): ItemWatchlist {
  return {
    ativo: { id, ticker, nome: ticker, tipo: 'ACAO', setor: null, moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-09-25T12:00:00Z',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('toda chave de portfólio fica sob ["portfolio"] (uma invalidação cobre todas)', () => {
  for (const chave of [chaves.posicoes, chaves.rentabilidade, chaves.distribuicao, chaves.benchmark('CDI')]) {
    expect(chave[0]).toBe(chaves.portfolio[0]);
  }
});

it('useDebounce só entrega o valor novo depois do atraso', async () => {
  jest.useFakeTimers();
  try {
    const { result, rerender } = await renderHook(({ valor }: { valor: string }) => useDebounce(valor, 400), {
      initialProps: { valor: 'PE' },
    });
    await rerender({ valor: 'PETR' });
    expect(result.current).toBe('PE');
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(result.current).toBe('PETR');
  } finally {
    jest.useRealTimers();
  }
});

it('registrar operação invalida operações e portfólio', async () => {
  const queryClient = criarQueryClientDeTeste();
  const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
  jest.mocked(portfolioApi.registrarOperacao).mockResolvedValue({ id: 'o-1' } as Operacao);
  const { result } = await renderHook(() => useRegistrarOperacao(), { wrapper: criarProvedor(queryClient) });

  await act(async () => {
    await result.current.mutateAsync({
      ativo_id: 'a-1',
      tipo: 'COMPRA',
      quantidade: '1',
      preco_unitario: '10',
      data: '2026-09-25',
    });
  });

  expect(portfolioApi.registrarOperacao).toHaveBeenCalledWith({
    ativo_id: 'a-1',
    tipo: 'COMPRA',
    quantidade: '1',
    preco_unitario: '10',
    data: '2026-09-25',
  });
  expect(invalidar).toHaveBeenCalledWith({ queryKey: chaves.operacoes });
  expect(invalidar).toHaveBeenCalledWith({ queryKey: chaves.portfolio });
});

it('resolver ativo invalida a watchlist só quando adicionou', async () => {
  const queryClient = criarQueryClientDeTeste();
  const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
  jest.mocked(watchlistApi.listar).mockResolvedValue([itemWatchlist('a-1', 'PETR4')]);
  jest.mocked(watchlistApi.adicionar).mockResolvedValue(itemWatchlist('a-2', 'VALE3'));
  const { result } = await renderHook(() => useResolverAtivo(), { wrapper: criarProvedor(queryClient) });

  await act(async () => {
    await result.current.mutateAsync('PETR4');
  });
  expect(invalidar).not.toHaveBeenCalled();

  await act(async () => {
    await result.current.mutateAsync('VALE3');
  });
  expect(invalidar).toHaveBeenCalledWith({ queryKey: chaves.watchlist });
});

it('useNaoLidas conta as não lidas e lista sem argumentos extras', async () => {
  const notificacoes: Notificacao[] = [
    { id: 'n-1', ativo_id: 'a-1', tipo: 'SINAL_ATIVADO', mensagem: 'x', lida: false, criado_em: '2026-09-25T12:00:00Z' },
    { id: 'n-2', ativo_id: 'a-1', tipo: 'ALERTA_DISPARADO', mensagem: 'y', lida: true, criado_em: '2026-09-25T12:00:00Z' },
  ];
  jest.mocked(notificacoesApi.listar).mockResolvedValue(notificacoes);
  const { result } = await renderHook(() => useNaoLidas(), { wrapper: criarProvedor() });
  await waitFor(() => expect(result.current).toBe(1));
  // queryFn precisa envolver a chamada: o contexto do TanStack não pode virar `apenasNaoLidas`.
  expect(notificacoesApi.listar).toHaveBeenCalledWith();
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx jest src/hooks/hooks.test.tsx`
Expected: FAIL — `Cannot find module '@/hooks/chaves'`.

- [ ] **Step 4: Implementar os hooks**

`src/hooks/chaves.ts`:

```ts
import type { PeriodoHistorico, TipoBenchmark, Uuid } from '@/api/tipos';

export const chaves = {
  watchlist: ['watchlist'] as const,
  cotacao: (ativoId: Uuid) => ['ativo', ativoId, 'cotacao'] as const,
  historico: (ativoId: Uuid, periodo: PeriodoHistorico) => ['ativo', ativoId, 'historico', periodo] as const,
  indicadores: (ativoId: Uuid) => ['ativo', ativoId, 'indicadores'] as const,
  sinais: (ativoId: Uuid) => ['ativo', ativoId, 'sinais'] as const,
  backtest: (ativoId: Uuid, regraId: Uuid) => ['ativo', ativoId, 'backtest', regraId] as const,
  busca: (termo: string) => ['busca', termo] as const,
  alertas: ['alertas'] as const,
  notificacoes: ['notificacoes'] as const,
  operacoes: ['operacoes'] as const,
  portfolio: ['portfolio'] as const,
  posicoes: ['portfolio', 'posicoes'] as const,
  rentabilidade: ['portfolio', 'rentabilidade'] as const,
  distribuicao: ['portfolio', 'distribuicao'] as const,
  benchmark: (benchmark: TipoBenchmark) => ['portfolio', 'benchmark', benchmark] as const,
};
```

`src/hooks/useAuth.ts`:

```ts
import { useMutation } from '@tanstack/react-query';

import { authApi } from '@/api/auth';
import type { ApiError } from '@/api/client';
import type { CadastroRequest, LoginRequest, TokenResponse } from '@/api/tipos';

export function useLogin() {
  return useMutation<TokenResponse, ApiError, LoginRequest>({ mutationFn: (dados) => authApi.login(dados) });
}

export function useCadastro() {
  return useMutation<TokenResponse, ApiError, CadastroRequest>({ mutationFn: (dados) => authApi.cadastrar(dados) });
}
```

`src/hooks/useWatchlist.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/api/client';
import type { ItemWatchlist, Uuid } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { chaves } from '@/hooks/chaves';

export function useWatchlist() {
  return useQuery<ItemWatchlist[], ApiError>({ queryKey: chaves.watchlist, queryFn: () => watchlistApi.listar() });
}

export function useItemWatchlist(ativoId: Uuid | undefined): ItemWatchlist | undefined {
  const { data } = useWatchlist();
  return data?.find((item) => item.ativo.id === ativoId);
}

export function useRemoverWatchlist() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, Uuid>({
    mutationFn: (ativoId) => watchlistApi.remover(ativoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chaves.watchlist }),
  });
}

export function useDefinirNotificacao() {
  const queryClient = useQueryClient();
  return useMutation<ItemWatchlist, ApiError, { ativoId: Uuid; notificar: boolean }>({
    mutationFn: ({ ativoId, notificar }) => watchlistApi.definirNotificacao(ativoId, notificar),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chaves.watchlist }),
  });
}
```

`src/hooks/useAtivo.ts`:

```ts
import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';

import { ativosApi } from '@/api/ativos';
import type { ApiError } from '@/api/client';
import type { CotacaoAtual, IndicadorTecnico, PeriodoHistorico, PontoHistorico, Sinal, Uuid } from '@/api/tipos';
import { chaves } from '@/hooks/chaves';

// Mesmo TTL do cache Redis de cotação atual no backend.
const VALIDADE_COTACAO_MS = 60_000;
const VALIDADE_BACKTEST_MS = 5 * 60_000;

export function useCotacao(ativoId: Uuid | undefined) {
  return useQuery<CotacaoAtual, ApiError>({
    queryKey: chaves.cotacao(ativoId ?? ''),
    queryFn: () => ativosApi.cotacao(ativoId as Uuid),
    enabled: Boolean(ativoId),
    staleTime: VALIDADE_COTACAO_MS,
  });
}

export function useCotacoes(ativoIds: Uuid[]) {
  return useQueries({
    queries: ativoIds.map((ativoId) => ({
      queryKey: chaves.cotacao(ativoId),
      queryFn: () => ativosApi.cotacao(ativoId),
      staleTime: VALIDADE_COTACAO_MS,
    })),
  });
}

export function useHistorico(ativoId: Uuid, periodo: PeriodoHistorico) {
  return useQuery<PontoHistorico[], ApiError>({
    queryKey: chaves.historico(ativoId, periodo),
    queryFn: () => ativosApi.historico(ativoId, periodo),
    placeholderData: keepPreviousData,
  });
}

export function useIndicadores(ativoId: Uuid) {
  return useQuery<IndicadorTecnico[], ApiError>({
    queryKey: chaves.indicadores(ativoId),
    queryFn: () => ativosApi.indicadores(ativoId),
  });
}

export function useSinais(ativoId: Uuid) {
  return useQuery<Sinal[], ApiError>({ queryKey: chaves.sinais(ativoId), queryFn: () => ativosApi.sinais(ativoId) });
}

export function useBacktests(ativoId: Uuid, regraIds: Uuid[]) {
  return useQueries({
    queries: regraIds.map((regraId) => ({
      queryKey: chaves.backtest(ativoId, regraId),
      queryFn: () => ativosApi.backtest(ativoId, regraId),
      staleTime: VALIDADE_BACKTEST_MS,
    })),
  });
}
```

`src/hooks/useBusca.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { ativosApi } from '@/api/ativos';
import type { ApiError } from '@/api/client';
import type { AtivoEncontrado } from '@/api/tipos';
import { chaves } from '@/hooks/chaves';

export const TAMANHO_MINIMO_BUSCA = 2;

export function useDebounce<T>(valor: T, atrasoMs: number): T {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const temporizador = setTimeout(() => setAtrasado(valor), atrasoMs);
    return () => clearTimeout(temporizador);
  }, [valor, atrasoMs]);
  return atrasado;
}

export function useBuscaAtivos(termo: string) {
  const normalizado = termo.trim();
  return useQuery<AtivoEncontrado[], ApiError>({
    queryKey: chaves.busca(normalizado),
    queryFn: () => ativosApi.buscar(normalizado),
    enabled: normalizado.length >= TAMANHO_MINIMO_BUSCA,
    staleTime: 5 * 60_000,
  });
}
```

`src/hooks/useAlertas.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { alertasApi } from '@/api/alertas';
import type { ApiError } from '@/api/client';
import type { Alerta, AtualizarAlertaRequest, CriarAlertaRequest, Uuid } from '@/api/tipos';
import { chaves } from '@/hooks/chaves';

function useInvalidarAlertas() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: chaves.alertas });
}

export function useAlertas() {
  return useQuery<Alerta[], ApiError>({ queryKey: chaves.alertas, queryFn: () => alertasApi.listar() });
}

export function useCriarAlerta() {
  const invalidar = useInvalidarAlertas();
  return useMutation<Alerta, ApiError, CriarAlertaRequest>({
    mutationFn: (dados) => alertasApi.criar(dados),
    onSuccess: () => invalidar(),
  });
}

export function useAtualizarAlerta() {
  const invalidar = useInvalidarAlertas();
  return useMutation<Alerta, ApiError, { id: Uuid; dados: AtualizarAlertaRequest }>({
    mutationFn: ({ id, dados }) => alertasApi.atualizar(id, dados),
    onSuccess: () => invalidar(),
  });
}

export function useRemoverAlerta() {
  const invalidar = useInvalidarAlertas();
  return useMutation<void, ApiError, Uuid>({
    mutationFn: (alertaId) => alertasApi.remover(alertaId),
    onSuccess: () => invalidar(),
  });
}
```

`src/hooks/useNotificacoes.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/api/client';
import { notificacoesApi } from '@/api/notificacoes';
import type { Notificacao, Uuid } from '@/api/tipos';
import { chaves } from '@/hooks/chaves';

// Sem push nativo no MVP: a lista é atualizada por polling enquanto o app está em primeiro plano.
export const INTERVALO_NOTIFICACOES_MS = 60_000;

export function useNotificacoes() {
  return useQuery<Notificacao[], ApiError>({
    queryKey: chaves.notificacoes,
    queryFn: () => notificacoesApi.listar(),
    refetchInterval: INTERVALO_NOTIFICACOES_MS,
  });
}

export function useNaoLidas(): number {
  const { data } = useNotificacoes();
  return data?.filter((notificacao) => !notificacao.lida).length ?? 0;
}

export function useMarcarLida() {
  const queryClient = useQueryClient();
  return useMutation<Notificacao, ApiError, Uuid>({
    mutationFn: (notificacaoId) => notificacoesApi.marcarComoLida(notificacaoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chaves.notificacoes }),
  });
}
```

`src/hooks/usePortfolio.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/api/client';
import { portfolioApi } from '@/api/portfolio';
import type {
  Comparativo,
  Distribuicao,
  Operacao,
  Posicao,
  RegistrarOperacaoRequest,
  Rentabilidade,
  TipoBenchmark,
  Uuid,
} from '@/api/tipos';
import { chaves } from '@/hooks/chaves';

function useInvalidarCarteira() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: chaves.operacoes }),
      queryClient.invalidateQueries({ queryKey: chaves.portfolio }),
    ]);
}

export function useOperacoes() {
  return useQuery<Operacao[], ApiError>({ queryKey: chaves.operacoes, queryFn: () => portfolioApi.listarOperacoes() });
}

export function usePosicoes() {
  return useQuery<Posicao[], ApiError>({ queryKey: chaves.posicoes, queryFn: () => portfolioApi.posicoes() });
}

export function useRentabilidade() {
  return useQuery<Rentabilidade, ApiError>({ queryKey: chaves.rentabilidade, queryFn: () => portfolioApi.rentabilidade() });
}

export function useDistribuicao() {
  return useQuery<Distribuicao, ApiError>({ queryKey: chaves.distribuicao, queryFn: () => portfolioApi.distribuicao() });
}

export function useBenchmark(benchmark: TipoBenchmark) {
  return useQuery<Comparativo, ApiError>({
    queryKey: chaves.benchmark(benchmark),
    queryFn: () => portfolioApi.benchmark(benchmark),
  });
}

export function useRegistrarOperacao() {
  const invalidar = useInvalidarCarteira();
  return useMutation<Operacao, ApiError, RegistrarOperacaoRequest>({
    mutationFn: (dados) => portfolioApi.registrarOperacao(dados),
    onSuccess: () => invalidar(),
  });
}

export function useRemoverOperacao() {
  const invalidar = useInvalidarCarteira();
  return useMutation<void, ApiError, Uuid>({
    mutationFn: (operacaoId) => portfolioApi.removerOperacao(operacaoId),
    onSuccess: () => invalidar(),
  });
}
```

`src/hooks/useResolverAtivo.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/api/client';
import { watchlistApi } from '@/api/watchlist';
import { type AtivoResolvido, resolverAtivoId } from '@/dominio/resolverAtivoId';
import { chaves } from '@/hooks/chaves';

export function useResolverAtivo() {
  const queryClient = useQueryClient();
  return useMutation<AtivoResolvido, ApiError, string>({
    mutationFn: (ticker) =>
      resolverAtivoId(ticker, {
        listarWatchlist: () => watchlistApi.listar(),
        adicionarWatchlist: (alvo) => watchlistApi.adicionar(alvo),
      }),
    onSuccess: async (resultado) => {
      if (resultado.adicionouNaWatchlist) await queryClient.invalidateQueries({ queryKey: chaves.watchlist });
    },
  });
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx jest src/hooks`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/hooks src/test
git commit -m "feat: adiciona hooks de dados com chaves de cache e invalidação

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Layout raiz, guarda de sessão e autenticação

**Files:**
- Modify: `app/_layout.tsx` (substituição completa)
- Move: `app/index.tsx` → `app/(tabs)/index.tsx` (placeholder; a Watchlist real vem na Task 10)
- Create: `app/(tabs)/_layout.tsx`, `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/cadastro.tsx`
- Create: `src/dominio/credenciais.ts`
- Test: `src/dominio/credenciais.test.ts`, `__tests__/telas/login.test.tsx`, `__tests__/telas/cadastro.test.tsx`

**Interfaces:**
- Consumes: `configurarApi` (Task 3); `queryClient` e `useSessao` (Task 4); `useTema`, `Tema`, `Tela`, `Campo`, `Botao`, `Texto` (Task 5); `useLogin`, `useCadastro` (Task 8); `ehStatus`, `mensagemDeErro` (Task 3); `renderizar` (Task 8).
- Produces:
  - `type ErrosCredenciais = Partial<Record<'nome' | 'email' | 'senha', string>>`; `validarLogin({ email, senha }): ErrosCredenciais`; `validarCadastro({ nome, email, senha }): ErrosCredenciais`.
  - Rotas `/login` e `/cadastro` (grupo `(auth)`), grupo `(tabs)` com a aba `index`.
  - `app/_layout.tsx` com um bloco `<Stack.Protected guard={autenticado}>` onde as Tasks 10, 11, 13 e 15 acrescentam `Stack.Screen`.

- [ ] **Step 1: Escrever o teste de validação de credenciais (falhando)**

`src/dominio/credenciais.test.ts`:

```ts
import { validarCadastro, validarLogin } from '@/dominio/credenciais';

describe('validarLogin', () => {
  it('aceita e-mail com espaços nas pontas e senha preenchida', () => {
    expect(validarLogin({ email: ' ana@exemplo.com ', senha: 'x' })).toEqual({});
  });

  it('exige e-mail válido e senha', () => {
    expect(validarLogin({ email: 'ana@', senha: '' })).toEqual({
      email: 'Informe um e-mail válido',
      senha: 'Informe a senha',
    });
  });
});

describe('validarCadastro', () => {
  it('aceita dados válidos', () => {
    expect(validarCadastro({ nome: 'Ana', email: 'ana@exemplo.com', senha: '12345678' })).toEqual({});
  });

  it('exige nome, e-mail válido e senha com 8+ caracteres (regra do backend)', () => {
    expect(validarCadastro({ nome: '  ', email: 'x', senha: '1234567' })).toEqual({
      nome: 'Informe seu nome',
      email: 'Informe um e-mail válido',
      senha: 'A senha precisa ter pelo menos 8 caracteres',
    });
  });

  it('respeita os limites máximos do backend', () => {
    expect(validarCadastro({ nome: 'a'.repeat(256), email: 'ana@exemplo.com', senha: 'a'.repeat(129) })).toEqual({
      nome: 'Use no máximo 255 caracteres',
      senha: 'Use no máximo 128 caracteres',
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/dominio/credenciais.test.ts`
Expected: FAIL — `Cannot find module '@/dominio/credenciais'`.

- [ ] **Step 3: Implementar**

`src/dominio/credenciais.ts`:

```ts
export type ErrosCredenciais = Partial<Record<'nome' | 'email' | 'senha', string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mesmos limites do CadastroRequest do backend.
const SENHA_MINIMA = 8;
const SENHA_MAXIMA = 128;
const NOME_MAXIMO = 255;

function validarEmail(email: string, erros: ErrosCredenciais): void {
  if (!EMAIL.test(email.trim())) erros.email = 'Informe um e-mail válido';
}

export function validarLogin({ email, senha }: { email: string; senha: string }): ErrosCredenciais {
  const erros: ErrosCredenciais = {};
  validarEmail(email, erros);
  if (!senha) erros.senha = 'Informe a senha';
  return erros;
}

export function validarCadastro({ nome, email, senha }: { nome: string; email: string; senha: string }): ErrosCredenciais {
  const erros: ErrosCredenciais = {};
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) erros.nome = 'Informe seu nome';
  else if (nomeLimpo.length > NOME_MAXIMO) erros.nome = 'Use no máximo 255 caracteres';
  validarEmail(email, erros);
  if (senha.length < SENHA_MINIMA) erros.senha = 'A senha precisa ter pelo menos 8 caracteres';
  else if (senha.length > SENHA_MAXIMA) erros.senha = 'Use no máximo 128 caracteres';
  return erros;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/dominio/credenciais.test.ts`
Expected: PASS.

- [ ] **Step 5: Escrever os testes das telas de login e cadastro (falhando)**

`__tests__/telas/login.test.tsx`:

```tsx
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { authApi } from '@/api/auth';
import { ApiError } from '@/api/client';
import { useSessao } from '@/store/sessao';
import { renderizar } from '@/test/renderizar';

import Login from '../../app/(auth)/login';

jest.mock('expo-router', () => ({ Link: ({ children }: { children: ReactNode }) => children }));
jest.mock('@/api/auth', () => ({ authApi: { login: jest.fn(), cadastrar: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  useSessao.setState({ status: 'anonimo', token: null, email: null });
});

it('valida os campos antes de chamar a API', async () => {
  const user = userEvent.setup();
  await renderizar(<Login />);
  await user.press(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByText('Informe um e-mail válido')).toBeOnTheScreen();
  expect(screen.getByText('Informe a senha')).toBeOnTheScreen();
  expect(authApi.login).not.toHaveBeenCalled();
});

it('login com sucesso inicia a sessão com o e-mail sem espaços', async () => {
  const user = userEvent.setup();
  jest.mocked(authApi.login).mockResolvedValue({ access_token: 'tok', token_type: 'bearer' });
  await renderizar(<Login />);
  await user.type(screen.getByLabelText('E-mail'), ' ana@exemplo.com ');
  await user.type(screen.getByLabelText('Senha'), 'segredo123');
  await user.press(screen.getByRole('button', { name: 'Entrar' }));
  await waitFor(() => expect(useSessao.getState().status).toBe('autenticado'));
  expect(authApi.login).toHaveBeenCalledWith({ email: 'ana@exemplo.com', senha: 'segredo123' });
  expect(useSessao.getState().email).toBe('ana@exemplo.com');
});

it('401 mostra mensagem de credenciais incorretas e mantém anônimo', async () => {
  const user = userEvent.setup();
  jest.mocked(authApi.login).mockRejectedValue(new ApiError(401, 'Credenciais inválidas'));
  await renderizar(<Login />);
  await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
  await user.type(screen.getByLabelText('Senha'), 'errada');
  await user.press(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos');
  expect(useSessao.getState().status).toBe('anonimo');
});
```

`__tests__/telas/cadastro.test.tsx`:

```tsx
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { authApi } from '@/api/auth';
import { ApiError } from '@/api/client';
import { useSessao } from '@/store/sessao';
import { renderizar } from '@/test/renderizar';

import Cadastro from '../../app/(auth)/cadastro';

jest.mock('expo-router', () => ({ Link: ({ children }: { children: ReactNode }) => children }));
jest.mock('@/api/auth', () => ({ authApi: { login: jest.fn(), cadastrar: jest.fn() } }));

async function preencher() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Nome'), 'Ana');
  await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
  await user.type(screen.getByLabelText('Senha'), 'segredo123');
  await user.press(screen.getByRole('button', { name: 'Criar conta' }));
}

beforeEach(() => {
  jest.clearAllMocks();
  useSessao.setState({ status: 'anonimo', token: null, email: null });
});

it('cadastro com sucesso já entra no app', async () => {
  jest.mocked(authApi.cadastrar).mockResolvedValue({ access_token: 'novo', token_type: 'bearer' });
  await renderizar(<Cadastro />);
  await preencher();
  await waitFor(() => expect(useSessao.getState().status).toBe('autenticado'));
  expect(authApi.cadastrar).toHaveBeenCalledWith({ nome: 'Ana', email: 'ana@exemplo.com', senha: 'segredo123' });
});

it('409 marca o e-mail como já cadastrado', async () => {
  jest.mocked(authApi.cadastrar).mockRejectedValue(new ApiError(409, 'E-mail já cadastrado'));
  await renderizar(<Cadastro />);
  await preencher();
  expect(await screen.findByText('E-mail já cadastrado')).toBeOnTheScreen();
  expect(useSessao.getState().status).toBe('anonimo');
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx jest __tests__/telas`
Expected: FAIL — `Cannot find module '../../app/(auth)/login'`.

- [ ] **Step 7: Implementar o layout raiz, os grupos de rota e as telas**

`app/_layout.tsx` (substitui o provisório):

```tsx
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, type Theme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { configurarApi } from '@/api/client';
import { queryClient } from '@/hooks/queryClient';
import { useSessao } from '@/store/sessao';
import { type Tema, useTema } from '@/theme/useTema';

void SplashScreen.preventAutoHideAsync();

configurarApi({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000',
  obterToken: () => useSessao.getState().token,
  // Token vencido ou inválido: volta ao login (não há refresh token no backend).
  aoNaoAutorizado: () => {
    void useSessao.getState().sair();
  },
});

function temaDeNavegacao(tema: Tema): Theme {
  const base = tema.esquema === 'escuro' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: tema.cores.fundo,
      card: tema.cores.superficie,
      text: tema.cores.texto,
      border: tema.cores.borda,
      primary: tema.cores.primaria,
    },
  };
}

export default function RootLayout() {
  const status = useSessao((estado) => estado.status);
  const hidratar = useSessao((estado) => estado.hidratar);
  const tema = useTema();

  useEffect(() => {
    void hidratar();
  }, [hidratar]);

  useEffect(() => {
    if (status !== 'carregando') void SplashScreen.hideAsync();
  }, [status]);

  useEffect(() => {
    // Sem isso o TanStack não sabe quando o app volta ao primeiro plano no React Native.
    const assinatura = AppState.addEventListener('change', (estado) => focusManager.setFocused(estado === 'active'));
    return () => assinatura.remove();
  }, []);

  if (status === 'carregando') return null;
  const autenticado = status === 'autenticado';

  return (
    <GestureHandlerRootView style={estilos.raiz}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={temaDeNavegacao(tema)}>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerBackTitle: 'Voltar' }}>
              <Stack.Protected guard={autenticado}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack.Protected>
              <Stack.Protected guard={!autenticado}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              </Stack.Protected>
            </Stack>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
});
```

Mova o placeholder para dentro do grupo de abas:

```bash
mkdir -p "app/(tabs)" "app/(auth)"
git mv app/index.tsx "app/(tabs)/index.tsx"
```

`app/(tabs)/_layout.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useTema } from '@/theme/useTema';

export default function TabsLayout() {
  const { cores } = useTema();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: cores.primaria, tabBarInactiveTintColor: cores.textoSecundario }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Watchlist',
          tabBarIcon: ({ color, size }) => <Ionicons name="eye-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
```

`app/(auth)/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

`app/(auth)/login.tsx`:

```tsx
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { Campo } from '@/components/Campo';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { type ErrosCredenciais, validarLogin } from '@/dominio/credenciais';
import { useLogin } from '@/hooks/useAuth';
import { useSessao } from '@/store/sessao';
import { espaco } from '@/theme/escala';
import { ehStatus, mensagemDeErro } from '@/utils/erros';

export default function Login() {
  const entrar = useSessao((estado) => estado.entrar);
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<ErrosCredenciais>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  async function aoEnviar() {
    const encontrados = validarLogin({ email, senha });
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    setErroGeral(null);
    try {
      const { access_token } = await login.mutateAsync({ email: email.trim(), senha });
      await entrar(access_token, email.trim());
    } catch (erro) {
      setErroGeral(ehStatus(erro, 401) ? 'E-mail ou senha incorretos' : mensagemDeErro(erro));
    }
  }

  return (
    <Tela areaSegura>
      <View style={estilos.cabecalho}>
        <Texto variante="destaque">InsightFlow</Texto>
        <Texto cor="secundario">Análise técnica de ativos com dados e contexto histórico.</Texto>
      </View>
      <Campo
        rotulo="E-mail"
        valor={email}
        aoMudar={setEmail}
        erro={erros.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <Campo rotulo="Senha" valor={senha} aoMudar={setSenha} erro={erros.senha} secureTextEntry autoComplete="password" />
      {erroGeral ? (
        <Texto role="alert" cor="negativo">
          {erroGeral}
        </Texto>
      ) : null}
      <Botao titulo="Entrar" onPress={aoEnviar} carregando={login.isPending} />
      <Link href="/cadastro" replace asChild>
        <Pressable role="link" style={estilos.link}>
          <Texto cor="primaria" negrito>
            Criar conta
          </Texto>
        </Pressable>
      </Link>
      <Texto variante="legenda" cor="secundario" style={estilos.rodape}>
        Ferramenta educacional de análise. Não constitui recomendação de investimento.
      </Texto>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  cabecalho: { gap: espaco.sm, marginTop: espaco.xl, marginBottom: espaco.md },
  link: { alignSelf: 'center', padding: espaco.sm },
  rodape: { textAlign: 'center', marginTop: 'auto' },
});
```

`app/(auth)/cadastro.tsx`:

```tsx
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { Campo } from '@/components/Campo';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { type ErrosCredenciais, validarCadastro } from '@/dominio/credenciais';
import { useCadastro } from '@/hooks/useAuth';
import { useSessao } from '@/store/sessao';
import { espaco } from '@/theme/escala';
import { ehStatus, mensagemDeErro } from '@/utils/erros';

export default function Cadastro() {
  const entrar = useSessao((estado) => estado.entrar);
  const cadastro = useCadastro();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<ErrosCredenciais>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  async function aoEnviar() {
    const encontrados = validarCadastro({ nome, email, senha });
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    setErroGeral(null);
    try {
      const { access_token } = await cadastro.mutateAsync({ nome: nome.trim(), email: email.trim(), senha });
      await entrar(access_token, email.trim());
    } catch (erro) {
      if (ehStatus(erro, 409)) setErros({ email: 'E-mail já cadastrado' });
      else setErroGeral(mensagemDeErro(erro));
    }
  }

  return (
    <Tela areaSegura>
      <View style={estilos.cabecalho}>
        <Texto variante="titulo">Criar conta</Texto>
        <Texto cor="secundario">Monte sua watchlist e registre operações simuladas, sem dinheiro real.</Texto>
      </View>
      <Campo rotulo="Nome" valor={nome} aoMudar={setNome} erro={erros.nome} autoComplete="name" />
      <Campo
        rotulo="E-mail"
        valor={email}
        aoMudar={setEmail}
        erro={erros.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <Campo
        rotulo="Senha"
        valor={senha}
        aoMudar={setSenha}
        erro={erros.senha}
        secureTextEntry
        autoComplete="new-password"
        placeholder="Mínimo de 8 caracteres"
      />
      {erroGeral ? (
        <Texto role="alert" cor="negativo">
          {erroGeral}
        </Texto>
      ) : null}
      <Botao titulo="Criar conta" onPress={aoEnviar} carregando={cadastro.isPending} />
      <Link href="/login" replace asChild>
        <Pressable role="link" style={estilos.link}>
          <Texto cor="primaria" negrito>
            Já tenho conta
          </Texto>
        </Pressable>
      </Link>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  cabecalho: { gap: espaco.sm, marginTop: espaco.xl, marginBottom: espaco.md },
  link: { alignSelf: 'center', padding: espaco.sm },
});
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx jest __tests__/telas src/dominio`
Expected: PASS.

- [ ] **Step 9: Verificação completa e bundle**

```bash
npm run verificar
npx expo export --platform android --output-dir dist
rm -rf dist
```

Expected: tudo verde; bundle gerado (o Expo Router resolve `(auth)` e `(tabs)`).

- [ ] **Step 10: Commit**

```bash
git add app src/dominio/credenciais.ts src/dominio/credenciais.test.ts __tests__/telas
git commit -m "feat: adiciona layout raiz com guarda de sessão, login e cadastro

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Watchlist e busca de ativos

**Files:**
- Create: `src/dominio/rotulos.ts`
- Create: `src/components/BotaoCabecalho.tsx`, `src/components/LinhaAtivo.tsx`, `src/components/LinhaResultadoBusca.tsx`
- Modify: `app/(tabs)/index.tsx` (substituição completa pela Watchlist)
- Modify: `app/(tabs)/_layout.tsx` (substituição completa: botão de busca no cabeçalho)
- Create: `app/buscar.tsx`
- Modify: `app/_layout.tsx` (registrar a rota `buscar`)
- Test: `src/components/listas.test.tsx`, `__tests__/telas/watchlist.test.tsx`, `__tests__/telas/buscar.test.tsx`

**Interfaces:**
- Consumes: `useWatchlist`, `useCotacoes`, `useBuscaAtivos`, `useDebounce`, `TAMANHO_MINIMO_BUSCA`, `useResolverAtivo` (Task 8); componentes base (Task 5); `VariacaoBadge` (Task 6); `formatarMoeda` (Task 2); `mensagemDeErro` (Task 3).
- Produces:
  - `ROTULO_TIPO_ATIVO: Record<TipoAtivo, string>` (`'Ação' | 'FII' | 'ETF' | 'BDR' | 'Cripto'`).
  - `BotaoCabecalho({ icone: NomeIcone, rotulo: string, onPress })` e `type NomeIcone` (nome de ícone Ionicons).
  - `type EstadoCotacao = 'carregando' | 'ok' | 'indisponivel'`; `LinhaAtivo({ ativo: Ativo, cotacao?: CotacaoAtual, estadoCotacao: EstadoCotacao, aoPressionar })` — botão com nome `"{ticker}, {nome}"`.
  - `LinhaResultadoBusca({ ativo: AtivoEncontrado, aoPressionar })` — botão com nome `"{ticker}, {nome}"`.
  - Navegação para o detalhe sempre como `router.push|replace({ pathname: '/ativo/[id]', params: { id, ticker } })`.

- [ ] **Step 1: Escrever o teste dos componentes de lista (falhando)**

`src/components/listas.test.tsx`:

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';

import type { Ativo, CotacaoAtual } from '@/api/tipos';
import { LinhaAtivo } from '@/components/LinhaAtivo';
import { LinhaResultadoBusca } from '@/components/LinhaResultadoBusca';

const NBSP = ' ';
const ativo: Ativo = { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: 'Petróleo', moeda: 'BRL' };
const cotacao: CotacaoAtual = {
  ticker: 'PETR4',
  preco: '38.5',
  variacao: '0.4',
  variacao_percentual: '1.05',
  maxima_dia: '39',
  minima_dia: '38',
  volume: '1000',
};

describe('LinhaAtivo', () => {
  it('mostra ticker, tipo, preço na moeda do ativo e variação em pontos', async () => {
    await render(<LinhaAtivo ativo={ativo} cotacao={cotacao} estadoCotacao="ok" aoPressionar={jest.fn()} />);
    expect(screen.getByText('PETR4')).toBeOnTheScreen();
    expect(screen.getByText('Ação · Petrobras PN')).toBeOnTheScreen();
    expect(screen.getByText(`R$${NBSP}38,50`)).toBeOnTheScreen();
    expect(screen.getByText('▲ +1,05%')).toBeOnTheScreen();
  });

  it('sem cotação mostra traço e legenda', async () => {
    await render(<LinhaAtivo ativo={ativo} estadoCotacao="indisponivel" aoPressionar={jest.fn()} />);
    expect(screen.getByText('—')).toBeOnTheScreen();
    expect(screen.getByText('sem cotação')).toBeOnTheScreen();
  });

  it('é pressionável pelo nome acessível', async () => {
    const user = userEvent.setup();
    const aoPressionar = jest.fn();
    await render(<LinhaAtivo ativo={ativo} estadoCotacao="carregando" aoPressionar={aoPressionar} />);
    await user.press(screen.getByRole('button', { name: 'PETR4, Petrobras PN' }));
    expect(aoPressionar).toHaveBeenCalled();
  });
});

it('LinhaResultadoBusca mostra o ativo encontrado', async () => {
  await render(
    <LinhaResultadoBusca
      ativo={{ ticker: 'VALE3', nome: 'Vale ON', tipo: 'ACAO', moeda: 'BRL', setor: null }}
      aoPressionar={jest.fn()}
    />,
  );
  expect(screen.getByRole('button', { name: 'VALE3, Vale ON' })).toBeOnTheScreen();
  expect(screen.getByText('Ação · BRL')).toBeOnTheScreen();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/components/listas.test.tsx`
Expected: FAIL — `Cannot find module '@/components/LinhaAtivo'`.

- [ ] **Step 3: Implementar rótulos e componentes**

`src/dominio/rotulos.ts`:

```ts
import type { TipoAtivo } from '@/api/tipos';

export const ROTULO_TIPO_ATIVO: Record<TipoAtivo, string> = {
  ACAO: 'Ação',
  FII: 'FII',
  ETF: 'ETF',
  BDR: 'BDR',
  CRIPTO: 'Cripto',
};
```

`src/components/BotaoCabecalho.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

export type NomeIcone = ComponentProps<typeof Ionicons>['name'];

interface Props {
  icone: NomeIcone;
  rotulo: string;
  onPress: () => void;
}

export function BotaoCabecalho({ icone, rotulo, onPress }: Props) {
  const { cores } = useTema();
  return (
    <Pressable role="button" aria-label={rotulo} hitSlop={8} onPress={onPress} style={estilos.botao}>
      <Ionicons name={icone} size={24} color={cores.primaria} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: { paddingHorizontal: espaco.md },
});
```

`src/components/LinhaAtivo.tsx`:

```tsx
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { Ativo, CotacaoAtual } from '@/api/tipos';
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
}

export function LinhaAtivo({ ativo, cotacao, estadoCotacao, aoPressionar }: Props) {
  const { cores } = useTema();
  return (
    <Pressable
      role="button"
      aria-label={`${ativo.ticker}, ${ativo.nome}`}
      onPress={aoPressionar}
      style={({ pressed }) => [
        estilos.linha,
        { backgroundColor: cores.superficie, borderColor: cores.borda, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={estilos.esquerda}>
        <Texto variante="subtitulo">{ativo.ticker}</Texto>
        <Texto variante="legenda" cor="secundario" numberOfLines={1}>
          {`${ROTULO_TIPO_ATIVO[ativo.tipo]} · ${ativo.nome}`}
        </Texto>
      </View>
      <View style={estilos.direita}>
        {estadoCotacao === 'carregando' ? <ActivityIndicator color={cores.primaria} /> : null}
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
            <Texto negrito>{formatarMoeda(cotacao.preco, ativo.moeda)}</Texto>
            <VariacaoBadge valor={cotacao.variacao_percentual} escala="pontos" />
          </>
        ) : null}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    padding: espaco.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: raio.lg,
  },
  esquerda: { flex: 1, gap: 2 },
  direita: { alignItems: 'flex-end', gap: espaco.xs },
});
```

`src/components/LinhaResultadoBusca.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { AtivoEncontrado } from '@/api/tipos';
import { Texto } from '@/components/Texto';
import { ROTULO_TIPO_ATIVO } from '@/dominio/rotulos';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  ativo: AtivoEncontrado;
  aoPressionar: () => void;
}

export function LinhaResultadoBusca({ ativo, aoPressionar }: Props) {
  const { cores } = useTema();
  return (
    <Pressable
      role="button"
      aria-label={`${ativo.ticker}, ${ativo.nome}`}
      onPress={aoPressionar}
      style={({ pressed }) => [estilos.linha, { borderColor: cores.borda, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={estilos.textos}>
        <Texto negrito>{ativo.ticker}</Texto>
        <Texto numberOfLines={1}>{ativo.nome}</Texto>
        <Texto variante="legenda" cor="secundario">{`${ROTULO_TIPO_ATIVO[ativo.tipo]} · ${ativo.moeda}`}</Texto>
      </View>
      <Ionicons name="add-circle-outline" size={24} color={cores.primaria} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingVertical: espaco.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textos: { flex: 1, gap: 2 },
});
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/components/listas.test.tsx`
Expected: PASS.

- [ ] **Step 5: Escrever os testes das telas Watchlist e Buscar (falhando)**

`__tests__/telas/watchlist.test.tsx`:

```tsx
import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ativosApi } from '@/api/ativos';
import { ApiError } from '@/api/client';
import type { CotacaoAtual, ItemWatchlist } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { renderizar } from '@/test/renderizar';

import Watchlist from '../../app/(tabs)/index';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn() } }));
jest.mock('@/api/ativos', () => ({ ativosApi: { cotacao: jest.fn() } }));

const NBSP = ' ';

function item(id: string, ticker: string, nome: string): ItemWatchlist {
  return {
    ativo: { id, ticker, nome, tipo: 'ACAO', setor: null, moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-09-25T12:00:00Z',
  };
}

const cotacaoPetr: CotacaoAtual = {
  ticker: 'PETR4',
  preco: '38.5',
  variacao: '0.4',
  variacao_percentual: '1.05',
  maxima_dia: '39',
  minima_dia: '38',
  volume: '1000',
};

beforeEach(() => {
  jest.clearAllMocks();
});

it('watchlist vazia oferece a busca', async () => {
  const user = userEvent.setup();
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  await renderizar(<Watchlist />);
  await user.press(await screen.findByRole('button', { name: 'Buscar ativo' }));
  expect(router.push).toHaveBeenCalledWith('/buscar');
});

it('mostra preço e variação, e "sem cotação" quando a cotação falha', async () => {
  jest.mocked(watchlistApi.listar).mockResolvedValue([item('a-1', 'PETR4', 'Petrobras PN'), item('a-2', 'XPTO3', 'Xpto ON')]);
  jest.mocked(ativosApi.cotacao).mockImplementation(async (ativoId: string) => {
    if (ativoId === 'a-2') throw new ApiError(404, 'Cotacao nao encontrada para o ativo');
    return cotacaoPetr;
  });
  await renderizar(<Watchlist />);
  expect(await screen.findByText(`R$${NBSP}38,50`)).toBeOnTheScreen();
  expect(screen.getByText('▲ +1,05%')).toBeOnTheScreen();
  expect(await screen.findByText('sem cotação')).toBeOnTheScreen();
});

it('tocar no ativo abre o detalhe com id e ticker', async () => {
  const user = userEvent.setup();
  jest.mocked(watchlistApi.listar).mockResolvedValue([item('a-1', 'PETR4', 'Petrobras PN')]);
  jest.mocked(ativosApi.cotacao).mockResolvedValue(cotacaoPetr);
  await renderizar(<Watchlist />);
  await user.press(await screen.findByRole('button', { name: 'PETR4, Petrobras PN' }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1', ticker: 'PETR4' } });
});
```

`__tests__/telas/buscar.test.tsx`:

```tsx
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ativosApi } from '@/api/ativos';
import { ApiError } from '@/api/client';
import { watchlistApi } from '@/api/watchlist';
import { renderizar } from '@/test/renderizar';

import Buscar from '../../app/buscar';

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock('@/api/ativos', () => ({ ativosApi: { buscar: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn(), adicionar: jest.fn() } }));

const petr = { ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO' as const, moeda: 'BRL', setor: 'Petróleo' };

beforeEach(() => {
  jest.clearAllMocks();
});

it('pede ao menos 2 caracteres antes de buscar', async () => {
  await renderizar(<Buscar />);
  expect(screen.getByText('Digite ao menos 2 caracteres do ticker ou do nome.')).toBeOnTheScreen();
  expect(ativosApi.buscar).not.toHaveBeenCalled();
});

it('escolher um resultado adiciona à watchlist e abre o ativo', async () => {
  const user = userEvent.setup();
  jest.mocked(ativosApi.buscar).mockResolvedValue([petr]);
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  jest.mocked(watchlistApi.adicionar).mockResolvedValue({
    ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: 'Petróleo', moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-09-25T12:00:00Z',
  });
  await renderizar(<Buscar />);
  await user.type(screen.getByLabelText('Ticker ou nome'), 'PETR');
  await user.press(await screen.findByRole('button', { name: 'PETR4, Petrobras PN' }));
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1', ticker: 'PETR4' } }),
  );
  expect(ativosApi.buscar).toHaveBeenLastCalledWith('PETR');
  expect(watchlistApi.adicionar).toHaveBeenCalledWith('PETR4');
});

it('fonte de dados fora do ar mostra erro amigável', async () => {
  const user = userEvent.setup();
  jest.mocked(ativosApi.buscar).mockRejectedValue(new ApiError(503, 'Fonte de dados de mercado indisponivel'));
  await renderizar(<Buscar />);
  await user.type(screen.getByLabelText('Ticker ou nome'), 'VALE');
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Fonte de dados de mercado indisponível. Tente novamente em instantes.',
  );
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx jest __tests__/telas/watchlist.test.tsx __tests__/telas/buscar.test.tsx`
Expected: FAIL — o placeholder não tem o estado vazio e `../../app/buscar` não existe.

- [ ] **Step 7: Implementar as telas**

`app/(tabs)/index.tsx` (substitui o placeholder):

```tsx
import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';

import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { type EstadoCotacao, LinhaAtivo } from '@/components/LinhaAtivo';
import { useCotacoes } from '@/hooks/useAtivo';
import { useWatchlist } from '@/hooks/useWatchlist';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

function estadoDaCotacao(consulta?: { isPending: boolean; isError: boolean }): EstadoCotacao {
  if (!consulta || consulta.isPending) return 'carregando';
  return consulta.isError ? 'indisponivel' : 'ok';
}

export default function Watchlist() {
  const { cores } = useTema();
  const watchlist = useWatchlist();
  const itens = watchlist.data ?? [];
  const cotacoes = useCotacoes(itens.map((item) => item.ativo.id));

  if (watchlist.isPending) return <Carregando />;
  if (watchlist.isError) {
    return <ErroComRetry erro={watchlist.error} aoTentarNovamente={() => void watchlist.refetch()} />;
  }

  function atualizar() {
    void watchlist.refetch();
    cotacoes.forEach((cotacao) => void cotacao.refetch());
  }

  return (
    <FlatList
      style={{ backgroundColor: cores.fundo }}
      contentContainerStyle={estilos.lista}
      data={itens}
      keyExtractor={(item) => item.ativo.id}
      refreshControl={
        <RefreshControl refreshing={watchlist.isRefetching} onRefresh={atualizar} tintColor={cores.primaria} />
      }
      ListEmptyComponent={
        <EstadoVazio
          mensagem="Sua watchlist está vazia."
          acao={{ titulo: 'Buscar ativo', onPress: () => router.push('/buscar') }}
        />
      }
      renderItem={({ item, index }) => {
        const cotacao = cotacoes[index];
        return (
          <LinhaAtivo
            ativo={item.ativo}
            cotacao={cotacao?.data}
            estadoCotacao={estadoDaCotacao(cotacao)}
            aoPressionar={() =>
              router.push({ pathname: '/ativo/[id]', params: { id: item.ativo.id, ticker: item.ativo.ticker } })
            }
          />
        );
      }}
    />
  );
}

const estilos = StyleSheet.create({
  lista: { padding: espaco.lg, gap: espaco.md, flexGrow: 1 },
});
```

`app/buscar.tsx`:

```tsx
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import type { AtivoEncontrado } from '@/api/tipos';
import { Campo } from '@/components/Campo';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { LinhaResultadoBusca } from '@/components/LinhaResultadoBusca';
import { Texto } from '@/components/Texto';
import { TAMANHO_MINIMO_BUSCA, useBuscaAtivos, useDebounce } from '@/hooks/useBusca';
import { useResolverAtivo } from '@/hooks/useResolverAtivo';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { mensagemDeErro } from '@/utils/erros';

const ATRASO_BUSCA_MS = 400;

export default function Buscar() {
  const { cores } = useTema();
  const [termo, setTermo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const termoAtrasado = useDebounce(termo.trim(), ATRASO_BUSCA_MS);
  const busca = useBuscaAtivos(termoAtrasado);
  const resolver = useResolverAtivo();

  async function aoEscolher(ativo: AtivoEncontrado) {
    setErro(null);
    try {
      const { ativoId } = await resolver.mutateAsync(ativo.ticker);
      router.replace({ pathname: '/ativo/[id]', params: { id: ativoId, ticker: ativo.ticker } });
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  }

  function resultados() {
    if (termoAtrasado.length < TAMANHO_MINIMO_BUSCA) {
      return <EstadoVazio mensagem="Digite ao menos 2 caracteres do ticker ou do nome." />;
    }
    if (busca.isPending) return <Carregando />;
    if (busca.isError) return <ErroComRetry erro={busca.error} aoTentarNovamente={() => void busca.refetch()} />;
    if (busca.data.length === 0) {
      return <EstadoVazio mensagem={`Nenhum ativo encontrado para “${termoAtrasado}”.`} />;
    }
    return (
      <FlatList
        data={busca.data}
        keyExtractor={(ativo) => ativo.ticker}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <LinhaResultadoBusca ativo={item} aoPressionar={() => void aoEscolher(item)} />}
      />
    );
  }

  return (
    <View style={[estilos.tela, { backgroundColor: cores.fundo }]}>
      <Campo
        rotulo="Ticker ou nome"
        valor={termo}
        aoMudar={setTermo}
        placeholder="Ex.: PETR4, Vale"
        autoCapitalize="characters"
      />
      {erro ? (
        <Texto role="alert" cor="negativo">
          {erro}
        </Texto>
      ) : null}
      {resolver.isPending ? <Carregando mensagem="Adicionando à watchlist…" /> : null}
      <View style={estilos.resultados}>{resultados()}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, padding: espaco.lg, gap: espaco.md },
  resultados: { flex: 1 },
});
```

`app/(tabs)/_layout.tsx` (substituição completa):

```tsx
import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';

import { BotaoCabecalho } from '@/components/BotaoCabecalho';
import { useTema } from '@/theme/useTema';

export default function TabsLayout() {
  const { cores } = useTema();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: cores.primaria, tabBarInactiveTintColor: cores.textoSecundario }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Watchlist',
          tabBarIcon: ({ color, size }) => <Ionicons name="eye-outline" color={color} size={size} />,
          headerRight: () => <BotaoCabecalho icone="add" rotulo="Buscar ativo" onPress={() => router.push('/buscar')} />,
        }}
      />
    </Tabs>
  );
}
```

Em `app/_layout.tsx`, dentro de `<Stack.Protected guard={autenticado}>`, logo após a linha `<Stack.Screen name="(tabs)" options={{ headerShown: false }} />`, acrescente:

```tsx
                <Stack.Screen name="buscar" options={{ title: 'Buscar ativo' }} />
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx jest __tests__/telas src/components`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add app src/components src/dominio/rotulos.ts __tests__/telas
git commit -m "feat: adiciona watchlist com cotações e busca de ativos

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Detalhe do ativo com gráfico de preço

**Files:**
- Create: `src/dominio/graficos.ts`
- Create: `src/components/GraficoPreco.tsx`
- Create: `app/ativo/[id].tsx`
- Modify: `app/_layout.tsx` (registrar a rota `ativo/[id]`)
- Test: `src/dominio/graficos.test.ts`, `__tests__/telas/ativo.test.tsx`

**Interfaces:**
- Consumes: `useItemWatchlist`, `useDefinirNotificacao`, `useRemoverWatchlist`, `useCotacao`, `useHistorico`, `useIndicadores`, `useSinais`, `useBacktests` (Task 8); `descreverIndicadores` (Task 6); `SinalCard`, `IndicadorItem`, `CardAnaliseIA`, `VariacaoBadge` (Task 6); componentes base (Task 5); `BotaoCabecalho` (Task 10); `ehStatus`, `mensagemDeErro` (Task 3); formatadores (Task 2).
- Produces:
  - `type PontoGrafico = { indice: number; fechamento: number }` (tipo alias, não interface — o Victory exige `Record<string, unknown>`).
  - `interface SeriePreco { pontos: PontoGrafico[]; minimo: number; maximo: number; inicio: string; fim: string; variacaoPercentual: number }` (`variacaoPercentual` em pontos percentuais).
  - `prepararSeriePreco(historico: PontoHistorico[]): SeriePreco | null` — `null` com menos de 2 pontos válidos.
  - `GraficoPreco({ serie: SeriePreco, moeda?: string })`.
  - Rota `/ativo/[id]` com parâmetros `id` (obrigatório) e `ticker` (opcional).

- [ ] **Step 1: Escrever o teste da série do gráfico (falhando)**

`src/dominio/graficos.test.ts`:

```ts
import type { PontoHistorico } from '@/api/tipos';
import { prepararSeriePreco } from '@/dominio/graficos';

function ponto(data: string, fechamento: string): PontoHistorico {
  return { data, abertura: fechamento, maxima: fechamento, minima: fechamento, fechamento, volume: '1000' };
}

it('ordena por data, converte decimais e calcula mínimo, máximo e variação', () => {
  const serie = prepararSeriePreco([
    ponto('2026-09-03T00:00:00Z', '12'),
    ponto('2026-09-01T00:00:00Z', '10'),
    ponto('2026-09-02T00:00:00Z', '9'),
  ]);
  expect(serie).toEqual({
    pontos: [
      { indice: 0, fechamento: 10 },
      { indice: 1, fechamento: 9 },
      { indice: 2, fechamento: 12 },
    ],
    minimo: 9,
    maximo: 12,
    inicio: '2026-09-01T00:00:00Z',
    fim: '2026-09-03T00:00:00Z',
    variacaoPercentual: 20,
  });
});

it('menos de 2 pontos não forma gráfico', () => {
  expect(prepararSeriePreco([])).toBeNull();
  expect(prepararSeriePreco([ponto('2026-09-01T00:00:00Z', '10')])).toBeNull();
});

it('descarta fechamentos que não são números', () => {
  const serie = prepararSeriePreco([
    ponto('2026-09-01T00:00:00Z', '10'),
    ponto('2026-09-02T00:00:00Z', 'NaN'),
    ponto('2026-09-03T00:00:00Z', '11'),
  ]);
  expect(serie?.pontos).toHaveLength(2);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/dominio/graficos.test.ts`
Expected: FAIL — `Cannot find module '@/dominio/graficos'`.

- [ ] **Step 3: Implementar**

`src/dominio/graficos.ts`:

```ts
import type { PontoHistorico } from '@/api/tipos';
import { paraNumero } from '@/utils/formatacao';

// `type` (e não `interface`): o CartesianChart exige dados compatíveis com Record<string, unknown>.
export type PontoGrafico = { indice: number; fechamento: number };

export interface SeriePreco {
  pontos: PontoGrafico[];
  minimo: number;
  maximo: number;
  inicio: string;
  fim: string;
  /** Pontos percentuais entre o primeiro e o último fechamento. */
  variacaoPercentual: number;
}

export function prepararSeriePreco(historico: PontoHistorico[]): SeriePreco | null {
  const validos = [...historico]
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
    .map((ponto) => ({ data: ponto.data, fechamento: paraNumero(ponto.fechamento) }))
    .filter((ponto) => Number.isFinite(ponto.fechamento));

  if (validos.length < 2) return null;

  const valores = validos.map((ponto) => ponto.fechamento);
  const primeiro = valores[0];
  const ultimo = valores[valores.length - 1];

  return {
    pontos: validos.map((ponto, indice) => ({ indice, fechamento: ponto.fechamento })),
    minimo: Math.min(...valores),
    maximo: Math.max(...valores),
    inicio: validos[0].data,
    fim: validos[validos.length - 1].data,
    variacaoPercentual: primeiro === 0 ? 0 : (ultimo / primeiro - 1) * 100,
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/dominio/graficos.test.ts`
Expected: PASS.

- [ ] **Step 5: Escrever o teste da tela de detalhe (falhando)**

`__tests__/telas/ativo.test.tsx`:

```tsx
import { screen } from '@testing-library/react-native';

import { ativosApi } from '@/api/ativos';
import { ApiError } from '@/api/client';
import { watchlistApi } from '@/api/watchlist';
import { AVISO_IA } from '@/dominio/regulatorio';
import { renderizar } from '@/test/renderizar';

import DetalheAtivo from '../../app/ativo/[id]';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'a-1', ticker: 'PETR4' }),
  router: { back: jest.fn() },
  Stack: { Screen: () => null },
}));
// O gráfico usa Skia, que não roda no Jest.
jest.mock('@/components/GraficoPreco', () => ({ GraficoPreco: () => null }));
jest.mock('@/api/ativos', () => ({
  ativosApi: { cotacao: jest.fn(), historico: jest.fn(), indicadores: jest.fn(), sinais: jest.fn(), backtest: jest.fn() },
}));
jest.mock('@/api/watchlist', () => ({
  watchlistApi: { listar: jest.fn(), remover: jest.fn(), definirNotificacao: jest.fn() },
}));

it('mostra cotação indisponível, indicadores, sinal com histórico e o aviso de IA', async () => {
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  jest.mocked(ativosApi.cotacao).mockRejectedValue(new ApiError(404, 'Cotacao nao encontrada para o ativo'));
  jest.mocked(ativosApi.historico).mockResolvedValue([]);
  jest.mocked(ativosApi.indicadores).mockResolvedValue([
    { tipo: 'RSI', parametros: { periodo: 14 }, data_calculo: '2026-09-25T12:00:00Z', valor: '25.1', valores_auxiliares: null },
  ]);
  jest.mocked(ativosApi.sinais).mockResolvedValue([
    {
      id: 's-1',
      ativo_id: 'a-1',
      regra_id: 'r-1',
      regra_nome: 'Sobrevenda RSI',
      regra_descricao: 'RSI(14) abaixo de 30 — condição técnica de sobrevenda.',
      data_ativacao: '2026-09-25T12:00:00Z',
      contexto: {},
      data_desativacao: null,
    },
  ]);
  jest.mocked(ativosApi.backtest).mockResolvedValue({
    regra_id: 'r-1',
    ativo_id: 'a-1',
    total_ocorrencias: 4,
    retorno_medio_5_pregoes: '1.2',
    retorno_medio_20_pregoes: null,
    retorno_medio_60_pregoes: '-3',
  });

  await renderizar(<DetalheAtivo />);

  expect(await screen.findByText('Sem cotação disponível para este ativo.')).toBeOnTheScreen();
  expect(await screen.findByText('Zona de sobrevenda (abaixo de 30)')).toBeOnTheScreen();
  expect(await screen.findByText('Sobrevenda RSI')).toBeOnTheScreen();
  expect(await screen.findByText('+1,20%')).toBeOnTheScreen();
  expect(screen.getByText('Dados insuficientes para o gráfico neste período.')).toBeOnTheScreen();
  expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
  expect(ativosApi.backtest).toHaveBeenCalledWith('a-1', 'r-1');
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx jest __tests__/telas/ativo.test.tsx`
Expected: FAIL — `Cannot find module '../../app/ativo/[id]'`.

- [ ] **Step 7: Implementar o gráfico e a tela**

`src/components/GraficoPreco.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';
import { Area, CartesianChart, Line } from 'victory-native';

import { Texto } from '@/components/Texto';
import { VariacaoBadge } from '@/components/VariacaoBadge';
import type { SeriePreco } from '@/dominio/graficos';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { formatarData, formatarMoeda } from '@/utils/formatacao';

interface Props {
  serie: SeriePreco;
  moeda?: string;
}

// Sem eixos desenhados no Skia (evita embarcar fonte TTF); mínimo, máximo e datas ficam em Text.
export function GraficoPreco({ serie, moeda }: Props) {
  const { cores } = useTema();
  return (
    <View style={estilos.container}>
      <View
        style={estilos.grafico}
        aria-label={`Gráfico de fechamento de ${formatarData(serie.inicio)} a ${formatarData(serie.fim)}`}
      >
        <CartesianChart data={serie.pontos} xKey="indice" yKeys={['fechamento']} domainPadding={{ top: 16, bottom: 16 }}>
          {({ points, chartBounds }) => (
            <>
              <Area points={points.fechamento} y0={chartBounds.bottom} color={cores.primaria} opacity={0.15} />
              <Line points={points.fechamento} color={cores.primaria} strokeWidth={2} />
            </>
          )}
        </CartesianChart>
      </View>
      <View style={estilos.legenda}>
        <Texto variante="legenda" cor="secundario">{`Mín. ${formatarMoeda(serie.minimo, moeda)}`}</Texto>
        <Texto variante="legenda" cor="secundario">{`Máx. ${formatarMoeda(serie.maximo, moeda)}`}</Texto>
      </View>
      <View style={estilos.legenda}>
        <Texto variante="legenda" cor="secundario">
          {formatarData(serie.inicio)}
        </Texto>
        <VariacaoBadge valor={serie.variacaoPercentual} escala="pontos" />
        <Texto variante="legenda" cor="secundario">
          {formatarData(serie.fim)}
        </Texto>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { gap: espaco.sm },
  grafico: { height: 200 },
  legenda: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
```

`app/ativo/[id].tsx`:

```tsx
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import type { PeriodoHistorico } from '@/api/tipos';
import { Botao } from '@/components/Botao';
import { BotaoCabecalho } from '@/components/BotaoCabecalho';
import { Card } from '@/components/Card';
import { CardAnaliseIA } from '@/components/CardAnaliseIA';
import { EstadoConsulta } from '@/components/EstadoConsulta';
import { EstadoVazio } from '@/components/EstadoVazio';
import { GraficoPreco } from '@/components/GraficoPreco';
import { IndicadorItem } from '@/components/IndicadorItem';
import { Linha } from '@/components/Linha';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { SinalCard } from '@/components/SinalCard';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { VariacaoBadge } from '@/components/VariacaoBadge';
import { prepararSeriePreco } from '@/dominio/graficos';
import { descreverIndicadores } from '@/dominio/indicadores';
import { useBacktests, useCotacao, useHistorico, useIndicadores, useSinais } from '@/hooks/useAtivo';
import { useDefinirNotificacao, useItemWatchlist, useRemoverWatchlist } from '@/hooks/useWatchlist';
import { espaco } from '@/theme/escala';
import { ehStatus, mensagemDeErro } from '@/utils/erros';
import { formatarMoeda, paraNumero } from '@/utils/formatacao';

const PERIODOS: readonly { valor: PeriodoHistorico; rotulo: string }[] = [
  { valor: '1D', rotulo: '1D' },
  { valor: '1S', rotulo: '1S' },
  { valor: '1M', rotulo: '1M' },
  { valor: '3M', rotulo: '3M' },
  { valor: '1A', rotulo: '1A' },
  { valor: '5A', rotulo: '5A' },
];

export default function DetalheAtivo() {
  const { id, ticker: tickerParam } = useLocalSearchParams<{ id: string; ticker?: string }>();
  const item = useItemWatchlist(id);
  const ativo = item?.ativo;
  const titulo = ativo?.ticker ?? tickerParam ?? 'Ativo';

  const [periodo, setPeriodo] = useState<PeriodoHistorico>('1M');
  const cotacao = useCotacao(id);
  const historico = useHistorico(id, periodo);
  const indicadores = useIndicadores(id);
  const sinais = useSinais(id);
  const backtests = useBacktests(id, sinais.data?.map((sinal) => sinal.regra_id) ?? []);
  const definirNotificacao = useDefinirNotificacao();
  const remover = useRemoverWatchlist();

  const precoAtual = cotacao.data ? paraNumero(cotacao.data.preco) : null;

  function atualizar() {
    void cotacao.refetch();
    void historico.refetch();
    void indicadores.refetch();
    void sinais.refetch();
  }

  function confirmarRemocao() {
    Alert.alert('Remover da watchlist', `Remover ${titulo} da sua watchlist?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () =>
          remover.mutate(id, {
            onSuccess: () => router.back(),
            onError: (erro) => Alert.alert('Não foi possível remover', mensagemDeErro(erro)),
          }),
      },
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: titulo,
          headerRight: item
            ? () => (
                <BotaoCabecalho
                  icone={item.notificar ? 'notifications' : 'notifications-off-outline'}
                  rotulo={item.notificar ? 'Desativar notificações' : 'Ativar notificações'}
                  onPress={() => definirNotificacao.mutate({ ativoId: id, notificar: !item.notificar })}
                />
              )
            : undefined,
        }}
      />
      <Tela aoAtualizar={atualizar} atualizando={cotacao.isRefetching}>
        <Card>
          {ativo ? <Texto cor="secundario">{ativo.nome}</Texto> : null}
          <EstadoConsulta
            consulta={cotacao}
            mensagemErro={(erro) => (ehStatus(erro, 404) ? 'Sem cotação disponível para este ativo.' : undefined)}
          >
            {(dados) => (
              <>
                <View style={estilos.linhaPreco}>
                  <Texto variante="destaque">{formatarMoeda(dados.preco, ativo?.moeda)}</Texto>
                  <VariacaoBadge valor={dados.variacao_percentual} escala="pontos" />
                </View>
                <Linha rotulo="Máxima do dia" valor={formatarMoeda(dados.maxima_dia, ativo?.moeda)} />
                <Linha rotulo="Mínima do dia" valor={formatarMoeda(dados.minima_dia, ativo?.moeda)} />
              </>
            )}
          </EstadoConsulta>
        </Card>

        <Card titulo="Histórico de fechamento">
          <SeletorSegmentado rotulo="Período do gráfico" opcoes={PERIODOS} selecionado={periodo} aoSelecionar={setPeriodo} />
          <EstadoConsulta
            consulta={historico}
            mensagemErro={(erro) => (ehStatus(erro, 404) ? 'Histórico indisponível para este ativo.' : undefined)}
          >
            {(pontos) => {
              const serie = prepararSeriePreco(pontos);
              return serie ? (
                <GraficoPreco serie={serie} moeda={ativo?.moeda} />
              ) : (
                <EstadoVazio mensagem="Dados insuficientes para o gráfico neste período." />
              );
            }}
          </EstadoConsulta>
        </Card>

        <Card titulo="Indicadores técnicos">
          <EstadoConsulta consulta={indicadores}>
            {(lista) =>
              lista.length === 0 ? (
                <EstadoVazio mensagem="Indicadores ainda não calculados para este ativo." />
              ) : (
                descreverIndicadores(lista, precoAtual).map((indicador) => (
                  <IndicadorItem key={indicador.chave} indicador={indicador} />
                ))
              )
            }
          </EstadoConsulta>
        </Card>

        <Texto variante="subtitulo" role="heading">
          Sinais técnicos ativos
        </Texto>
        <EstadoConsulta consulta={sinais}>
          {(lista) =>
            lista.length === 0 ? (
              <EstadoVazio mensagem="Nenhum sinal técnico ativo no momento." />
            ) : (
              lista.map((sinal, indice) => (
                <SinalCard
                  key={sinal.id}
                  sinal={sinal}
                  backtest={backtests[indice]?.data}
                  carregandoBacktest={backtests[indice]?.isPending ?? true}
                />
              ))
            )
          }
        </EstadoConsulta>

        <CardAnaliseIA />

        {item ? (
          <Botao titulo="Remover da watchlist" variante="perigo" onPress={confirmarRemocao} carregando={remover.isPending} />
        ) : null}
      </Tela>
    </>
  );
}

const estilos = StyleSheet.create({
  linhaPreco: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco.md },
});
```

Em `app/_layout.tsx`, dentro de `<Stack.Protected guard={autenticado}>`, logo após a linha `<Stack.Screen name="buscar" options={{ title: 'Buscar ativo' }} />`, acrescente:

```tsx
                <Stack.Screen name="ativo/[id]" options={{ title: 'Ativo' }} />
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx jest __tests__/telas/ativo.test.tsx src/dominio`
Expected: PASS.

- [ ] **Step 9: Verificação completa e bundle (o Victory/Skia só é exercitado aqui)**

```bash
npm run verificar
npx expo export --platform android --output-dir dist
rm -rf dist
```

Expected: tudo verde e bundle gerado com `victory-native`.

- [ ] **Step 10: Commit**

```bash
git add app src/components/GraficoPreco.tsx src/dominio/graficos.ts src/dominio/graficos.test.ts __tests__/telas/ativo.test.tsx
git commit -m "feat: adiciona detalhe do ativo com gráfico, indicadores e sinais com backtest

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Portfólio

**Files:**
- Modify: `src/dominio/rotulos.ts` (acrescentar `ROTULO_CLASSE_PLURAL`)
- Create: `src/dominio/portfolio.ts`
- Create: `src/components/GraficoDistribuicao.tsx`, `ItemPosicao.tsx`, `ItemOperacao.tsx`, `BotaoFlutuante.tsx`
- Create: `app/(tabs)/portfolio.tsx`
- Modify: `app/(tabs)/_layout.tsx` (substituição completa: aba Portfólio)
- Test: `src/dominio/portfolio.test.ts`, `src/components/carteira.test.tsx`, `__tests__/telas/portfolio.test.tsx`

**Interfaces:**
- Consumes: `useOperacoes`, `usePosicoes`, `useRentabilidade`, `useDistribuicao`, `useBenchmark`, `useRemoverOperacao`, `useWatchlist` (Task 8); componentes base (Task 5); `VariacaoBadge` (Task 6); `BotaoCabecalho`, `NomeIcone`, `ROTULO_TIPO_ATIVO` (Task 10); formatadores (Task 2); `ehStatus`, `mensagemDeErro` (Task 3).
- Produces:
  - `ROTULO_CLASSE_PLURAL: Record<TipoAtivo, string>`.
  - `interface InfoAtivo { ticker: string; moeda?: string }`; `mapaAtivos(posicoes: Posicao[] | undefined, watchlist: ItemWatchlist[] | undefined): Map<Uuid, InfoAtivo>` (a watchlist prevalece porque traz a moeda).
  - `type DimensaoDistribuicao = 'classe' | 'setor' | 'moeda'`; `type FatiaDistribuicao = { rotulo: string; valor: number; cor: string }` (valor em fração); `prepararDistribuicao(distribuicao: Distribuicao, dimensao: DimensaoDistribuicao, paleta: readonly string[]): FatiaDistribuicao[]`.
  - `GraficoDistribuicao({ fatias })`; `ItemPosicao({ posicao, moeda? })`; `ItemOperacao({ operacao, ticker: string | null, moeda?, aoRemover, removendo })`; `BotaoFlutuante({ rotulo, icone: NomeIcone, onPress })`.

- [ ] **Step 1: Escrever o teste do domínio do portfólio (falhando)**

`src/dominio/portfolio.test.ts`:

```ts
import type { Distribuicao, ItemWatchlist, Posicao } from '@/api/tipos';
import { mapaAtivos, prepararDistribuicao } from '@/dominio/portfolio';

const paleta = ['#111111', '#222222'];

const distribuicao: Distribuicao = {
  por_classe: { ACAO: '0.6', CRIPTO: '0.4', FII: '0' },
  por_setor: { 'N/A': '0.4', Petróleo: '0.6' },
  por_moeda: { BRL: '0.6', USD: '0.4' },
};

describe('prepararDistribuicao', () => {
  it('ordena do maior para o menor, descarta zeros e usa rótulos pt-BR', () => {
    expect(prepararDistribuicao(distribuicao, 'classe', paleta)).toEqual([
      { rotulo: 'Ações', valor: 0.6, cor: '#111111' },
      { rotulo: 'Criptomoedas', valor: 0.4, cor: '#222222' },
    ]);
  });

  it('setor "N/A" vira "Sem setor"', () => {
    expect(prepararDistribuicao(distribuicao, 'setor', paleta).map((fatia) => fatia.rotulo)).toEqual([
      'Petróleo',
      'Sem setor',
    ]);
  });

  it('repete a paleta quando há mais fatias que cores', () => {
    const muitas: Distribuicao = { por_classe: {}, por_setor: {}, por_moeda: { BRL: '0.5', USD: '0.3', EUR: '0.2' } };
    expect(prepararDistribuicao(muitas, 'moeda', paleta).map((fatia) => fatia.cor)).toEqual([
      '#111111',
      '#222222',
      '#111111',
    ]);
  });
});

describe('mapaAtivos', () => {
  const posicao = { ativo_id: 'a-1', ticker: 'PETR4' } as Posicao;
  const itemWatchlist: ItemWatchlist = {
    ativo: { id: 'a-2', ticker: 'AAPL34', nome: 'Apple', tipo: 'BDR', setor: null, moeda: 'USD' },
    notificar: true,
    adicionado_em: '2026-09-25T12:00:00Z',
  };

  it('junta posições e watchlist; a watchlist traz a moeda', () => {
    const mapa = mapaAtivos([posicao], [itemWatchlist]);
    expect(mapa.get('a-1')).toEqual({ ticker: 'PETR4' });
    expect(mapa.get('a-2')).toEqual({ ticker: 'AAPL34', moeda: 'USD' });
  });

  it('aceita consultas ainda sem dados', () => {
    expect(mapaAtivos(undefined, undefined).size).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/dominio/portfolio.test.ts`
Expected: FAIL — `Cannot find module '@/dominio/portfolio'`.

- [ ] **Step 3: Implementar**

Acrescente ao final de `src/dominio/rotulos.ts`:

```ts

export const ROTULO_CLASSE_PLURAL: Record<TipoAtivo, string> = {
  ACAO: 'Ações',
  FII: 'FIIs',
  ETF: 'ETFs',
  BDR: 'BDRs',
  CRIPTO: 'Criptomoedas',
};
```

`src/dominio/portfolio.ts`:

```ts
import type { Decimal, Distribuicao, ItemWatchlist, Posicao, TipoAtivo, Uuid } from '@/api/tipos';
import { ROTULO_CLASSE_PLURAL } from '@/dominio/rotulos';
import { paraNumero } from '@/utils/formatacao';

export interface InfoAtivo {
  ticker: string;
  moeda?: string;
}

/** OperacaoResponse só traz ativo_id: o ticker vem das posições e, com moeda, da watchlist. */
export function mapaAtivos(
  posicoes: Posicao[] | undefined,
  watchlist: ItemWatchlist[] | undefined,
): Map<Uuid, InfoAtivo> {
  const mapa = new Map<Uuid, InfoAtivo>();
  for (const posicao of posicoes ?? []) mapa.set(posicao.ativo_id, { ticker: posicao.ticker });
  for (const item of watchlist ?? []) mapa.set(item.ativo.id, { ticker: item.ativo.ticker, moeda: item.ativo.moeda });
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/dominio/portfolio.test.ts`
Expected: PASS.

- [ ] **Step 5: Escrever o teste dos componentes da carteira (falhando)**

`src/components/carteira.test.tsx`:

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';

import type { Operacao, Posicao } from '@/api/tipos';
import { ItemOperacao } from '@/components/ItemOperacao';
import { ItemPosicao } from '@/components/ItemPosicao';

const NBSP = ' ';

it('ItemPosicao mostra quantidade, preço médio, valor em BRL e lucro com sinal', async () => {
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
  await render(<ItemPosicao posicao={posicao} moeda="BRL" />);
  expect(screen.getByText('PETR4')).toBeOnTheScreen();
  expect(screen.getByText(`10 × PM R$${NBSP}30,00`)).toBeOnTheScreen();
  expect(screen.getByText(`R$${NBSP}330,00`)).toBeOnTheScreen();
  expect(screen.getByText(`+R$${NBSP}30,00`)).toBeOnTheScreen();
});

it('ItemOperacao descreve a operação simulada e permite remover', async () => {
  const user = userEvent.setup();
  const aoRemover = jest.fn();
  const operacao: Operacao = {
    id: 'o-1',
    ativo_id: 'a-1',
    tipo: 'VENDA',
    quantidade: '5',
    preco_unitario: '40',
    data: '2026-09-10',
    criado_em: '2026-09-10T12:00:00Z',
  };
  await render(<ItemOperacao operacao={operacao} ticker="PETR4" moeda="BRL" aoRemover={aoRemover} removendo={false} />);
  expect(screen.getByText('Venda · PETR4')).toBeOnTheScreen();
  expect(screen.getByText(`10/09/2026 · 5 × R$${NBSP}40,00`)).toBeOnTheScreen();
  expect(screen.getByText(`R$${NBSP}200,00`)).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Remover operação de venda de PETR4 em 10/09/2026' }));
  expect(aoRemover).toHaveBeenCalled();
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx jest src/components/carteira.test.tsx`
Expected: FAIL — `Cannot find module '@/components/ItemOperacao'`.

- [ ] **Step 7: Implementar os componentes da carteira**

`src/components/ItemPosicao.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';

import type { Posicao } from '@/api/tipos';
import { Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';
import { formatarMoeda, formatarQuantidade, paraNumero } from '@/utils/formatacao';

interface Props {
  posicao: Posicao;
  moeda?: string;
}

export function ItemPosicao({ posicao, moeda }: Props) {
  const lucro = paraNumero(posicao.lucro_nao_realizado);
  const corLucro = lucro > 0 ? 'positivo' : lucro < 0 ? 'negativo' : 'secundario';
  return (
    <View style={estilos.linha}>
      <View style={estilos.esquerda}>
        <Texto negrito>{posicao.ticker}</Texto>
        <Texto variante="legenda" cor="secundario">
          {`${formatarQuantidade(posicao.quantidade)} × PM ${formatarMoeda(posicao.preco_medio, moeda)}`}
        </Texto>
      </View>
      <View style={estilos.direita}>
        <Texto negrito>{formatarMoeda(posicao.valor_mercado_brl, 'BRL')}</Texto>
        <Texto variante="legenda" cor={corLucro}>
          {`${lucro > 0 ? '+' : ''}${formatarMoeda(posicao.lucro_nao_realizado, moeda)}`}
        </Texto>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  esquerda: { flex: 1, gap: 2 },
  direita: { alignItems: 'flex-end', gap: 2 },
});
```

`src/components/ItemOperacao.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Operacao } from '@/api/tipos';
import { Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { formatarData, formatarMoeda, formatarQuantidade, paraNumero } from '@/utils/formatacao';

interface Props {
  operacao: Operacao;
  ticker: string | null;
  moeda?: string;
  aoRemover: () => void;
  removendo: boolean;
}

// "Compra"/"Venda" aqui é o tipo da operação simulada que o próprio usuário registrou (permitido pela RN-01).
const ROTULO_TIPO = { COMPRA: 'Compra', VENDA: 'Venda' } as const;

export function ItemOperacao({ operacao, ticker, moeda, aoRemover, removendo }: Props) {
  const { cores } = useTema();
  const rotuloTipo = ROTULO_TIPO[operacao.tipo];
  const nomeAtivo = ticker ?? 'Ativo';
  const data = formatarData(operacao.data);
  const total = paraNumero(operacao.quantidade) * paraNumero(operacao.preco_unitario);

  return (
    <View style={estilos.linha}>
      <View style={estilos.esquerda}>
        <Texto negrito>{`${rotuloTipo} · ${nomeAtivo}`}</Texto>
        <Texto variante="legenda" cor="secundario">
          {`${data} · ${formatarQuantidade(operacao.quantidade)} × ${formatarMoeda(operacao.preco_unitario, moeda)}`}
        </Texto>
      </View>
      <Texto negrito>{formatarMoeda(total, moeda)}</Texto>
      <Pressable
        role="button"
        aria-label={`Remover operação de ${rotuloTipo.toLowerCase()} de ${nomeAtivo} em ${data}`}
        aria-disabled={removendo}
        disabled={removendo}
        onPress={aoRemover}
        hitSlop={8}
      >
        <Ionicons name="trash-outline" size={20} color={cores.negativo} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  esquerda: { flex: 1, gap: 2 },
});
```

`src/components/GraficoDistribuicao.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';
import { Pie, PolarChart } from 'victory-native';

import { Texto } from '@/components/Texto';
import type { FatiaDistribuicao } from '@/dominio/portfolio';
import { espaco } from '@/theme/escala';
import { formatarNumero } from '@/utils/formatacao';

export function GraficoDistribuicao({ fatias }: { fatias: FatiaDistribuicao[] }) {
  return (
    <View style={estilos.container}>
      <View style={estilos.rosca}>
        <PolarChart data={fatias} labelKey="rotulo" valueKey="valor" colorKey="cor">
          <Pie.Chart innerRadius="58%" />
        </PolarChart>
      </View>
      <View style={estilos.legenda}>
        {fatias.map((fatia) => (
          <View key={fatia.rotulo} style={estilos.itemLegenda}>
            <View style={[estilos.marcador, { backgroundColor: fatia.cor }]} />
            <Texto style={estilos.rotulo} numberOfLines={1}>
              {fatia.rotulo}
            </Texto>
            <Texto negrito>{`${formatarNumero(fatia.valor * 100, 1)}%`}</Texto>
          </View>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: espaco.lg },
  rosca: { width: 140, height: 140 },
  legenda: { flex: 1, gap: espaco.sm },
  itemLegenda: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  marcador: { width: 10, height: 10, borderRadius: 5 },
  rotulo: { flex: 1 },
});
```

`src/components/BotaoFlutuante.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import type { NomeIcone } from '@/components/BotaoCabecalho';
import { Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  rotulo: string;
  icone: NomeIcone;
  onPress: () => void;
}

export function BotaoFlutuante({ rotulo, icone, onPress }: Props) {
  const { cores } = useTema();
  return (
    <Pressable
      role="button"
      aria-label={rotulo}
      onPress={onPress}
      style={({ pressed }) => [estilos.botao, { backgroundColor: cores.primaria, opacity: pressed ? 0.85 : 1 }]}
    >
      <Ionicons name={icone} size={22} color={cores.textoSobrePrimaria} />
      <Texto negrito cor="sobrePrimaria">
        {rotulo}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: {
    position: 'absolute',
    right: espaco.lg,
    bottom: espaco.lg,
    height: 52,
    borderRadius: 26,
    paddingHorizontal: espaco.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx jest src/components/carteira.test.tsx src/dominio`
Expected: PASS.

- [ ] **Step 9: Escrever o teste da tela do portfólio (falhando)**

`__tests__/telas/portfolio.test.tsx`:

```tsx
import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ApiError } from '@/api/client';
import { portfolioApi } from '@/api/portfolio';
import type { Comparativo, TipoBenchmark } from '@/api/tipos';
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

beforeEach(() => {
  jest.clearAllMocks();
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
});

it('sem operações mostra o estado vazio com atalho para registrar', async () => {
  const user = userEvent.setup();
  jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([]);
  await renderizar(<Portfolio />);
  await user.press(await screen.findByRole('button', { name: 'Registrar operação' }));
  expect(router.push).toHaveBeenCalledWith('/operacao/nova');
});

it('mostra rentabilidade e benchmarks na escala de fração e o ticker das operações', async () => {
  jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([
    {
      id: 'o-1',
      ativo_id: 'a-1',
      tipo: 'COMPRA',
      quantidade: '10',
      preco_unitario: '30',
      data: '2026-09-01',
      criado_em: '2026-09-01T12:00:00Z',
    },
  ]);
  jest.mocked(portfolioApi.posicoes).mockResolvedValue([
    {
      ativo_id: 'a-1',
      ticker: 'PETR4',
      quantidade: '10',
      preco_medio: '30',
      cotacao_atual: '33',
      valor_mercado: '330',
      valor_mercado_brl: '330',
      lucro_nao_realizado: '30',
      lucro_realizado: '0',
    },
  ]);
  jest.mocked(portfolioApi.rentabilidade).mockResolvedValue({
    custo_base_brl: '300',
    valor_mercado_brl: '330',
    lucro_nao_realizado_brl: '30',
    lucro_realizado_brl: '0',
    percentual: '0.1',
  });
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

  await renderizar(<Portfolio />);

  expect(await screen.findByText('▲ +10,00%')).toBeOnTheScreen();
  expect(await screen.findByText('+2,00%')).toBeOnTheScreen();
  expect(screen.getByText('indisponível')).toBeOnTheScreen();
  expect(await screen.findByText('Compra · PETR4')).toBeOnTheScreen();
});
```

- [ ] **Step 10: Rodar e ver falhar**

Run: `npx jest __tests__/telas/portfolio.test.tsx`
Expected: FAIL — `Cannot find module '../../app/(tabs)/portfolio'`.

- [ ] **Step 11: Implementar a tela do portfólio**

`app/(tabs)/portfolio.tsx`:

```tsx
import type { UseQueryResult } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import type { ApiError } from '@/api/client';
import type { Comparativo, Operacao } from '@/api/tipos';
import { BotaoFlutuante } from '@/components/BotaoFlutuante';
import { Card } from '@/components/Card';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoConsulta } from '@/components/EstadoConsulta';
import { EstadoVazio } from '@/components/EstadoVazio';
import { GraficoDistribuicao } from '@/components/GraficoDistribuicao';
import { ItemOperacao } from '@/components/ItemOperacao';
import { ItemPosicao } from '@/components/ItemPosicao';
import { Linha } from '@/components/Linha';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { VariacaoBadge } from '@/components/VariacaoBadge';
import { type DimensaoDistribuicao, mapaAtivos, prepararDistribuicao } from '@/dominio/portfolio';
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
import { ehStatus, mensagemDeErro } from '@/utils/erros';
import { formatarMoeda, formatarPercentual } from '@/utils/formatacao';

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
  const ativos = mapaAtivos(posicoes.data, watchlist.data);

  function atualizar() {
    for (const consulta of [operacoes, rentabilidade, cdi, ibovespa, distribuicao, posicoes]) void consulta.refetch();
  }

  function confirmarRemocao(operacao: Operacao) {
    Alert.alert('Remover operação', 'Remover esta operação simulada do histórico?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () =>
          removerOperacao.mutate(operacao.id, {
            onError: (erro) => Alert.alert('Não foi possível remover', mensagemDeErro(erro)),
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

  return (
    <View style={estilos.tela}>
      <Tela aoAtualizar={atualizar} atualizando={operacoes.isRefetching}>
        <Card titulo="Resumo da carteira">
          <EstadoConsulta consulta={rentabilidade}>
            {(dados) => (
              <>
                <View style={estilos.destaque}>
                  <Texto variante="destaque">{formatarMoeda(dados.valor_mercado_brl, 'BRL')}</Texto>
                  <VariacaoBadge valor={dados.percentual} escala="fracao" />
                </View>
                <Linha rotulo="Custo base" valor={formatarMoeda(dados.custo_base_brl, 'BRL')} />
                <Linha rotulo="Lucro não realizado" valor={formatarMoeda(dados.lucro_nao_realizado_brl, 'BRL')} />
                <Linha rotulo="Lucro realizado" valor={formatarMoeda(dados.lucro_realizado_brl, 'BRL')} />
              </>
            )}
          </EstadoConsulta>
        </Card>

        <Card titulo="Comparativo desde a 1ª operação">
          <ComparativoBenchmarks cdi={cdi} ibovespa={ibovespa} />
        </Card>

        <Card titulo="Distribuição">
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

        <Card titulo="Posições">
          <EstadoConsulta consulta={posicoes}>
            {(lista) =>
              lista.length > 0 ? (
                lista.map((posicao) => (
                  <ItemPosicao key={posicao.ativo_id} posicao={posicao} moeda={ativos.get(posicao.ativo_id)?.moeda} />
                ))
              ) : (
                <EstadoVazio mensagem="Nenhuma posição em aberto." />
              )
            }
          </EstadoConsulta>
        </Card>

        <Card titulo="Operações simuladas">
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
      <BotaoFlutuante rotulo="Nova operação" icone="add" onPress={() => router.push('/operacao/nova')} />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  destaque: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco.md },
  espacoDoBotao: { height: 72 },
});
```

`app/(tabs)/_layout.tsx` (substituição completa):

```tsx
import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';

import { BotaoCabecalho } from '@/components/BotaoCabecalho';
import { useTema } from '@/theme/useTema';

export default function TabsLayout() {
  const { cores } = useTema();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: cores.primaria, tabBarInactiveTintColor: cores.textoSecundario }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Watchlist',
          tabBarIcon: ({ color, size }) => <Ionicons name="eye-outline" color={color} size={size} />,
          headerRight: () => <BotaoCabecalho icone="add" rotulo="Buscar ativo" onPress={() => router.push('/buscar')} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfólio',
          tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 12: Rodar e ver passar**

Run: `npx jest __tests__/telas src/components src/dominio`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add app src/components src/dominio __tests__/telas/portfolio.test.tsx
git commit -m "feat: adiciona portfólio com rentabilidade, benchmarks, distribuição e operações

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Nova operação simulada

**Files:**
- Create: `src/dominio/operacao.ts`
- Create: `src/components/CampoData.tsx`, `src/components/SugestoesTicker.tsx`
- Create: `app/operacao/nova.tsx`
- Modify: `app/_layout.tsx` (registrar a rota `operacao/nova`)
- Modify: `app/(tabs)/portfolio.tsx` (mensagem do 422 na remoção)
- Test: `src/dominio/operacao.test.ts`, `src/components/operacao.test.tsx`, `__tests__/telas/nova-operacao.test.tsx`

**Interfaces:**
- Consumes: `useWatchlist`, `useCotacao`, `useResolverAtivo`, `useRegistrarOperacao` (Task 8); componentes base (Task 5); `ApiError`, `ehStatus`, `mensagemDeErro` (Task 3); `normalizarDecimal`, `dataParaISOLocal`, `formatarData`, `formatarMoeda` (Task 2).
- Produces:
  - `interface FormOperacao { tipo: TipoOperacao; ticker: string; quantidade: string; precoUnitario: string; data: Date }`; `type ErrosOperacao = Partial<Record<'ticker' | 'quantidade' | 'precoUnitario' | 'data', string>>`; `interface OperacaoValidada { ticker; tipo; quantidade: Decimal; precoUnitario: Decimal; data: DataISO }`; `type ResultadoValidacaoOperacao = { ok: true; dados: OperacaoValidada } | { ok: false; erros: ErrosOperacao }`.
  - `validarOperacao(form: FormOperacao, hoje?: Date): ResultadoValidacaoOperacao`.
  - `mensagemErroOperacao(erro: unknown, contexto: 'registrar' | 'remover'): string`.
  - `CampoData({ rotulo, valor: Date, aoMudar: (data: Date) => void, maximo?: Date, erro? })`; `SugestoesTicker({ tickers: string[], aoEscolher: (ticker: string) => void })` — botões com nome `"Usar {ticker}"`.
  - Rota `/operacao/nova` (modal).

- [ ] **Step 1: Escrever o teste do domínio da operação (falhando)**

`src/dominio/operacao.test.ts`:

```ts
import { ApiError } from '@/api/client';
import { type FormOperacao, mensagemErroOperacao, validarOperacao } from '@/dominio/operacao';

const hoje = new Date(2026, 8, 25, 23, 30);
const base: FormOperacao = {
  tipo: 'COMPRA',
  ticker: ' petr4 ',
  quantidade: '10,5',
  precoUnitario: '38.20',
  data: new Date(2026, 8, 25, 10, 0),
};

describe('validarOperacao', () => {
  it('normaliza ticker, decimais e data', () => {
    expect(validarOperacao(base, hoje)).toEqual({
      ok: true,
      dados: { ticker: 'PETR4', tipo: 'COMPRA', quantidade: '10.5', precoUnitario: '38.20', data: '2026-09-25' },
    });
  });

  it('operação de hoje às 23:30 não é considerada futura (dia local, não UTC)', () => {
    expect(validarOperacao({ ...base, data: new Date(2026, 8, 25, 23, 30) }, hoje).ok).toBe(true);
  });

  it('data de amanhã é rejeitada', () => {
    expect(validarOperacao({ ...base, data: new Date(2026, 8, 26, 0, 5) }, hoje)).toEqual({
      ok: false,
      erros: { data: 'A data não pode ser futura' },
    });
  });

  it('exige ticker, quantidade e preço positivos', () => {
    expect(validarOperacao({ ...base, ticker: '  ', quantidade: '0', precoUnitario: 'abc' }, hoje)).toEqual({
      ok: false,
      erros: {
        ticker: 'Informe o ticker do ativo',
        quantidade: 'Informe uma quantidade maior que zero',
        precoUnitario: 'Informe um preço maior que zero',
      },
    });
  });
});

describe('mensagemErroOperacao', () => {
  const uuid = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

  it('422 com só o UUID ao registrar vira quantidade insuficiente', () => {
    expect(mensagemErroOperacao(new ApiError(422, uuid), 'registrar')).toBe(
      'Quantidade insuficiente em carteira para esta venda na data informada.',
    );
  });

  it('422 com só o UUID ao remover explica o bloqueio', () => {
    expect(mensagemErroOperacao(new ApiError(422, uuid), 'remover')).toBe(
      'Esta operação não pode ser removida: uma venda posterior ficaria sem saldo em carteira.',
    );
  });

  it('422 com texto legível é mantido', () => {
    expect(mensagemErroOperacao(new ApiError(422, 'data nao pode ser futura'), 'registrar')).toBe('data nao pode ser futura');
  });

  it('outros erros usam a mensagem padrão', () => {
    expect(mensagemErroOperacao(new ApiError(0, 'Sem conexão com o servidor'), 'registrar')).toBe(
      'Sem conexão com o servidor',
    );
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/dominio/operacao.test.ts`
Expected: FAIL — `Cannot find module '@/dominio/operacao'`.

- [ ] **Step 3: Implementar**

`src/dominio/operacao.ts`:

```ts
import { ApiError } from '@/api/client';
import type { DataISO, Decimal, TipoOperacao } from '@/api/tipos';
import { mensagemDeErro } from '@/utils/erros';
import { dataParaISOLocal, normalizarDecimal } from '@/utils/formatacao';

export interface FormOperacao {
  tipo: TipoOperacao;
  ticker: string;
  quantidade: string;
  precoUnitario: string;
  data: Date;
}

export type ErrosOperacao = Partial<Record<'ticker' | 'quantidade' | 'precoUnitario' | 'data', string>>;

export interface OperacaoValidada {
  ticker: string;
  tipo: TipoOperacao;
  quantidade: Decimal;
  precoUnitario: Decimal;
  data: DataISO;
}

export type ResultadoValidacaoOperacao = { ok: true; dados: OperacaoValidada } | { ok: false; erros: ErrosOperacao };

function decimalPositivo(entrada: string): Decimal | null {
  const decimal = normalizarDecimal(entrada);
  return decimal !== null && Number(decimal) > 0 ? decimal : null;
}

export function validarOperacao(form: FormOperacao, hoje: Date = new Date()): ResultadoValidacaoOperacao {
  const erros: ErrosOperacao = {};
  const ticker = form.ticker.trim().toUpperCase();
  const quantidade = decimalPositivo(form.quantidade);
  const precoUnitario = decimalPositivo(form.precoUnitario);
  const data = dataParaISOLocal(form.data);

  if (!ticker) erros.ticker = 'Informe o ticker do ativo';
  if (quantidade === null) erros.quantidade = 'Informe uma quantidade maior que zero';
  if (precoUnitario === null) erros.precoUnitario = 'Informe um preço maior que zero';
  // Strings AAAA-MM-DD comparam na mesma ordem que as datas.
  if (data > dataParaISOLocal(hoje)) erros.data = 'A data não pode ser futura';

  if (!ticker || quantidade === null || precoUnitario === null || erros.data) return { ok: false, erros };
  return { ok: true, dados: { ticker, tipo: form.tipo, quantidade, precoUnitario, data } };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** O backend converte QuantidadeInsuficienteError(ativo_id) em string: o `detail` do 422 é só o UUID. */
export function mensagemErroOperacao(erro: unknown, contexto: 'registrar' | 'remover'): string {
  if (erro instanceof ApiError && erro.status === 422 && UUID.test(erro.message.trim())) {
    return contexto === 'registrar'
      ? 'Quantidade insuficiente em carteira para esta venda na data informada.'
      : 'Esta operação não pode ser removida: uma venda posterior ficaria sem saldo em carteira.';
  }
  return mensagemDeErro(erro);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/dominio/operacao.test.ts`
Expected: PASS.

- [ ] **Step 5: Escrever o teste do componente de sugestões (falhando)**

`src/components/operacao.test.tsx`:

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';

import { SugestoesTicker } from '@/components/SugestoesTicker';

it('SugestoesTicker oferece os tickers da watchlist como atalho', async () => {
  const user = userEvent.setup();
  const aoEscolher = jest.fn();
  await render(<SugestoesTicker tickers={['PETR4', 'VALE3']} aoEscolher={aoEscolher} />);
  await user.press(screen.getByRole('button', { name: 'Usar VALE3' }));
  expect(aoEscolher).toHaveBeenCalledWith('VALE3');
});

it('SugestoesTicker não renderiza nada sem tickers', async () => {
  await render(<SugestoesTicker tickers={[]} aoEscolher={jest.fn()} />);
  expect(screen.queryByRole('button')).not.toBeOnTheScreen();
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx jest src/components/operacao.test.tsx`
Expected: FAIL — `Cannot find module '@/components/SugestoesTicker'`.

- [ ] **Step 7: Implementar os componentes**

`src/components/SugestoesTicker.tsx`:

```tsx
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  tickers: string[];
  aoEscolher: (ticker: string) => void;
}

export function SugestoesTicker({ tickers, aoEscolher }: Props) {
  const { cores } = useTema();
  if (tickers.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={estilos.lista}
    >
      {tickers.map((ticker) => (
        <Pressable
          key={ticker}
          role="button"
          aria-label={`Usar ${ticker}`}
          onPress={() => aoEscolher(ticker)}
          style={[estilos.chip, { borderColor: cores.primaria }]}
        >
          <Texto variante="legenda" negrito cor="primaria">
            {ticker}
          </Texto>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  lista: { gap: espaco.sm },
  chip: { borderWidth: 1, borderRadius: raio.pilula, paddingHorizontal: espaco.md, paddingVertical: espaco.xs },
});
```

`src/components/CampoData.tsx`:

```tsx
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { dataParaISOLocal, formatarData } from '@/utils/formatacao';

interface Props {
  rotulo: string;
  valor: Date;
  aoMudar: (data: Date) => void;
  maximo?: Date;
  erro?: string;
}

export function CampoData({ rotulo, valor, aoMudar, maximo, erro }: Props) {
  const { cores } = useTema();
  const texto = formatarData(dataParaISOLocal(valor));

  function abrirNoAndroid() {
    DateTimePickerAndroid.open({
      value: valor,
      mode: 'date',
      maximumDate: maximo,
      onValueChange: (_evento, data) => aoMudar(data),
    });
  }

  return (
    <View style={estilos.container}>
      <Texto variante="legenda" cor="secundario" negrito>
        {rotulo}
      </Texto>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={valor}
          mode="date"
          display="compact"
          locale="pt-BR"
          maximumDate={maximo}
          onValueChange={(_evento, data) => aoMudar(data)}
          style={estilos.seletorIos}
        />
      ) : (
        <Pressable
          role="button"
          aria-label={`${rotulo}: ${texto}`}
          onPress={abrirNoAndroid}
          style={[estilos.campo, { backgroundColor: cores.superficie, borderColor: erro ? cores.negativo : cores.borda }]}
        >
          <Texto>{texto}</Texto>
        </Pressable>
      )}
      {erro ? (
        <Texto variante="legenda" cor="negativo">
          {erro}
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { gap: espaco.xs },
  seletorIos: { alignSelf: 'flex-start' },
  campo: { minHeight: 48, borderWidth: 1, borderRadius: raio.md, paddingHorizontal: espaco.md, justifyContent: 'center' },
});
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx jest src/components/operacao.test.tsx`
Expected: PASS.

- [ ] **Step 9: Escrever o teste da tela de nova operação (falhando)**

`__tests__/telas/nova-operacao.test.tsx`:

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

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
// O seletor de data é nativo; a data padrão (hoje) é suficiente para estes testes.
jest.mock('@/components/CampoData', () => ({ CampoData: () => null }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn(), adicionar: jest.fn() } }));
jest.mock('@/api/portfolio', () => ({ portfolioApi: { registrarOperacao: jest.fn() } }));
jest.mock('@/api/ativos', () => ({ ativosApi: { cotacao: jest.fn() } }));

const NBSP = ' ';

function item(id: string, ticker: string): ItemWatchlist {
  return {
    ativo: { id, ticker, nome: ticker, tipo: 'ACAO', setor: null, moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-09-25T12:00:00Z',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(watchlistApi.listar).mockResolvedValue([item('a-1', 'PETR4')]);
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

it('valida os campos antes de enviar', async () => {
  const user = userEvent.setup();
  await renderizar(<NovaOperacao />);
  await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
  expect(await screen.findByText('Informe o ticker do ativo')).toBeOnTheScreen();
  expect(portfolioApi.registrarOperacao).not.toHaveBeenCalled();
});

it('ativo fora da watchlist é adicionado e a operação vai com decimais normalizados', async () => {
  const user = userEvent.setup();
  jest.mocked(watchlistApi.adicionar).mockResolvedValue(item('a-2', 'VALE3'));
  jest.mocked(portfolioApi.registrarOperacao).mockResolvedValue({ id: 'o-1' } as Operacao);
  await renderizar(<NovaOperacao />);
  await user.type(screen.getByLabelText('Ativo (ticker)'), 'vale3');
  await user.type(screen.getByLabelText('Quantidade'), '10,5');
  await user.type(screen.getByLabelText('Preço unitário'), '61,4');
  await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
  await waitFor(() => expect(router.back).toHaveBeenCalled());
  expect(watchlistApi.adicionar).toHaveBeenCalledWith('VALE3');
  expect(portfolioApi.registrarOperacao).toHaveBeenCalledWith({
    ativo_id: 'a-2',
    tipo: 'COMPRA',
    quantidade: '10.5',
    preco_unitario: '61.4',
    data: dataParaISOLocal(new Date()),
  });
});

it('atalho da watchlist e "usar cotação atual" preenchem ticker e preço', async () => {
  const user = userEvent.setup();
  await renderizar(<NovaOperacao />);
  await user.press(await screen.findByRole('button', { name: 'Usar PETR4' }));
  await user.press(await screen.findByRole('button', { name: `Usar cotação atual (R$${NBSP}38,20)` }));
  expect(screen.getByLabelText('Ativo (ticker)')).toHaveDisplayValue('PETR4');
  expect(screen.getByLabelText('Preço unitário')).toHaveDisplayValue('38,2');
});

it('venda sem saldo mostra frase legível em vez do UUID do backend', async () => {
  const user = userEvent.setup();
  jest.mocked(portfolioApi.registrarOperacao).mockRejectedValue(
    new ApiError(422, '3fa85f64-5717-4562-b3fc-2c963f66afa6'),
  );
  await renderizar(<NovaOperacao />);
  await user.press(screen.getByRole('radio', { name: 'Venda' }));
  await user.type(screen.getByLabelText('Ativo (ticker)'), 'PETR4');
  await user.type(screen.getByLabelText('Quantidade'), '100');
  await user.type(screen.getByLabelText('Preço unitário'), '38');
  await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Quantidade insuficiente em carteira para esta venda na data informada.',
  );
  expect(router.back).not.toHaveBeenCalled();
});
```

- [ ] **Step 10: Rodar e ver falhar**

Run: `npx jest __tests__/telas/nova-operacao.test.tsx`
Expected: FAIL — `Cannot find module '../../app/operacao/nova'`.

- [ ] **Step 11: Implementar a tela e ligar as rotas**

`app/operacao/nova.tsx`:

```tsx
import { router } from 'expo-router';
import { useState } from 'react';

import type { TipoOperacao } from '@/api/tipos';
import { Botao } from '@/components/Botao';
import { Campo } from '@/components/Campo';
import { CampoData } from '@/components/CampoData';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { SugestoesTicker } from '@/components/SugestoesTicker';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { type ErrosOperacao, mensagemErroOperacao, validarOperacao } from '@/dominio/operacao';
import { useCotacao } from '@/hooks/useAtivo';
import { useRegistrarOperacao } from '@/hooks/usePortfolio';
import { useResolverAtivo } from '@/hooks/useResolverAtivo';
import { useWatchlist } from '@/hooks/useWatchlist';
import { ehStatus } from '@/utils/erros';
import { formatarMoeda } from '@/utils/formatacao';

// Tipo da operação simulada que o próprio usuário registra (rótulos permitidos pela RN-01).
const TIPOS: readonly { valor: TipoOperacao; rotulo: string }[] = [
  { valor: 'COMPRA', rotulo: 'Compra' },
  { valor: 'VENDA', rotulo: 'Venda' },
];

export default function NovaOperacao() {
  const watchlist = useWatchlist();
  const resolver = useResolverAtivo();
  const registrar = useRegistrarOperacao();
  const [tipo, setTipo] = useState<TipoOperacao>('COMPRA');
  const [ticker, setTicker] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [precoUnitario, setPrecoUnitario] = useState('');
  const [data, setData] = useState(() => new Date());
  const [erros, setErros] = useState<ErrosOperacao>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  // Atalho de preço só para ativos já na watchlist: digitar um ticker não deve adicioná-lo.
  const tickerNormalizado = ticker.trim().toUpperCase();
  const itemConhecido = watchlist.data?.find((item) => item.ativo.ticker.toUpperCase() === tickerNormalizado);
  const cotacao = useCotacao(itemConhecido?.ativo.id);
  const precoAtual = cotacao.data?.preco;
  const enviando = resolver.isPending || registrar.isPending;

  async function aoRegistrar() {
    const resultado = validarOperacao({ tipo, ticker, quantidade, precoUnitario, data });
    if (!resultado.ok) {
      setErros(resultado.erros);
      return;
    }
    setErros({});
    setErroGeral(null);
    const { dados } = resultado;
    try {
      const { ativoId } = await resolver.mutateAsync(dados.ticker);
      await registrar.mutateAsync({
        ativo_id: ativoId,
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
      <SugestoesTicker tickers={watchlist.data?.map((item) => item.ativo.ticker) ?? []} aoEscolher={setTicker} />
      <Campo
        rotulo="Quantidade"
        valor={quantidade}
        aoMudar={setQuantidade}
        erro={erros.quantidade}
        keyboardType="decimal-pad"
        placeholder="Ex.: 100"
      />
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
          titulo={`Usar cotação atual (${formatarMoeda(precoAtual, itemConhecido?.ativo.moeda)})`}
          onPress={() => setPrecoUnitario(precoAtual.replace('.', ','))}
        />
      ) : null}
      <CampoData rotulo="Data da operação" valor={data} aoMudar={setData} maximo={new Date()} erro={erros.data} />
      {erroGeral ? (
        <Texto role="alert" cor="negativo">
          {erroGeral}
        </Texto>
      ) : null}
      <Botao titulo="Registrar operação" onPress={aoRegistrar} carregando={enviando} />
    </Tela>
  );
}
```

Em `app/_layout.tsx`, dentro de `<Stack.Protected guard={autenticado}>`, logo após a linha `<Stack.Screen name="ativo/[id]" options={{ title: 'Ativo' }} />`, acrescente:

```tsx
                <Stack.Screen name="operacao/nova" options={{ title: 'Nova operação', presentation: 'modal' }} />
```

Em `app/(tabs)/portfolio.tsx`, use a mensagem específica no 422 da remoção. Troque o import

```tsx
import { ehStatus, mensagemDeErro } from '@/utils/erros';
```

por

```tsx
import { ehStatus } from '@/utils/erros';
```

acrescente, junto aos imports de `@/dominio/...`,

```tsx
import { mensagemErroOperacao } from '@/dominio/operacao';
```

e troque

```tsx
            onError: (erro) => Alert.alert('Não foi possível remover', mensagemDeErro(erro)),
```

por

```tsx
            onError: (erro) => Alert.alert('Não foi possível remover', mensagemErroOperacao(erro, 'remover')),
```

- [ ] **Step 12: Rodar e ver passar**

Run: `npx jest __tests__/telas src/components src/dominio`
Expected: PASS.

- [ ] **Step 13: Verificação completa**

Run: `npm run verificar`
Expected: tudo verde (o lint pega import esquecido em `portfolio.tsx`).

- [ ] **Step 14: Commit**

```bash
git add app src/components src/dominio __tests__/telas/nova-operacao.test.tsx
git commit -m "feat: adiciona registro de operação simulada com resolução de ativo e mensagens de saldo

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Alertas de preço

**Files:**
- Create: `src/dominio/alerta.ts`
- Create: `src/components/ItemAlerta.tsx`
- Create: `app/(tabs)/alertas.tsx`
- Modify: `app/(tabs)/_layout.tsx` (substituição completa: aba Alertas)
- Test: `src/dominio/alerta.test.ts`, `src/components/alerta.test.tsx`, `__tests__/telas/alertas.test.tsx`

**Interfaces:**
- Consumes: `useAlertas`, `useCriarAlerta`, `useAtualizarAlerta`, `useRemoverAlerta` (Task 8); componentes base (Task 5); `BotaoCabecalho` (Task 10); `ehStatus`, `mensagemDeErro` (Task 3); `formatarMoeda`, `formatarDataHora`, `normalizarDecimal` (Task 2).
- Produces:
  - `ROTULO_CONDICAO: Record<TipoCondicaoAlerta, string>` (`'Preço ≥' | 'Preço ≤'`); `descreverCondicao(tipo, valorAlvo: Decimal, moeda: string): string`.
  - `interface FormAlerta { ticker: string; tipoCondicao: TipoCondicaoAlerta; valorAlvo: string }`; `type ErrosAlerta = Partial<Record<'ticker' | 'valorAlvo', string>>`; `validarAlerta(form): { ok: true; dados: CriarAlertaRequest } | { ok: false; erros: ErrosAlerta }`.
  - `ItemAlerta({ alerta: Alerta, aoAlternar: (habilitado: boolean) => void, aoRemover: () => void, ocupado: boolean })` — `Switch` com nome `"Alerta de {ticker} habilitado"`.

- [ ] **Step 1: Escrever o teste do domínio de alertas (falhando)**

`src/dominio/alerta.test.ts`:

```ts
import { descreverCondicao, validarAlerta } from '@/dominio/alerta';

const NBSP = ' ';

it('descreve a condição com a moeda do alerta', () => {
  expect(descreverCondicao('PRECO_MAIOR_IGUAL', '40', 'BRL')).toBe(`Preço ≥ R$${NBSP}40,00`);
  expect(descreverCondicao('PRECO_MENOR_IGUAL', '10.5', 'USD')).toBe(`Preço ≤ US$${NBSP}10,50`);
});

describe('validarAlerta', () => {
  it('normaliza ticker e valor', () => {
    expect(validarAlerta({ ticker: ' vale3 ', tipoCondicao: 'PRECO_MENOR_IGUAL', valorAlvo: '61,5' })).toEqual({
      ok: true,
      dados: { ticker: 'VALE3', tipo_condicao: 'PRECO_MENOR_IGUAL', valor_alvo: '61.5' },
    });
  });

  it('exige ticker e valor maior que zero', () => {
    expect(validarAlerta({ ticker: '', tipoCondicao: 'PRECO_MAIOR_IGUAL', valorAlvo: '0' })).toEqual({
      ok: false,
      erros: { ticker: 'Informe o ticker do ativo', valorAlvo: 'Informe um valor maior que zero' },
    });
  });

  it('limita o ticker a 20 caracteres (regra do backend)', () => {
    const resultado = validarAlerta({ ticker: 'A'.repeat(21), tipoCondicao: 'PRECO_MAIOR_IGUAL', valorAlvo: '1' });
    expect(resultado).toEqual({ ok: false, erros: { ticker: 'Use no máximo 20 caracteres' } });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/dominio/alerta.test.ts`
Expected: FAIL — `Cannot find module '@/dominio/alerta'`.

- [ ] **Step 3: Implementar**

`src/dominio/alerta.ts`:

```ts
import type { CriarAlertaRequest, Decimal, TipoCondicaoAlerta } from '@/api/tipos';
import { formatarMoeda, normalizarDecimal } from '@/utils/formatacao';

export const ROTULO_CONDICAO: Record<TipoCondicaoAlerta, string> = {
  PRECO_MAIOR_IGUAL: 'Preço ≥',
  PRECO_MENOR_IGUAL: 'Preço ≤',
};

export function descreverCondicao(tipo: TipoCondicaoAlerta, valorAlvo: Decimal, moeda: string): string {
  return `${ROTULO_CONDICAO[tipo]} ${formatarMoeda(valorAlvo, moeda)}`;
}

export interface FormAlerta {
  ticker: string;
  tipoCondicao: TipoCondicaoAlerta;
  valorAlvo: string;
}

export type ErrosAlerta = Partial<Record<'ticker' | 'valorAlvo', string>>;

export type ResultadoValidacaoAlerta = { ok: true; dados: CriarAlertaRequest } | { ok: false; erros: ErrosAlerta };

// Mesmo limite do CriarAlertaRequest do backend.
const TICKER_MAXIMO = 20;

export function validarAlerta(form: FormAlerta): ResultadoValidacaoAlerta {
  const erros: ErrosAlerta = {};
  const ticker = form.ticker.trim().toUpperCase();
  if (!ticker) erros.ticker = 'Informe o ticker do ativo';
  else if (ticker.length > TICKER_MAXIMO) erros.ticker = 'Use no máximo 20 caracteres';

  const valor = normalizarDecimal(form.valorAlvo);
  if (valor === null || Number(valor) <= 0) erros.valorAlvo = 'Informe um valor maior que zero';

  if (erros.ticker || erros.valorAlvo || valor === null) return { ok: false, erros };
  return { ok: true, dados: { ticker, tipo_condicao: form.tipoCondicao, valor_alvo: valor } };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/dominio/alerta.test.ts`
Expected: PASS.

- [ ] **Step 5: Escrever o teste do item de alerta (falhando)**

`src/components/alerta.test.tsx`:

```tsx
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import type { Alerta } from '@/api/tipos';
import { ItemAlerta } from '@/components/ItemAlerta';

const NBSP = ' ';

const alerta: Alerta = {
  id: 'al-1',
  ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: null, moeda: 'BRL' },
  tipo_condicao: 'PRECO_MAIOR_IGUAL',
  valor_alvo: '40',
  moeda_alvo: 'BRL',
  habilitado: true,
  ultimo_estado: true,
  disparado_em: '2026-09-25T15:30:00Z',
  criado_em: '2026-09-20T12:00:00Z',
  atualizado_em: '2026-09-25T15:30:00Z',
};

it('mostra ticker, condição e quando disparou', async () => {
  await render(<ItemAlerta alerta={alerta} aoAlternar={jest.fn()} aoRemover={jest.fn()} ocupado={false} />);
  expect(screen.getByText('PETR4')).toBeOnTheScreen();
  expect(screen.getByText(`Preço ≥ R$${NBSP}40,00`)).toBeOnTheScreen();
  expect(screen.getByText('Disparado em 25/09/2026 12:30')).toBeOnTheScreen();
});

it('o switch reflete e alterna o estado', async () => {
  const aoAlternar = jest.fn();
  await render(<ItemAlerta alerta={alerta} aoAlternar={aoAlternar} aoRemover={jest.fn()} ocupado={false} />);
  const chave = screen.getByRole('switch', { name: 'Alerta de PETR4 habilitado' });
  expect(chave).toBeChecked();
  await fireEvent(chave, 'valueChange', false);
  expect(aoAlternar).toHaveBeenCalledWith(false);
});

it('botão de remover chama aoRemover', async () => {
  const user = userEvent.setup();
  const aoRemover = jest.fn();
  await render(<ItemAlerta alerta={alerta} aoAlternar={jest.fn()} aoRemover={aoRemover} ocupado={false} />);
  await user.press(screen.getByRole('button', { name: 'Remover alerta de PETR4' }));
  expect(aoRemover).toHaveBeenCalled();
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx jest src/components/alerta.test.tsx`
Expected: FAIL — `Cannot find module '@/components/ItemAlerta'`.

- [ ] **Step 7: Implementar o componente**

`src/components/ItemAlerta.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import type { Alerta } from '@/api/tipos';
import { Texto } from '@/components/Texto';
import { descreverCondicao } from '@/dominio/alerta';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { formatarDataHora } from '@/utils/formatacao';

interface Props {
  alerta: Alerta;
  aoAlternar: (habilitado: boolean) => void;
  aoRemover: () => void;
  ocupado: boolean;
}

export function ItemAlerta({ alerta, aoAlternar, aoRemover, ocupado }: Props) {
  const { cores } = useTema();
  const ticker = alerta.ativo.ticker;
  return (
    <View style={[estilos.item, { backgroundColor: cores.superficie, borderColor: cores.borda }]}>
      <View style={estilos.textos}>
        <Texto negrito>{ticker}</Texto>
        <Texto>{descreverCondicao(alerta.tipo_condicao, alerta.valor_alvo, alerta.moeda_alvo)}</Texto>
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
        trackColor={{ true: cores.primaria, false: cores.borda }}
      />
      <Pressable
        role="button"
        aria-label={`Remover alerta de ${ticker}`}
        aria-disabled={ocupado}
        disabled={ocupado}
        onPress={aoRemover}
        hitSlop={8}
      >
        <Ionicons name="trash-outline" size={20} color={cores.negativo} />
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

- [ ] **Step 8: Rodar e ver passar**

Run: `npx jest src/components/alerta.test.tsx`
Expected: PASS.

- [ ] **Step 9: Escrever o teste da tela de alertas (falhando)**

`__tests__/telas/alertas.test.tsx`:

```tsx
import { fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';

import { alertasApi } from '@/api/alertas';
import { ApiError } from '@/api/client';
import type { Alerta } from '@/api/tipos';
import { renderizar } from '@/test/renderizar';

import Alertas from '../../app/(tabs)/alertas';

jest.mock('@/api/alertas', () => ({
  alertasApi: { listar: jest.fn(), criar: jest.fn(), atualizar: jest.fn(), remover: jest.fn() },
}));

const alerta: Alerta = {
  id: 'al-1',
  ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: null, moeda: 'BRL' },
  tipo_condicao: 'PRECO_MAIOR_IGUAL',
  valor_alvo: '40',
  moeda_alvo: 'BRL',
  habilitado: true,
  ultimo_estado: false,
  disparado_em: null,
  criado_em: '2026-09-20T12:00:00Z',
  atualizado_em: '2026-09-20T12:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(alertasApi.listar).mockResolvedValue([]);
});

it('lista vazia mostra estado vazio', async () => {
  await renderizar(<Alertas />);
  expect(await screen.findByText('Nenhum alerta cadastrado.')).toBeOnTheScreen();
});

it('cria alerta com ticker normalizado e limpa o formulário', async () => {
  const user = userEvent.setup();
  jest.mocked(alertasApi.criar).mockResolvedValue(alerta);
  await renderizar(<Alertas />);
  await user.type(screen.getByLabelText('Ticker'), ' vale3');
  await user.press(screen.getByRole('radio', { name: 'Preço ≤' }));
  await user.type(screen.getByLabelText('Valor alvo'), '61,5');
  await user.press(screen.getByRole('button', { name: 'Criar alerta' }));
  await waitFor(() =>
    expect(alertasApi.criar).toHaveBeenCalledWith({ ticker: 'VALE3', tipo_condicao: 'PRECO_MENOR_IGUAL', valor_alvo: '61.5' }),
  );
  await waitFor(() => expect(screen.getByLabelText('Ticker')).toHaveDisplayValue(''));
});

it('ticker inexistente marca o campo', async () => {
  const user = userEvent.setup();
  jest.mocked(alertasApi.criar).mockRejectedValue(new ApiError(404, 'Ativo nao encontrado'));
  await renderizar(<Alertas />);
  await user.type(screen.getByLabelText('Ticker'), 'XPTO9');
  await user.type(screen.getByLabelText('Valor alvo'), '10');
  await user.press(screen.getByRole('button', { name: 'Criar alerta' }));
  expect(await screen.findByText('Ativo não encontrado')).toBeOnTheScreen();
});

it('alternar o switch desabilita o alerta no backend', async () => {
  jest.mocked(alertasApi.listar).mockResolvedValue([alerta]);
  jest.mocked(alertasApi.atualizar).mockResolvedValue({ ...alerta, habilitado: false });
  await renderizar(<Alertas />);
  await fireEvent(await screen.findByRole('switch', { name: 'Alerta de PETR4 habilitado' }), 'valueChange', false);
  expect(alertasApi.atualizar).toHaveBeenCalledWith('al-1', { ativo: false });
});
```

- [ ] **Step 10: Rodar e ver falhar**

Run: `npx jest __tests__/telas/alertas.test.tsx`
Expected: FAIL — `Cannot find module '../../app/(tabs)/alertas'`.

- [ ] **Step 11: Implementar a tela e a aba**

`app/(tabs)/alertas.tsx`:

```tsx
import { useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import type { Alerta, TipoCondicaoAlerta } from '@/api/tipos';
import { Botao } from '@/components/Botao';
import { Campo } from '@/components/Campo';
import { Card } from '@/components/Card';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { ItemAlerta } from '@/components/ItemAlerta';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { Texto } from '@/components/Texto';
import { type ErrosAlerta, ROTULO_CONDICAO, validarAlerta } from '@/dominio/alerta';
import { useAlertas, useAtualizarAlerta, useCriarAlerta, useRemoverAlerta } from '@/hooks/useAlertas';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { ehStatus, mensagemDeErro } from '@/utils/erros';

const CONDICOES: readonly { valor: TipoCondicaoAlerta; rotulo: string }[] = [
  { valor: 'PRECO_MAIOR_IGUAL', rotulo: ROTULO_CONDICAO.PRECO_MAIOR_IGUAL },
  { valor: 'PRECO_MENOR_IGUAL', rotulo: ROTULO_CONDICAO.PRECO_MENOR_IGUAL },
];

function FormNovoAlerta() {
  const criar = useCriarAlerta();
  const [ticker, setTicker] = useState('');
  const [tipoCondicao, setTipoCondicao] = useState<TipoCondicaoAlerta>('PRECO_MAIOR_IGUAL');
  const [valorAlvo, setValorAlvo] = useState('');
  const [erros, setErros] = useState<ErrosAlerta>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  async function aoCriar() {
    const resultado = validarAlerta({ ticker, tipoCondicao, valorAlvo });
    if (!resultado.ok) {
      setErros(resultado.erros);
      return;
    }
    setErros({});
    setErroGeral(null);
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
    <Card titulo="Novo alerta de preço">
      <Campo rotulo="Ticker" valor={ticker} aoMudar={setTicker} erro={erros.ticker} autoCapitalize="characters" placeholder="Ex.: PETR4" />
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

export default function Alertas() {
  const { cores } = useTema();
  const alertas = useAlertas();
  const atualizar = useAtualizarAlerta();
  const remover = useRemoverAlerta();

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
        <RefreshControl refreshing={alertas.isRefetching} onRefresh={() => void alertas.refetch()} tintColor={cores.primaria} />
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
      renderItem={({ item }) => (
        <ItemAlerta
          alerta={item}
          ocupado={
            (atualizar.isPending && atualizar.variables?.id === item.id) ||
            (remover.isPending && remover.variables === item.id)
          }
          aoAlternar={(habilitado) => alternar(item, habilitado)}
          aoRemover={() => confirmarRemocao(item)}
        />
      )}
    />
  );
}

const estilos = StyleSheet.create({
  lista: { padding: espaco.lg, gap: espaco.md, flexGrow: 1 },
  cabecalho: { gap: espaco.lg },
});
```

`app/(tabs)/_layout.tsx` (substituição completa):

```tsx
import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';

import { BotaoCabecalho } from '@/components/BotaoCabecalho';
import { useTema } from '@/theme/useTema';

export default function TabsLayout() {
  const { cores } = useTema();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: cores.primaria, tabBarInactiveTintColor: cores.textoSecundario }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Watchlist',
          tabBarIcon: ({ color, size }) => <Ionicons name="eye-outline" color={color} size={size} />,
          headerRight: () => <BotaoCabecalho icone="add" rotulo="Buscar ativo" onPress={() => router.push('/buscar')} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfólio',
          tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="alertas"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color, size }) => <Ionicons name="alarm-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 12: Rodar e ver passar**

Run: `npx jest __tests__/telas src/components src/dominio`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add app src/components/ItemAlerta.tsx src/components/alerta.test.tsx src/dominio/alerta.ts src/dominio/alerta.test.ts __tests__/telas/alertas.test.tsx
git commit -m "feat: adiciona alertas de preço com criação, ativação e remoção

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Perfil, notificações e chat de IA (em breve)

**Files:**
- Modify: `src/dominio/rotulos.ts` (acrescentar `ROTULO_TIPO_NOTIFICACAO`)
- Create: `src/components/ItemNotificacao.tsx`
- Create: `app/(tabs)/perfil.tsx`, `app/chat.tsx`
- Modify: `app/(tabs)/_layout.tsx` (substituição completa: aba Perfil com badge e atalho do chat)
- Modify: `app/_layout.tsx` (registrar a rota `chat`)
- Test: `src/components/notificacao.test.tsx`, `__tests__/telas/perfil.test.tsx`, `__tests__/telas/chat.test.tsx`

**Interfaces:**
- Consumes: `useNotificacoes`, `useNaoLidas`, `useMarcarLida`, `useWatchlist` (Task 8); `useSessao` (Task 4); `mapaAtivos` (Task 12); `AvisoIA` (Task 6); componentes base (Task 5); `BotaoCabecalho` (Task 10); `formatarDataHora` (Task 2).
- Produces:
  - `ROTULO_TIPO_NOTIFICACAO: Record<TipoNotificacao, string>` (`'Sinal técnico' | 'Alerta de preço'`).
  - `ItemNotificacao({ notificacao: Notificacao, ticker: string | null, aoPressionar })` — botão com nome `"{Não lida. }{título}. {mensagem}"`, onde título é `"{tipo} · {ticker}"` ou só o tipo.
  - Rotas `/perfil` (aba) e `/chat`.

- [ ] **Step 1: Escrever o teste do item de notificação (falhando)**

`src/components/notificacao.test.tsx`:

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';

import type { Notificacao } from '@/api/tipos';
import { ItemNotificacao } from '@/components/ItemNotificacao';

const notificacao: Notificacao = {
  id: 'n-1',
  ativo_id: 'a-1',
  tipo: 'SINAL_ATIVADO',
  mensagem: 'Sobrevenda RSI ativado em PETR4',
  lida: false,
  criado_em: '2026-09-25T15:30:00Z',
};

it('não lida anuncia o estado e mostra tipo, ticker e data', async () => {
  await render(<ItemNotificacao notificacao={notificacao} ticker="PETR4" aoPressionar={jest.fn()} />);
  expect(
    screen.getByRole('button', { name: 'Não lida. Sinal técnico · PETR4. Sobrevenda RSI ativado em PETR4' }),
  ).toBeOnTheScreen();
  expect(screen.getByText('25/09/2026 12:30')).toBeOnTheScreen();
});

it('lida e sem ticker conhecido mostra só o tipo', async () => {
  const user = userEvent.setup();
  const aoPressionar = jest.fn();
  await render(
    <ItemNotificacao
      notificacao={{ ...notificacao, tipo: 'ALERTA_DISPARADO', lida: true }}
      ticker={null}
      aoPressionar={aoPressionar}
    />,
  );
  await user.press(screen.getByRole('button', { name: 'Alerta de preço. Sobrevenda RSI ativado em PETR4' }));
  expect(aoPressionar).toHaveBeenCalled();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/components/notificacao.test.tsx`
Expected: FAIL — `Cannot find module '@/components/ItemNotificacao'`.

- [ ] **Step 3: Implementar rótulo e componente**

Acrescente ao final de `src/dominio/rotulos.ts` e inclua `TipoNotificacao` no `import type` do topo do arquivo (que passa a ser `import type { TipoAtivo, TipoNotificacao } from '@/api/tipos';`):

```ts

export const ROTULO_TIPO_NOTIFICACAO: Record<TipoNotificacao, string> = {
  SINAL_ATIVADO: 'Sinal técnico',
  ALERTA_DISPARADO: 'Alerta de preço',
};
```

`src/components/ItemNotificacao.tsx`:

```tsx
import { Pressable, StyleSheet, View } from 'react-native';

import type { Notificacao } from '@/api/tipos';
import { Texto } from '@/components/Texto';
import { ROTULO_TIPO_NOTIFICACAO } from '@/dominio/rotulos';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { formatarDataHora } from '@/utils/formatacao';

interface Props {
  notificacao: Notificacao;
  ticker: string | null;
  aoPressionar: () => void;
}

export function ItemNotificacao({ notificacao, ticker, aoPressionar }: Props) {
  const { cores } = useTema();
  const tipo = ROTULO_TIPO_NOTIFICACAO[notificacao.tipo];
  const titulo = ticker ? `${tipo} · ${ticker}` : tipo;
  const naoLida = !notificacao.lida;

  return (
    <Pressable
      role="button"
      aria-label={`${naoLida ? 'Não lida. ' : ''}${titulo}. ${notificacao.mensagem}`}
      onPress={aoPressionar}
      style={({ pressed }) => [
        estilos.item,
        {
          backgroundColor: cores.superficie,
          borderColor: naoLida ? cores.primaria : cores.borda,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={estilos.cabecalho}>
        {naoLida ? <View style={[estilos.ponto, { backgroundColor: cores.primaria }]} /> : null}
        <Texto variante="legenda" cor="secundario" negrito={naoLida}>
          {titulo}
        </Texto>
      </View>
      <Texto negrito={naoLida}>{notificacao.mensagem}</Texto>
      <Texto variante="legenda" cor="secundario">
        {formatarDataHora(notificacao.criado_em)}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  item: { padding: espaco.lg, gap: espaco.xs, borderWidth: 1, borderRadius: raio.lg },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  ponto: { width: 8, height: 8, borderRadius: 4 },
});
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/components/notificacao.test.tsx`
Expected: PASS.

- [ ] **Step 5: Escrever os testes das telas de perfil e chat (falhando)**

`__tests__/telas/perfil.test.tsx`:

```tsx
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { notificacoesApi } from '@/api/notificacoes';
import type { Notificacao } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { useSessao } from '@/store/sessao';
import { renderizar } from '@/test/renderizar';

import Perfil from '../../app/(tabs)/perfil';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn() } }));

const naoLida: Notificacao = {
  id: 'n-1',
  ativo_id: 'a-1',
  tipo: 'SINAL_ATIVADO',
  mensagem: 'Sobrevenda RSI ativado em PETR4',
  lida: false,
  criado_em: '2026-09-25T15:30:00Z',
};
const lidaDeAtivoRemovido: Notificacao = {
  id: 'n-2',
  ativo_id: 'a-9',
  tipo: 'ALERTA_DISPARADO',
  mensagem: 'Preço atingiu o alvo',
  lida: true,
  criado_em: '2026-09-24T15:30:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  useSessao.setState({ status: 'autenticado', token: 'tok', email: 'ana@exemplo.com' });
  jest.mocked(watchlistApi.listar).mockResolvedValue([
    {
      ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: null, moeda: 'BRL' },
      notificar: true,
      adicionado_em: '2026-09-20T12:00:00Z',
    },
  ]);
  jest.mocked(notificacoesApi.listar).mockResolvedValue([naoLida, lidaDeAtivoRemovido]);
  jest.mocked(notificacoesApi.marcarComoLida).mockResolvedValue({ ...naoLida, lida: true });
});

it('mostra o e-mail e as notificações, com ticker quando conhecido', async () => {
  await renderizar(<Perfil />);
  expect(await screen.findByText('ana@exemplo.com')).toBeOnTheScreen();
  expect(await screen.findByText('Sinal técnico · PETR4')).toBeOnTheScreen();
  expect(screen.getByText('Alerta de preço')).toBeOnTheScreen();
});

it('tocar numa não lida marca como lida e abre o ativo', async () => {
  const user = userEvent.setup();
  await renderizar(<Perfil />);
  await user.press(
    await screen.findByRole('button', { name: 'Não lida. Sinal técnico · PETR4. Sobrevenda RSI ativado em PETR4' }),
  );
  await waitFor(() => expect(notificacoesApi.marcarComoLida).toHaveBeenCalledWith('n-1'));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1', ticker: 'PETR4' } });
});

it('sair pede confirmação e encerra a sessão', async () => {
  const user = userEvent.setup();
  jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensagem, botoes) => {
    botoes?.find((botao) => botao.style === 'destructive')?.onPress?.();
  });
  await renderizar(<Perfil />);
  await user.press(await screen.findByRole('button', { name: 'Sair' }));
  await waitFor(() => expect(useSessao.getState().status).toBe('anonimo'));
});
```

`__tests__/telas/chat.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';

import { AVISO_IA } from '@/dominio/regulatorio';

import Chat from '../../app/chat';

it('chat mostra o aviso de IA (RN-05) e fica desabilitado até a IA existir', async () => {
  await render(<Chat />);
  expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
  expect(screen.getByText('O chat com IA estará disponível em breve.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx jest __tests__/telas/perfil.test.tsx __tests__/telas/chat.test.tsx`
Expected: FAIL — `Cannot find module '../../app/(tabs)/perfil'`.

- [ ] **Step 7: Implementar as telas e o layout final das abas**

`app/(tabs)/perfil.tsx`:

```tsx
import { router } from 'expo-router';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import type { Notificacao } from '@/api/tipos';
import { Botao } from '@/components/Botao';
import { Card } from '@/components/Card';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { ItemNotificacao } from '@/components/ItemNotificacao';
import { Texto } from '@/components/Texto';
import { mapaAtivos } from '@/dominio/portfolio';
import { useMarcarLida, useNotificacoes } from '@/hooks/useNotificacoes';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useSessao } from '@/store/sessao';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

export default function Perfil() {
  const { cores } = useTema();
  const email = useSessao((estado) => estado.email);
  const sair = useSessao((estado) => estado.sair);
  const notificacoes = useNotificacoes();
  const watchlist = useWatchlist();
  const marcarLida = useMarcarLida();
  const ativos = mapaAtivos(undefined, watchlist.data);

  function abrir(notificacao: Notificacao) {
    if (!notificacao.lida) marcarLida.mutate(notificacao.id);
    const ticker = ativos.get(notificacao.ativo_id)?.ticker;
    router.push({
      pathname: '/ativo/[id]',
      params: ticker ? { id: notificacao.ativo_id, ticker } : { id: notificacao.ativo_id },
    });
  }

  function confirmarSaida() {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void sair() },
    ]);
  }

  function listaVazia() {
    if (notificacoes.isPending) return <Carregando />;
    if (notificacoes.isError) {
      return <ErroComRetry erro={notificacoes.error} aoTentarNovamente={() => void notificacoes.refetch()} />;
    }
    return <EstadoVazio mensagem="Nenhuma notificação por enquanto." />;
  }

  return (
    <FlatList
      style={{ backgroundColor: cores.fundo }}
      contentContainerStyle={estilos.lista}
      data={notificacoes.data ?? []}
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
          <Card>
            <Texto cor="secundario">Conectado como</Texto>
            <Texto negrito>{email ?? '—'}</Texto>
          </Card>
          <Texto variante="subtitulo" role="heading">
            Notificações
          </Texto>
        </View>
      }
      ListEmptyComponent={listaVazia()}
      ListFooterComponent={
        <View style={estilos.rodape}>
          <Botao titulo="Sair" variante="perigo" onPress={confirmarSaida} />
          <Texto variante="legenda" cor="secundario" style={estilos.aviso}>
            Ferramenta educacional de análise. Não constitui recomendação de investimento.
          </Texto>
        </View>
      }
      renderItem={({ item }) => (
        <ItemNotificacao
          notificacao={item}
          ticker={ativos.get(item.ativo_id)?.ticker ?? null}
          aoPressionar={() => abrir(item)}
        />
      )}
    />
  );
}

const estilos = StyleSheet.create({
  lista: { padding: espaco.lg, gap: espaco.md, flexGrow: 1 },
  cabecalho: { gap: espaco.lg },
  rodape: { gap: espaco.md, marginTop: espaco.xl },
  aviso: { textAlign: 'center' },
});
```

`app/chat.tsx`:

```tsx
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvisoIA } from '@/components/AvisoIA';
import { Botao } from '@/components/Botao';
import { Texto } from '@/components/Texto';
import { espaco, fonte, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

// O backend ainda não expõe o chat (RF-15); a tela já nasce com o aviso legal fixo (RN-05).
export default function Chat() {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  return (
    <View style={[estilos.tela, { backgroundColor: cores.fundo }]}>
      <ScrollView contentContainerStyle={estilos.conversa}>
        <View style={[estilos.balao, { backgroundColor: cores.superficie, borderColor: cores.borda }]}>
          <Texto negrito>Assistente InsightFlow</Texto>
          <Texto>O chat com IA estará disponível em breve.</Texto>
          <Texto cor="secundario">
            Você poderá fazer perguntas como “qual ativo da carteira teve o melhor desempenho no mês?”, com respostas
            baseadas nos dados reais da sua carteira simulada.
          </Texto>
        </View>
      </ScrollView>
      <View
        style={[
          estilos.rodape,
          { borderColor: cores.borda, backgroundColor: cores.superficie, paddingBottom: espaco.md + insets.bottom },
        ]}
      >
        <AvisoIA />
        <View style={estilos.entrada}>
          <TextInput
            aria-label="Mensagem para a IA"
            editable={false}
            placeholder="Disponível em breve"
            placeholderTextColor={cores.textoSecundario}
            style={[estilos.campo, { color: cores.texto, borderColor: cores.borda, backgroundColor: cores.fundo }]}
          />
          <Botao titulo="Enviar" onPress={() => undefined} desabilitado />
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conversa: { padding: espaco.lg, gap: espaco.md },
  balao: { borderWidth: 1, borderRadius: raio.lg, padding: espaco.lg, gap: espaco.sm, maxWidth: '90%' },
  rodape: { borderTopWidth: StyleSheet.hairlineWidth, padding: espaco.md, gap: espaco.sm },
  entrada: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  campo: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    fontSize: fonte.corpo,
  },
});
```

`app/(tabs)/_layout.tsx` (substituição completa — versão final):

```tsx
import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';

import { BotaoCabecalho } from '@/components/BotaoCabecalho';
import { useNaoLidas } from '@/hooks/useNotificacoes';
import { useTema } from '@/theme/useTema';

export default function TabsLayout() {
  const { cores } = useTema();
  // Montar as abas liga o polling de notificações (só acontece com sessão ativa).
  const naoLidas = useNaoLidas();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: cores.primaria, tabBarInactiveTintColor: cores.textoSecundario }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Watchlist',
          tabBarIcon: ({ color, size }) => <Ionicons name="eye-outline" color={color} size={size} />,
          headerRight: () => <BotaoCabecalho icone="add" rotulo="Buscar ativo" onPress={() => router.push('/buscar')} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfólio',
          tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart-outline" color={color} size={size} />,
          headerRight: () => (
            <BotaoCabecalho icone="chatbubbles-outline" rotulo="Perguntar à IA" onPress={() => router.push('/chat')} />
          ),
        }}
      />
      <Tabs.Screen
        name="alertas"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color, size }) => <Ionicons name="alarm-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} />,
          tabBarBadge: naoLidas > 0 ? naoLidas : undefined,
        }}
      />
    </Tabs>
  );
}
```

Em `app/_layout.tsx`, dentro de `<Stack.Protected guard={autenticado}>`, logo após a linha `<Stack.Screen name="operacao/nova" options={{ title: 'Nova operação', presentation: 'modal' }} />`, acrescente:

```tsx
                <Stack.Screen name="chat" options={{ title: 'Perguntar à IA' }} />
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx jest`
Expected: PASS (suíte inteira).

- [ ] **Step 9: Verificação completa e bundle**

```bash
npm run verificar
npx expo export --platform android --output-dir dist
rm -rf dist
```

Expected: tudo verde e bundle gerado.

- [ ] **Step 10: Commit**

```bash
git add app src/components src/dominio/rotulos.ts __tests__/telas
git commit -m "feat: adiciona perfil com notificações, badge de não lidas e chat de IA em breve

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: README, verificação final e Pull Request

**Files:**
- Modify: `README.md` (substituição completa)

**Interfaces:**
- Consumes: o app completo (Tasks 1–15).
- Produces: README com instruções de execução; branches `main`, `develop` e `feature/app-mobile-mvp` no GitHub; PR `feature/app-mobile-mvp` → `develop`.

- [ ] **Step 1: Reescrever o README**

`README.md`:

````md
# Insight Flow — Mobile

Cliente mobile (Android e iOS) do Sistema de Análise de Ativos do Mercado Financeiro. Consome exclusivamente a API REST do [backend](https://github.com/InsightF-AI/Insight-flow-backend).

> Ferramenta de análise e apoio à decisão, com caráter educacional. Não constitui recomendação de investimento.

## Funcionalidades

- Cadastro e login (token JWT guardado no SecureStore; token vencido volta ao login)
- Watchlist com cotação e variação do dia, e busca de ativos
- Detalhe do ativo: gráfico de fechamento (1D a 5A), indicadores técnicos (SMA 20/50/200, RSI 14, MACD 12/26/9, Bollinger 20/2, volume relativo) e sinais ativos com o histórico da condição nos últimos 24 meses
- Alertas de preço (criar, ativar/desativar, remover)
- Notificações in-app, atualizadas a cada 60 s com o app aberto
- Portfólio simulado: rentabilidade, comparação com CDI e Ibovespa, distribuição por classe, setor e moeda, posições e histórico de operações
- Telas de IA (análise do ativo e chat) prontas com o aviso legal, aguardando os endpoints de IA do backend
- Tema claro e escuro, seguindo o sistema

## Stack

Expo SDK 57 (React Native 0.86, TypeScript), Expo Router, TanStack Query, Zustand, expo-secure-store, Victory Native (Skia), Jest + React Native Testing Library.

## Como rodar

1. Suba o backend: no repositório do backend, `docker compose up` (API em `http://localhost:8000`).
2. Instale as dependências deste projeto (Node `^20.19.4`, `^22.13`, `^24.3` ou `>= 25`):

   ```bash
   npm install
   ```

3. Copie `.env.example` para `.env` e ajuste `EXPO_PUBLIC_API_URL`:

   | Onde o app roda | Valor |
   |---|---|
   | Celular físico com Expo Go (mesma rede Wi-Fi do PC) | `http://<IP-do-PC>:8000` |
   | Emulador Android | `http://10.0.2.2:8000` |
   | Simulador iOS (macOS) | `http://localhost:8000` |

   No celular físico, libere a porta 8000 no firewall do Windows.

4. Inicie o Metro e abra no Expo Go (SDK 57) pelo QR code, ou pressione `a` para o emulador Android:

   ```bash
   npx expo start
   ```

Sem `BRAPI_API_KEY` no backend, só `PETR4`, `MGLU3`, `VALE3` e `ITUB4` têm cotação e histórico. A busca funciona para qualquer ticker.

## Scripts

| Comando | O que faz |
|---|---|
| `npm start` | Inicia o Metro (Expo) |
| `npm run lint` | ESLint (`eslint-config-expo`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Testes (Jest + RNTL) |
| `npm run verificar` | Lint + typecheck + testes (o mesmo do CI) |

## Estrutura

```
app/              rotas do Expo Router (telas)
src/api/          client HTTP e tipos da API (sem React Native)
src/hooks/        hooks TanStack Query e chaves de cache
src/store/        sessão (Zustand + SecureStore)
src/dominio/      regras puras (validações, indicadores, portfólio)
src/components/   componentes de apresentação
src/theme/        tokens de cor, espaçamento e tipografia
__tests__/telas/  testes de tela
```

Design completo: [`docs/superpowers/specs/2026-09-25-app-mobile-mvp-design.md`](docs/superpowers/specs/2026-09-25-app-mobile-mvp-design.md).

## Fora do escopo desta versão

- Push nativo (precisa de endpoint de token no backend e de development build via EAS)
- Endpoints de IA, refresh token e recuperação de senha (ainda não existem no backend)
- Gráfico de candles
````

- [ ] **Step 2: Verificação final completa**

```bash
npm run verificar
npx expo-doctor
npx expo install --check
npx expo export --platform android --output-dir dist
npx expo export --platform ios --output-dir dist
rm -rf dist
```

Expected: lint e typecheck sem erros; todos os testes passando; `expo-doctor` sem falhas; dependências compatíveis com o SDK 57; bundles Android e iOS gerados.

- [ ] **Step 3: Conferir as regras regulatórias no código-fonte**

```bash
grep -rniE "\b(compre|comprar|vender|invista|investir)\b" app src --include=*.tsx --include=*.ts | grep -v "\.test\." || echo "RN-01 ok"
grep -rn "AvisoIA" app src --include=*.tsx | grep -v "\.test\."
```

Expected: `RN-01 ok`; `AvisoIA` usado em `src/components/CardAnaliseIA.tsx` e `app/chat.tsx`. A palavra "venda" aparece de propósito só como tipo de operação e na mensagem de saldo insuficiente. O grep abaixo é sensível a maiúsculas para ignorar o enum `'VENDA'`:

```bash
grep -rnE "\b[Vv]enda\b" app src --include=*.tsx --include=*.ts | grep -v "\.test\."
```

Expected: apenas `app/operacao/nova.tsx` (rótulo `Venda` e comentário), `src/components/ItemOperacao.tsx` (rótulo `Venda` e comentário) e `src/dominio/operacao.ts` (mensagens de saldo insuficiente). Qualquer outra ocorrência precisa ser reescrita de forma factual.

- [ ] **Step 4: Commit do README**

```bash
git add README.md
git commit -m "docs: descreve funcionalidades, execução e estrutura do app

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Publicar as branches no GitHub**

O repositório é privado e só a conta `brunoosouza09` tem acesso; use o token dela só nestes comandos, sem trocar a conta ativa do `gh`:

```bash
export GH_TOKEN="$(gh auth token --user brunoosouza09)"
git push -u origin main
git push -u origin develop
git push -u origin feature/app-mobile-mvp
```

Expected: as três branches criadas no remoto; `main` vira a branch padrão por ser a primeira enviada.

- [ ] **Step 6: Abrir o Pull Request para `develop`**

```bash
export GH_TOKEN="$(gh auth token --user brunoosouza09)"
gh pr create --repo InsightF-AI/Insight-flow-mobile --base develop --head feature/app-mobile-mvp \
  --title "feat: app mobile MVP (Expo SDK 57)" \
  --body "$(cat <<'EOF'
## Resumo

Primeira versão do app mobile do InsightFlow (Fase 5 do roadmap), consumindo só a API REST que o backend já expõe.

- Login e cadastro, com sessão no SecureStore e volta ao login quando o token vence
- Watchlist com cotações, busca de ativos e detalhe com gráfico, indicadores e sinais com backtest de 24 meses
- Alertas de preço e notificações in-app (polling de 60 s)
- Portfólio simulado: rentabilidade, CDI/Ibovespa, distribuição, posições e operações
- Telas de IA (análise e chat) com o aviso legal da RN-05, aguardando os endpoints de IA

## Decisões

- **Expo SDK 57 em vez do 54 dos documentos:** o Expo Go das lojas só abre o SDK mais recente. Os documentos do projeto precisam ser atualizados.
- **`ativo_id` da nova operação resolvido pela watchlist:** a busca da API não devolve id. O ativo passa a aparecer na watchlist.
- **422 de saldo insuficiente:** o backend manda só o UUID do ativo no `detail`, e o app mostra uma frase legível no lugar.
- **Fora do escopo:** push nativo, IA, refresh token e recuperação de senha, que dependem do backend.

Spec: `docs/superpowers/specs/2026-09-25-app-mobile-mvp-design.md`
Plano: `docs/superpowers/plans/2026-09-25-app-mobile-mvp.md`

## Como testar

`npm run verificar` roda lint, typecheck e testes.

Roteiro manual com o backend rodando (`docker compose up`) e o Expo Go SDK 57:

1. Criar conta, sair e entrar de novo.
2. Buscar e adicionar PETR4. Conferir a cotação na watchlist, o gráfico nos períodos 1M e 1A, os indicadores e os sinais.
3. Registrar uma compra de PETR4 com "Usar cotação atual" e conferir resumo, benchmarks e distribuição no Portfólio.
4. Registrar uma venda maior que a posição e ver a mensagem de saldo insuficiente.
5. Criar um alerta, desativar e remover.
6. Alternar o tema do celular entre claro e escuro.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: URL do PR impressa. O CI (`.github/workflows/ci.yml`) roda no PR; aguarde ficar verde.

```bash
export GH_TOKEN="$(gh auth token --user brunoosouza09)"
gh pr checks --repo InsightF-AI/Insight-flow-mobile --watch
```

Expected: job "Lint, typecheck e testes" com sucesso.
