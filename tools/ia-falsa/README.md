# IA falsa (Gemini de teste)

Serve para ver a **análise por IA** e o **chat** funcionando de ponta a ponta sem uma chave real do Gemini. O backend
fala com este servidor no lugar do provedor. Não altera nada no repositório do backend: o desvio é feito por um arquivo de
override do `docker compose`.

## Como funciona

`gemini_falso.py` responde `POST /v1beta/models/<modelo>:generateContent` no formato do Gemini. O cenário vem do último
texto do usuário:

| Pergunta contém | Resposta do falso | O que o backend devolve ao app |
| --- | --- | --- |
| qualquer outro texto | "Resposta de teste do Gemini falso. O RSI(14) está em 28,4…" | 200 com o texto, o modelo e o aviso legal |
| `#cota` | 429 com `Retry-After: 37` | 503 "Cota do provedor de IA excedida" (o app mostra "Tente novamente em 37 s") |
| `#guardrail` | texto com recomendação de compra | 502 "Resposta da IA bloqueada pelo guardrail" |

Cada chamada é registrada em `tools/ia-falsa/stub.log` (cenário, número de mensagens e rota): serve para conferir o
histórico que o app envia e o cache da análise.

## Subir

No Windows, com o Docker ligado e o backend já criado (`docker compose up` ao menos uma vez):

```powershell
# 1. o falso, na rede do compose do backend (a imagem é a que o compose construiu)
docker run -d --name gemini-stub --network insight-flow-backend_default `
  -v "<caminho>\Insight-flow-mobile\tools\ia-falsa:/stub" insight-flow-backend-app python /stub/gemini_falso.py

# 2. o backend apontando para ele (na pasta do backend)
docker compose -f docker-compose.yml -f "<caminho>\Insight-flow-mobile\tools\ia-falsa\override-ia.yml" up -d app
```

Os nomes `insight-flow-backend_default` e `insight-flow-backend-app` vêm do nome da pasta do backend; ajuste se a sua
pasta tiver outro nome (`docker network ls` e `docker images`).

## Desligar (voltar ao normal)

```powershell
docker rm -f gemini-stub
docker compose up -d app        # na pasta do backend, sem o override
docker exec insight-flow-backend-app-1 sh -c 'echo "AI_HABILITADA=[$AI_HABILITADA]"'   # deve mostrar []
```

## Cuidados

- A análise é cacheada **por ativo** no backend, entre contas e execuções: um ativo já analisado volta como "Reaproveitada
  de…". Para ver "Gerada em…", use um ticker que ainda não foi analisado.
- Em cota e guardrail o backend chama o provedor duas vezes por pedido (nova tentativa interna): é esperado no log.
- A chave do override é falsa de propósito. Nunca coloque uma chave real em arquivo versionado.
