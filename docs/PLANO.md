# Plano do app mobile InsightFlow (Fase 2)

Base: [`docs/MAPEAMENTO.md`](MAPEAMENTO.md) (Fase 1, 10/10/2026). Este documento diz **como** o app será construído e em que ordem. O detalhamento de cada ciclo, com testes e código, fica em `docs/superpowers/plans/`; o primeiro é [`2026-10-10-ciclo-1-base-e-sessao.md`](superpowers/plans/2026-10-10-ciclo-1-base-e-sessao.md).

Nada aqui altera backend, web ou desktop. Necessidades de API continuam como sugestões no §8.2 do mapeamento.

## 0. Decisões adotadas

Aprovadas com o "s" de 10/10/2026, seguindo as recomendações do §8.1 do mapeamento:

| # | Decisão |
| --- | --- |
| D1 | Evoluir o MVP local (`feature/redesign-web`), sem recomeçar |
| D2 | Manter o Expo SDK 57 (registrar a divergência com os documentos, que citam o 54) |
| D3 | Publicar as branches existentes e abrir PRs: MVP → `develop`, depois o redesign |
| D4 | Remover `AGENTS.md`, `LICENSE` (copyright da Expo), `.claude/settings.json` e `assets/favicon.png`; trocar o fundo `#E6F4FE` do ícone Android |
| D5 | Cinco abas: Início, Carteira, Chat, Alertas, Perfil |
| D6 | Ativo fora da watchlist exige "Adicionar à watchlist" explícito antes do detalhe, da operação e do alerta |
| D7 | Sem recuperação de senha, edição de perfil e troca de senha (não há rota) |
| D9 | Até 20/10, priorizar o que o Checkpoint 02 avalia; push e IA depois |
| D10 | Manter tema claro e escuro (escuro padrão) |
| D11 | Candles desenhados com Skia sobre o Victory Native já instalado |
| D12 | Redigir o status da issue #9 para você revisar e publicar |

**Ainda em aberto (D8):** quem cria ou tem a conta Expo (EAS) e o projeto Firebase do push. Só bloqueia a Etapa 8.

## 1. Stack

**React Native + Expo SDK 57 + TypeScript**, a mesma do MVP. Motivos:

- O web é React: TanStack Query, Zustand, a organização "uma função por endpoint" e as regras de formatação passam para o mobile sem tradução de conceitos.
- A disciplina exige React Native com TypeScript (Checkpoint 01), e os documentos do projeto e a issue #9 exigem Expo.
- O backend já fala com o **Expo Push Service**. Com `expo-notifications`, o token do aparelho vai direto para `POST /dispositivos`, sem servidor intermediário.
- Expo Router dá rotas por arquivo, abas e pilhas, além de deep link (`insightflow://`) para abrir a tela certa no toque do push.

Alternativas descartadas: Flutter ou nativo (Kotlin/Swift) perdem o reaproveitamento do web e fogem do exigido pela disciplina. React Native sem Expo não traz ganho e perde EAS e Expo Notifications.

| Papel | Biblioteca | Situação |
| --- | --- | --- |
| Runtime | `expo` ~57, `react-native` 0.86, `react` 19.2, `typescript` ~6.0 | instalado |
| Navegação | `expo-router` (abas + pilhas + modal) | instalado |
| Estado de servidor | `@tanstack/react-query` 5 (cache, repetição, invalidação; `focusManager` ligado ao `AppState`) | instalado |
| Estado local | `zustand` 5 (sessão e preferências) | instalado |
| Armazenamento seguro | `expo-secure-store` (Keychain/Keystore) | instalado |
| Gráficos | `victory-native` 42 + `@shopify/react-native-skia` | instalado |
| Gestos e animação | `react-native-gesture-handler`, `react-native-reanimated` 4 | instalado |
| Ícones e fontes | `lucide-react-native`, `@expo-google-fonts/inter`, `@expo-google-fonts/space-grotesk` | instalado |
| Datas | `@react-native-community/datetimepicker` | instalado |
| Push | `expo-notifications`, `expo-device` | instalado |
| Build de desenvolvimento | EAS CLI, `expo-dev-client`, `expo-build-properties` (texto claro só em dev) | Etapa 8, depois da D8 (instalar `expo-dev-client` troca o `npx expo start` para development build e tira o Expo Go) |
| Copiar texto (chat) | `expo-clipboard` | instalado |
| Qualidade | Jest + `jest-expo` + React Native Testing Library, ESLint (`eslint-config-expo`), `tsc`, GitHub Actions | instalado |

Toda dependência nova entra com `npx expo install <pacote>`, para casar com o SDK 57. Antes de usar uma API do Expo, consultar `https://docs.expo.dev/versions/v57.0.0/`.

## 2. Gráficos de candles, RSI e MACD

| Opção | Candles | RSI e MACD | Toque (mira) | Custo |
| --- | --- | --- | --- | --- |
| **Victory Native 42 (Skia), já instalado** | Desenho próprio com Skia dentro do `CartesianChart`, que fornece escalas e limites | `Line` e `Bar` prontos | `useChartPressState` | Nenhuma dependência nova; cerca de 150 linhas para os candles |
| `react-native-wagmi-charts` | Pronto, com mira | Só linha (sem histograma do MACD) | Pronto | Dependência nova; conferir compatibilidade com Reanimated 4 e RN 0.86 |
| Lightweight Charts dentro de uma WebView | Idêntico ao web | Idêntico ao web | Bom | `react-native-webview` + HTML embutido; tema injetado por ponte JS; acessibilidade pior |

**Escolha: Skia.** As cores vêm dos mesmos tokens do tema e não há dependência nova. Plano B: se os candles em Skia passarem de um dia de trabalho na Etapa 4, usar Lightweight Charts numa WebView.

**Como ficou na Etapa 4.** Os candles, o volume, as médias, o RSI e o MACD são desenhados direto com `Canvas` e `Path` do Skia, sem o `CartesianChart` do Victory Native: as posições vêm de funções puras testadas (`src/dominio/geometriaGrafico.ts`), o que deixa a mira, as escalas e os casos de borda (série parada, um candle, histórico curto) cobertos por teste sem depender de Skia no Jest. A mira usa o Gesture Handler (`Pan` horizontal e `Tap`), com a rolagem vertical da tela preservada, e não o `useChartPressState`. O Victory Native segue só no gráfico de distribuição.

Regras dos gráficos (valem para qualquer opção):

- As séries de SMA 20/50/200, Bollinger (20, 2), RSI (14) e MACD (12, 26, 9) são calculadas no app sobre o histórico, porque a API só devolve o último valor. As fórmulas são as do backend (pandas-ta), que o desktop conferiu: Bollinger com **desvio-padrão amostral** e RSI com suavização de Wilder iniciada na primeira variação. Os valores oficiais exibidos continuam sendo os de `/indicadores`.
- Para as médias não começarem vazias, buscar também o histórico `5A` (o que o backend guardou) e recortar o período exibido, como faz o desktop.
- A data do candle é a parte UTC da string (`AAAA-MM-DD`). Converter para o fuso local mostraria o dia anterior nos candles de cripto.
- Verde/vermelho só para alta/baixa. As cores das linhas de SMA são as do web (azul, âmbar e violeta).

## 3. Estrutura de pastas

Mantém as fronteiras do `CLAUDE.md` do mobile: `app/` só tem rotas; telas falam com hooks; hooks falam com `src/api/`; `src/api/` não importa React Native; componentes recebem dados por props.

```text
app/                         rotas do Expo Router
  _layout.tsx                provedores, guarda de sessão, tempo real (E5), push (E8)
  (auth)/login.tsx           (auth)/cadastro.tsx
  (tabs)/_layout.tsx         Início · Carteira · Chat · Alertas · Perfil
  (tabs)/index.tsx           Início (E3)
  (tabs)/portfolio.tsx       Carteira (E6)
  (tabs)/chat.tsx            Chat (E7)
  (tabs)/alertas.tsx         Preço | Sinais (E5)
  (tabs)/perfil.tsx          Conta, push, notificar por ativo, servidor, tema (E8)
  ativo/[id].tsx             detalhe do ativo (E4, E7)
  buscar.tsx                 (E4)
  notificacoes.tsx           caixa de notificações (novo, E5)
  operacao/nova.tsx          modal (E6)
src/
  config/ambiente.ts         URL da API validada (novo, E1)
  api/                       HTTP sem React Native
    client.ts                tempo limite, X-Request-ID, renovação de sessão, erros (E2)
    auth.ts watchlist.ts ativos.ts alertas.ts notificacoes.ts portfolio.ts
    ia.ts                    análise e chat (novo, E7)
    dispositivos.ts          registro do token de push (novo, E8)
    tempoReal.ts             cliente WebSocket sem React (novo, E5)
    tipos.ts                 espelho dos schemas do backend
  store/sessao.ts            tokens no SecureStore + renovação serializada (E2)
  store/preferencias.ts      tema (e push, E8)
  hooks/                     TanStack Query; useTempoReal (E5); usePush (E8)
  dominio/                   regras puras com teste ao lado (séries, portfólio, alertas, regulatório)
  notificacoes/push.ts       expo-notifications: permissão, canal, token, toque (novo, E8)
  components/  theme/  utils/
__tests__/telas/             testes de tela
docs/                        MAPEAMENTO.md, PLANO.md, checkpoint-02.md (E3), superpowers/
```

## 4. Navegação

```text
Raiz (Stack com Stack.Protected por sessão)
├─ (auth)            login · cadastro                       sem sessão
└─ com sessão
   ├─ (tabs)         Início · Carteira · Chat · Alertas · Perfil
   ├─ ativo/[id]     pilha
   ├─ buscar         pilha
   ├─ notificacoes   pilha (sino no cabeçalho do Início, toque no push)
   └─ operacao/nova  modal
```

| Aba | Ícone | Cabeçalho | Badge |
| --- | --- | --- | --- |
| Início | casa | buscar (+), sino de notificações | — |
| Carteira | gráfico de pizza | nova operação | — |
| Chat | mensagem | limpar conversa | — |
| Alertas | sino | — | notificações não lidas |
| Perfil | usuário | — | — |

Entre telas trafegam só IDs (`ativo/[id]?ticker=` para o título, `operacao/nova?ativoId=`); o restante vem do cache do TanStack Query. A guarda é o `Stack.Protected` que já existe: sem sessão, o app só mostra `(auth)`.

## 5. Camada de API

### 5.1 Endereço

`EXPO_PUBLIC_API_URL` é a **raiz do servidor** (ex.: `http://192.168.0.10:8000`), sem `/api/v1`; o client acrescenta o prefixo. A URL é validada ao abrir o app (`src/config/ambiente.ts`). Se for inválida, o app mostra uma tela explicando como corrigir, em vez de falhar com "sem conexão" em todas as telas. O WebSocket deriva da mesma raiz (`http`→`ws`, `https`→`wss`). Fora da rede local, só `https`.

### 5.2 Cliente HTTP (`src/api/client.ts`)

- Uma função por endpoint em `src/api/<recurso>.ts`, como o `client.js` do web.
- Todo request leva `Accept`, `X-Request-ID` (gerado no app, até 64 caracteres `[A-Za-z0-9._-]`) e, fora de `/auth/*`, `Authorization: Bearer`.
- **Tempo limite por chamada:**

  | Chamada | Limite |
  | --- | --- |
  | Padrão | 20 s |
  | `POST /watchlist` (primeira coleta de histórico) | 30 s |
  | `GET /ativos/{id}/analise` | 70 s |
  | `POST /chat` | 90 s |

- **Erros** viram `ApiError(status, mensagem, { requestId, retryAfterSegundos, causa })`: `status 0` com `causa: 'rede'` ou `'tempo'`; `detail` string ou lista (422); `Retry-After` lido (cota da IA). O `requestId` aparece na tela de erro como "Código do erro" para cruzar com os logs do backend.
- **Repetições:** consultas repetem até 2 vezes só em rede, tempo e 5xx; as de IA não repetem; mutações nunca repetem sozinhas (o servidor pode já ter gravado).

### 5.3 Sessão e renovação (`src/store/sessao.ts`)

- Uma única chave no SecureStore, `insightflow.sessao`, com JSON `{ accessToken, refreshToken, expiraEm, email }`. Gravação atômica, sem credencial parcial. As chaves do MVP antigo são apagadas e quem tinha sessão antiga entra de novo uma vez.
- **Renovação antecipada:** se o access vence em menos de 60 s, o client renova antes de enviar. Sem rede, segue com o token atual.
- **Renovação reativa:** num 401 fora de `/auth/*`, se outra requisição já renovou, repete com o token vigente; senão renova e repete **uma vez**. Um segundo 401 vai para a tela.
- **Serialização:** chamadas simultâneas a `renovar()` compartilham a mesma promessa (duas renovações com o mesmo refresh revogam a sessão inteira no backend).
- Refresh recusado (401): sessão encerrada localmente e o app volta ao login. Falha de rede: mantém a sessão e a tela mostra "sem conexão".
- **Sair:** limpa a sessão local e o cache na hora, depois revoga no servidor (`POST /auth/logout`) sem bloquear. Na Etapa 8, antes disso, `DELETE /dispositivos`.
- Tokens nunca vão para log.

### 5.4 Estados de tela

`EstadoConsulta` decide entre carregando (`Skeleton`, Etapa 3), erro (`ErroComRetry`, com mensagem em pt-BR e código) e conteúdo. O vazio é responsabilidade da tela (`EstadoVazio` com ação). Toda lista tem puxar para atualizar. `null` não vira zero; falha de rede não vira lista vazia; dado faltante aparece como "indisponível". São os cinco cenários do Checkpoint 02: com dados, vazio, carregando, falha de comunicação e erro do servidor.

## 6. Tema

Os tokens do web (§4 do mapeamento) já estão em `src/theme/` com ajustes de contraste AA. O que entra:

- Tokens de gráfico que faltam: grade, mira, volume de alta e de baixa, Bollinger e CDI (E4).
- Componentes `Kpi` e `Skeleton` (E3), `Banner` de notificação in-app (E5).
- Regras que continuam: cores só via `useTema()`, nunca `fontWeight`, ícones só via `Icone`, contraste ≥ 4,5:1 nos dois temas, alvo de toque ≥ 44 pt, verde/vermelho só para positivo/negativo, IA em violeta com `AvisoIA`.

## 7. Notificações

**Primeiro plano: WebSocket** (`src/api/tempoReal.ts` + `src/hooks/useTempoReal.ts`, Etapa 5). Segue o §6.2 do mapeamento:

- Mensagem `autenticar` na abertura, em até 10 s; reautenticação na mesma conexão depois de cada renovação.
- Fechamento 4401: renova e reconecta. Fechamento 1011 ou queda: espera crescente de 1 s a 30 s.
- 90 s sem mensagens: conexão considerada morta e reaberta.
- A cada conexão autenticada e ao voltar ao primeiro plano, `GET /notificacoes?apenas_nao_lidas=true`, mesclando por `id`.
- Em segundo plano, a conexão é fechada.
- Cada notificação gera um banner in-app e invalida as consultas afetadas.
- O polling atual de 60 s fica só como reserva enquanto o WebSocket estiver caído.

**Segundo plano: push Expo** (`src/notificacoes/push.ts` + `usePush`, Etapa 8). Segue o §6.3 do mapeamento:

- Permissão, canal Android `default`, `getExpoPushTokenAsync({ projectId })` e `POST /dispositivos` a cada login e quando o token mudar.
- Banner suprimido com o app aberto.
- O toque abre o ativo ou a notificação e marca como lida.
- `DELETE /dispositivos` antes do logout.
- No Expo Go, o push fica desligado com uma explicação no Perfil (precisa de development build).

## 8. Roteiro

Cada etapa termina com `npm run verificar` verde, teste no aparelho do que mudou, PR para `develop` e um resumo do que foi feito e do que vem a seguir. O plano detalhado de cada ciclo é escrito no início dele, sobre o código que existir naquele momento.

| Etapa | Entregas | Critério de pronto |
| --- | --- | --- |
| **1. Setup e tema** (ciclo 1) | Branches publicadas e PRs abertos; mapeamento e plano versionados; sobras do template removidas; fundo do ícone Android; URL da API validada com tela de erro; primeiro teste em aparelho | Repositório no GitHub com `main` padrão e PRs abertos; app abre no celular pelo Expo Go e lista a watchlist do backend local pelo IP |
| **2. Cadastro e login** (ciclo 1) | Sessão com refresh token, renovação antecipada e reativa serializada, logout revogando no servidor, `X-Request-ID`, tempo limite por chamada, mensagens em pt-BR com código do erro, tipos alinhados ao backend (`INDICE`, `RESUMO_DIARIO`, `ativo_id` nulo) | Testes cobrem 401, corrida de renovações, refresh recusado e sem rede; no aparelho, com `JWT_EXPIRATION_MINUTES=2` no `.env` local do backend, o app segue funcionando depois de 3 min sem voltar ao login |
| **3. Dashboard e watchlist** | Aba Início com KPIs da carteira (patrimônio simulado, resultado, variação do dia ponderada pelo valor em BRL, sinais ativos), resumo diário com aviso legal, watchlist com preço, variação, nº de sinais e sino de notificar, sinais ativos com backtest de 20 pregões; `Kpi` e `Skeleton`; cada item falha em separado; ordenação estável. **Documento do Checkpoint 02** (`docs/checkpoint-02.md`) | Os cinco estados do checkpoint têm teste; nenhum número inventado; entrega do checkpoint até 19/10. **Feito em 10/10/2026** (PR da Etapa 3); documento em `docs/checkpoint-02.md` |
| **4. Busca e detalhe do ativo** | Busca com adição explícita à watchlist; detalhe com cotação, seis períodos, candles + volume com SMA e Bollinger alternáveis e mira por toque, RSI (30/70) e MACD; indicadores oficiais; sinais com valor no disparo e backtest 5/20/60 (`null` = "sem dados") | Último valor de SMA 20/50/200, RSI 14, Bollinger e MACD calculados no app bate com `/indicadores` em fixtures (tolerância 0,01); gráfico responde ao dedo no aparelho. **Feito em 10/10/2026** (PR da Etapa 4): o cálculo bate nos 4 ativos da captura (B3 e cripto, `src/dominio/contratoIndicadores.test.ts`); **falta conferir o toque e o desempenho no aparelho** |
| **5. Alertas e notificações** | Aba Alertas com "Preço" (CRUD, preço atual, distância ao alvo, ticker por busca) e "Sinais"; tela Notificações (não lidas, marcar todas, toque abre ativo ou resumo); WebSocket completo; banner in-app; badge | Teste com WebSocket falso cobre autenticar → notificação → 4401 → renovação → reconexão; no aparelho, alerta de BTC com alvo logo abaixo do preço chega em até 5 min como banner. **Feito em 10/10/2026** (PR da Etapa 5): protocolo conferido com o backend local e entrega ponta a ponta de uma notificação real (alerta de BTC) pelo WebSocket em 200 s; **falta conferir o banner e a reconexão no aparelho** |
| **6. Portfólio e operações** | Aba Carteira com KPIs, CDI e Ibovespa (`null` = indisponível), distribuição, posições com variação do dia e filtro, operações com exclusão confirmada; nova operação só com ativo da watchlist, cotação sugerida, disponível na venda, data local; 422 traduzido; aviso de simulação; aviso de dados parciais | Frações ×100 e pontos percentuais com testes; COMPRA/VENDA sem verde/vermelho. **Feito em 11/10/2026** (PR da Etapa 6); erros 422 e escalas conferidos com o backend local; **falta conferir no aparelho** o filtro, o aviso de dados parciais e o registro de operações |
| **7. Análise IA e chat** | Card de análise sob demanda (70 s; `em_cache`, `desatualizada`, modelo); Chat como aba (histórico local, últimas 20 mensagens, 2000 caracteres, sugestões, copiar, limpar, 90 s); 503 com IA desligada, cota com `Retry-After`, 502 do guardrail | Nenhum texto de IA sem o aviso legal (teste por tela); com a IA desligada nada quebra. **Feito em 11/10/2026** (PR da Etapa 7): a análise é uma consulta desligada que só o botão dispara, sem repetição automática; a conversa fica em memória (o backend não guarda histórico) e sai com a sessão; resposta da IA acima de 2000 caracteres é cortada ao reenviar o histórico (o backend valida todas as mensagens); o texto copiado leva o aviso legal. Conferidos no backend local: 503 com a IA desligada e, com um Gemini falso, 200 (`em_cache`), 503 de cota com `Retry-After`, 502 do guardrail e os limites do `/chat`; **falta conferir no aparelho** o teclado, a rolagem e a cópia |
| **8. Configurações e push** | Perfil com tema, servidor configurado, push ligado/desligado, notificar por ativo, aviso educacional, sair; push completo; `app.config.ts` com `projectId`; `eas.json` com perfil `development` | Em development build Android, alerta disparado com o app fechado chega como push e o toque abre o ativo. **Parte A feita em 11/10/2026** (PR da Etapa 8): Perfil completo, cliente de push (permissão só na primeira vez, canal `default`, `POST`/`DELETE /dispositivos`, banner do sistema suprimido, toque abre o ativo e marca como lida), `app.config.ts` com `EAS_PROJECT_ID` e plugin do `expo-notifications`; contrato de `/dispositivos` e `/health` conferido no backend local. **Parte B, depende da D8:** `eas init`, chave FCM V1, `eas.json`, `expo-dev-client`, `expo-build-properties`, build de desenvolvimento e o teste do push em aparelho |

Ordem até o prazo: ciclo 1 (Etapas 1 e 2) e Etapa 3 até **19/10**, deixando 20/10 para revisar a entrega do Checkpoint 02. As Etapas 4 a 8 seguem depois, na ordem da tabela. A Etapa 8 depende da resposta ao D8.

## 9. Como testar no celular ou no emulador

O celular não enxerga o `localhost` do PC: o app precisa do **IP do PC na rede**.

### 9.1 Backend

1. Ligar o Docker Desktop.
2. No `Insight-flow-backend`: `docker compose up -d`, depois `curl http://localhost:8000/health` (esperado: `{"status":"ok"}`).
3. Opcional, para testar a renovação de sessão: no `.env` local do backend (não versionado), `JWT_EXPIRATION_MINUTES=2`, depois `docker compose up -d` de novo.
4. Para IA: `AI_HABILITADA=true` e `GEMINI_API_KEY` no mesmo `.env`. Sem isso, análise e chat respondem 503 ("Provedor de IA indisponivel") e o app mostra "A IA está indisponível no momento".

### 9.2 Rede do PC (Windows)

1. Descobrir o IP: `ipconfig` → "Endereço IPv4" do adaptador Wi-Fi (ex.: `192.168.0.10`).
2. Prefira deixar a rede do Windows como **Privada**: Configurações → Rede e Internet → Wi-Fi → propriedades. Wi-Fi de
   faculdade costuma vir como **Pública**; se não puder mudar, use `-Profile Public` na regra abaixo e remova-a depois
   (`Remove-NetFirewallRule -DisplayName "InsightFlow API 8000"`). Para ver a categoria: `Get-NetConnectionProfile`.
3. Liberar a porta da API no firewall (PowerShell como administrador):

   ```powershell
   New-NetFirewallRule -DisplayName "InsightFlow API 8000" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow -Profile Private
   ```

   Na primeira execução do Metro, aceitar o aviso do firewall para o Node (porta 8081).
4. Celular e PC na **mesma rede Wi-Fi**. Rede de visitantes ou com isolamento de clientes bloqueia.
5. No navegador do celular, abrir `http://<IP>:8000/health`. Se não abrir, o app também não vai conectar.

### 9.3 App

1. No `Insight-flow-mobile`, criar `.env` a partir do `.env.example`:

   | Onde roda | `EXPO_PUBLIC_API_URL` |
   | --- | --- |
   | Celular com Expo Go | `http://<IP-do-PC>:8000` |
   | Emulador Android | `http://10.0.2.2:8000` |
   | Simulador iOS (macOS) | `http://localhost:8000` |

2. `npx expo start -c` (o `-c` limpa o cache; a variável é embutida no bundle e só muda reiniciando assim).
3. Abrir com o **Expo Go** (versão compatível com o SDK 57) lendo o QR code, ou `a` para o emulador Android.
4. Se a rede local bloquear o Metro, `npx expo start --tunnel` resolve o bundle. A API continua precisando ser alcançável pelo IP, ou por um túnel HTTPS para a porta 8000.

### 9.4 Roteiro de teste com dados

1. Criar conta no app e adicionar `PETR4`, `VALE3` e `BTC`. Sem `BRAPI_API_KEY`, só `PETR4`, `MGLU3`, `VALE3` e `ITUB4` têm dados na B3; cripto funciona sem chave.
2. **Alerta rápido:** alerta de `BTC` com "preço maior ou igual" e alvo **um pouco abaixo** do preço atual. O ciclo de cripto roda a cada 5 min e dispara na transição.
3. Registrar uma compra de `PETR4` com data de alguns dias atrás e conferir carteira, CDI e Ibovespa.
4. Sinais dependem do mercado (RSI < 30, > 70 ou volume > 1,5×) e podem não aparecer.

### 9.5 Push (Etapa 8)

O Expo Go não recebe push remoto no Android: é preciso uma **development build**.

1. `expo-notifications` e `expo-device` já estão instalados. Instalar `expo-dev-client` e `expo-build-properties` com `npx expo install` (depois disso o `npx expo start` abre em development build; para voltar ao Expo Go, `npx expo start --go`).
2. `eas init` (gera o `projectId`) e cadastrar a chave FCM V1 com `eas credentials`. O `app.config.ts` lê o projeto de `EAS_PROJECT_ID`: coloque `EAS_PROJECT_ID=<uuid>` no `.env` (o Expo CLI o carrega; funciona igual no PowerShell e no bash) ou, no EAS, numa variável de ambiente do perfil de build. O `eas build` precisa do `projectId` resolvido na avaliação local da configuração. Sem ele o Perfil mostra "Falta configurar o projeto Expo (EAS)" e nada é registrado.
3. `eas build --profile development --platform android` e instalar o APK.
4. `npx expo start --dev-client`.
5. O perfil `development` libera tráfego `http://` no Android (`usesCleartextTraffic`); produção usa HTTPS.

### 9.6 Problemas comuns

| Sintoma | Causa provável |
| --- | --- |
| "Sem conexão com o servidor (http://…)" no celular, mas funciona no emulador | Firewall, rede pública no Windows ou Wi-Fi diferente |
| O app ainda usa o endereço antigo | Metro sem `-c` depois de mudar o `.env` |
| Tela "Endereço do servidor inválido" | `EXPO_PUBLIC_API_URL` com `/api/v1`, sem `http://` ou com caminho |
| Expo Go diz que o projeto é de outro SDK | Atualizar o Expo Go |
| Volta ao login sozinho | Refresh recusado: sessão revogada (logout em outro lugar ou reuso) ou expirada (30 dias) |
| IA sempre "indisponível" | `AI_HABILITADA`/`GEMINI_API_KEY` ausentes no backend ou cota do Gemini |

## 10. Qualidade

- TDD nas regras e no client: teste que falha, implementação mínima, teste verde, commit.
- `npm run verificar` (lint + typecheck + testes) antes de cada commit relevante e no CI.
- Testes de tela com o RNTL do projeto (ler `node_modules/@testing-library/react-native/docs/guides/llm-guidelines.md` antes).
- Teste manual em aparelho a cada etapa, com o roteiro do §9.4. Registrar no PR o que foi e o que não foi testado em aparelho.
- Um PR por ciclo para `develop`, com as mesmas regras do repositório (trailer de coautoria nos commits e rodapé do Claude Code nos PRs).
- Nenhum segredo no repositório: `.env` é ignorado; só `.env.example` é versionado.
