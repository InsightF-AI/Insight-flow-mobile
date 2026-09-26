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
