# Checkpoint 02 — Programação Mobile

Projeto Integrador: **InsightFlow**, aplicativo mobile (React Native + Expo + TypeScript) do Sistema de Análise de Ativos do Mercado Financeiro.

Repositório: <https://github.com/InsightF-AI/Insight-flow-mobile> (privado, organização InsightF-AI).
WebAPI utilizada: `Insight-flow-backend` (FastAPI), repositório <https://github.com/InsightF-AI/Insight-flow-backend> (público). Sobe com `docker compose up` em `http://localhost:8000`; a documentação interativa (Swagger) fica em `/docs`.

## 1. Evolução do projeto

**Ponto de partida (Checkpoint 01).** [Preencher: o que foi entregue em 22/09/2026.]

**O que foi implementado desde então:**

- Cadastro e login reais na WebAPI, com sessão por token de acesso (30 min) e token de renovação (30 dias) guardados em armazenamento seguro (`expo-secure-store`). O aplicativo renova a sessão sozinho; se a renovação for recusada, volta ao login.
- Consumo de dados reais por `GET` nas telas de dados: watchlist, cotação, histórico de preços, indicadores técnicos, sinais e seu histórico (backtest), alertas, notificações, posições, rentabilidade, comparação com CDI e Ibovespa, e distribuição da carteira.
- Operações com `POST`, `PATCH` e `DELETE`: adicionar e remover ativos da watchlist, ligar e desligar notificações, criar, ativar, desativar e remover alertas de preço, registrar e remover operações simuladas.
- **Carteira simulada** com KPIs, comparação com CDI e Ibovespa, distribuição, posições com variação do dia e filtro, e registro de operações só com ativos da watchlist (o aplicativo mostra a quantidade disponível na venda e traduz os erros do servidor).
- Tela **Início** (dashboard): indicadores da carteira, resumo diário gerado por IA (com o aviso legal obrigatório), watchlist com preço, variação e sinais, e sinais técnicos ativos com o histórico da mesma condição.
- Tela de **detalhe do ativo** com gráfico de candles e volume, médias móveis e bandas de Bollinger que o usuário liga e desliga, leitura dos valores de cada dia ao tocar no gráfico, painéis de RSI e MACD (calculados no aplicativo com o mesmo histórico e as mesmas fórmulas do servidor, e conferidos com os valores oficiais da API), indicadores oficiais e sinais com o valor no disparo.
- **Busca** de ativos com adição explícita à watchlist: o aplicativo pede confirmação antes de adicionar e mostra "Na watchlist" para os que já estão.
- **Notificações em tempo real** por WebSocket, com banner in-app, selo de não lidas e tela de notificações; alertas de preço com o preço atual e a distância ao alvo, e a aba de sinais técnicos ativos.
- Tratamento explícito de carregamento, lista vazia, falha de comunicação e erro do servidor nas telas.
- Identidade visual do cliente web (tema escuro e claro, fontes Inter e Space Grotesk).

**O que foi alterado:** a primeira aba deixou de ser uma lista simples de ativos e passou a ser o painel Início; a camada de acesso à API passou a renovar a sessão e a traduzir as mensagens de erro do servidor para o português.

## 2. Navegação

Biblioteca: **Expo Router** (rotas por arquivo, pilhas e abas).

| Tela | Rota | Como se chega |
| --- | --- | --- |
| Login | `/login` | Abertura sem sessão; "Entrar" no cadastro |
| Cadastro | `/cadastro` | "Criar conta" no login |
| Início | `/` (aba) | Abertura com sessão |
| Carteira | `/portfolio` (aba) | Aba inferior |
| Alertas | `/alertas` (aba) | Aba inferior |
| Perfil | `/perfil` (aba) | Aba inferior |
| Detalhe do ativo | `/ativo/[id]` | Toque num ativo da watchlist, num sinal ou numa notificação |
| Buscar ativo | `/buscar` | Botão "+" do cabeçalho do Início |
| Nova operação | `/operacao/nova` (modal) | Botão "Nova operação" da Carteira |
| Chat com IA | `/chat` | Botão do cabeçalho da Carteira (em construção) |

**Proteção de rotas.** O layout raiz mostra só `(auth)` sem sessão e só `(tabs)` e as pilhas com sessão (`Stack.Protected`); ao sair ou ao perder a sessão, o aplicativo volta ao login sozinho.

**Dados entre telas.** Só o identificador (e o ticker, para o título) trafega pelos parâmetros de rota, por exemplo `router.push({ pathname: '/ativo/[id]', params: { id, ticker } })`. O restante vem do **cache do TanStack Query**: a mesma chave de consulta não gera nova requisição enquanto o dado está válido, então abrir o detalhe de um ativo já visto na watchlist reaproveita a cotação, os sinais e o histórico da condição que a tela Início já carregou (o gráfico e os indicadores técnicos são buscados ao abrir).

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
| Histórico | `GET /ativos/{id}/historico?periodo=` | Candles e séries dos indicadores (1D a 5A; o 5A também aquece as médias móveis) |
| Indicadores | `GET /ativos/{id}/indicadores` | SMA, RSI, MACD, Bollinger, volume relativo |
| Sinais | `GET /ativos/{id}/sinais` | Sinais técnicos vigentes |
| Backtest | `GET /ativos/{id}/sinais/{regra}/backtest` | Histórico da condição (24 meses) |
| Watchlist | `GET`, `POST /watchlist`; `DELETE /watchlist/{id}`; `PATCH /watchlist/{id}/notificacao` | Lista, adicionar, remover, notificar |
| Alertas | `GET`, `POST /alertas`; `PATCH`, `DELETE /alertas/{id}` | Alertas de preço |
| Operações | `GET`, `POST /operacoes`; `DELETE /operacoes/{id}` | Carteira simulada |
| Carteira | `GET /portfolio/posicoes`, `/rentabilidade`, `/benchmark`, `/distribuicao` | Posições, resultado, CDI/Ibovespa, distribuição |
| Notificações | `GET /notificacoes`; `PATCH /notificacoes/{id}/lida` | Caixa de notificações e resumo diário |
| Tempo real | `WS /notificacoes/ws` | Notificações em primeiro plano (o servidor não reenvia o que chegou com a conexão caída: o app sincroniza pelo `GET`) |

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
| Falha na comunicação | Mensagem "Sem conexão com o servidor (endereço)" ou "O servidor demorou demais para responder (endereço)", com botão "Tentar novamente". Se o dado já estava na tela, ele continua visível |
| Erro enviado pelo servidor | Mensagem em português ("Erro no servidor. Tente novamente em instantes.") e o **código do erro** (`X-Request-ID`) para localizar a requisição nos logs do servidor |

**Apresentação de erros.** Cada bloco trata o próprio erro: se o resumo diário falha, a watchlist e os indicadores continuam aparecendo; se a cotação de um ativo falha, só aquela linha mostra "sem cotação". Mensagens do backend (muitas sem acento) são traduzidas por um dicionário em `src/utils/erros.ts`; as que não constam passam como vieram, exceto erros 5xx, que viram uma mensagem genérica. Valores ausentes nunca viram zero: sem dado, a tela mostra "—" ou "indisponível". Uma falha ao reler um dado que já está na tela não o apaga.

## 5. Regras do produto respeitadas

- Todo texto gerado por IA aparece com o aviso **"Análise gerada por IA. Não constitui recomendação de investimento."**
- Linguagem informativa (RN-01): nenhum texto de análise sugere comprar, vender ou investir; "Compra" e "Venda" aparecem só como o tipo da operação simulada que o próprio usuário registra. Verde e vermelho indicam só valor positivo ou negativo.
- Carteira **simulada**: nenhuma operação é executada em corretora.

## 6. Requisitos do Checkpoint e onde estão no código

| Requisito | Onde |
| --- | --- |
| Navegação funcional entre as telas | `app/_layout.tsx` e `app/(tabs)/_layout.tsx` (Expo Router) |
| Interface com Flexbox | `flexDirection`, `flexWrap`, `flex` e `flexBasis` em `app/(tabs)/index.tsx`, `src/components/Kpi.tsx`, `src/components/LinhaAtivo.tsx` e `src/components/PainelTecnico.tsx` |
| Integração com Web API e requisições HTTP (GET) | `src/api/client.ts` (`fetch`) e uma função por rota em `src/api/*.ts` |
| Conversão e uso do JSON recebido | `resposta.json()` em `src/api/client.ts`; `paraNumero` e os formatadores de `src/utils/formatacao.ts` |
| Renderização dos dados recebidos | `app/(tabs)/index.tsx` e os componentes de `src/components/` |
| async e await | `src/api/client.ts` (`request`) e `src/store/sessao.ts` (`entrar`, `renovar`) |
| useEffect | `app/_layout.tsx` (hidratação da sessão e do tema; `AppState` ligado ao `focusManager`). O carregamento dos dados usa `useQuery` do TanStack Query, que dispara a requisição ao montar a tela e guarda estado, carregamento e erro; por isso as telas de dados não repetem `useEffect` com `useState` |
| Estado para guardar os dados recebidos | `useQuery` em `src/hooks/`, `useSessao` e `usePreferencias` |
| Separação entre componentes visuais e comunicação | `src/api/` (HTTP) separado de `src/hooks/` (estado) e de `app/` e `src/components/` (visual) |
