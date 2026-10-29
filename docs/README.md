# Documentação do app mobile

Índice do que existe em `docs/`, na ordem em que vale ler.

## Para quem avalia a entrega (Checkpoint 02)

| Documento | O que é |
| --- | --- |
| [`checkpoint-02.md`](checkpoint-02.md) | Documentação do Checkpoint 02: evolução do projeto, navegação, integração com a WebAPI e tratamento de estado |
| [`entregas/checkpoint-02/`](entregas/checkpoint-02/README.md) | Itens da entrega (Termo de Uso de IA, capturas, status do card) e a lista do que falta antes de entregar |
| [`distribuicao-apk.md`](distribuicao-apk.md) | Como gerar o link do APK (EAS Build), quem faz cada parte e o que falta do servidor |

## Para quem desenvolve

| Documento | O que é |
| --- | --- |
| [`../README.md`](../README.md) | Funcionalidades, como rodar, scripts e estrutura |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Git Flow, padrão de commits, regras de PR e como mesclar a pilha de PRs |
| [`MAPEAMENTO.md`](MAPEAMENTO.md) | Fase 1: o que existe na organização (backend, web, desktop), rotas, regras de negócio, decisões D1 a D12 e sugestões de mudança na API |
| [`PLANO.md`](PLANO.md) | Fase 2: stack, pastas, navegação, camada de API, tema, notificações, roteiro em etapas e como testar no celular (§9) |
| [`roteiro-de-teste-no-aparelho.md`](roteiro-de-teste-no-aparelho.md) | O que só o celular confere (toque, teclado, rede real, leitores de tela, push), com o resultado esperado de cada passo |
| [`entregas/acessibilidade-e-responsividade.md`](entregas/acessibilidade-e-responsividade.md) | Formulários pelo teclado, erros para leitor de tela, fonte grande e tablet: o que mudou, como foi feito e o que falta conferir |
| [`superpowers/specs/`](superpowers/specs/) | Desenhos (spec) do MVP e do redesign visual |
| [`superpowers/plans/`](superpowers/plans/) | Um plano por etapa, com tarefas, testes, revisão e o "Registro da execução" (menores adiados, o que não foi verificado) |
| [`../tools/`](../tools/README.md) | IA falsa, conferência dos contratos do backend e prévia web |

## Mapa dos pull requests

Foram publicados empilhados (cada um apontando para o anterior; o #1 apontava para `develop`) e **entraram na `develop` de uma só vez, pelo #11, com merge commit, em 11/10/2026**. A `main` recebeu a release `v0.1.0` (tag). Os PRs #1 a #10 foram fechados com a indicação do #11; as branches `feature/*` continuam no repositório como histórico.

| PR | Branch | Conteúdo |
| --- | --- | --- |
| [#1](https://github.com/InsightF-AI/Insight-flow-mobile/pull/1) | `feature/app-mobile-mvp` | MVP do app (Expo SDK 57) |
| [#2](https://github.com/InsightF-AI/Insight-flow-mobile/pull/2) | `feature/redesign-web` | Identidade visual do cliente web |
| [#3](https://github.com/InsightF-AI/Insight-flow-mobile/pull/3) | `feature/ciclo-1-base-sessao` | Ciclo 1: base do repositório e sessão com refresh token; mapeamento e plano |
| [#4](https://github.com/InsightF-AI/Insight-flow-mobile/pull/4) | `feature/etapa-3-inicio` | Etapa 3: aba Início e documento do Checkpoint 02 |
| [#5](https://github.com/InsightF-AI/Insight-flow-mobile/pull/5) | `feature/etapa-4-detalhe-do-ativo` | Etapa 4: gráfico técnico e busca com adição explícita |
| [#6](https://github.com/InsightF-AI/Insight-flow-mobile/pull/6) | `feature/etapa-5-alertas-notificacoes` | Etapa 5: tempo real (WebSocket), banner e aba Alertas |
| [#7](https://github.com/InsightF-AI/Insight-flow-mobile/pull/7) | `feature/etapa-6-carteira-operacoes` | Etapa 6: carteira, KPIs e operações simuladas |
| [#8](https://github.com/InsightF-AI/Insight-flow-mobile/pull/8) | `feature/etapa-7-analise-ia-chat` | Etapa 7: análise por IA e chat |
| [#9](https://github.com/InsightF-AI/Insight-flow-mobile/pull/9) | `feature/etapa-8-perfil-push` | Etapa 8 (parte A): perfil e cliente de push; roteiro de teste no aparelho |
| [#10](https://github.com/InsightF-AI/Insight-flow-mobile/pull/10) | `feature/polimento-menores` | Polimento dos menores adiados e patches do Expo SDK 57 |
| [#11](https://github.com/InsightF-AI/Insight-flow-mobile/pull/11) | `feature/documentacao-entrega-cp2` | Esta documentação, `CONTRIBUTING.md`, pasta da entrega e `tools/` |
| [#15](https://github.com/InsightF-AI/Insight-flow-mobile/pull/15) | `feature/senha-e-dividendos` | Recuperação e troca de senha, dividendos por ativo e da carteira; [`entregas/senha-e-dividendos.md`](entregas/senha-e-dividendos.md) |
| [#19](https://github.com/InsightF-AI/Insight-flow-mobile/pull/19) | `feature/acessibilidade-formularios` | Formulários pelo teclado, erros para leitor de tela, fonte grande e tablet; [`entregas/acessibilidade-e-responsividade.md`](entregas/acessibilidade-e-responsividade.md) |

Ordem e forma de mesclar: [`CONTRIBUTING.md`](../CONTRIBUTING.md#pull-requests-empilhados-como-o-histórico-atual-foi-publicado).

## Estado e pendências

| Item | Situação |
| --- | --- |
| Código no repositório | Em `develop` e em `main` (tag `v0.1.0`), desde 11/10/2026 |
| Etapas 1 a 8 (parte A) | Prontas e testadas por automação (97 suítes, 1.026 testes) e conferidas contra o backend local |
| Teste em aparelho | Aberto no iPhone com Expo Go; o [roteiro](roteiro-de-teste-no-aparelho.md) completo ainda não foi concluído |
| Push com o app fechado (Etapa 8, parte B) | Depende da decisão D8: conta Expo/EAS, projeto Firebase (Android) e conta Apple Developer (iOS) |
| "Ponto de partida (Checkpoint 01)" em `checkpoint-02.md` | A preencher pelo estudante: o Termo do Checkpoint 01 cita o app "Controle de Gastos" |
| CI do GitHub | O workflow `.github/workflows/ci.yml` não teve nenhuma execução neste repositório (o backend e o desktop têm); conferir em Settings → Actions |
| Status na issue #9 do backend | **Publicado em 11/10/2026** ([comentário](https://github.com/InsightF-AI/Insight-flow-backend/issues/9#issuecomment-6113166864)); o texto está em [`entregas/checkpoint-02/status-issue-9.md`](entregas/checkpoint-02/status-issue-9.md) |

Os menores adiados de cada etapa estão no "Registro da execução" do plano correspondente; os que continuam abertos depois
do polimento estão em [`superpowers/plans/2026-10-11-polimento-menores.md`](superpowers/plans/2026-10-11-polimento-menores.md).
