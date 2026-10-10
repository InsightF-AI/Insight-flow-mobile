# Insight Flow — Mobile

Cliente mobile (Android e iOS) do Sistema de Análise de Ativos do Mercado Financeiro. Consome exclusivamente a API REST do [backend](https://github.com/InsightF-AI/Insight-flow-backend).

> Ferramenta de análise e apoio à decisão, com caráter educacional. Não constitui recomendação de investimento.

## Funcionalidades

- Cadastro e login com sessão renovada automaticamente (access token de 30 min e refresh token de 30 dias no SecureStore); sair revoga a sessão no servidor
- Início: indicadores da carteira (patrimônio, resultado, variação do dia, sinais ativos), resumo diário por IA com aviso legal, watchlist com preço, variação, sinais e notificação por ativo, e sinais técnicos ativos com o histórico da condição. Busca de ativos com adição explícita à watchlist (o ativo só entra depois da confirmação)
- Detalhe do ativo: gráfico de candles com volume (1D a 5A), médias móveis (SMA 20/50/200) e Bollinger alternáveis, leitura de abertura, máxima, mínima, fechamento e volume por toque, painéis de RSI (14, com 30 e 70) e MACD (12/26/9), que só aparecem com o histórico anterior ao período (o 5A) para não mostrar valores diferentes dos oficiais; indicadores técnicos oficiais da API; e sinais ativos com o valor do indicador no disparo e o histórico da condição (5, 20 e 60 pregões, "sem dados" quando não há)
- Alertas de preço (criar, ativar/desativar, remover)
- Notificações in-app, atualizadas a cada 60 s com o app aberto
- Portfólio simulado: rentabilidade, comparação com CDI e Ibovespa, distribuição por classe, setor e moeda, posições e histórico de operações
- Telas de IA (análise do ativo e chat) prontas com o aviso legal; a integração com os endpoints do backend é a etapa 7 do [plano](docs/PLANO.md)
- Tema escuro (padrão) e claro, alternável no Perfil, com a mesma identidade visual do cliente web

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

   Endereços `http://` funcionam no Expo Go e em desenvolvimento. Uma development build ou uma build de release exige HTTPS (ou liberar tráfego em texto claro no Android e uma exceção de ATS no iOS).

   Se o endereço for inválido (por exemplo, terminando em `/api/v1`), o app abre numa tela que explica como corrigir. Passo a passo para testar no celular, incluindo firewall e IP: [`docs/PLANO.md` §9](docs/PLANO.md#9-como-testar-no-celular-ou-no-emulador).

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

## Próximas etapas

O roteiro está em [`docs/PLANO.md`](docs/PLANO.md): alertas com WebSocket, portfólio, IA e push (o dashboard, o gráfico de candles e a busca já estão prontos). Recuperação de senha não existe no backend.
