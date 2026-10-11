# Prévia web (só para visualizar)

O app é Android e iOS e **não tem alvo web**. Esta receita sobe uma versão no navegador, descartável, para ver as telas no
PC e gerar capturas. Nada daqui é commitado: a receita é aplicada, usada e desfeita.

## O que a prévia troca por stubs

| No aparelho | Na prévia |
| --- | --- |
| `expo-secure-store` | `localStorage` |
| Gráficos desenhados com Skia (candles, RSI/MACD, distribuição) | Espaço reservado "[prévia web] gráfico desenhado com Skia: só no aparelho" |
| `Alert.alert` (confirmações) | `window.confirm` / `window.alert` |

## Passo a passo

Na raiz do projeto, com o backend em `http://localhost:8000`:

```bash
# 1. dependências web (alteram package.json e o lock: serão desfeitas no fim)
npx expo install react-native-web @expo/metro-runtime
npm install --no-save playwright-core

# 2. configuração local (fora do git)
cp tools/previa-web/metro.config.js metro.config.js
echo "metro.config.js" >> .git/info/exclude
echo "EXPO_PUBLIC_API_URL=http://localhost:8000" > .env

# 3. servidor (CI=1 evita o modo de recarga; pare e suba de novo depois de mexer em código)
CI=1 npx expo start --web --port 8081 --clear
```

O Chrome precisa de `--disable-web-security` porque a API só libera a origem `http://localhost:5173` (CORS); os roteiros
já abrem o Chrome assim. Defina `CHROME_PATH` se o Chrome não estiver no caminho padrão do Windows.

## Roteiros (Playwright, viewport 390×844)

Rodam da raiz do projeto e gravam as capturas em pastas do diretório atual (ignoradas pelo git).

| Roteiro | O que percorre |
| --- | --- |
| `roteiros/cadastro-e-telas.js` | Cadastro, busca e adição de PETR4, VALE3 e BTC, detalhe, análise e chat (IA desligada), carteira com compra, alertas, perfil, tema claro e sair |
| `roteiros/ia-ligada.js` | Análise (gerada e reaproveitada) e chat com a [IA falsa](../ia-falsa/README.md): cópia, limite de 2000, cota, guardrail, limpar e sair |
| `roteiros/alerta-e-venda.js <e-mail> <senha>` | Alerta de BTC, venda acima do disponível e venda válida |
| `roteiros/banner-do-alerta.js <e-mail> <senha>` | Espera o banner do alerta por WebSocket (até 7 min) e toca nele |

## Desfazer

```bash
rm .env metro.config.js
git checkout -- package.json package-lock.json tsconfig.json expo-env.d.ts
npm ci
```

Remova também a linha `metro.config.js` de `.git/info/exclude`.

## Armadilhas conhecidas

- O Metro em `CI=1` não recompila ao salvar: pare o processo da porta 8081 e suba de novo com `--clear`.
- O Expo mexe em `tsconfig.json` e apaga `expo-env.d.ts` ao iniciar: restaure com `git checkout`, como acima.
- O que a prévia não cobre (toque no gráfico, teclado, interruptores nativos, push, leitores de tela) está no
  [roteiro de teste no aparelho](../../docs/roteiro-de-teste-no-aparelho.md).
