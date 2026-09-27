# Redesign visual do app mobile (identidade do web) — design

## Contexto

O app mobile (`docs/superpowers/specs/2026-09-25-app-mobile-mvp-design.md`) está implementado e revisado na branch `feature/app-mobile-mvp`, com identidade visual própria e genérica (azul/cinza, ícones Ionicons, fonte do sistema, tema que segue o sistema). O cliente web (`InsightF-AI/Insight-flow-web`, repositório privado) tem um design system próprio, o "cockpit de mercado" InsightFlow. Este sub-projeto faz o app mobile adotar a **mesma identidade visual do web**, sem mudar funcionalidades, fluxos, navegação nem a camada de dados.

**Referência (lida em `src/index.css`, `tailwind.config.js`, `src/lib/theme.js`, `src/components/ui.jsx` e `src/pages/Login.jsx` do web):** fundo quase-preto, superfícies em degraus, acento duplo azul (ação/foco) + âmbar (destaque) + violeta (IA), verde/vermelho para alta/queda, Inter no corpo e Space Grotesk nos títulos, raios 8/14/20 px, sombras em camadas com brilho no topo dos cards, `Card` com cabeçalho, `Pill` de tons, `IconChip`, ícones lucide e login com card, logo e barra de gradiente azul→verde.

**Decisões tomadas em brainstorming (não reabrir):**

- **Fidelidade: identidade completa.** Paleta e tokens dos dois temas, tipografia, raios/sombras, ícones lucide, `Card` com cabeçalho, `Pill`, `IconChip`, login/cadastro no padrão do web. Navegação e fluxos do mobile permanecem. Sem paridade estrutural (sem ticker tape, sem KPIs novos).
- **Abordagem A — reskin por tokens.** Toda tela continua lendo cores só de `useTema()`; muda o conteúdo dos tokens, a tipografia e os componentes. Descartada a migração para NativeWind/Tailwind (reescreveria todos os componentes e a build, com risco no SDK 57).
- **Tema: escuro por padrão + alternador** no Perfil, escolha persistida no aparelho. Substitui o comportamento "seguir o sistema" do MVP.
- **Branch nova `feature/redesign-web`**, criada a partir de `feature/app-mobile-mvp` (o MVP ainda não foi publicado). O PR do redesign aponta para `develop` depois do MVP, ou é reencaminhado se o MVP mudar.

**Fora do escopo:** painel lateral/navegação do web, ticker tape, KPIs novos, imagem hero do login (existe só em telas largas no web), qualquer mudança de backend ou de funcionalidade, telas de IA além do visual, prévia/alvo web do app (o app continua sendo Android/iOS; a prévia web usada para capturas de tela é ferramenta de verificação local e não é entregue).

## Tokens de cor

`Cores` (`src/theme/cores.ts`) mantém as 11 chaves atuais (para não quebrar consumidores) com os valores do web e ganha chaves novas. Os valores vêm das variáveis CSS do web (`--bg`, `--surface`…).

| Chave | Escuro | Claro | Origem no web |
|---|---|---|---|
| `fundo` | `#070b14` | `#eef1f6` | `--bg` |
| `superficie` | `#0f1626` | `#ffffff` | `--surface` |
| `superficieElevada` | `#141d33` | `#f5f7fb` | `--surface-2` |
| `superficieAlta` (nova) | `#1b2540` | `#e8ecf5` | `--surface-3` |
| `borda` | `#1e293f` | `#dde3ef` | `--border` |
| `bordaForte` (nova) | `#2c3b5e` | `#c3ccdf` | `--border-strong` |
| `texto` | `#eef2f9` | `#141b2e` | `--ink` |
| `textoSecundario` | `#a7b3c9` | `#48546f` | `--ink-2` |
| `textoTerciario` (nova) | `#7683a0` | `#71809c` | `--ink-3` |
| `textoDesativado` (nova) | `#4b5670` | `#9aa6bd` | `--ink-4` (só decorativo/desativado, nunca texto informativo) |
| `primaria` | `#3aa0ff` | `#1f6fd1` | `--accent` |
| `primariaHover` (nova) | `#5cb3ff` | `#175dae` | `--accent-hover` (estado pressionado) |
| `textoSobrePrimaria` | `#070b14` | `#ffffff` | web usa branco nos dois; no escuro usamos o fundo escuro por contraste (branco sobre `#3aa0ff` ≈ 2,6:1) |
| `destaque` (nova, âmbar) | `#f5a623` | `#b9770e` | `--amber` |
| `ia` (nova, violeta) | `#b18cff` | `#7c5cd6` | `--violet` |
| `positivo` | `#22c58a` | `#0f9d63` | `--up` |
| `negativo` | `#fb5468` | `#e0324a` | `--down` |
| `alerta` | `#f0b429` | `#92610a` | `--warn` |

Objeto `tons` (fundos suaves das pills; texto do tom vem das chaves acima): `verdeFundo` `#0d2b20`/`#e3f7ec`, `vermelhoFundo` `#341019`/`#fde6e9`, `amareloFundo` `#2b2000`/`#fdf1d8`, `laranjaFundo` `#2c1c05`/`#fdead2`, `laranjaTexto` `#f0a94e`/`#92510a`, `azulFundo` `#0d2038`/`#e4f0ff`, `violetaFundo` `#221148`/`#efe7ff`.

Objeto `grafico`: `grade` `#182238`/`#e7ebf3`, `eixo` `#5b6780`/`#8391ab`, `cruzamento` `#3a4a70`/`#aebbd6`, `alta` `#22c58a`/`#0f9d63`, `baixa` `#fb5468`/`#e0324a`, `altaPreenchimento` `#123324`/`#d9f2e6`, `baixaPreenchimento` `#3a1520`/`#fbdde1`, `sma20` `#3aa0ff`/`#1f6fd1`, `sma50` `#f5a623`/`#b9770e`, `sma200` `#b18cff`/`#7c5cd6`, `benchCarteira` `#22c58a`/`#0f9d63`, `benchIndice` `#3aa0ff`/`#1f6fd1`, `benchCdi` `#8391ab`/`#7b869e`.

`serie` (categórica, 6 cores): `sma20`, `benchCarteira`, `sma200`, `sma50`, `negativo`, `eixo` do tema — a legenda sempre traz rótulo e valor, então a cor nunca é o único sinal.

**Contraste (regra do projeto, teste em `cores.test.ts`):** todo par texto/fundo informativo ≥ 4,5:1 nos dois temas (`texto`, `textoSecundario`, `textoTerciario`, `positivo`, `negativo`, `alerta`, `destaque`, `ia`, `primaria` sobre `fundo`/`superficie`/`superficieElevada`; `textoSobrePrimaria` sobre `primaria`; texto dos tons sobre seus fundos). Se um valor do web não atingir 4,5:1 num par em que o token é usado (ex.: `textoTerciario` claro sobre branco ≈ 4,0:1), ajusta-se o valor **no mínimo necessário**, mantendo o matiz, e o desvio é registrado num comentário ao lado do token. `textoDesativado` é isento por ser só decorativo (bordas de ícone desativado, placeholder de baixa ênfase) e nunca carrega informação.

**Ajustes definidos ao escrever o plano** (`docs/superpowers/plans/2026-09-26-redesign-visual-web.md`, valem sobre o texto acima):

- Valores finais com contraste verificado (mesmo matiz do web, ajuste mínimo): tema claro `textoTerciario` `#616e86`, `primaria` `#1e6bc9`, `positivo` `#0c7e4f`, `negativo` `#c72d42`, `destaque` `#98620b`, `ia` `#7356c7`; tema escuro `textoTerciario` `#7985a2`. Os demais valores são os da tabela.
- O objeto `grafico` fica só com os tokens usados: `alta`, `baixa`, `eixo`, `sma20`, `sma50`, `sma200`, `benchCarteira` (o app não desenha grade nem eixos no Skia). `serie` = `sma20`, `benchCarteira`, `sma200`, `sma50`, `negativo`, `eixo`.
- Sem gradiente de fundo na `Tela`, sem gradiente no item ativo da aba e sem flutuação da logo. Só o gradiente azul→verde do card de login.
- Sombras: `Sombras` ganha a chave `foco` (anel de foco dos campos). `Card` ganha a prop `tomIcone`. `Texto` ganha a variante `secao`, a prop `numerico` e as cores `terciario`, `destaque` e `ia`.
- `Botao` mantém as variantes `primario | secundario | perigo`.

**Fora desta entrega (cortes conscientes):**

- Pill "IA" em `AvisoIA` e `CardAnaliseIA` (usam o `IconeChip` `brilho`).
- Pills de status de alerta, tipo de notificação, sinais e classe/setor/moeda: só o detalhe do ativo ganhou Pills de tipo e moeda; a notificação não lida ganhou a Pill "Nova".
- `IconeChip` em Nova operação e Watchlist.
- Android 7–8.1 (API < 28) não desenha `boxShadow` (sem sombra, degradação segura); o FAB perdeu o `elevation` do MVP nessas versões.

## Tipografia

- Inter (400, 500, 600, 700) no corpo e Space Grotesk (600, 700) nos títulos, via `@expo-google-fonts/inter` e `@expo-google-fonts/space-grotesk` + `expo-font` (instalados com `npx expo install`).
- Famílias: `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold`, `SpaceGrotesk_600SemiBold`, `SpaceGrotesk_700Bold`. `fonte` (`src/theme/escala.ts`) ganha `familia` por variante; tamanhos atuais mantidos, exceto `corpo` 15 (igual ao web) e `titulo`/`destaque` em Space Grotesk.
- A tela de splash fica presa até fontes **e** sessão **e** preferência de tema estarem prontas (um único `pronto` no layout raiz). Falha ao carregar fonte não trava o app: cai na fonte do sistema.
- `Texto` ganha as variantes `rotulo` (caixa alta, 12 px, `letterSpacing` ≈ 0,8, cor `textoSecundario`, como `.label` do web) e `mono`/números tabulares (`fontVariant: ['tabular-nums']`) para preços e percentuais.

## Tema, preferência e StatusBar

- Novo store `src/store/preferencias.ts` (Zustand): `tema: 'escuro' | 'claro'` (padrão `'escuro'`), `hidratar()` lê `insightflow.tema` do SecureStore (já usado pelo projeto; sem dependência nova), `definirTema(t)` grava e atualiza. Valor inválido/ausente/erro de leitura → `'escuro'`.
- `useTema()` passa a ler o store (não mais `useColorScheme`). Interface: `Tema { esquema: 'claro' | 'escuro'; cores: Cores; tons: Tons; grafico: CoresGrafico; serie: readonly string[] }` — `esquema`, `cores` e `serie` mantêm nome e formato atuais (só o conteúdo de `cores` muda e ganha chaves); `tons` e `grafico` são novos campos do mesmo nível.
- Alternador no Perfil (`SeletorSegmentado` com "Escuro" / "Claro", como em `SettingsPanel` do web), efeito imediato e persistido.
- `<StatusBar style>` no layout raiz acompanha o tema (`light` no escuro). `app.json`: `userInterfaceStyle` **permanece `automatic`** (teclado, alertas nativos e barras do sistema seguem o SO; a UI própria segue a preferência do app). O `ThemeProvider` do Expo Router usa cores do tema atual (já é assim).

## Ícones

- `lucide-react-native` + `react-native-svg` (`npx expo install react-native-svg`; `lucide-react-native` via npm, versão compatível com o `lucide-react` 0.469 do web ou a mais recente compatível com `react-native-svg` do SDK 57 — registrar no plano).
- Wrapper `Icone` (`src/components/Icone.tsx`): `Icone({ nome: IconeNome, tamanho?, cor?: keyof cores | string via token, espessura? })`. `IconeNome` é um union fechado dos ícones usados (evita importar a biblioteca inteira); cor sempre vinda de `useTema()`.
- Mapeamento dos 7 arquivos que usam Ionicons (mesmos nomes do web onde existir): abas — Watchlist `Star`, Portfólio `PieChart`, Alertas `Bell`, Perfil `User`; busca `Search`; lixeira `Trash2`; notificações `Bell`/`BellOff`; chat `MessageSquare`; olho `Eye`/`EyeOff`; e-mail `Mail`; senha `Lock`; círculo (rádio) `Circle`; carregamento e vazio `Inbox`; erro `AlertCircle`; tentar novamente `RefreshCw`. `@expo/vector-icons` deixa de ser usado no código do app (a dependência permanece se o Expo Router a exigir).

## Componentes

Mesma API de props, salvo onde indicado; consumidores existentes não mudam.

- **`Card`** (já aceita `titulo` e `acao`): fundo `superficie`, borda `borda`, raio 14, sombra em camadas (`boxShadow` do RN, token `sombra` abaixo) + linha de brilho no topo (`borderTopColor` clara semitransparente no escuro / branca no claro). O cabeçalho existente passa ao estilo do web: fundo `superficieElevada`, borda inferior `borda`, título 14/600. Prop nova opcional `icone` (renderiza um `IconeChip` de 24 px antes do título, como `SectionTitle` do web). Sem cabeçalho, comporta-se como hoje.
- **`Botao`** (variantes atuais `primario | secundario | perigo`, nomes mantidos): `primario` fundo `primaria`, texto `textoSobrePrimaria`, sombra colorida (`primaria` a 35% + brilho topo), pressionado usa `primariaHover` e escala 0,98; `secundario` passa ao estilo "ghost" do web (borda `bordaForte`, fundo transparente, texto `textoSecundario`, sombra `sm`); `perigo` mantém borda/texto `negativo` com fundo transparente. Estados desativado/carregando mantidos (opacidade 0,5 + spinner).
- **`Campo`**: fundo `superficieElevada`, borda `bordaForte`, foco com borda `primaria` e anel externo de 3 px a 24%; prop opcional `icone` (à esquerda, `textoTerciario`, vira `primaria` no foco); prop opcional `alternarSenha` (botão olho à direita, `aria-pressed`) quando `secureTextEntry`. Rótulo na variante `rotulo` do `Texto`.
- **`Texto`**: fontes acima; cores só por token.
- **`Pill`** (novo): `Pill({ tom, children, icone? })`, `tom` ∈ `verde | vermelho | amarelo | laranja | azul | violeta | cinza`; fundo `tons.*Fundo` (cinza: `superficieAlta`), texto na cor correspondente, raio pílula, 12/500. Usada em tipo de ativo, status de alerta, tipo de notificação, sinais, classe/setor/moeda.
- **`IconeChip`** (novo): quadrado arredondado colorido com `Icone` dentro (`accent`, `up`, `down`, `amber`, `purple`, `slate`), tamanhos 24/28/34, como `IconChip` do web. Usado em cabeçalhos de seção e estados vazios de destaque.
- **`SeletorSegmentado`, `EstadoVazio`, `ErroComRetry`, `Carregando`, `BotaoCabecalho`, `BotaoFlutuante`, `Linha`, `Tela`**: restilizados com os tokens/ícones novos; `Tela` usa `fundo` com o gradiente de brilho do web só no escuro (dois `radial` aproximados por `expo-linear-gradient` muito sutis) — se o custo/legibilidade não compensar, fica o fundo chapado (decisão registrada no plano, não bloqueia).
- **`VariacaoBadge`**: vira `Pill` verde/vermelho/cinza com ▲/▼ (mantém a regra de derivar sinal do texto formatado). **`AvisoIA`/`CardAnaliseIA`**: violeta (`ia`) + `Pill` "IA"; texto legal `AVISO_IA` inalterado (RN-05). **`SinalCard`, `IndicadorItem`, `ItemPosicao`, `ItemOperacao`, `ItemAlerta`, `ItemNotificacao`, `LinhaAtivo`, `LinhaResultadoBusca`, `CampoData`, `SugestoesTicker`**: usam `Card`/`Pill`/`Icone` novos, mesmos dados e a11y.

**Sombras:** `sombra` em `escala.ts` (`sm`, `md`, `lg`) com o mesmo formato do web (duas camadas), aplicadas via `boxShadow` do RN (suportado no RN 0.86, arquitetura nova). Isto **substitui** a exceção `shadowColor: '#000'` do MVP: cores de sombra passam a vir do tema (`rgba` derivado do tema, definidas em `escala.ts`/`cores.ts`, nunca `#000` solto em componente).

## Telas

Fluxos, rotas e comportamentos inalterados; apenas apresentação.

- **Login/Cadastro (`app/(auth)`)**: fundo `fundo`; card centralizado (raio 20, borda `bordaForte`, sombra `lg`) com barra de gradiente azul→verde de 2 px no topo (`expo-linear-gradient`, 18% de margem lateral, brilho leve), logo `assets/icone.png` (copiado do web) 64×64 com flutuação sutil (desligada com "reduzir movimento"), título "InsightFlow" (Space Grotesk 700), linha `ANÁLISE DE ATIVOS · B3 & CRIPTO` (10/700, caixa alta, `letterSpacing` ≈ 2, `textoTerciario`), subtítulo da tela ("Entrar"/"Criar conta"), `Campo` com ícones `Mail`/`Lock`/`User` e alternância de senha, botão primário, link para a outra tela em `primaria`, rodapé com aviso educacional existente.
- **Abas (`app/(tabs)/_layout.tsx`)**: barra `superficie` com borda superior `borda`, ícone/rótulo ativos em `primaria` (fundo do ativo: gradiente sutil azul→verde a ~20/14% como `.shell-nav-link.is-active`, se couber no item da aba; senão só cor), inativos `textoTerciario`; cabeçalhos com `fundo`/`texto` e título em Space Grotesk; badge de não lidas em `negativo`.
- **Watchlist / Busca / Detalhe / Portfólio / Alertas / Perfil / Chat / Nova operação**: seções em `Card` com cabeçalho e `IconeChip` de seção; rótulos e KPIs numéricos em tabular; `Pill` para tipo de ativo, status e sinais; listas com separador `borda`; estados vazios/erro com `Icone` (`Inbox`, `AlertCircle`) no padrão `Empty`/`ErrorState` do web.
- **Perfil**: nova seção "Aparência" com o alternador de tema, acima de Notificações; e-mail e "Sair" mantidos.

## Gráficos

`GraficoPreco` e `GraficoDistribuicao` (Victory Native + Skia) leem `grafico`/`serie` do tema: linha/área com `grafico.alta`/`baixa` conforme a variação do período, grade `grade`, eixos `eixo`, rótulos em Inter; fatias com `serie`. Mesmos dados e a11y. O mock do Skia nos testes continua igual.

## Acessibilidade

Contraste ≥ 4,5:1 (teste); alvos de toque ≥ 44 pt nos componentes tocados (corrige os itens de 36 pt deferidos no MVP: `SeletorSegmentado`, lixeiras); `aria-*` existentes preservados; animações (flutuação da logo, transições) respeitam "reduzir movimento" (`AccessibilityInfo.isReduceMotionEnabled`); ícones puramente decorativos com `aria-hidden`.

## Testes e verificação

- Atualizar `cores.test.ts`: chaves nos dois temas, paridade de chaves (`tons`, `grafico`, `serie`), contraste ≥ 4,5:1 nos pares listados.
- `preferencias.test.ts`: padrão escuro; lê `claro` do SecureStore; valor inválido → escuro; `definirTema` persiste; erro de leitura → escuro.
- Testes de componente: `Pill` (tom → cores), `Icone` (nome/tamanho/cor do tema), `Card` com/sem cabeçalho, `Campo` com ícone e alternância de senha (`aria-pressed`, `secureTextEntry` alternando), `Botao` variantes.
- Teste de tela do Perfil: alternar para claro/escuro muda `useTema().esquema` e grava; padrão escuro.
- Testes de telas e componentes existentes seguem por consultas semânticas; ajustar só o que depender de cor/ícone antigo. Mocks novos em `jest.setup.ts` para `expo-font`/`expo-linear-gradient`/`lucide` só se o Jest exigir.
- Verificação final: `npm run verificar`, `npm run test:ci -- --no-cache`, `npx expo-doctor`, `npx expo install --check`, exports Android/iOS. Capturas de tela de login, watchlist, detalhe, portfólio e perfil nos dois temas, lado a lado com o web, numa prévia web **local e descartável** (o app não ganha alvo web); confere-se visualmente paleta, tipografia e cartões. Sem verificação em aparelho/emulador nesta rodada (registrar no PR).
- Continuam valendo: RN-01, RN-05, escalas de percentual, regras de data, `queryFn` em arrow, RNTL v14 assíncrono, sem `jest.setTimeout`.

## Riscos

- **Fontes/ícones/SVG no Jest:** mocks mínimos e testes por comportamento (nome do ícone via prop/`testID`).
- **`boxShadow` no RN 0.86:** exige arquitetura nova (padrão no SDK 57); se algum componente não renderizar a sombra, cai para elevação/`shadow*` apenas naquele componente, registrado no plano.
- **Gradiente de fundo (`Tela`) e do item ativo das abas:** opcionais; degradam para cor chapada sem quebrar o design.
- **Paleta vs contraste:** valores do web podem precisar de ajuste mínimo (documentado por token).
- **Repositório web é privado:** a spec registra os valores lidos; se o web mudar, este documento não acompanha automaticamente.

## Entrega

Branch `feature/redesign-web`; commits em Conventional Commits, em português, terminando com `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`; execução por subagentes (plano em `docs/superpowers/plans/`); publicação e PR só com OK explícito do usuário (repositório privado, conta `brunoosouza09`).
