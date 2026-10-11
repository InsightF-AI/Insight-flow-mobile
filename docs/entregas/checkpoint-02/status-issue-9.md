<!--
Rascunho do comentário de status para a issue #9 do backend ("[Mobile] Criação do Aplicativo (Versão Celular)").
Mesmo formato que o time do desktop usou na #10. NÃO foi publicado: o responsável pelo card revisa e cola.
Atualizado em 11/10/2026 (PRs #1 a #11 do repositório mobile).
-->

@Vinicius11s segue o status da #9:

### ✅ Implementado
- [x] Estrutura do projeto (React Native + Expo SDK 57, TypeScript, Expo Router, TanStack Query, Zustand), com testes automatizados (97 suítes, 1.026 testes) e o workflow de CI (lint, typecheck e testes) no repositório
- [x] Consumo da API real: cotação, histórico, indicadores, sinais, backtest, alertas, notificações, carteira e IA vêm do servidor, sem cálculo pesado no cliente (RSI e MACD do gráfico são calculados no app com as mesmas fórmulas e conferidos com os valores oficiais)
- [x] Cadastro e login, com sessão renovada automaticamente e logout no servidor
- [x] Menu inferior com 5 abas: Início, Carteira, Chat, Alertas e Perfil
- [x] Início: indicadores da carteira, resumo diário da IA, watchlist com preço, variação e sinais, e sinais técnicos ativos com o histórico da condição
- [x] Busca de ativos e watchlist, com confirmação antes de adicionar e notificação por ativo
- [x] Detalhe do ativo: cotação, gráfico de candles com volume, médias móveis e Bollinger, painéis de RSI e MACD, leitura do dia ao tocar, indicadores oficiais e sinais com backtest
- [x] Alertas de preço (criar, ativar, desativar e remover) e notificações em tempo real por WebSocket, com banner, selo de não lidas e caixa de notificações
- [x] Carteira simulada: operações de compra e venda, posições, resultado, comparativo com CDI e Ibovespa e distribuição por classe, setor e moeda
- [x] Análise por IA do ativo (sob demanda) e Chat com IA, com tratamento de IA desligada, limite de uso e bloqueio do filtro de linguagem
- [x] Perfil: conta, push neste aparelho, notificar por ativo, endereço do servidor com teste de conexão e tema claro e escuro
- [x] Cliente de push: permissão, registro do aparelho em `POST /dispositivos`, toque que abre o ativo e remoção do aparelho ao sair (conferido contra o backend; sem o push real, ver Pendente)
- [x] Aviso legal "Análise gerada por IA. Não constitui recomendação de investimento." em todas as telas com texto de IA, inclusive no texto copiado do chat
- [x] Revisão da linguagem neutra: sem botão ou texto mandando comprar ou vender ("Compra" e "Venda" aparecem só como o tipo da operação simulada); verde e vermelho só para valores positivos e negativos
- [x] Estados de tela em todas as telas de dados: carregando, vazio, falha de comunicação e erro do servidor (com o código `X-Request-ID`)
- [x] Conferido contra o backend real local (Docker); a IA foi testada com um provedor de teste, sem a chave real
- [x] Aberto no iPhone com o Expo Go

### 🚧 Em andamento
- [ ] Teste em aparelho seguindo o roteiro (`docs/roteiro-de-teste-no-aparelho.md`): toque e arrasto no gráfico, teclado, interruptores, tema e leitores de tela
- [ ] Documentação e entrega do Checkpoint 02 da disciplina (prazo 20/10/2026)
- [ ] Merge dos PRs do repositório `Insight-flow-mobile` (#1 a #11, empilhados; nenhum mergeado ainda)

### 📋 Pendente
- [ ] Push com o app fechado: development build e credenciais (conta Expo/EAS, projeto Firebase para Android e conta Apple Developer para iPhone)
- [ ] Teste em Android físico (só o iPhone foi usado até agora)

### ❓ Preciso de vocês
1. Quem é o dono da conta **Expo/EAS** e do projeto **Firebase**? Sem isso o push com o app fechado não sai; o app segue funcionando e o Perfil informa que o push não está disponível neste aparelho.
2. Para a apresentação: o backend ficará acessível fora da máquina de cada um (servidor com HTTPS) ou será rede local? A IA estará ligada (`GEMINI_API_KEY`) e haverá `BRAPI_API_KEY`? Sem ela só PETR4, MGLU3, VALE3 e ITUB4 têm dados da B3.
3. Qual a ordem de merge dos PRs e a branch de destino (`develop`)? O workflow de CI do mobile ainda não rodou no GitHub: dá para conferir em Settings → Actions se está habilitado para o repositório?

### Sugestões para o backend (nada foi alterado lá)
- Devolver o `id` em `GET /ativos/buscar` quando o ativo existir, ou uma rota por ticker
- `GET /usuarios/me` (nome e e-mail)
- Mensagem legível no 422 de quantidade insuficiente (hoje o `detail` é só o UUID do ativo)
- `moeda` e `tipo` em `PosicaoResponse`; rentabilidade que não trate ativo sem cotação como prejuízo (ou `dados_parciais`)
- Paginação em `GET /notificacoes` e "marcar todas como lidas"; ordenação definida em watchlist, alertas e operações
- `channelId` no push Expo e texto do alerta em português correto (hoje: "999999.000000 BRL (preco menor ou igual)")
- `GET /portfolio/benchmark` com carteira vazia responder 200 com valores nulos em vez de 404
