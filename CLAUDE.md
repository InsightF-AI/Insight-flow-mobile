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

Listas (FlatList) não exigem nada especial nos testes: o `afterEach` de `jest.setup.ts` aguarda o timer de lote do VirtualizedList antes do cleanup do RNTL. Por isso `jest.setup.ts` não pode importar `@testing-library/react-native` no topo (só `pure`, via require preguiçoso).
