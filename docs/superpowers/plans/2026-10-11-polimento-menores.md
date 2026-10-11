# Polimento dos menores adiados (Etapas 4 a 8): registro

> Rodada curta, sem plano de tarefas: cada correção foi feita com teste vermelho antes do código. Este arquivo registra
> o que foi corrigido, de onde veio e o que continua adiado.

**Objetivo:** fechar os menores adiados das revisões das Etapas 4 a 8 que o usuário veria no aparelho (teclado, gráfico,
volume de cripto, selo de notificações, textos e leitor de tela), sem mexer em nada que dependa de aparelho ou de
decisão da equipe.

**Base:** `feature/etapa-8-perfil-push` (PR #9). **Branch:** `feature/polimento-menores`.

## Corrigido

| # | Origem | Problema | Correção | Teste (vermelho antes) |
| --- | --- | --- | --- | --- |
| 1 | Etapa 7, item 9 | `Tela` não passava deslocamento ao `KeyboardAvoidingView`: sob um cabeçalho, o teclado do iOS cobre o fim dos formulários (nova operação, alerta) | `keyboardVerticalOffset` = `HeaderHeightContext` (0 sem cabeçalho, como em login e cadastro) | `src/components/tela.test.tsx` |
| 2 | Etapa 4 | Trocar o período zerava as médias e o Bollinger escolhidos | O estado sobe para a tela do ativo (`sobreposicoesIniciais` e `aoMudarSobreposicoes` do painel; padrão em `SOBREPOSICOES_PADRAO`, em `src/dominio/candles.ts`) | `graficoTecnico.test.tsx` e `__tests__/telas/ativo.test.tsx` |
| 3 | Etapa 4 | Volume de cripto arredondado para inteiro: 0,42 BTC aparecia como "Volume 0" | `formatarVolume`: até 4 casas abaixo de mil, inteiro de mil em diante | `formatacao.test.ts` e `graficoTecnico.test.tsx` |
| 4 | Etapa 5 | "Marcar todas como lidas" sem rede deixava o selo em zero com não lidas no servidor | A marcação otimista é desfeita para os ids que o servidor não confirmou | `__tests__/telas/notificacoes.test.tsx` |
| 5 | Etapa 6 | Trocar de Venda para Compra deixava o erro de quantidade da venda na tela | A troca de tipo apaga o erro de quantidade e o erro geral | `__tests__/telas/nova-operacao.test.tsx` |
| 6 | Etapa 6 | A mensagem do 422 dizia "na data informada" mesmo quando a causa era uma venda posterior | Texto cobre as duas causas | `nova-operacao.test.tsx` e `operacao.test.ts` |
| 7 | Etapa 4 | O `aria-label` da linha de busca escondia o estado "Na watchlist" do leitor de tela | `accessibilityHint` diz se já está na watchlist ou o que o toque faz (o nome acessível não mudou) | `__tests__/telas/buscar.test.tsx` |
| 8 | Etapa 7, item 7 | `formatarEspera` devolvia "cerca de 60 min" entre 3541 e 3599 s | Fecha em "cerca de 1 h" | `errosIA.test.ts` |

## Continua adiado

- **Depende de aparelho ou de decisão:** push real (Etapa 8, parte B), teclado/rolagem/leitor de tela em Android, canal
  do push, `ws://` em build de produção.
- **Etapa 4:** escala do gráfico com série parada por resíduo de ponto flutuante; SMA 200 liga sem desenhar na B3; a
  mira não mostra médias nem Bollinger; testes do `Tap` e da troca de período no gráfico.
- **Etapa 5:** notificação do WebSocket perdida se um `GET` já em voo responde sem ela; guardas de corrida do cliente
  WebSocket sem teste; selo da aba no nome acessível do iOS; banners repetidos não reanunciados.
- **Etapa 6:** falha de recarregamento da watchlist troca o formulário pela tela de erro; alvo de toque do filtro de
  posições em tela estreita; acessibilidade de `ItemPosicao`; `mutateAsync` espera o recarregamento da carteira.
- **Etapa 7:** itens 1 a 6 e 8 (chamada dupla de `gerar()`, espera da cota que envelhece, anúncio do "Gerando…" para
  leitor de tela, seleção manual sem aviso legal, corpo do `/chat` com espaços, `refetchQueries()` sem filtro,
  re-render dos balões).
- **Etapa 8:** itens 1 a 8 (permissão revogada nos Ajustes, "Verificando" a cada retorno, toque tratado antes da
  navegação, API obsoleta de última resposta, texto do estado "erro", `testarConexao` na rota, prévia web, herdado do
  client).

## Verificação

`npm run verificar` verde: 97 suítes e 1.026 testes (antes: 96 e 1.008). Não testado em aparelho: o deslocamento do
teclado em cada tela com cabeçalho (iPhone e Android) e a leitura da dica da busca com VoiceOver e TalkBack.
