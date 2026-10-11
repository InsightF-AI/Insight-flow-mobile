# Conferência dos contratos do backend

Scripts Node (sem dependências, Node 20+) que chamam o **backend real local** e conferem o que o app assume: formatos,
status e mensagens. Cada linha sai como `OK` ou `FALHA`; o código de saída é diferente de zero se algo falhar.

Pré-requisito: backend em `http://localhost:8000` (`docker compose up` na pasta do backend). Cada script cria usuários
descartáveis no banco **local**; o token fica só em memória e não é impresso.

| Script | Confere | Observações |
| --- | --- | --- |
| `ia.js desligada` | Análise e chat com a IA desligada: 503 "Provedor de IA indisponivel"; sem token é recusado | Backend sem `AI_HABILITADA` |
| `ia.js stub` | Análise nova e em cache, chat, os limites do `/chat` (20 mensagens, 2000 caracteres, 422), cota com `Retry-After` e guardrail | Precisa da [IA falsa](../ia-falsa/README.md). A primeira checagem ("análise nova") falha se o ativo já foi analisado antes: é o cache do backend, não um erro |
| `dispositivos.js` | `POST /dispositivos` (201 e 200), `DELETE` (204), 422 e 401, e `GET /health` na raiz | Contratos do push |
| `websocket.js protocolo` | `autenticar`, `ping` em até 30 s, reautenticação na mesma conexão e fechamento 4401 com token inválido | Contrato do tempo real |
| `websocket.js entrega` | Cria um alerta já satisfeito e espera a notificação chegar pelo WebSocket | Cripto: o ciclo roda a cada 5 min, pode levar até esse tempo |
| `carteira.js` | 422 de venda sem saldo (o `detail` é só o UUID), data futura, remoção com venda posterior e as escalas de rentabilidade e benchmark | Contratos da carteira |

```bash
node tools/conferencia-backend/ia.js desligada
node tools/conferencia-backend/dispositivos.js
```
