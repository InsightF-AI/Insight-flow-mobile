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
- Sessão só via `useSessao` (`src/store/sessao.ts`): uma chave `insightflow.sessao` no SecureStore com access, refresh, vencimento e e-mail. O client renova sozinho (antes de vencer e no 401); telas nunca chamam `/auth/refresh`.
- Rotas `/auth/*` não levam `Authorization`. Chamadas lentas passam `timeoutMs` ao `request` (padrão 20 s).
- Mensagem de erro para o usuário só via `mensagemDeErro`; o `requestId` aparece como "Código do erro" no `ErroComRetry`.
- Push: só `src/notificacoes/push.ts` fala com `expo-notifications` (carga sob demanda: nada é carregado no Expo Go). A vontade do usuário é `usePreferencias.pushLigado`; o que o aparelho consegue é `usePush` (`src/store/push.ts`). A permissão só é pedida sozinha quando ainda não foi decidida. O `DELETE /dispositivos` roda no fluxo de sair do Perfil, antes de limpar a sessão e com limite de 4 s. Sem `projectId` (`EAS_PROJECT_ID`), no Expo Go e em simulador o push fica "indisponível" com explicação.
- IA: chamadas de IA nunca repetem sozinhas (cada uma gasta cota). A análise é a consulta desligada de `useAnaliseIA` (só o botão dispara); a conversa do chat vive em memória em `src/store/conversa.ts` (limpa ao sair da conta; resposta tardia é descartada) e o corpo do `/chat` sai de `montarMensagensDaApi` (`src/dominio/ia.ts`), que respeita os limites do backend. O card da análise usa `avisoLegalDe` (o aviso da API, ou o fixo se vier vazio); o rodapé do chat mostra sempre o aviso fixo e o botão Copiar leva o `avisoLegal` guardado da resposta.

## Regras visuais (identidade do web)
- Cores, sombras e séries só via `useTema()` (`cores`, `tons`, `grafico`, `sombras`, `serie`); hex/`rgba` literais só em `src/theme/`. O tema padrão é o escuro; a preferência fica em `src/store/preferencias.ts`.
- Nunca use `fontWeight`: a fonte é escolhida pela família (`Texto` ou `familia.*` de `@/theme/familias`).
- Ícones só pelo wrapper `Icone` (lucide); novos ícones entram no mapa de `src/components/Icone.tsx` com nome em pt-BR.
- Contraste ≥ 4,5:1 nos dois temas (`src/theme/cores.test.ts`); alvos de toque ≥ 44 pt.
- As variantes do `Botao` (`primario`, `secundario` e `perigo`) mantêm os nomes; só o visual mudou.
- Jest mapeia `lucide-react-native` para o build CJS (`moduleNameMapper` na config do jest em `package.json`): o resolvedor do RN escolhe o `.mjs` ESM, que o transform do jest-expo não cobre. O Metro não é afetado.
- Os ícones lucide são `aria-hidden`; nos testes, consulte-os com `{ includeHiddenElements: true }`.
- Referência visual: spec `docs/superpowers/specs/2026-09-26-redesign-visual-web-design.md`.

## React Native Testing Library in this project

This project uses `@testing-library/react-native`. Its APIs and testing conventions can differ from your training data.
Before writing or changing RNTL tests, read the relevant guide in
`node_modules/@testing-library/react-native/docs/`, starting with
`node_modules/@testing-library/react-native/docs/guides/llm-guidelines.md`.
Prefer those package docs over stale assumptions, and follow deprecation notices.

Listas (FlatList) não exigem nada especial nos testes: o `afterEach` de `jest.setup.ts` aguarda o timer de lote do VirtualizedList antes do cleanup do RNTL. Por isso `jest.setup.ts` não pode importar `@testing-library/react-native` no topo (só `pure`, via require preguiçoso).

## Expo muda a cada SDK
Antes de usar uma API do Expo, EAS ou React Native, consulte a documentação da versão em uso (`https://docs.expo.dev/versions/v57.0.0/`; índice em `https://docs.expo.dev/llms.txt`) em vez de confiar na memória. Dependências novas entram com `npx expo install <pacote>`.
