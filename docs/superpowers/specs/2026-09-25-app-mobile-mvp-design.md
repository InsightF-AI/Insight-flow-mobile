# App Mobile (MVP) — design

## Contexto

O backend (`InsightF-AI/Insight-flow-backend`) já expõe via REST: cadastro/login com JWT, watchlist, busca de ativos, cotação atual, histórico OHLCV, indicadores técnicos, sinais + backtest, alertas de preço, notificações in-app e o portfólio simulado completo (operações, posições, rentabilidade, benchmark, distribuição). Não existe nenhum cliente ainda — o repositório web não foi criado.

Este sub-projeto é a **Fase 5 do roadmap** ("Cliente mobile consumindo API existente"): um app React Native que cobre tudo que o backend já oferece, sem alterar o backend. A stack segue a dos documentos do projeto (`escopo-e-stack` e `documentacao-tecnica`, seção 8) — **React Native + Expo, EAS CLI, Expo Notifications, Victory Native** — com uma divergência deliberada de versão: **Expo SDK 57** em vez do 54 (ver decisões).

O app também atende os requisitos do Checkpoint 01 da disciplina de Programação Mobile: TypeScript, componentes próprios, props, `useState`, estilos com Flexbox e as principais telas do projeto existentes.

**Decisões tomadas em brainstorming:**

- **Expo SDK 57, não 54.** Em 25/09/2026 o SDK atual é o 57, e o Expo Go das lojas só abre projetos do SDK mais recente. Com o 54, iPhones não abririam o app pelo Expo Go. Os documentos do projeto (`escopo-e-stack`, `documentacao-tecnica`) precisam ser atualizados para "Expo SDK 57".
- **Repositório próprio** (`InsightF-AI/Insight-flow-mobile`), seguindo a decisão arquitetural dos documentos de que os clientes são desacoplados e só compartilham o contrato REST.
- **Escopo = tudo que o backend já tem.** Telas de IA (análise textual por ativo e chat) entram com layout e aviso legal, exibindo "disponível em breve", porque o backend ainda não tem os endpoints de IA. Push notifications ficam fora (ver "Fora do escopo").
- **Stack de estado igual à do web** (TanStack Query + Zustand). Os documentos pedem "reaproveitamento da camada de API do web", mas o web não existe; aqui acontece o inverso — `src/api/` nasce sem dependência de React Native, para o web poder copiá-la.
- **Navegação com Expo Router** (rotas por arquivo, padrão do template do SDK 54).
- **`ativo_id` de nova operação resolvido no app:** `POST /operacoes` exige `ativo_id`, que só existe para ativos já persistidos (via watchlist ou alerta), e `GET /ativos/buscar` não devolve id. O app adiciona o ativo à watchlist quando necessário para obter o id (algoritmo em "Nova operação"). Efeito colateral aceito: o ativo passa a aparecer na watchlist.
- **Tema claro + escuro** acompanhando a configuração do sistema.

**Fora do escopo deste sub-projeto:**

- **Push notifications nativas (Expo Notifications).** O backend não tem endpoint para registrar o token do dispositivo nem envia via Expo Push, e push remoto não funciona no Expo Go (exige development build via EAS). Notificações ficam in-app, com polling. Vira sub-projeto próprio que toca os dois repositórios.
- **Endpoints de IA** (RF-13, RF-14, RF-15): o app só prepara as telas.
- **Refresh token** (RNF-04) e **recuperação de senha** (fluxo alternativo do UC-01): não existem no backend. Token expirado → volta ao login.
- **Gráfico de candles.** O Victory Native XL não tem candlestick pronto; o MVP usa linha/área do fechamento.
- **Expo Web.** Alvo é Android e iOS; `expo-secure-store` não funciona na web.
- **Build de loja via EAS.** O MVP roda em Expo Go; `eas.json` fica para o sub-projeto de push.

## Stack

| Papel | Biblioteca |
|---|---|
| Runtime | Expo SDK 57 (React Native 0.86, React 19.2), TypeScript 6 estrito |
| Navegação | `expo-router` |
| Estado de servidor | `@tanstack/react-query` v5 |
| Estado global | `zustand` v5 (somente sessão) |
| Armazenamento do token | `expo-secure-store` |
| Gráficos | `victory-native` 42 (XL) + `@shopify/react-native-skia` + `react-native-reanimated` + `react-native-gesture-handler`. Sem rótulos de eixo desenhados no Skia (evita embarcar fonte TTF): mínimo, máximo e datas do período ficam em `Text` do React Native abaixo do gráfico |
| Data da operação | `@react-native-community/datetimepicker` |
| Testes | `jest-expo` + `@testing-library/react-native` v14 (API assíncrona, renderer `test-renderer`) |
| Lint | `eslint-config-expo` (via `npx expo lint`) |

Dependências nativas são instaladas com `npx expo install` para casar as versões com o SDK 57. Todas as bibliotecas nativas acima estão incluídas no Expo Go do SDK 57.

## Arquitetura

```
app/                                  # rotas (Expo Router)
├── _layout.tsx                       # providers (QueryClient, tema), hidratação da sessão, guarda de rota
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx
│   └── cadastro.tsx
├── (tabs)/
│   ├── _layout.tsx                   # 4 abas; badge de não lidas na aba Perfil
│   ├── index.tsx                     # Watchlist (home)
│   ├── portfolio.tsx
│   ├── alertas.tsx
│   └── perfil.tsx                    # notificações + sair
├── ativo/[id].tsx                    # detalhe do ativo
├── buscar.tsx                        # busca → adiciona à watchlist
├── operacao/nova.tsx                 # nova operação fictícia
└── chat.tsx                          # chat IA (em breve)

src/
├── api/                              # sem import de react-native
│   ├── client.ts                     # request<T>(), ApiError, configurarApi()
│   ├── tipos.ts                      # espelho dos schemas Pydantic
│   ├── auth.ts                       # login, cadastrar
│   ├── watchlist.ts
│   ├── ativos.ts                     # buscar, cotacao, historico, indicadores, sinais, backtest
│   ├── alertas.ts
│   ├── notificacoes.ts
│   └── portfolio.ts                  # operacoes, posicoes, rentabilidade, benchmark, distribuicao
├── hooks/                            # hooks TanStack Query por recurso + chaves de cache
├── store/sessao.ts                   # Zustand + SecureStore
├── dominio/resolverAtivoId.ts        # regra de "Nova operação" (função pura)
├── components/                       # componentes próprios reutilizáveis
├── theme/                            # tokens claro/escuro + useTema()
└── utils/formatacao.ts               # moeda, percentual, datas
```

**Fronteiras:** telas (`app/`) só falam com hooks; hooks só falam com `src/api/`; `src/api/` só conhece `fetch` e os tipos. Componentes de `src/components/` recebem dados por props e não chamam hooks de dados.

### Camada de API (`src/api/`)

**`request<T>(caminho, opcoes)`**

- Base URL de `process.env.EXPO_PUBLIC_API_URL` + `/api/v1`.
- Injeta `Authorization: Bearer <token>` quando `obterToken()` devolve token.
- Timeout de 15 s via `AbortController`.
- `204` → `undefined`. Demais 2xx → JSON tipado.
- Qualquer falha vira `ApiError { status: number; mensagem: string }`:
  - `detail` string (FastAPI `HTTPException`) → usado como mensagem;
  - `detail` lista (validação 422 do Pydantic) → mensagens dos itens unidas por `; `;
  - falha de rede/timeout → `status: 0`, mensagem "Sem conexão com o servidor".
- Se a requisição **levava token** e recebeu 401 → chama `aoNaoAutorizado()` antes de lançar. O 401 de `POST /auth/login` (sem token) não dispara logout.

`configurarApi({ obterToken, aoNaoAutorizado })` é chamada uma vez no `app/_layout.tsx`, ligando o client à store de sessão sem import circular.

**Tipos (`tipos.ts`)** espelham os schemas de `src/app/api/v1/schemas/` do backend. O Pydantic v2 serializa `Decimal` como **string** em JSON, então todo campo `Decimal` é tipado como `string` (alias `Decimal = string`) e só vira `number` na formatação e nos gráficos. UUIDs e datas são `string`. Enums viram unions de literais (`TipoAtivo = 'ACAO' | 'FII' | 'ETF' | 'BDR' | 'CRIPTO'` etc.).

**Escala dos percentuais — o backend usa duas:**

| Campo | Escala | Exemplo |
|---|---|---|
| `CotacaoAtual.variacao_percentual` (repasse do `regularMarketChangePercent` da brapi) | pontos percentuais | `"1.23"` = 1,23% |
| `ResultadoBacktest.retorno_medio_*_pregoes` (`× 100` no `SinalService`) | pontos percentuais | `"-2.5"` = −2,5% |
| `Rentabilidade.percentual`, `Comparativo.*_percentual` | fração | `"0.05"` = 5% |
| `Distribuicao.por_classe/por_setor/por_moeda` | fração | `"0.4"` = 40% |

`formatarPercentual(valor, escala: 'pontos' | 'fracao')` exige a escala explicitamente, sem default, para o erro não passar despercebido.

### Sessão (`src/store/sessao.ts`)

Estado: `{ status: 'carregando' | 'autenticado' | 'anonimo'; token: string | null; email: string | null }`.

- `hidratar()`: lê token e e-mail do SecureStore na abertura; a splash fica visível até terminar.
- `entrar(token, email)`: grava no SecureStore → `autenticado`.
- `sair()`: apaga do SecureStore, `queryClient.clear()` → `anonimo`.
- O backend não tem `/usuarios/me` e o JWT só carrega `sub`; o e-mail digitado no login/cadastro é guardado para exibir "Conectado como …" no Perfil.

Guarda de rota no `app/_layout.tsx`: `anonimo` → `(auth)/login`; `autenticado` em rota de `(auth)` → `(tabs)`.

### Cache e invalidação (`src/hooks/`)

| Chave | Endpoint | Observação |
|---|---|---|
| `['watchlist']` | `GET /watchlist` | |
| `['ativo', id, 'cotacao']` | `GET /ativos/{id}/cotacao` | `staleTime` 60 s (igual ao cache Redis) |
| `['ativo', id, 'historico', periodo]` | `GET /ativos/{id}/historico?periodo=` | |
| `['ativo', id, 'indicadores']` | `GET /ativos/{id}/indicadores` | |
| `['ativo', id, 'sinais']` | `GET /ativos/{id}/sinais` | |
| `['ativo', id, 'backtest', regraId]` | `GET /ativos/{id}/sinais/{regraId}/backtest` | um por sinal, via `useQueries` |
| `['busca', termo]` | `GET /ativos/buscar?termo=` | debounce 400 ms, mínimo 2 caracteres |
| `['alertas']` | `GET /alertas` | |
| `['notificacoes']` | `GET /notificacoes` | `refetchInterval` 60 s enquanto autenticado |
| `['operacoes']` | `GET /operacoes` | |
| `['portfolio', 'posicoes' \| 'rentabilidade' \| 'distribuicao']` | `GET /portfolio/*` | |
| `['portfolio', 'benchmark', 'CDI' \| 'IBOVESPA']` | `GET /portfolio/benchmark?benchmark=` | |

Invalidações após mutação:

- adicionar/remover da watchlist, alterar `notificar` → `['watchlist']`
- registrar/remover operação → `['operacoes']` e `['portfolio']` (e `['watchlist']` se a resolução adicionou o ativo)
- criar/editar/remover alerta → `['alertas']`
- marcar notificação como lida → `['notificacoes']`

`retry` do QueryClient: não repete em 4xx; até 2 vezes em `status 0` e 5xx.

## Telas

Todas as telas usam três componentes de estado compartilhados: `Carregando`, `EstadoVazio` (mensagem + ação opcional) e `ErroComRetry` (mensagem do `ApiError` + botão "Tentar novamente"). Toda lista tem pull-to-refresh.

**Login / Cadastro** — `POST /auth/login`, `POST /usuarios` (o cadastro devolve token direto, 201). Validação no cliente: e-mail com formato válido; senha ≥ 8 caracteres no cadastro (mesma regra do `CadastroRequest`); nome obrigatório. Mensagens: 401 → "E-mail ou senha incorretos"; 409 → "E-mail já cadastrado".

**Watchlist (aba inicial)** — lista de `ItemWatchlist`: ticker, nome, tipo, preço e `VariacaoBadge`. A cotação de cada item vem de uma query própria; 404 na cotação mostra "—" com a legenda "sem cotação" (sem `BRAPI_API_KEY` só `PETR4`, `MGLU3`, `VALE3` e `ITUB4` têm dados). Botão "+" no cabeçalho → `buscar`. Toque no item → `ativo/[id]`. Estado vazio: "Sua watchlist está vazia" + "Buscar ativo".

**Buscar** — campo com debounce; lista de `AtivoEncontrado`. Toque → `POST /watchlist { ticker }` → navega para `ativo/[id]` com o id retornado. 409 → recarrega a watchlist, localiza o ativo pelo ticker e navega até ele.

**Detalhe do ativo (`ativo/[id]`)** — não existe `GET /ativos/{id}`; ticker e nome vêm do cache `['watchlist']` (a rota recebe `ticker` como parâmetro de reserva para o cabeçalho). Se o ativo não estiver na watchlist nem houver parâmetro (ex.: notificação de ativo removido), o cabeçalho mostra só "Ativo" e as seções continuam funcionando, pois todos os endpoints usam o id; o sino e "Remover da watchlist" ficam ocultos. Seções, de cima para baixo:

1. Cabeçalho: ticker, nome, preço, `VariacaoBadge`, máxima/mínima do dia. Ícone de sino alterna `notificar` (`PATCH /watchlist/{id}/notificacao`).
2. `GraficoPreco`: linha/área do `fechamento` + seletor de período `1D 1S 1M 3M 1A 5A` (padrão `1M`).
3. Indicadores, com descrição factual (RN-01):
   - SMA 20/50/200: valor e se o preço atual está acima ou abaixo;
   - RSI 14: valor e zona — "sobrevenda (< 30)", "neutra" ou "sobrecompra (> 70)", mesmos limiares das regras padrão do backend;
   - MACD 12/26/9: linha, sinal e histograma (`valores_auxiliares.linha_sinal`, `.histograma`);
   - Bollinger 20/2: superior, média e inferior (`valores_auxiliares.banda_superior`, `.banda_inferior`) e a posição do preço;
   - Volume relativo 20: "N,N× a média de 20 pregões".
4. Sinais ativos: cada `SinalCard` mostra nome, descrição e data de ativação da regra **e sempre o backtest** (RN-03): total de ocorrências em 24 meses e retorno médio em 5/20/60 pregões. `null` → "—"; zero ocorrências → "Sem ocorrências nos últimos 24 meses". Sem sinais → "Nenhum sinal técnico ativo no momento".
5. `CardAnaliseIA`: "Análise textual por IA — disponível em breve" + `AvisoIA`.
6. "Remover da watchlist" (confirmação → `DELETE /watchlist/{id}` → volta).

**Portfólio (aba)**

1. Resumo (`/portfolio/rentabilidade`): valor de mercado, custo base, lucro não realizado, lucro realizado e rentabilidade %, tudo em BRL.
2. Comparativo: carteira × CDI e carteira × Ibovespa (duas queries). `rentabilidade_benchmark_percentual: null` → "indisponível". 404 → estado vazio "Registre uma operação para comparar".
3. Distribuição (`/portfolio/distribuicao`): gráfico de rosca com seletor Classe / Setor / Moeda.
4. Posições (`/portfolio/posicoes`): ticker, quantidade, preço médio, cotação atual, valor de mercado e lucro não realizado.
5. Histórico de operações (`/operacoes`), com remoção (confirmação → `DELETE /operacoes/{id}`; o 422 também chega só com o UUID, e o app mostra "Esta operação não pode ser removida: uma venda posterior ficaria sem saldo em carteira.").
6. Botão flutuante "Nova operação" → `operacao/nova`. Botão no cabeçalho "Perguntar à IA" → `chat`.

O ticker das operações vem das posições ou da watchlist (`OperacaoResponse` só tem `ativo_id`).

**Nova operação (`operacao/nova`)** — campos: tipo (Compra | Venda), ativo (ticker digitado, com atalhos para os tickers da watchlist logo abaixo), quantidade, preço unitário, data (datepicker, padrão hoje, sem datas futuras). Quando o ticker já está na watchlist, um botão "Usar cotação atual (R$ …)" preenche o preço unitário com um toque; o campo continua editável. O preenchimento não é automático para não depender de efeito colateral nem adicionar o ativo à watchlist só por digitar.

Algoritmo `resolverAtivoId(ticker, deps)` em `src/dominio/`, puro e testado, com as chamadas de API injetadas:

1. Procura o ticker em `watchlist.listar()` (comparação sem diferenciar maiúsculas); achou → devolve `ativo.id`.
2. Senão → `watchlist.adicionar(ticker)`; sucesso → devolve `item.ativo.id` e sinaliza `adicionouNaWatchlist: true`.
3. 409 no passo 2 (corrida) → repete o passo 1; se ainda não achar, lança `ApiError`.
4. Outros erros propagam (404 → "Ativo não encontrado", 503 → fonte indisponível).

Depois: `POST /operacoes`. 422 → mensagem abaixo do formulário. Atenção: quando falta quantidade, o backend responde `detail` com **apenas o UUID do ativo** (`QuantidadeInsuficienteError(ativo_id)` convertido em string); nesse caso o app mostra "Quantidade insuficiente em carteira para esta venda na data informada." Os demais 422 (`OperacaoInvalidaError`) já trazem texto legível e são exibidos como vieram. Sucesso → invalida caches e volta ao Portfólio.

**Alertas (aba)** — lista de `Alerta`: ticker, condição ("Preço ≥ R$ 40,00" / "Preço ≤ …", com a `moeda_alvo`), switch de habilitado (`PATCH { ativo }`) e "Disparado em …" quando `disparado_em` existir. Formulário de criação (ticker, condição, valor > 0) → `POST /alertas`. Remoção com confirmação → `DELETE`.

**Perfil (aba)** — "Conectado como {email}", lista de notificações (não lidas destacadas; toque → `PATCH /notificacoes/{id}/lida` e navega para `ativo/[ativo_id]`), botão "Sair". O ticker da notificação vem do cache da watchlist; se o ativo não estiver lá, mostra só a mensagem. O badge da aba mostra a contagem de não lidas.

**Chat (`chat`)** — layout de conversa com campo desabilitado, "O chat com IA estará disponível em breve" e `AvisoIA` fixo no rodapé.

## Componentes próprios (`src/components/`)

`Botao`, `Campo` (input com rótulo e erro), `Card`, `Linha` (rótulo/valor), `VariacaoBadge` (cor e seta por sinal, recebe a escala), `AvisoIA`, `GraficoPreco`, `GraficoDistribuicao`, `IndicadorItem`, `SinalCard`, `SeletorSegmentado` (períodos e Classe/Setor/Moeda), `Carregando`, `EstadoVazio`, `ErroComRetry`. Todos recebem dados por props; o estado local de UI (seleção, campos, expansão) usa `useState`. Layout com Flexbox.

## Tema

`src/theme/cores.ts` define dois conjuntos de tokens com as mesmas chaves (`fundo`, `superficie`, `texto`, `textoSecundario`, `borda`, `primaria`, `positivo`, `negativo`, `alerta`); `useTema()` escolhe pelo `useColorScheme()`. Nenhuma tela usa cor literal. Positivo/negativo sempre acompanham sinal (+/−) ou seta, para não depender só de cor. Contraste mínimo AA para texto nos dois temas.

## Regras regulatórias no app

- **RN-01:** nenhum texto de análise, sinal, indicador, alerta ou chamada para ação usa verbo imperativo de recomendação ("compre", "venda", "invista"); as descrições são factuais ("condição de sobrevenda detectada"). Os rótulos "Compra"/"Venda" como **tipo** da operação fictícia registrada pelo próprio usuário são permitidos — descrevem o que ele fez, não recomendam nada.
- **RN-05 / RF-16:** `AvisoIA` exibe exatamente "Análise gerada por IA. Não constitui recomendação de investimento." e está presente em `CardAnaliseIA` e em `chat`. Há teste garantindo isso.
- **RN-04:** o formulário de operação deixa claro que é uma "operação simulada".

## Configuração e execução

- `EXPO_PUBLIC_API_URL` em `.env` (com `.env.example` versionado): no celular físico com Expo Go, o IP do PC na rede local (`http://192.168.x.x:8000`); no emulador Android, `http://10.0.2.2:8000`; no simulador iOS, `http://localhost:8000`.
- Backend via `docker compose up` no repositório do backend.
- Node: o React Native 0.86 aceita `^20.19.4 || ^22.13.0 || ^24.3.0 || >= 25.0.0`, então o Node 25 da máquina de desenvolvimento serve. O CI usa Node 24 LTS (`.nvmrc` com `24`).

## Testes

- `src/api/client.test.ts`: header de autorização presente/ausente; `detail` string e lista; timeout/rede → `status 0`; 401 com token chama `aoNaoAutorizado`; 401 sem token não chama; 204 → `undefined`.
- `src/utils/formatacao.test.ts`: moeda BRL/USD em pt-BR; percentual nas duas escalas; sinal +/−.
- `src/dominio/resolverAtivoId.test.ts`: achou na watchlist; adicionou; 409 com nova busca; erro propagado.
- `src/store/sessao.test.ts`: hidratar/entrar/sair com o SecureStore mockado.
- Componentes: `VariacaoBadge` (positivo/negativo/zero), `AvisoIA` com o texto exato, `SinalCard` com backtest vazio/nulo.
- Telas: login (sucesso navega; 401 mostra mensagem) e `CardAnaliseIA`/`chat` contendo o `AvisoIA`, com o módulo de API mockado.
- `GraficoPreco` e `GraficoDistribuicao` (Skia) são mockados nos testes de tela; não há teste de renderização do Skia no Jest.
- Testes de unidade ficam ao lado do código em `src/` (`*.test.ts(x)`). Testes de tela ficam em `__tests__/telas/`, nunca em `app/` — o Expo Router trata todo arquivo de `app/` como rota.

## CI

`.github/workflows/ci.yml` em push/PR para `main` e `develop`: Node 24, `npm ci`, `npx expo lint`, `npx tsc --noEmit`, `npx jest --ci`. Atende a regra do `CONTRIBUTING` de só mesclar com CI verde.

## Git

Commit inicial em `main` (README + esta spec), `develop` criada a partir de `main`, implementação em `feature/app-mobile-mvp` com PR para `develop` — o mesmo Git Flow e Conventional Commits do backend.
