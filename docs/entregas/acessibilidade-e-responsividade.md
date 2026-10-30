# Acessibilidade e responsividade (formulários primeiro)

Data: 29/10/2026 · Branch: `feature/acessibilidade-formularios`

O app já tinha a base certa: rótulo acessível em todo botão e campo, alvos de toque de 44 pt e contraste de 4,5:1 testado nos dois temas. Faltava o que só aparece com o uso real: passar de um campo ao outro pelo teclado, saber onde está o erro sem enxergar a tela, e o layout em tablet e com fonte grande. Esta entrega cobre essas lacunas, começando pelos formulários.

## O que mudou para quem usa

### Formulários

Vale para login, cadastro, recuperar senha (as duas etapas), alterar senha (Perfil), nova operação, novo alerta de preço e busca.

| Antes | Agora |
| --- | --- |
| A tecla do teclado não fazia nada; era preciso fechar o teclado e tocar no botão | "Próximo" passa ao campo seguinte; no último campo, "Entrar", "Enviar" ou "Concluído" envia o formulário |
| Ao enviar com erro, o foco ficava onde estava | O foco vai ao **primeiro campo com erro**, na ordem da tela |
| O erro de um campo era só um texto vermelho abaixo dele | O erro também é a **dica do campo** (`accessibilityHint`): o leitor de tela lê "E-mail, Informe um e-mail válido" ao focar |
| O erro geral ("sem conexão", "senha incorreta") não era anunciado | Anunciado ao aparecer: região viva no Android (TalkBack) e `announceForAccessibility` no iOS (VoiceOver) |
| O corretor trocava letras de e-mail, senha e ticker | Corretor desligado em e-mail, senha, código do e-mail e ticker |
| Enviar duas vezes seguidas pelo teclado podia disparar dois envios | O envio ignora toques enquanto o anterior está em andamento |
| Para fechar o teclado, só tocando fora | Arrastar a tela fecha o teclado (no iOS, acompanhando o dedo) |
| No iOS, o teclado podia cobrir o campo "Valor alvo" do novo alerta | A lista de Alertas abre espaço para o teclado (`automaticallyAdjustKeyboardInsets`) |

O seletor de data no Android ganhou a dica "Abre o calendário" (ou o erro da data, quando houver).

### Resto do app

- **Tablet e paisagem** (`supportsTablet` está ligado): o conteúdo fica centralizado com até 720 pt de largura, em vez de esticar de ponta a ponta. Vale para todas as telas com `Tela`, Alertas, Notificações, Busca e Chat.
- **Fonte grande:** o texto acompanha o tamanho de fonte do aparelho até 200% (WCAG 1.4.4). Títulos (`titulo` e `destaque`) param em 150% e subtítulos em 175%, para não empurrar o conteúdo para fora da tela.
- **Watchlist com leitor de tela:** o rótulo de cada linha substituía o texto de dentro e o leitor só dizia "PETR4, Petrobras PN". Agora diz "PETR4, Petrobras PN, R$ 38,50, variação +1,05%, 2 sinais" (ou "sem cotação").
- **Chat:** o contador "120/2000" deixou de ser lido a cada letra; a contagem vai na dica do campo, e o aviso de limite excedido é anunciado.

## Como foi feito

| Peça | Onde | O que faz |
| --- | --- | --- |
| `Campo` | `src/components/Campo.tsx` | Aceita `ref` (React 19: `ref` como prop), `returnKeyType`, `onSubmitEditing`, `submitBehavior` e `autoCorrect`. O erro vira `accessibilityHint`. O corretor fica desligado por padrão em `secureTextEntry` e `keyboardType="email-address"` |
| `MensagemErro` | `src/components/MensagemErro.tsx` | Erro geral do formulário: `role="alert"`, região viva no Android e anúncio no iOS quando a mensagem aparece ou muda. Substitui os blocos `{erroGeral ? <Texto role="alert">…}` repetidos nas telas |
| `focarPrimeiroComErro` | `src/utils/formulario.ts` | Recebe os erros da validação e a lista `[chave, ref]` na ordem da tela; foca o primeiro com mensagem |
| `Texto` | `src/components/Texto.tsx` | `maxFontSizeMultiplier` por variante; `role="alert"` ganha `accessibilityLiveRegion="polite"` sozinho |
| `conteudoLimitado` | `src/theme/escala.ts` | `{ width: '100%', maxWidth: 720, alignSelf: 'center' }` para o conteúdo das telas e listas |
| `Tela` | `src/components/Tela.tsx` | Conteúdo limitado e `keyboardDismissMode` |

## Decisões

- **Sem `react-native-keyboard-controller`.** A documentação do Expo o recomenda para formulários longos, mas ele não roda no Expo Go, que é como o app é testado no iPhone. Os formulários são curtos; o `KeyboardAvoidingView` da `Tela` mais o encadeamento pelo teclado resolvem. Rever se o app passar a ser testado só em development build.
- **O erro de cada campo não é região viva.** Com três campos errados, o TalkBack leria os três de uma vez, além do campo focado. O foco no primeiro campo com erro e a dica já levam a informação a quem precisa.
- **Limite de ampliação em vez de fonte fixa.** A fonte continua acompanhando o aparelho; só os títulos, já grandes, param antes de 200%.
- **720 pt de largura máxima.** Mantém linhas de texto legíveis em tablet sem mudar o layout de celular (sempre menor que isso).
- **Teclado numérico no iOS não tem tecla de envio** (`decimal-pad`). Nesses campos o `returnKeyType` só aparece no Android; no iOS o botão da tela continua sendo o caminho.

## Verificação

`npm run verificar`: lint, typecheck e **1.059 testes (101 suítes)** passando. Testes novos:

- `src/utils/formulario.test.ts`: ordem do foco, chave sem mensagem e ref nula.
- `src/components/mensagemErro.test.tsx`: nada sem mensagem; região viva no Android; anúncio no iOS ao aparecer e ao mudar.
- `src/components/campo.test.tsx`: erro como dica, corretor por tipo de campo, tecla de envio e `ref`.
- `src/components/senhaProventos.test.tsx`: alterar senha enviada pela tecla do último campo.
- `src/components/listas.test.tsx`: rótulo da linha da watchlist com preço, variação e sinais.
- `__tests__/telas/login.test.tsx`: erro como dica nos dois campos; entrar pela tecla do teclado.
- `__tests__/telas/inicio.test.tsx`: consultas da watchlist ajustadas ao rótulo novo (casam pelo começo).

**Não verificado:** nada disso foi testado em aparelho. Teclado, foco, leitores de tela, fonte grande e tablet ficam para o bloco 9 do [roteiro de teste no aparelho](../roteiro-de-teste-no-aparelho.md#9-acessibilidade-rápida-talkback-no-android-voiceover-no-ios).
