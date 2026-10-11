# Entrega do Checkpoint 02: Programação Mobile

Prof. Lenon Fachiano Silva, Toledo Prudente Centro Universitário. **Entrega: 20/10/2026.**

Esta pasta reúne o que o enunciado pede, com o mapa de onde está cada item. O texto da documentação em si é
[`docs/checkpoint-02.md`](../../checkpoint-02.md).

## Itens da entrega

| # | Pede o enunciado | Onde está |
| --- | --- | --- |
| 1 | Código-fonte completo e atualizado do projeto React Native | Este repositório. Estado atual: branch `feature/documentacao-entrega-cp2` (empilhada sobre os PRs #1 a #10). Depois do merge, `develop` |
| 2 | Código ou indicação da WebAPI utilizada | `Insight-flow-backend` (FastAPI): <https://github.com/InsightF-AI/Insight-flow-backend>. Sobe com `docker compose up` em `http://localhost:8000`; Swagger em `/docs`. Endpoints usados: [`docs/checkpoint-02.md` §3](../../checkpoint-02.md#3-integração-com-a-webapi) |
| 3 | Documentação do Checkpoint 2 | [`docs/checkpoint-02.md`](../../checkpoint-02.md): evolução do projeto, navegação, integração com a WebAPI e tratamento de estado |
| 4 | Termo de Uso de Inteligência Artificial Generativa | [`Termo_Uso_IA_Checkpoint02.docx`](Termo_Uso_IA_Checkpoint02.docx) (rascunho para o estudante revisar, assinar e entregar) |
| 5 | Hyperlink do repositório (opcional) | <https://github.com/InsightF-AI/Insight-flow-mobile> (privado: dar acesso ao professor) |

## Requisitos obrigatórios e onde se vê

A tabela completa, com arquivos e símbolos, está em [`docs/checkpoint-02.md` §6](../../checkpoint-02.md#6-requisitos-do-checkpoint-e-onde-estão-no-código).

## Situações mínimas tratadas

Cada uma tem teste automatizado (`__tests__/telas/inicio.test.tsx` e os das outras telas) e, quando indicado, captura.

| Situação | Como o app se comporta | Captura |
| --- | --- | --- |
| WebAPI disponível e com dados | Indicadores, resumo, watchlist e sinais | [`03`](capturas/03-inicio-com-dados.png), [`04`](capturas/04-detalhe-do-ativo.png), [`08`](capturas/08-carteira.png) |
| WebAPI disponível sem registros | Mensagem de lista vazia com ação; indicadores com "—", nunca "R$ 0,00" | [`02`](capturas/02-inicio-vazio.png), [`11`](capturas/11-alertas.png) |
| Aguardando resposta | Esqueletos nos blocos e indicador de carregamento | **sem captura ainda** (fazer no aparelho) |
| Falha na comunicação | "Sem conexão com o servidor (endereço)" com "Tentar novamente"; o dado que já estava na tela continua | **sem captura ainda** (fazer no aparelho: desligar o backend) |
| Erro enviado pelo servidor | Mensagem em português e o código do erro (`X-Request-ID`) | [`07`](capturas/07-analise-por-ia-indisponivel.png), [`14`](capturas/14-chat-limite-de-uso.png), [`15`](capturas/15-chat-filtro-de-linguagem.png), [`16`](capturas/16-chat-ia-indisponivel.png) |

## Capturas

Capturas da execução do app **em navegador** (prévia web, 390×844) contra a WebAPI local, geradas pelos roteiros de
[`tools/previa-web`](../../../tools/previa-web/README.md). Nesse modo os gráficos desenhados com Skia aparecem como espaço
reservado, e as respostas de IA vêm de um provedor de teste ([`tools/ia-falsa`](../../../tools/ia-falsa/README.md)).
**Substitua pelas do iPhone/Android antes de entregar** (o roteiro está no bloco 8 de
[`docs/roteiro-de-teste-no-aparelho.md`](../../roteiro-de-teste-no-aparelho.md)).

| Arquivo | Mostra |
| --- | --- |
| `01-cadastro.png` | Cadastro |
| `02-inicio-vazio.png` | Início de uma conta nova: indicadores com "—", watchlist vazia com ação |
| `03-inicio-com-dados.png` | Início com watchlist, preço, variação e sinais |
| `04-detalhe-do-ativo.png` | Detalhe do ativo: cotação, períodos, médias, leitura do candle e indicadores |
| `05-analise-por-ia-gerada.png` | Análise por IA: texto, "Gerada em", modelo e aviso legal |
| `06-analise-por-ia-reaproveitada.png` | Análise reaproveitada do cache |
| `07-analise-por-ia-indisponivel.png` | IA desligada no servidor (503) |
| `08-carteira.png` | Carteira simulada: KPIs, comparativo e distribuição |
| `09-nova-operacao.png` | Formulário de nova operação (simulada) |
| `10-venda-acima-do-disponivel.png` | Venda maior que a quantidade disponível |
| `11-alertas.png` | Alertas de preço (lista vazia) |
| `12-banner-em-tempo-real.png` | Banner de alerta entregue por WebSocket, com o selo na aba |
| `13-chat-resposta.png` | Chat com IA, com o aviso legal |
| `14-chat-limite-de-uso.png` | Limite de uso da IA (429 do provedor) |
| `15-chat-filtro-de-linguagem.png` | Resposta bloqueada pelo filtro de linguagem (502) |
| `16-chat-ia-indisponivel.png` | Pergunta "Não enviada" com "Tentar novamente" |
| `17-perfil.png` | Perfil: conta, push, notificar por ativo, servidor, tema |
| `18-tema-claro.png` | Tema claro |

## Antes de entregar

- [ ] Preencher o "Ponto de partida (Checkpoint 01)" em [`docs/checkpoint-02.md`](../../checkpoint-02.md): o Termo do
      Checkpoint 01 cita o aplicativo "Controle de Gastos" e o enunciado pede evolução do projeto do Checkpoint 1;
      explicar a relação com o InsightFlow.
- [ ] Ler o Termo de Uso de IA, conferir cada declaração, trocar as capturas e assinar.
- [ ] Rodar o [roteiro de teste no aparelho](../../roteiro-de-teste-no-aparelho.md) e anotar o resultado.
- [ ] Capturar no aparelho os estados "aguardando resposta" e "falha na comunicação".
- [ ] Conferir que o repositório está acessível ao professor e que a branch entregue é a esperada.
