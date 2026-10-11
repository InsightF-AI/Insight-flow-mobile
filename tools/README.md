# Ferramentas de desenvolvimento e teste

Scripts de apoio usados nas etapas deste app. **Não fazem parte do aplicativo**: não entram no bundle, no lint nem nos
testes (`npm run verificar` ignora esta pasta). Todos funcionam só contra o **backend local** (`http://localhost:8000`) e
criam usuários descartáveis no banco local; nenhum imprime token nem guarda segredo.

| Pasta | Para quê | Quando usar |
| --- | --- | --- |
| [`ia-falsa/`](ia-falsa/README.md) | Gemini falso (container Python) que faz análise e chat responderem sem chave real, com cenários de cota e guardrail | Testar os estados de IA no app ou nos scripts sem `GEMINI_API_KEY` |
| [`conferencia-backend/`](conferencia-backend/README.md) | Scripts Node que conferem, contra o backend real, os contratos que o app assume (IA, dispositivos, WebSocket, carteira) | Depois de mudar o client da API, ou quando o backend mudar |
| [`previa-web/`](previa-web/README.md) | Receita para rodar o app no navegador (só para visualizar) e roteiros automatizados com capturas de tela | Gerar capturas para a documentação e percorrer o app sem celular |

O que a prévia web **não** cobre (gráfico Skia, toque, teclado, interruptores nativos, SecureStore real, push e leitores
de tela) está em [`docs/roteiro-de-teste-no-aparelho.md`](../docs/roteiro-de-teste-no-aparelho.md).
