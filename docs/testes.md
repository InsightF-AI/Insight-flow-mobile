# Estratégia de testes — mobile

A pirâmide tem três andares. **Base:** testes de unidade sobre código puro, sem React — regras de `src/dominio/` (conversão de decimais da API, percentuais por escala, sinais, operações), validação de `EXPO_PUBLIC_API_URL` em `src/config/` e os helpers de `src/utils/`. **Meio:** o maior andar aqui — client HTTP (`src/api/`) com a rede dublada, hooks e stores, componentes isolados, e as telas do `app/` montadas com a Testing Library e operadas como o usuário opera (digitar, tocar, ler o que aparece). **Topo:** aparelho real é manual, pelo `docs/roteiro-de-teste-no-aparelho.md`.

Cobertura da V0: autenticação e renovação de sessão, watchlist, detalhe do ativo, sinais, alertas, notificações e push, carteira e operações, análise de IA e chat, preferências e tema, além do contraste mínimo das cores nos dois temas. Nenhum teste acessa a rede.

Fica para depois: automação em aparelho ou emulador (Maestro ou Detox), teste de contrato contra a API de homologação e cobertura de código publicada.

TDD é o ciclo vermelho, verde, refatora: primeiro o teste que falha, depois o código mínimo que o faz passar, e só então a melhoria do desenho.

São **1.026 testes** em 97 suítes. Rodar: `npm test` (ou `npm run test:ci`, como no CI) e `npm run verificar` para lint, typecheck e testes juntos.
