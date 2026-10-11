# Roteiro de teste no aparelho

O que o código e os testes automatizados **não** conseguem conferir: toque, rolagem, teclado, desempenho, rede real, leitores de tela e o push. Este roteiro junta, em uma lista só, tudo o que ficou marcado como "não verificado" nas Etapas 1 a 8, com o resultado esperado de cada passo.

Preparação (backend, rede do Windows, `.env` e Expo Go): [`docs/PLANO.md`, seção 9](PLANO.md#9-como-testar-no-celular-ou-no-emulador). Em resumo:

1. `docker compose up -d` no `Insight-flow-backend` e `curl http://localhost:8000/health` → `{"status":"ok"}`.
2. No navegador do **celular**, abrir `http://<IP-do-PC>:8000/health`. Se não abrir, o app também não conecta (firewall, rede pública ou Wi-Fi diferente).
3. No `Insight-flow-mobile`: `.env` com `EXPO_PUBLIC_API_URL=http://<IP-do-PC>:8000` e `npx expo start -c`.
4. Abrir no **Expo Go** (versão do SDK 57).

Como usar: percorra na ordem (cada bloco usa o que o anterior criou), marque ✔ ou ✘ e anote o que viu. Se algo falhar, anote **a tela, o que fez, a mensagem e o "Código do erro"** (aparece nas telas de erro; é o `X-Request-ID` que localiza a chamada nos logs do backend). Capturas de tela dos estados do bloco 10 servem para o relatório do Checkpoint 02.

## 1. Conta e sessão

| Passo | Esperado | ✔ |
| --- | --- | --- |
| Criar conta (nome, e-mail, senha) | Entra direto no Início | |
| Fechar o app por completo e abrir de novo | Continua logado, sem pedir senha | |
| Perfil → Sair, depois entrar de novo | Volta ao login e entra | |
| **Renovação (opcional):** no `.env` do backend `JWT_EXPIRATION_MINUTES=2`, `docker compose up -d`; entrar, esperar 3 min e navegar | Continua logado (renova sozinho). Voltar ao login só se a sessão tiver sido revogada | |

## 2. Início e busca

| Passo | Esperado | ✔ |
| --- | --- | --- |
| Início recém-criado | Estado vazio com "Buscar ativo"; KPIs sem número inventado ("—" ou "indisponível") | |
| Botão **+** do cabeçalho → buscar `PETR4` → adicionar (confirmar) | Pede confirmação; o ativo entra na watchlist com preço e variação | |
| Adicionar `VALE3` e `BTC` | Idem; `BTC` (cripto) funciona sem chave | |
| Buscar de novo `PETR4` | Mostra o selo "Na watchlist" | |
| Puxar a tela para baixo | Atualiza | |

## 3. Detalhe do ativo e gráfico (Etapa 4)

| Passo | Esperado | ✔ |
| --- | --- | --- |
| Tocar em `PETR4` | Abre o detalhe com cotação, gráfico, indicadores e sinais | |
| Trocar o período (1D, 1S, 1M, 3M, 1A, 5A) | O gráfico muda sem travar; 1D mostra só a cotação atual e explica | |
| **Arrastar o dedo sobre o gráfico** | Aparece a mira com data, abertura, máxima, mínima, fechamento e volume do dia | |
| Rolar a tela na vertical **fora** do gráfico e arrastando de lado dentro dele | A tela rola; a mira não "rouba" a rolagem | |
| Ligar e desligar SMA 20, SMA 50, SMA 200 e Bollinger | As linhas aparecem e somem | |
| Períodos 1M, 3M e 1A | RSI e MACD aparecem (com o histórico de aquecimento); no 5A também | |
| Girar o aparelho e voltar | O gráfico se redesenha sem erro | |
| Percepção geral | Fluido (sem engasgos ao arrastar a mira ou trocar de período) | |

## 4. Alertas e notificações em tempo real (Etapa 5)

| Passo | Esperado | ✔ |
| --- | --- | --- |
| Alertas → Preço → criar alerta de `BTC` "maior ou igual" com alvo **um pouco abaixo** do preço atual | O alerta aparece com preço atual e distância ao alvo | |
| Deixar o app aberto e esperar até 5 min (ciclo de cripto) | **Banner no topo**, selo no sino do Início e badge na aba Alertas | |
| Tocar no banner | Abre o ativo e marca a notificação como lida | |
| Sino do Início → caixa de notificações; "Marcar todas como lidas" | A lista atualiza e os selos zeram | |
| Colocar o app em segundo plano por 1 min e voltar | Sincroniza sem duplicar notificações | |
| Aba Alertas → Sinais | Sinais técnicos ativos com histórico (podem não existir: dependem do mercado) | |

## 5. Carteira e operações (Etapa 6)

| Passo | Esperado | ✔ |
| --- | --- | --- |
| Carteira vazia | Mensagem de vazio; aviso de que é simulação | |
| **Nova operação**: compra de `PETR4`, quantidade 10, preço atual, data de alguns dias atrás | Registra; KPIs, posição e comparativo com CDI/Ibovespa aparecem | |
| Ibovespa | "Indisponível" quando a fonte não cobre (nunca 0%) | |
| Nova operação: venda de `PETR4` maior que a quantidade disponível | Mostra "Disponível para venda: N" e recusa antes de enviar | |
| Nova operação: tentar escolher uma data futura no seletor | O seletor não deixa passar de hoje | |
| Nova operação: digitar um ticker fora da watchlist | Não adiciona em silêncio; oferece "Buscar ativo" (no iOS, a busca abre por cima do modal) | |
| Toque numa posição | Abre o detalhe do ativo | |
| Com 2 ou mais classes (ex.: `PETR4` e `BTC`): filtro por classe | O filtro cabe na tela estreita e o toque funciona (alvo confortável) | |
| Remover uma operação | Pede confirmação; a lista só muda se o servidor aceitar | |

## 6. IA e chat (Etapa 7)

Sem `AI_HABILITADA` e `GEMINI_API_KEY` no backend, os dois recursos respondem 503: o app deve mostrar "A IA está indisponível no momento" e o resto continua funcionando.

| Passo | Esperado | ✔ |
| --- | --- | --- |
| Detalhe do ativo → **Gerar análise por IA** | Mostra "Gerando…"; sem IA no servidor, a mensagem de indisponível e o botão para tentar de novo | |
| Aba **Chat**: tocar numa sugestão | A pergunta aparece; sem IA, mensagem de erro e "Tentar novamente" | |
| **Teclado do chat** (Android e iOS): tocar no campo de mensagem | O campo e o botão Enviar ficam **visíveis acima do teclado**; no Android a barra de abas some com o teclado | |
| Digitar mais de 2000 caracteres | Mostra o limite e desabilita Enviar | |
| Aviso legal | "Análise gerada por IA. Não constitui recomendação de investimento." visível na tela do chat e no card | |
| **Com chave real do Gemini (opcional):** gerar a análise e conversar | Texto da IA com modelo e aviso; copiar a resposta e colar em outro app → o aviso legal vai junto; "Limpar conversa" pede confirmação | |

## 7. Perfil e servidor (Etapa 8)

| Passo | Esperado | ✔ |
| --- | --- | --- |
| Perfil → Aparência: Claro e Escuro | Troca na hora e continua depois de fechar o app | |
| **Notificações push** (Expo Go) | "Indisponíveis neste aparelho" com o motivo (Expo Go) e o interruptor desabilitado | |
| **Notificar por ativo**: desligar `BTC` | O interruptor muda; ao voltar ao Início o sino do ativo reflete | |
| **Servidor** → Testar conexão | "Conectado (xx ms)" | |
| Desligar o Wi-Fi do celular → Testar conexão | "Sem conexão com o servidor. Confira o Wi-Fi e o endereço." | |
| Perfil → Sair | Volta ao login | |

## 8. Estados exigidos pelo Checkpoint 02

| Estado | Como provocar | Esperado | ✔ |
| --- | --- | --- | --- |
| Com dados | Uso normal | Telas preenchidas | |
| Vazio | Conta nova (watchlist, alertas, carteira) | Mensagem de vazio com ação, nunca "R$ 0,00" | |
| Carregando | Abrir o Início/detalhe com a rede lenta | Esqueletos no lugar do conteúdo | |
| Falha de comunicação | Desligar o Wi-Fi do celular e abrir uma tela de dados | Mensagem "Sem conexão…" com "Tentar novamente" | |
| Erro do servidor | `docker stop insight-flow-backend-app-1` e abrir uma tela de dados | Mensagem legível com "Código do erro" quando houver; `docker start insight-flow-backend-app-1` e "Tentar novamente" recupera | |

## 9. Acessibilidade rápida (TalkBack no Android, VoiceOver no iOS)

| Passo | Esperado | ✔ |
| --- | --- | --- |
| Percorrer o Início | Cada KPI e cada linha da watchlist é lida com o que significa (valor, variação, sinais) | |
| Interruptores do Perfil e dos alertas | O nome e o estado (ligado/desligado) são lidos | |
| Chat: enviar uma pergunta | A resposta chega e é possível alcançá-la; anote se foi **anunciada** (sabe-se que o app ainda não anuncia a chegada) | |
| Alvos de toque | Nenhum botão é difícil de acertar com o polegar | |

## 10. Push de verdade (parte B da Etapa 8, só com development build)

Só vale depois da decisão D8 (conta Expo/EAS e projeto Firebase). Passos de preparação: [`docs/PLANO.md`, seção 9.5](PLANO.md#95-push-etapa-8).

| Passo | Esperado | ✔ |
| --- | --- | --- |
| Abrir na development build e entrar | Android 13+ pede a permissão de notificações; Perfil mostra "Ligadas neste aparelho" | |
| Conferir o registro | `POST /dispositivos` com o token do aparelho (log do backend ou banco) | |
| Criar o alerta de `BTC` do bloco 4 e **fechar o app por completo** | Chega o push "Alerta de preço" em até 5 min | |
| Tocar no push | Abre o ativo e marca a notificação como lida (também com o app fechado: partida a frio) | |
| Conferir **em qual canal** a notificação aparece (Configurações do Android → Apps → InsightFlow → Notificações) | Canal "Avisos do InsightFlow" (`default`). Se aparecer "Miscellaneous", o backend precisa mandar `channelId` | |
| Perfil → desligar o push | O backend deixa de enviar; o aparelho some de `dispositivos` | |
| Sair da conta | O aparelho é removido do push antes do logout | |

## Resultado

| Bloco | Tudo ✔? | Observações / código do erro |
| --- | --- | --- |
| 1. Conta e sessão | | |
| 2. Início e busca | | |
| 3. Detalhe e gráfico | | |
| 4. Alertas e tempo real | | |
| 5. Carteira e operações | | |
| 6. IA e chat | | |
| 7. Perfil e servidor | | |
| 8. Estados do Checkpoint | | |
| 9. Acessibilidade | | |
| 10. Push | | |
