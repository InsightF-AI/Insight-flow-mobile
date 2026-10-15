# Redesign visual do app mobile (identidade do web) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o app mobile adotar a identidade visual do cliente web (paleta dos dois temas, Inter + Space Grotesk, ícones lucide, cards com cabeçalho, pills, login no padrão do web), sem alterar funcionalidades, fluxos, navegação nem a camada de dados.

**Architecture:** Reskin por tokens. Toda tela continua lendo cores só de `useTema()`; muda o conteúdo dos tokens (mais chaves), a tipografia (famílias por peso, sem `fontWeight`), o wrapper de ícones (`Icone`, lucide) e os componentes base (`Card`, `Botao`, `Campo`, novos `Pill` e `IconeChip`). O tema passa a vir de uma preferência persistida (escuro por padrão, alternador no Perfil). Sombras via `boxShadow` do RN com strings definidas no tema.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript ~6.0, Zustand 5 (store de preferências), `@expo-google-fonts/inter` + `@expo-google-fonts/space-grotesk` (+ `expo-font`, já instalado), `lucide-react-native` + `react-native-svg`, `expo-linear-gradient`, jest-expo 57 + @testing-library/react-native 14.

**Spec:** `docs/superpowers/specs/2026-09-26-redesign-visual-web-design.md` (branch `feature/redesign-web`). Onde este plano e a spec divergem, vale o plano: ver "Ajustes em relação à spec" logo abaixo.

**Repositório:** `C:\Users\Bruno\Insight-flow-mobile`. Todos os caminhos são relativos a essa pasta. Comandos de shell usam Git Bash.

## Ajustes em relação à spec (decididos ao escrever o plano)

- **Valores finais do tema claro.** Vários valores do web não passam 4,5:1 sobre os fundos do tema claro; os ajustes mínimos (mesmo matiz, escurecidos) foram calculados e verificados: `textoTerciario` `#616e86`, `primaria` `#1e6bc9`, `positivo` `#0c7e4f`, `negativo` `#c72d42`, `destaque` `#98620b`, `ia` `#7356c7`. No escuro só `textoTerciario` sobe de `#7683a0` para `#7985a2`. Estão na Task 1.
- **Tokens de gráfico só os usados:** `alta`, `baixa`, `eixo`, `sma20`, `sma50`, `sma200`, `benchCarteira` (formam a `serie` categórica e as cores do gráfico de preço). Ficam de fora `grade`, `cruzamento`, preenchimentos, `benchIndice`, `benchCdi` (o app não desenha grade nem eixos no Skia).
- **Sem gradiente de fundo na `Tela`, sem gradiente no item ativo da aba e sem flutuação da logo** (a spec os marcava como opcionais/decorativos). Só o gradiente azul→verde do card de login (`expo-linear-gradient`).
- **`Sombras` ganha a chave `foco`** (anel de foco dos campos) e o `Card` ganha a prop `tomIcone`.
- **`Texto` ganha a variante `secao`** (14 px, Inter 600) para o título do cabeçalho do `Card`; `Texto` ganha a prop `numerico` (tabular nums) e as cores `terciario`, `destaque`, `ia`.
- **Variantes do `Botao` mantêm os nomes** `primario | secundario | perigo`.

## Global Constraints

- Branch de trabalho: `feature/redesign-web` (já criada a partir de `feature/app-mobile-mvp`). Commits em Conventional Commits, em português, terminando com a linha `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Nada é enviado ao GitHub (sem `git push`, sem `gh pr create`).
- Expo SDK 57 (`expo ~57.0.25`, `react-native 0.86.3`, `react 19.2.3`, `typescript ~6.0.3`). Dependência nativa só entra via `npx expo install <pacote>`. Exceção: `lucide-react-native` é JS puro sobre `react-native-svg` e entra por `npm install`.
- Imports internos sempre pelo alias `@/` (→ `src/`). Todo arquivo dentro de `app/` vira rota: nunca coloque testes/helpers/componentes ali. Testes de tela em `__tests__/telas/`; testes de unidade ao lado do código em `src/`.
- `src/components/` não chama hooks de dados; pode chamar `useTema()`, `useSafeAreaInsets()` e hooks de UI locais (`useState`).
- **Cores e sombras só via `useTema()`** (`cores`, `tons`, `grafico`, `sombras`, `serie`). Valores hex/`rgba(...)` literais só existem em `src/theme/`. A antiga exceção `shadowColor: '#000'` deixa de existir (sombras vêm de `sombras`).
- **Tipografia:** nunca use `fontWeight` (famílias customizadas escolhem o peso pela família). Use `familia.*` de `@/theme/familias` (via `Texto`, ou `style` com `fontFamily` em `TextInput`). Famílias: `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold`, `SpaceGrotesk_600SemiBold`, `SpaceGrotesk_700Bold`.
- **Ícones só via `Icone`** (`@/components/Icone`, lucide). Nenhum import de `@expo/vector-icons` em `app/` ou `src/` ao final da Task 4.
- Contraste: todo par texto/fundo informativo ≥ 4,5:1 nos dois temas (teste em `cores.test.ts`). Alvos de toque ≥ 44 pt nos componentes tocados.
- Todo texto visível em pt-BR. RN-01: nenhum texto de análise/indicador/sinal/alerta/CTA usa "compre", "venda", "invista" (nem os infinitivos); "Compra"/"Venda" só como rótulo do **tipo** de operação simulada. RN-05: `AVISO_IA` exato em `CardAnaliseIA` e na tela `chat`.
- `formatarPercentual(valor, escala)` sempre com escala explícita; Decimais da API são `string` (use `paraNumero()`); datas com `dataParaISOLocal`/`formatarData`. `queryFn`/`mutationFn` sempre em arrow function.
- RNTL v14: `render`, `renderHook`, `fireEvent.*` e `userEvent.*` são assíncronos — sempre `await`. Antes de escrever testes, leia `node_modules/@testing-library/react-native/docs/guides/llm-guidelines.md`. Nunca `jest.setTimeout` (o `testTimeout` de 30000 é central no `package.json`). O tema padrão nos testes é o **escuro** (padrão do store).
- Nada de funcionalidade nova: textos, rótulos (`aria-label`), roles e comportamentos existentes continuam iguais; testes existentes seguem por consultas semânticas e só mudam onde dependiam de cor/ícone/fonte antigos.

## Review Focus

1. **Preferência de tema ausente, inválida ou com erro de leitura do SecureStore** deve cair em escuro e nunca travar a splash — teste em `preferencias.test.ts` (Task 2).
2. **Falha ao carregar as fontes** não pode deixar o app preso na splash: com erro, abre com a fonte do sistema — teste de `fontesProntas` (Task 3).
3. **Tema claro com a paleta do web reprova contraste** em vários pares — teste de contraste nos dois temas, incluindo tons e `textoSobrePrimaria` sobre `primaria` e `primariaHover` (Task 1).
4. **Alternar o tema em tempo de execução** deve reestilizar a tela sem reiniciar, e a escolha persiste — teste no Perfil (Task 11).
5. **Campo de senha com olho:** alternar a visibilidade não pode apagar o texto digitado e o `aria-pressed` reflete o estado — teste em `campo.test.tsx` (Task 7).
6. **Regressão regulatória:** o texto exato `AVISO_IA` continua visível em `AvisoIA`, `CardAnaliseIA` e no chat depois do restyle — testes existentes em `dominio.test.tsx` e `chat.test.tsx` seguem verdes (Tasks 6 e 11).

---

## File Structure

```
assets/icone.png                          # logo do web (Task 8)
src/theme/cores.ts                        # Cores, Tons, CoresGrafico, valores dos 2 temas, criarSerie, comAlfa
src/theme/sombras.ts                      # Sombras (strings de boxShadow) por tema
src/theme/familias.ts                     # familia.*, fontesProntas (sem imports de pacotes de fonte)
src/theme/carregarFontes.ts               # FONTES para useFonts (importa @expo-google-fonts/*)
src/theme/escala.ts                       # espaco, raio (novo), fonte (novo secao)
src/theme/useTema.ts                      # Tema completo, lê preferência
src/store/preferencias.ts                 # tema escuro/claro persistido no SecureStore
src/components/Icone.tsx, IconeChip.tsx, Pill.tsx, CartaoAuth.tsx   # novos
src/components/Texto.tsx, Card.tsx, Botao.tsx, Campo.tsx, ...       # restilizados
app/_layout.tsx, app/(tabs)/_layout.tsx, app/(auth)/login.tsx, cadastro.tsx, telas
```

---

### Task 1: Tokens de cor, tons, gráfico e sombras

**Files:**
- Modify (substituição completa): `src/theme/cores.ts`, `src/theme/cores.test.ts`
- Create: `src/theme/sombras.ts`

**Interfaces:**
- Consumes: nada.
- Produces (de `@/theme/cores`): `interface Cores` (chaves abaixo), `interface Tons`, `interface CoresGrafico`, constantes `coresEscuro`, `coresClaro`, `tonsEscuro`, `tonsClaro`, `graficoEscuro`, `graficoClaro`, `criarSerie(cores: Cores, grafico: CoresGrafico): readonly string[]`, `comAlfa(hex: string, alfa: number): string`. De `@/theme/sombras`: `interface Sombras { sm; md; lg; brilho; primaria; foco }` (todas `string` de `boxShadow`), `sombrasEscuro`, `sombrasClaro`.
- **Não** remova ainda `useTema.ts` nem `paletaClaro/paletaEscuro`: a Task 2 troca o `useTema`. Nesta task `useTema.ts` importa os nomes antigos — ver Step 3 para o ajuste mínimo que mantém o typecheck verde.

- [ ] **Step 1: Escrever o teste (falhando)**

Substitua `src/theme/cores.test.ts` por:

```ts
import {
  type Cores,
  comAlfa,
  coresClaro,
  coresEscuro,
  criarSerie,
  graficoClaro,
  graficoEscuro,
  tonsClaro,
  tonsEscuro,
} from '@/theme/cores';
import { sombrasClaro, sombrasEscuro } from '@/theme/sombras';

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((inicio) => {
    const canal = parseInt(hex.slice(inicio, inicio + 2), 16) / 255;
    return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [clara, escura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (clara + 0.05) / (escura + 0.05);
}

const TEXTOS: (keyof Cores)[] = [
  'texto',
  'textoSecundario',
  'textoTerciario',
  'primaria',
  'positivo',
  'negativo',
  'alerta',
  'destaque',
  'ia',
];
const FUNDOS: (keyof Cores)[] = ['fundo', 'superficie', 'superficieElevada'];
const PARES = TEXTOS.flatMap((texto) => FUNDOS.map((fundo) => [texto, fundo] as [keyof Cores, keyof Cores]));

const PARES_DE_TONS = [
  ['positivo', 'verdeFundo'],
  ['negativo', 'vermelhoFundo'],
  ['alerta', 'amareloFundo'],
  ['primaria', 'azulFundo'],
  ['ia', 'violetaFundo'],
  ['textoSecundario', 'violetaFundo'],
] as const;

describe.each([
  ['claro', coresClaro, tonsClaro],
  ['escuro', coresEscuro, tonsEscuro],
])('tema %s', (_nome, cores, tons) => {
  it.each(PARES)('%s sobre %s atinge contraste AA (≥ 4,5)', (texto, fundo) => {
    expect(contraste(cores[texto], cores[fundo])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(PARES_DE_TONS)('%s sobre o tom %s atinge contraste AA', (texto, fundo) => {
    expect(contraste(cores[texto], tons[fundo])).toBeGreaterThanOrEqual(4.5);
  });

  it('texto do tom laranja atinge contraste AA', () => {
    expect(contraste(tons.laranjaTexto, tons.laranjaFundo)).toBeGreaterThanOrEqual(4.5);
  });

  it('textoSecundario sobre superficieAlta (pill cinza) atinge contraste AA', () => {
    expect(contraste(cores.textoSecundario, cores.superficieAlta)).toBeGreaterThanOrEqual(4.5);
  });

  it('texto sobre a cor primária (repouso e pressionado) atinge contraste AA', () => {
    expect(contraste(cores.textoSobrePrimaria, cores.primaria)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(cores.textoSobrePrimaria, cores.primariaHover)).toBeGreaterThanOrEqual(4.5);
  });
});

it('os dois temas têm as mesmas chaves (cores, tons, gráfico e sombras)', () => {
  expect(Object.keys(coresEscuro).sort()).toEqual(Object.keys(coresClaro).sort());
  expect(Object.keys(tonsEscuro).sort()).toEqual(Object.keys(tonsClaro).sort());
  expect(Object.keys(graficoEscuro).sort()).toEqual(Object.keys(graficoClaro).sort());
  expect(Object.keys(sombrasEscuro).sort()).toEqual(Object.keys(sombrasClaro).sort());
});

describe('criarSerie', () => {
  it.each([
    ['claro', coresClaro, graficoClaro],
    ['escuro', coresEscuro, graficoEscuro],
  ])('no tema %s devolve 6 cores distintas', (_nome, cores, grafico) => {
    const serie = criarSerie(cores, grafico);
    expect(serie).toHaveLength(6);
    expect(new Set(serie).size).toBe(6);
  });
});

describe('comAlfa', () => {
  it('converte hex em rgba', () => {
    expect(comAlfa('#3aa0ff', 0.24)).toBe('rgba(58,160,255,0.24)');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/theme/cores.test.ts`
Expected: FAIL (`comAlfa`/`tonsClaro`/`sombras` inexistentes).

- [ ] **Step 3: Implementar**

Substitua `src/theme/cores.ts` por:

```ts
/**
 * Tokens de cor do design system InsightFlow (mesma identidade do cliente web, `src/index.css` do web).
 * Os valores do web foram mantidos, exceto onde não atingiam contraste AA (4,5:1) nos fundos em que o token é usado;
 * nesses casos o valor foi escurecido/clareado no mínimo necessário (mesmo matiz) e o desvio está comentado ao lado.
 */
export interface Cores {
  fundo: string;
  superficie: string;
  superficieElevada: string;
  superficieAlta: string;
  borda: string;
  bordaForte: string;
  texto: string;
  textoSecundario: string;
  textoTerciario: string;
  /** Só decorativo/desativado: NUNCA para texto informativo (não é testado em contraste). */
  textoDesativado: string;
  primaria: string;
  primariaHover: string;
  textoSobrePrimaria: string;
  destaque: string;
  ia: string;
  positivo: string;
  negativo: string;
  alerta: string;
}

/** Fundos suaves das pills; a cor do texto do tom vem de `Cores` (exceto `laranjaTexto`). */
export interface Tons {
  verdeFundo: string;
  vermelhoFundo: string;
  amareloFundo: string;
  laranjaFundo: string;
  laranjaTexto: string;
  azulFundo: string;
  violetaFundo: string;
}

export interface CoresGrafico {
  alta: string;
  baixa: string;
  eixo: string;
  sma20: string;
  sma50: string;
  sma200: string;
  benchCarteira: string;
}

export const coresEscuro: Cores = {
  fundo: '#070b14',
  superficie: '#0f1626',
  superficieElevada: '#141d33',
  superficieAlta: '#1b2540',
  borda: '#1e293f',
  bordaForte: '#2c3b5e',
  texto: '#eef2f9',
  textoSecundario: '#a7b3c9',
  textoTerciario: '#7985a2', // web: #7683a0 (4,41:1 sobre superficieElevada)
  textoDesativado: '#4b5670',
  primaria: '#3aa0ff',
  primariaHover: '#5cb3ff',
  // web usa branco; branco sobre #3aa0ff dá ≈2,6:1, então o texto sobre a primária é o fundo escuro.
  textoSobrePrimaria: '#070b14',
  destaque: '#f5a623',
  ia: '#b18cff',
  positivo: '#22c58a',
  negativo: '#fb5468',
  alerta: '#f0b429',
};

export const coresClaro: Cores = {
  fundo: '#eef1f6',
  superficie: '#ffffff',
  superficieElevada: '#f5f7fb',
  superficieAlta: '#e8ecf5',
  borda: '#dde3ef',
  bordaForte: '#c3ccdf',
  texto: '#141b2e',
  textoSecundario: '#48546f',
  textoTerciario: '#616e86', // web: #71809c (3,98:1 sobre branco)
  textoDesativado: '#9aa6bd',
  primaria: '#1e6bc9', // web: #1f6fd1 (4,36:1 sobre o fundo)
  primariaHover: '#175dae',
  textoSobrePrimaria: '#ffffff',
  destaque: '#98620b', // web: #b9770e (3,25:1)
  ia: '#7356c7', // web: #7c5cd6 (4,26:1)
  positivo: '#0c7e4f', // web: #0f9d63 (3,08:1)
  negativo: '#c72d42', // web: #e0324a (3,93:1)
  alerta: '#92610a',
};

export const tonsEscuro: Tons = {
  verdeFundo: '#0d2b20',
  vermelhoFundo: '#341019',
  amareloFundo: '#2b2000',
  laranjaFundo: '#2c1c05',
  laranjaTexto: '#f0a94e',
  azulFundo: '#0d2038',
  violetaFundo: '#221148',
};

export const tonsClaro: Tons = {
  verdeFundo: '#e3f7ec',
  vermelhoFundo: '#fde6e9',
  amareloFundo: '#fdf1d8',
  laranjaFundo: '#fdead2',
  laranjaTexto: '#92510a',
  azulFundo: '#e4f0ff',
  violetaFundo: '#efe7ff',
};

// Elementos gráficos (não texto) seguem os valores do web: precisam de 3:1, não de 4,5:1.
export const graficoEscuro: CoresGrafico = {
  alta: '#22c58a',
  baixa: '#fb5468',
  eixo: '#5b6780',
  sma20: '#3aa0ff',
  sma50: '#f5a623',
  sma200: '#b18cff',
  benchCarteira: '#22c58a',
};

export const graficoClaro: CoresGrafico = {
  alta: '#0f9d63',
  baixa: '#e0324a',
  eixo: '#8391ab',
  sma20: '#1f6fd1',
  sma50: '#b9770e',
  sma200: '#7c5cd6',
  benchCarteira: '#0f9d63',
};

/** Cores de série para gráficos categóricos (a legenda sempre traz rótulo e valor, então a cor nunca é o único sinal). */
export function criarSerie(cores: Cores, grafico: CoresGrafico): readonly string[] {
  return [grafico.sma20, grafico.benchCarteira, grafico.sma200, grafico.sma50, cores.negativo, grafico.eixo];
}

/** `#rrggbb` + alfa → `rgba(r,g,b,alfa)`. Só para uso dentro de `src/theme/`. */
export function comAlfa(hex: string, alfa: number): string {
  const [r, g, b] = [1, 3, 5].map((inicio) => parseInt(hex.slice(inicio, inicio + 2), 16));
  return `rgba(${r},${g},${b},${alfa})`;
}
```

Crie `src/theme/sombras.ts`:

```ts
import { comAlfa, coresClaro, coresEscuro } from '@/theme/cores';

/** Strings de `boxShadow` do React Native (mesmas camadas do web). */
export interface Sombras {
  sm: string;
  md: string;
  lg: string;
  /** Linha de brilho no topo dos cards (`inset`). */
  brilho: string;
  /** Brilho colorido do botão primário. */
  primaria: string;
  /** Anel de foco dos campos. */
  foco: string;
}

export const sombrasEscuro: Sombras = {
  sm: '0 1px 2px rgba(0,0,0,0.4), 0 1px 8px rgba(0,0,0,0.28)',
  md: '0 2px 8px rgba(0,0,0,0.45), 0 10px 28px rgba(0,0,0,0.35)',
  lg: '0 6px 16px rgba(0,0,0,0.5), 0 24px 56px rgba(0,0,0,0.45)',
  brilho: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  primaria: `0 4px 14px ${comAlfa(coresEscuro.primaria, 0.35)}`,
  foco: `0 0 0 3px ${comAlfa(coresEscuro.primaria, 0.24)}`,
};

export const sombrasClaro: Sombras = {
  sm: '0 1px 2px rgba(15,23,42,0.06), 0 1px 6px rgba(15,23,42,0.05)',
  md: '0 2px 8px rgba(15,23,42,0.07), 0 10px 24px rgba(15,23,42,0.08)',
  lg: '0 6px 16px rgba(15,23,42,0.08), 0 24px 48px rgba(15,23,42,0.1)',
  brilho: 'inset 0 1px 0 rgba(255,255,255,0.7)',
  primaria: `0 4px 14px ${comAlfa(coresClaro.primaria, 0.35)}`,
  foco: `0 0 0 3px ${comAlfa(coresClaro.primaria, 0.24)}`,
};
```

Ajuste mínimo em `src/theme/useTema.ts` para o typecheck continuar verde (a Task 2 reescreve o arquivo): troque a linha de import por

```ts
import { type Cores, coresClaro, coresEscuro, criarSerie, graficoClaro, graficoEscuro } from '@/theme/cores';
```

e as duas constantes por

```ts
const temaClaro: Tema = { esquema: 'claro', cores: coresClaro, serie: criarSerie(coresClaro, graficoClaro) };
const temaEscuro: Tema = { esquema: 'escuro', cores: coresEscuro, serie: criarSerie(coresEscuro, graficoEscuro) };
```

(`paletaClaro`/`paletaEscuro` deixam de existir; nenhum outro arquivo os importa.)

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/theme/cores.test.ts` → PASS. Depois `npm run verificar` → verde (lint + typecheck + testes existentes; `Cores` ganhou chaves, nenhum consumidor cria um objeto `Cores`).

- [ ] **Step 5: Commit**

```bash
git add src/theme/cores.ts src/theme/cores.test.ts src/theme/sombras.ts src/theme/useTema.ts
git commit -m "feat(tema): adiciona tokens de cor, tons, gráfico e sombras da identidade do web

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Preferência de tema e `useTema` completo

**Files:**
- Create: `src/store/preferencias.ts`, `src/store/preferencias.test.ts`
- Modify (substituição completa): `src/theme/useTema.ts`
- Modify: `src/components/dominio.test.tsx` (importa `coresClaro`; o tema padrão agora é o escuro)

**Interfaces:**
- Consumes: Task 1 (`cores`, `tons`, `grafico`, `sombras`, `criarSerie`); mock global de `expo-secure-store` (`__armazenamento`, funções `jest.fn` — ver `jest.setup.ts`).
- Produces:
  - `type EsquemaTema = 'escuro' | 'claro'`; `usePreferencias` (Zustand) com estado `{ tema: EsquemaTema; hidratado: boolean; hidratar(): Promise<void>; definirTema(tema: EsquemaTema): Promise<void> }`. Chave no SecureStore: `insightflow.tema`. Padrão `'escuro'`.
  - `interface Tema { esquema: EsquemaTema; cores: Cores; tons: Tons; grafico: CoresGrafico; sombras: Sombras; serie: readonly string[] }` e `useTema(): Tema` (lê `usePreferencias`).

- [ ] **Step 1: Escrever o teste (falhando)**

`src/store/preferencias.test.ts`:

```ts
import * as SecureStore from 'expo-secure-store';

import { usePreferencias } from '@/store/preferencias';

const armazenamento = (SecureStore as unknown as { __armazenamento: Map<string, string> }).__armazenamento;

beforeEach(() => {
  armazenamento.clear();
  usePreferencias.setState({ tema: 'escuro', hidratado: false });
});

describe('usePreferencias', () => {
  it('começa no tema escuro, ainda não hidratado', () => {
    expect(usePreferencias.getState()).toMatchObject({ tema: 'escuro', hidratado: false });
  });

  it('hidratar lê o tema claro salvo', async () => {
    armazenamento.set('insightflow.tema', 'claro');
    await usePreferencias.getState().hidratar();
    expect(usePreferencias.getState()).toMatchObject({ tema: 'claro', hidratado: true });
  });

  it('hidratar sem valor salvo mantém o escuro', async () => {
    await usePreferencias.getState().hidratar();
    expect(usePreferencias.getState()).toMatchObject({ tema: 'escuro', hidratado: true });
  });

  it('valor salvo inválido cai em escuro', async () => {
    armazenamento.set('insightflow.tema', 'sepia');
    await usePreferencias.getState().hidratar();
    expect(usePreferencias.getState()).toMatchObject({ tema: 'escuro', hidratado: true });
  });

  it('erro de leitura do SecureStore cai em escuro e marca como hidratado (não trava a splash)', async () => {
    jest.spyOn(SecureStore, 'getItemAsync').mockRejectedValueOnce(new Error('falha'));
    await usePreferencias.getState().hidratar();
    expect(usePreferencias.getState()).toMatchObject({ tema: 'escuro', hidratado: true });
  });

  it('definirTema atualiza o estado e persiste', async () => {
    await usePreferencias.getState().definirTema('claro');
    expect(usePreferencias.getState().tema).toBe('claro');
    expect(armazenamento.get('insightflow.tema')).toBe('claro');
  });

  it('definirTema mantém o estado mesmo se a gravação falhar', async () => {
    jest.spyOn(SecureStore, 'setItemAsync').mockRejectedValueOnce(new Error('falha'));
    await expect(usePreferencias.getState().definirTema('claro')).resolves.toBeUndefined();
    expect(usePreferencias.getState().tema).toBe('claro');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/store/preferencias.test.ts` → FAIL (módulo inexistente).

- [ ] **Step 3: Implementar**

`src/store/preferencias.ts`:

```ts
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const CHAVE_TEMA = 'insightflow.tema';

export type EsquemaTema = 'escuro' | 'claro';

const TEMA_PADRAO: EsquemaTema = 'escuro';

interface EstadoPreferencias {
  tema: EsquemaTema;
  hidratado: boolean;
  hidratar: () => Promise<void>;
  definirTema: (tema: EsquemaTema) => Promise<void>;
}

export const usePreferencias = create<EstadoPreferencias>((set) => ({
  tema: TEMA_PADRAO,
  hidratado: false,

  hidratar: async () => {
    try {
      const salvo = await SecureStore.getItemAsync(CHAVE_TEMA);
      set({ tema: salvo === 'claro' ? 'claro' : TEMA_PADRAO, hidratado: true });
    } catch {
      // Sem leitura, o app abre no tema padrão em vez de travar na splash.
      set({ tema: TEMA_PADRAO, hidratado: true });
    }
  },

  definirTema: async (tema) => {
    set({ tema });
    try {
      await SecureStore.setItemAsync(CHAVE_TEMA, tema);
    } catch {
      // A escolha vale nesta sessão mesmo que não persista.
    }
  },
}));
```

Substitua `src/theme/useTema.ts` por:

```ts
import { usePreferencias } from '@/store/preferencias';
import {
  type Cores,
  type CoresGrafico,
  coresClaro,
  coresEscuro,
  criarSerie,
  graficoClaro,
  graficoEscuro,
  type Tons,
  tonsClaro,
  tonsEscuro,
} from '@/theme/cores';
import { type Sombras, sombrasClaro, sombrasEscuro } from '@/theme/sombras';

export interface Tema {
  esquema: 'claro' | 'escuro';
  cores: Cores;
  tons: Tons;
  grafico: CoresGrafico;
  sombras: Sombras;
  serie: readonly string[];
}

const temaClaro: Tema = {
  esquema: 'claro',
  cores: coresClaro,
  tons: tonsClaro,
  grafico: graficoClaro,
  sombras: sombrasClaro,
  serie: criarSerie(coresClaro, graficoClaro),
};

const temaEscuro: Tema = {
  esquema: 'escuro',
  cores: coresEscuro,
  tons: tonsEscuro,
  grafico: graficoEscuro,
  sombras: sombrasEscuro,
  serie: criarSerie(coresEscuro, graficoEscuro),
};

export function useTema(): Tema {
  const tema = usePreferencias((estado) => estado.tema);
  return tema === 'claro' ? temaClaro : temaEscuro;
}
```

Em `src/components/dominio.test.tsx`: troque `import { coresClaro } from '@/theme/cores';` por `import { coresEscuro } from '@/theme/cores';` e, nas três asserções de `VariacaoBadge`, `coresClaro.` por `coresEscuro.` (o tema padrão passou a ser o escuro).

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/store/preferencias.test.ts src/components/dominio.test.tsx` → PASS. Depois `npm run verificar` → verde.

- [ ] **Step 5: Commit**

```bash
git add src/store/preferencias.ts src/store/preferencias.test.ts src/theme/useTema.ts src/components/dominio.test.tsx
git commit -m "feat(tema): guarda a preferência de tema (escuro por padrão) e expõe o tema completo

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Tipografia (Inter + Space Grotesk), escala e `Texto`

**Files:**
- Create: `src/theme/familias.ts`, `src/theme/familias.test.ts`, `src/theme/carregarFontes.ts`, `src/components/texto.test.tsx`
- Modify: `src/theme/escala.ts`, `src/components/Texto.tsx`, `app/_layout.tsx`
- Dependências: `npx expo install @expo-google-fonts/inter @expo-google-fonts/space-grotesk`

**Interfaces:**
- Consumes: Task 2 (`useTema`, `usePreferencias`), `Cores` (Task 1).
- Produces: `familia` (`corpo`, `medio`, `semibold`, `negrito`, `tituloSemi`, `titulo`) e `fontesProntas(carregou: boolean, erro: unknown): boolean` em `@/theme/familias`; `FONTES` em `@/theme/carregarFontes` (só o layout raiz importa); `raio = { sm: 8, md: 10, lg: 14, xl: 20, pilula: 999 }` e `fonte` com `secao: 14`; `Texto` com variantes `destaque | titulo | subtitulo | secao | corpo | legenda | rotulo`, cores `padrao | secundario | terciario | primaria | destaque | ia | positivo | negativo | alerta | sobrePrimaria`, e props `negrito?`, `numerico?`.

- [ ] **Step 1: Instalar as fontes**

```bash
npx expo install @expo-google-fonts/inter @expo-google-fonts/space-grotesk
```

Expected: pacotes adicionados a `package.json`/`package-lock.json` (o `expo-font` já está instalado). O Jest do `jest-expo` já transforma `@expo-google-fonts/*`.

- [ ] **Step 2: Escrever os testes (falhando)**

`src/theme/familias.test.ts`:

```ts
import { familia, fontesProntas } from '@/theme/familias';

describe('fontesProntas', () => {
  it('fica pronto quando as fontes carregaram', () => {
    expect(fontesProntas(true, null)).toBe(true);
  });

  it('não está pronto enquanto carrega, sem erro', () => {
    expect(fontesProntas(false, null)).toBe(false);
  });

  it('com erro de carregamento libera o app (usa a fonte do sistema em vez de travar a splash)', () => {
    expect(fontesProntas(false, new Error('falha'))).toBe(true);
  });
});

it('nomes das famílias são os do pacote @expo-google-fonts', () => {
  expect(familia).toEqual({
    corpo: 'Inter_400Regular',
    medio: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    negrito: 'Inter_700Bold',
    tituloSemi: 'SpaceGrotesk_600SemiBold',
    titulo: 'SpaceGrotesk_700Bold',
  });
});
```

`src/components/texto.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';

import { Texto } from '@/components/Texto';
import { coresEscuro } from '@/theme/cores';
import { familia } from '@/theme/familias';

describe('Texto', () => {
  it('título usa Space Grotesk Bold', async () => {
    await render(<Texto variante="titulo">Olá</Texto>);
    expect(screen.getByText('Olá')).toHaveStyle({ fontFamily: familia.titulo, fontSize: 22 });
  });

  it('corpo usa Inter Regular e, com negrito, Inter Bold (sem fontWeight)', async () => {
    await render(
      <>
        <Texto>normal</Texto>
        <Texto negrito>forte</Texto>
      </>,
    );
    expect(screen.getByText('normal')).toHaveStyle({ fontFamily: familia.corpo });
    expect(screen.getByText('forte')).toHaveStyle({ fontFamily: familia.negrito });
    expect(screen.getByText('forte')).not.toHaveStyle({ fontWeight: '700' });
  });

  it('rótulo é caixa alta com espaçamento entre letras', async () => {
    await render(<Texto variante="rotulo">E-mail</Texto>);
    expect(screen.getByText('E-mail')).toHaveStyle({ textTransform: 'uppercase', letterSpacing: 0.8 });
  });

  it('numerico ativa algarismos tabulares', async () => {
    await render(<Texto numerico>R$ 10,00</Texto>);
    expect(screen.getByText('R$ 10,00')).toHaveStyle({ fontVariant: ['tabular-nums'] });
  });

  it('cores terciario, destaque e ia vêm do tema', async () => {
    await render(
      <>
        <Texto cor="terciario">a</Texto>
        <Texto cor="destaque">b</Texto>
        <Texto cor="ia">c</Texto>
      </>,
    );
    expect(screen.getByText('a')).toHaveStyle({ color: coresEscuro.textoTerciario });
    expect(screen.getByText('b')).toHaveStyle({ color: coresEscuro.destaque });
    expect(screen.getByText('c')).toHaveStyle({ color: coresEscuro.ia });
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx jest src/theme/familias.test.ts src/components/texto.test.tsx` → FAIL.

- [ ] **Step 4: Implementar**

`src/theme/familias.ts`:

```ts
/** Nomes das famílias registradas por `carregarFontes.ts`. Sem imports de pacotes: seguro para importar em qualquer teste. */
export const familia = {
  corpo: 'Inter_400Regular',
  medio: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  negrito: 'Inter_700Bold',
  tituloSemi: 'SpaceGrotesk_600SemiBold',
  titulo: 'SpaceGrotesk_700Bold',
} as const;

/** Com erro de carregamento o app abre com a fonte do sistema em vez de ficar preso na splash. */
export function fontesProntas(carregou: boolean, erro: unknown): boolean {
  return carregou || erro != null;
}
```

`src/theme/carregarFontes.ts`:

```ts
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';

import { familia } from '@/theme/familias';

/** Argumento de `useFonts` (só o layout raiz importa este arquivo). */
export const FONTES = {
  [familia.corpo]: Inter_400Regular,
  [familia.medio]: Inter_500Medium,
  [familia.semibold]: Inter_600SemiBold,
  [familia.negrito]: Inter_700Bold,
  [familia.tituloSemi]: SpaceGrotesk_600SemiBold,
  [familia.titulo]: SpaceGrotesk_700Bold,
};
```

`src/theme/escala.ts` (substituição completa):

```ts
export const espaco = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
// sm: botões e campos; lg: cards; xl: card de login (mesmos raios do web: 8/14/20).
export const raio = { sm: 8, md: 10, lg: 14, xl: 20, pilula: 999 } as const;
export const fonte = { legenda: 12, corpo: 15, secao: 14, subtitulo: 17, titulo: 22, destaque: 28 } as const;
```

`src/components/Texto.tsx` (substituição completa):

```tsx
import { Text, type TextProps, type TextStyle } from 'react-native';

import type { Cores } from '@/theme/cores';
import { fonte } from '@/theme/escala';
import { familia } from '@/theme/familias';
import { useTema } from '@/theme/useTema';

export type VarianteTexto = 'destaque' | 'titulo' | 'subtitulo' | 'secao' | 'corpo' | 'legenda' | 'rotulo';
export type CorTexto =
  | 'padrao'
  | 'secundario'
  | 'terciario'
  | 'primaria'
  | 'destaque'
  | 'ia'
  | 'positivo'
  | 'negativo'
  | 'alerta'
  | 'sobrePrimaria';

const TOKEN_DA_COR: Record<CorTexto, keyof Cores> = {
  padrao: 'texto',
  secundario: 'textoSecundario',
  terciario: 'textoTerciario',
  primaria: 'primaria',
  destaque: 'destaque',
  ia: 'ia',
  positivo: 'positivo',
  negativo: 'negativo',
  alerta: 'alerta',
  sobrePrimaria: 'textoSobrePrimaria',
};

const ESTILO_DA_VARIANTE: Record<VarianteTexto, TextStyle> = {
  destaque: { fontSize: fonte.destaque, fontFamily: familia.titulo },
  titulo: { fontSize: fonte.titulo, fontFamily: familia.titulo },
  subtitulo: { fontSize: fonte.subtitulo, fontFamily: familia.tituloSemi },
  secao: { fontSize: fonte.secao, fontFamily: familia.semibold },
  corpo: { fontSize: fonte.corpo, fontFamily: familia.corpo },
  legenda: { fontSize: fonte.legenda, fontFamily: familia.corpo },
  // Rótulo de campo/KPI, como `.label` do web: caixa alta, letras espaçadas.
  rotulo: { fontSize: fonte.legenda, fontFamily: familia.semibold, textTransform: 'uppercase', letterSpacing: 0.8 },
};

// Peso "negrito" por variante: com fonte customizada o peso vem da família, nunca de `fontWeight`.
const FAMILIA_NEGRITO: Partial<Record<VarianteTexto, string>> = {
  subtitulo: familia.titulo,
  secao: familia.negrito,
  corpo: familia.negrito,
  legenda: familia.negrito,
  rotulo: familia.negrito,
};

const NUMERICO: TextStyle = { fontVariant: ['tabular-nums'] };

interface Props extends TextProps {
  variante?: VarianteTexto;
  cor?: CorTexto;
  negrito?: boolean;
  /** Algarismos de largura fixa (preços, percentuais, quantidades). */
  numerico?: boolean;
}

export function Texto({ variante = 'corpo', cor = 'padrao', negrito = false, numerico = false, style, ...resto }: Props) {
  const { cores } = useTema();
  const familiaNegrito = negrito ? FAMILIA_NEGRITO[variante] : undefined;
  return (
    <Text
      style={[
        ESTILO_DA_VARIANTE[variante],
        familiaNegrito ? { fontFamily: familiaNegrito } : null,
        numerico ? NUMERICO : null,
        { color: cores[TOKEN_DA_COR[cor]] },
        style,
      ]}
      {...resto}
    />
  );
}
```

`app/_layout.tsx`: carregar fontes e preferências e segurar a splash até tudo estar pronto; StatusBar acompanha o tema. Substitua o arquivo por (o resto — providers, guarda de sessão, `configurarApi`, `temaDeNavegacao` — permanece igual ao atual):

```tsx
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, type Theme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { configurarApi } from '@/api/client';
import { queryClient } from '@/hooks/queryClient';
import { usePreferencias } from '@/store/preferencias';
import { useSessao } from '@/store/sessao';
import { FONTES } from '@/theme/carregarFontes';
import { fontesProntas } from '@/theme/familias';
import { type Tema, useTema } from '@/theme/useTema';

void SplashScreen.preventAutoHideAsync();

configurarApi({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000',
  obterToken: () => useSessao.getState().token,
  // Token vencido ou inválido: volta ao login (não há refresh token no backend).
  // `sair` propaga falhas do SecureStore e vários 401 podem disparar em paralelo: sem o `.catch` haveria rejeição não tratada.
  aoNaoAutorizado: () => {
    void useSessao
      .getState()
      .sair()
      .catch(() => {});
  },
});

function temaDeNavegacao(tema: Tema): Theme {
  const base = tema.esquema === 'escuro' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: tema.cores.fundo,
      card: tema.cores.superficie,
      text: tema.cores.texto,
      border: tema.cores.borda,
      primary: tema.cores.primaria,
    },
  };
}

export default function RootLayout() {
  const status = useSessao((estado) => estado.status);
  const hidratar = useSessao((estado) => estado.hidratar);
  const preferenciasHidratadas = usePreferencias((estado) => estado.hidratado);
  const hidratarPreferencias = usePreferencias((estado) => estado.hidratar);
  const [carregouFontes, erroFontes] = useFonts(FONTES);
  const tema = useTema();

  useEffect(() => {
    void hidratar();
    void hidratarPreferencias();
  }, [hidratar, hidratarPreferencias]);

  // Splash presa até sessão, preferência de tema e fontes estarem prontas (erro de fonte não trava: usa a do sistema).
  const pronto = status !== 'carregando' && preferenciasHidratadas && fontesProntas(carregouFontes, erroFontes);

  useEffect(() => {
    if (pronto) void SplashScreen.hideAsync();
  }, [pronto]);

  useEffect(() => {
    // Sem isso o TanStack não sabe quando o app volta ao primeiro plano no React Native.
    const assinatura = AppState.addEventListener('change', (estado) => focusManager.setFocused(estado === 'active'));
    return () => assinatura.remove();
  }, []);

  if (!pronto) return null;
  const autenticado = status === 'autenticado';

  return (
    <GestureHandlerRootView style={estilos.raiz}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={temaDeNavegacao(tema)}>
            <StatusBar style={tema.esquema === 'escuro' ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerBackTitle: 'Voltar' }}>
              <Stack.Protected guard={autenticado}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="buscar" options={{ title: 'Buscar ativo' }} />
                <Stack.Screen name="ativo/[id]" options={{ title: 'Ativo' }} />
                <Stack.Screen name="operacao/nova" options={{ title: 'Nova operação', presentation: 'modal' }} />
                <Stack.Screen name="chat" options={{ title: 'Perguntar à IA' }} />
              </Stack.Protected>
              <Stack.Protected guard={!autenticado}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              </Stack.Protected>
            </Stack>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
});
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx jest src/theme src/components/texto.test.tsx` → PASS. `npm run verificar` → verde (nenhum arquivo usa mais `fontWeight` em `Texto`; `VariacaoBadge` ainda tem um `fontWeight` — é trocado na Task 6). `npx expo export --platform android --output-dir "$(mktemp -d)"` deve resolver o bundle com as fontes.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/theme src/components/Texto.tsx src/components/texto.test.tsx app/_layout.tsx
git commit -m "feat(tema): adiciona Inter e Space Grotesk, escala de raios e splash até fontes e tema estarem prontos

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Ícones lucide (`Icone`, `IconeChip`) e migração dos Ionicons

**Files:**
- Create: `src/components/Icone.tsx`, `src/components/IconeChip.tsx`, `src/components/icone.test.tsx`
- Modify: `src/components/BotaoCabecalho.tsx`, `BotaoFlutuante.tsx`, `AvisoIA.tsx`, `ItemAlerta.tsx`, `ItemOperacao.tsx`, `LinhaResultadoBusca.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/portfolio.tsx`, `app/ativo/[id].tsx`
- Dependências: `npx expo install react-native-svg` e `npm install lucide-react-native`

**Interfaces:**
- Consumes: `useTema` (Task 2), `raio` (Task 3).
- Produces: `NomeIcone` (union fechado, abaixo), `NOMES_DE_ICONES: NomeIcone[]`, `Icone({ nome, tamanho?, cor?: keyof Cores, corExata?: string, espessura? })`, `IconeChip({ nome, tom?: 'primaria' | 'positivo' | 'negativo' | 'destaque' | 'ia' | 'neutro', tamanho? })`. `BotaoCabecalho` e `BotaoFlutuante` passam a receber `icone: NomeIcone` (de `@/components/Icone`); `NomeIcone` deixa de ser exportado por `BotaoCabecalho`.

Nomes de ícones e seus componentes lucide: `atividade` Activity, `erro` AlertCircle, `sino` Bell, `sino-desligado` BellOff, `circulo` Circle, `olho` Eye, `olho-fechado` EyeOff, `caixa-vazia` Inbox, `info` Info, `lista` List, `cadeado` Lock, `email` Mail, `mensagem` MessageSquare, `lua` Moon, `grafico-pizza` PieChart, `mais` Plus, `mais-circulo` PlusCircle, `atualizar` RefreshCw, `busca` Search, `brilho` Sparkles, `estrela` Star, `lixeira` Trash2, `tendencia` TrendingUp, `usuario` User, `carteira` Wallet.

- [ ] **Step 1: Instalar**

```bash
npx expo install react-native-svg
npm install lucide-react-native
```

Confira que cada componente acima existe na versão instalada: `grep -c "declare const <Nome>:" node_modules/lucide-react-native/dist/lucide-react-native.d.ts` (deve dar ≥ 1). Se algum nome tiver sido renomeado nessa versão (ex.: `AlertCircle` → `CircleAlert`, `PieChart` → `ChartPie`), use o nome novo no mapa do Step 3 — o nome **pt-BR** do ícone não muda. Se o Jest não transformar `lucide-react-native`/`react-native-svg`, acrescente-os ao `transformIgnorePatterns` do `jest` no `package.json` seguindo o padrão do preset `jest-expo`.

- [ ] **Step 2: Escrever o teste (falhando)**

`src/components/icone.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';

import { Icone, NOMES_DE_ICONES } from '@/components/Icone';
import { IconeChip } from '@/components/IconeChip';

describe('Icone', () => {
  it.each(NOMES_DE_ICONES)('renderiza o ícone %s (componente lucide existe na versão instalada)', async (nome) => {
    await render(<Icone nome={nome} />);
    expect(screen.getByTestId(`icone-${nome}`)).toBeOnTheScreen();
  });

  it('é decorativo para leitores de tela', async () => {
    await render(<Icone nome="lixeira" />);
    expect(screen.getByTestId('icone-lixeira').props['aria-hidden']).toBe(true);
  });
});

describe('IconeChip', () => {
  it('renderiza o ícone dentro do chip', async () => {
    await render(<IconeChip nome="carteira" tom="positivo" />);
    expect(screen.getByTestId('icone-carteira')).toBeOnTheScreen();
  });
});
```

Se `props['aria-hidden']` não estiver no elemento de host encontrado pelo `testID` (o `Svg` do `react-native-svg` repassa props), inspecione `screen.toJSON()` e assevere a prop equivalente que o lucide repassa ao `Svg` (`aria-hidden` ou `accessibilityElementsHidden`); o objetivo é provar que o ícone é oculto para leitores de tela.

- [ ] **Step 3: Rodar (falha) e implementar**

Run: `npx jest src/components/icone.test.tsx` → FAIL (módulos inexistentes).

`src/components/Icone.tsx`:

```tsx
import {
  Activity,
  AlertCircle,
  Bell,
  BellOff,
  Circle,
  Eye,
  EyeOff,
  Inbox,
  Info,
  List,
  Lock,
  Mail,
  MessageSquare,
  Moon,
  PieChart,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  User,
  Wallet,
} from 'lucide-react-native';

import type { Cores } from '@/theme/cores';
import { useTema } from '@/theme/useTema';

const ICONES = {
  atividade: Activity,
  erro: AlertCircle,
  sino: Bell,
  'sino-desligado': BellOff,
  circulo: Circle,
  olho: Eye,
  'olho-fechado': EyeOff,
  'caixa-vazia': Inbox,
  info: Info,
  lista: List,
  cadeado: Lock,
  email: Mail,
  mensagem: MessageSquare,
  lua: Moon,
  'grafico-pizza': PieChart,
  mais: Plus,
  'mais-circulo': PlusCircle,
  atualizar: RefreshCw,
  busca: Search,
  brilho: Sparkles,
  estrela: Star,
  lixeira: Trash2,
  tendencia: TrendingUp,
  usuario: User,
  carteira: Wallet,
} as const;

export type NomeIcone = keyof typeof ICONES;

export const NOMES_DE_ICONES = Object.keys(ICONES) as NomeIcone[];

interface Props {
  nome: NomeIcone;
  tamanho?: number;
  /** Token de cor do tema. */
  cor?: keyof Cores;
  /** Só para cores que o navegador entrega já resolvidas a partir dos tokens (ex.: ícone de aba). */
  corExata?: string;
  espessura?: number;
}

/** Ícone lucide (o mesmo conjunto do web) sempre com cor vinda do tema. Decorativo: oculto para leitores de tela. */
export function Icone({ nome, tamanho = 20, cor = 'texto', corExata, espessura = 2 }: Props) {
  const { cores } = useTema();
  const Componente = ICONES[nome];
  return (
    <Componente
      testID={`icone-${nome}`}
      aria-hidden
      size={tamanho}
      color={corExata ?? cores[cor]}
      strokeWidth={espessura}
    />
  );
}
```

`src/components/IconeChip.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';

import { Icone, type NomeIcone } from '@/components/Icone';
import { raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

export type TomChip = 'primaria' | 'positivo' | 'negativo' | 'destaque' | 'ia' | 'neutro';

interface Props {
  nome: NomeIcone;
  tom?: TomChip;
  tamanho?: number;
}

/** Ícone em quadrado colorido (padrão `IconChip` do web) — cabeçalhos de seção e KPIs. */
export function IconeChip({ nome, tom = 'primaria', tamanho = 28 }: Props) {
  const { cores, sombras } = useTema();
  const fundo = tom === 'neutro' ? cores.superficieAlta : cores[tom];
  const corIcone = tom === 'neutro' ? 'texto' : 'textoSobrePrimaria';
  return (
    <View
      style={[estilos.chip, { width: tamanho, height: tamanho, backgroundColor: fundo, boxShadow: sombras.sm }]}
    >
      <Icone nome={nome} tamanho={Math.round(tamanho * 0.55)} cor={corIcone} />
    </View>
  );
}

const estilos = StyleSheet.create({
  chip: { borderRadius: raio.sm, alignItems: 'center', justifyContent: 'center' },
});
```

Migração (troque cada uso de `Ionicons`; remova o import `@expo/vector-icons` de cada arquivo):

- `src/components/BotaoCabecalho.tsx`: remova o `type NomeIcone = ComponentProps<...>` e o import `ComponentProps`; use `import { Icone, type NomeIcone } from '@/components/Icone';`; corpo: `<Icone nome={icone} tamanho={22} cor="primaria" />`. (`Props.icone: NomeIcone`.) `hitSlop={8}` passa a `hitSlop={12}` (alvo ≥ 44 pt com o `paddingHorizontal` existente).
- `src/components/BotaoFlutuante.tsx`: `import type { NomeIcone } from '@/components/Icone';`, `import { Icone } from '@/components/Icone';` (ou um import único) e `<Icone nome={icone} tamanho={22} cor="textoSobrePrimaria" />`. Nesta task **não** mexa nos estilos (Task 5).
- `src/components/AvisoIA.tsx`: `<Icone nome="info" tamanho={16} cor="alerta" />`.
- `src/components/ItemAlerta.tsx` e `ItemOperacao.tsx`: `<Icone nome="lixeira" tamanho={20} cor="negativo" />` e `hitSlop={12}`.
- `src/components/LinhaResultadoBusca.tsx`: `<Icone nome="mais-circulo" tamanho={24} cor="primaria" />`.
- `app/(tabs)/_layout.tsx`: remova o import de `Ionicons`; ícones das abas via `corExata`: Watchlist `<Icone nome="estrela" corExata={color} tamanho={size} />`, Portfólio `nome="grafico-pizza"`, Alertas `nome="sino"`, Perfil `nome="usuario"`; `BotaoCabecalho icone="mais"` (busca) e `icone="mensagem"` (chat).
- `app/(tabs)/portfolio.tsx`: `<BotaoFlutuante rotulo="Nova operação" icone="mais" ... />`.
- `app/ativo/[id].tsx`: `icone={item.notificar ? 'sino' : 'sino-desligado'}`.

Confirme: `grep -rn "vector-icons\|Ionicons" app src` não retorna nada.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/components/icone.test.tsx` → PASS; `npm run verificar` → verde; `npx expo export --platform android --output-dir "$(mktemp -d)"` resolve o bundle com `react-native-svg`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/components app
git commit -m "feat(ui): troca Ionicons por ícones lucide com Icone e IconeChip

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Card, Botão e botões de cabeçalho/flutuante no estilo do web

**Files:**
- Modify: `src/components/Card.tsx`, `src/components/Botao.tsx`, `src/components/BotaoFlutuante.tsx`
- Test: `src/components/superficies.test.tsx` (novo)

**Interfaces:**
- Consumes: `useTema` (`cores`, `sombras`), `raio`/`espaco` (Task 3), `Icone`/`IconeChip` (Task 4), `Texto` variante `secao` (Task 3).
- Produces: `Card({ titulo?, acao?, icone?: NomeIcone, tomIcone?: TomChip, children })` — mesmas props anteriores, mais `icone`/`tomIcone`; `Botao` com as mesmas props e variantes (`primario | secundario | perigo`).

- [ ] **Step 1: Escrever o teste (falhando)**

`src/components/superficies.test.tsx`:

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Botao } from '@/components/Botao';
import { Card } from '@/components/Card';
import { coresEscuro } from '@/theme/cores';

describe('Card', () => {
  it('sem cabeçalho renderiza só o conteúdo', async () => {
    await render(
      <Card>
        <Text>corpo</Text>
      </Card>,
    );
    expect(screen.getByText('corpo')).toBeOnTheScreen();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('com título mostra o cabeçalho (heading) e a ação', async () => {
    await render(
      <Card titulo="Resumo" acao={<Text>ação</Text>}>
        <Text>corpo</Text>
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'Resumo' })).toBeOnTheScreen();
    expect(screen.getByText('ação')).toBeOnTheScreen();
  });

  it('com icone mostra o chip de ícone antes do título', async () => {
    await render(
      <Card titulo="Resumo" icone="carteira">
        <Text>corpo</Text>
      </Card>,
    );
    expect(screen.getByTestId('icone-carteira')).toBeOnTheScreen();
  });
});

describe('Botao', () => {
  it('primário usa a cor primária de fundo', async () => {
    await render(<Botao titulo="Entrar" onPress={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Entrar' })).toHaveStyle({ backgroundColor: coresEscuro.primaria });
  });

  it('secundário é transparente com borda forte', async () => {
    await render(<Botao titulo="Tentar" variante="secundario" onPress={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Tentar' })).toHaveStyle({
      backgroundColor: 'transparent',
      borderColor: coresEscuro.bordaForte,
    });
  });

  it('perigo usa a cor negativa na borda', async () => {
    await render(<Botao titulo="Sair" variante="perigo" onPress={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Sair' })).toHaveStyle({ borderColor: coresEscuro.negativo });
  });

  it('desabilitado não dispara e fica com aria-disabled', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Botao titulo="Entrar" onPress={onPress} desabilitado />);
    const botao = screen.getByRole('button', { name: 'Entrar' });
    expect(botao).toBeDisabled();
    await user.press(botao);
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/components/superficies.test.tsx` → FAIL (o `Card` ainda não aceita `icone`; `secundario` ainda tem borda `primaria`).

- [ ] **Step 3: Implementar**

`src/components/Card.tsx` (substituição completa):

```tsx
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { NomeIcone } from '@/components/Icone';
import { IconeChip, type TomChip } from '@/components/IconeChip';
import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  titulo?: string;
  acao?: ReactNode;
  /** Chip de ícone antes do título (padrão `SectionTitle` do web). */
  icone?: NomeIcone;
  tomIcone?: TomChip;
  children: ReactNode;
}

export function Card({ titulo, acao, icone, tomIcone = 'primaria', children }: Props) {
  const { cores, sombras } = useTema();
  const temCabecalho = Boolean(titulo || acao);
  return (
    <View
      style={[
        estilos.card,
        { backgroundColor: cores.superficie, borderColor: cores.borda, boxShadow: `${sombras.md}, ${sombras.brilho}` },
      ]}
    >
      {temCabecalho ? (
        <View style={[estilos.cabecalho, { backgroundColor: cores.superficieElevada, borderBottomColor: cores.borda }]}>
          <View style={estilos.tituloLinha}>
            {icone ? <IconeChip nome={icone} tom={tomIcone} tamanho={24} /> : null}
            {titulo ? (
              <Texto variante="secao" role="heading" style={estilos.titulo}>
                {titulo}
              </Texto>
            ) : null}
          </View>
          {acao}
        </View>
      ) : null}
      <View style={estilos.corpo}>{children}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: raio.lg, overflow: 'hidden' },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaco.sm,
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.md,
    borderBottomWidth: 1,
  },
  tituloLinha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, flexShrink: 1 },
  titulo: { flexShrink: 1 },
  corpo: { padding: espaco.lg, gap: espaco.md },
});
```

`src/components/Botao.tsx` (substituição completa):

```tsx
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { type CorTexto, Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

type VarianteBotao = 'primario' | 'secundario' | 'perigo';

interface Props {
  titulo: string;
  onPress: () => void;
  variante?: VarianteBotao;
  carregando?: boolean;
  desabilitado?: boolean;
}

const COR_DO_TEXTO: Record<VarianteBotao, CorTexto> = {
  primario: 'sobrePrimaria',
  secundario: 'secundario',
  perigo: 'negativo',
};

export function Botao({ titulo, onPress, variante = 'primario', carregando = false, desabilitado = false }: Props) {
  const { cores, sombras } = useTema();
  const inativo = desabilitado || carregando;
  const primario = variante === 'primario';
  const borda = variante === 'perigo' ? cores.negativo : primario ? cores.primaria : cores.bordaForte;
  const sombra = primario ? `${sombras.primaria}, ${sombras.brilho}` : sombras.sm;

  return (
    <Pressable
      role="button"
      aria-label={titulo}
      aria-disabled={inativo}
      aria-busy={carregando}
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        {
          backgroundColor: primario ? (pressed ? cores.primariaHover : cores.primaria) : 'transparent',
          borderColor: borda,
          boxShadow: sombra,
          opacity: inativo ? 0.5 : 1,
          transform: [{ scale: pressed && !inativo ? 0.98 : 1 }],
        },
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={primario ? cores.textoSobrePrimaria : cores.primaria} />
      ) : (
        <Texto negrito cor={COR_DO_TEXTO[variante]}>
          {titulo}
        </Texto>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: raio.sm,
    borderWidth: 1,
    paddingHorizontal: espaco.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
});
```

`src/components/BotaoFlutuante.tsx`: `const { cores, sombras } = useTema();` e o `style` do `Pressable` vira:

```tsx
style={({ pressed }) => [
  estilos.botao,
  {
    backgroundColor: pressed ? cores.primariaHover : cores.primaria,
    boxShadow: `${sombras.primaria}, ${sombras.lg}`,
  },
]}
```

e remova de `estilos.botao` as chaves `elevation`, `shadowColor`, `shadowOpacity`, `shadowRadius`, `shadowOffset`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/components` → PASS (inclui `base.test.tsx`, `carteira.test.tsx`, `dominio.test.tsx`). Se algum teste existente dependia do estilo antigo, ajuste **só** a asserção de estilo. `npm run verificar` → verde.

- [ ] **Step 5: Commit**

```bash
git add src/components
git commit -m "feat(ui): restiliza Card, Botao e BotaoFlutuante no padrão do web

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: `Pill`, `VariacaoBadge` e blocos de IA

**Files:**
- Create: `src/components/Pill.tsx`, `src/components/pill.test.tsx`
- Modify: `src/components/VariacaoBadge.tsx`, `src/components/AvisoIA.tsx`, `src/components/CardAnaliseIA.tsx`

**Interfaces:**
- Consumes: `useTema` (`cores`, `tons`), `Texto`/`familia` (Task 3), `Icone` (Task 4), `Card` com `icone`/`tomIcone` (Task 5).
- Produces: `type TomPill = 'verde' | 'vermelho' | 'amarelo' | 'laranja' | 'azul' | 'violeta' | 'cinza'`; `Pill({ tom?: TomPill; icone?: NomeIcone; children: string; 'aria-label'?: string })`. `VariacaoBadge` mantém `{ valor, escala }`, texto `${seta} ${percentual}` e `aria-label` `Variação ${percentual}`.

- [ ] **Step 1: Escrever o teste (falhando)**

`src/components/pill.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';

import { Pill, type TomPill } from '@/components/Pill';
import { VariacaoBadge } from '@/components/VariacaoBadge';
import { coresEscuro, tonsEscuro } from '@/theme/cores';

const CASOS: [TomPill, string, string][] = [
  ['verde', tonsEscuro.verdeFundo, coresEscuro.positivo],
  ['vermelho', tonsEscuro.vermelhoFundo, coresEscuro.negativo],
  ['amarelo', tonsEscuro.amareloFundo, coresEscuro.alerta],
  ['laranja', tonsEscuro.laranjaFundo, tonsEscuro.laranjaTexto],
  ['azul', tonsEscuro.azulFundo, coresEscuro.primaria],
  ['violeta', tonsEscuro.violetaFundo, coresEscuro.ia],
  ['cinza', coresEscuro.superficieAlta, coresEscuro.textoSecundario],
];

describe('Pill', () => {
  it.each(CASOS)('tom %s usa o fundo e o texto do tema', async (tom, fundo, texto) => {
    await render(
      <Pill tom={tom} aria-label={`pill ${tom}`}>
        Rótulo
      </Pill>,
    );
    expect(screen.getByLabelText(`pill ${tom}`)).toHaveStyle({ backgroundColor: fundo });
    expect(screen.getByText('Rótulo')).toHaveStyle({ color: texto });
  });

  it('mostra o ícone quando informado', async () => {
    await render(<Pill icone="sino">Alerta</Pill>);
    expect(screen.getByTestId('icone-sino')).toBeOnTheScreen();
  });
});

describe('VariacaoBadge como Pill', () => {
  it('alta usa o tom verde e mantém aria-label', async () => {
    await render(<VariacaoBadge valor="1.23" escala="pontos" />);
    expect(screen.getByLabelText('Variação +1,23%')).toHaveStyle({ backgroundColor: tonsEscuro.verdeFundo });
  });

  it('baixa usa o tom vermelho', async () => {
    await render(<VariacaoBadge valor="-0.025" escala="fracao" />);
    expect(screen.getByLabelText('Variação -2,50%')).toHaveStyle({ backgroundColor: tonsEscuro.vermelhoFundo });
  });

  it('zero usa o tom cinza', async () => {
    await render(<VariacaoBadge valor="0" escala="pontos" />);
    expect(screen.getByLabelText('Variação 0,00%')).toHaveStyle({ backgroundColor: coresEscuro.superficieAlta });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/components/pill.test.tsx` → FAIL.

- [ ] **Step 3: Implementar**

`src/components/Pill.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';

import { Icone, type NomeIcone } from '@/components/Icone';
import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { familia } from '@/theme/familias';
import { type Tema, useTema } from '@/theme/useTema';

export type TomPill = 'verde' | 'vermelho' | 'amarelo' | 'laranja' | 'azul' | 'violeta' | 'cinza';

function coresDoTom(tom: TomPill, { cores, tons }: Tema): { fundo: string; texto: string } {
  switch (tom) {
    case 'verde':
      return { fundo: tons.verdeFundo, texto: cores.positivo };
    case 'vermelho':
      return { fundo: tons.vermelhoFundo, texto: cores.negativo };
    case 'amarelo':
      return { fundo: tons.amareloFundo, texto: cores.alerta };
    case 'laranja':
      return { fundo: tons.laranjaFundo, texto: tons.laranjaTexto };
    case 'azul':
      return { fundo: tons.azulFundo, texto: cores.primaria };
    case 'violeta':
      return { fundo: tons.violetaFundo, texto: cores.ia };
    case 'cinza':
      return { fundo: cores.superficieAlta, texto: cores.textoSecundario };
  }
}

interface Props {
  tom?: TomPill;
  icone?: NomeIcone;
  children: string;
  'aria-label'?: string;
}

/** Rótulo em pílula colorida (padrão `Pill` do web). */
export function Pill({ tom = 'cinza', icone, children, 'aria-label': ariaLabel }: Props) {
  const tema = useTema();
  const { fundo, texto } = coresDoTom(tom, tema);
  return (
    <View aria-label={ariaLabel} style={[estilos.pill, { backgroundColor: fundo }]}>
      {icone ? <Icone nome={icone} tamanho={12} corExata={texto} /> : null}
      <Texto variante="legenda" style={{ color: texto, fontFamily: familia.medio }}>
        {children}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.xs,
    alignSelf: 'flex-start',
    borderRadius: raio.pilula,
    paddingHorizontal: espaco.sm,
    paddingVertical: 2,
  },
});
```

`src/components/VariacaoBadge.tsx` (substituição completa):

```tsx
import type { Decimal } from '@/api/tipos';
import { Pill, type TomPill } from '@/components/Pill';
import { type EscalaPercentual, formatarPercentual } from '@/utils/formatacao';

interface Props {
  valor: Decimal | number;
  escala: EscalaPercentual;
}

export function VariacaoBadge({ valor, escala }: Props) {
  const texto = formatarPercentual(valor, escala);
  const alta = texto.startsWith('+');
  const baixa = texto.startsWith('-');
  const tom: TomPill = alta ? 'verde' : baixa ? 'vermelho' : 'cinza';
  const seta = alta ? '▲' : baixa ? '▼' : '•';

  return (
    <Pill tom={tom} aria-label={`Variação ${texto}`}>
      {`${seta} ${texto}`}
    </Pill>
  );
}
```

`src/components/AvisoIA.tsx`: `const { cores, tons } = useTema();`; o container passa a `style={[estilos.aviso, { backgroundColor: tons.violetaFundo, borderColor: cores.ia }]}` e o ícone a `<Icone nome="info" tamanho={16} cor="ia" />`; o texto continua `<Texto variante="legenda" cor="secundario" style={estilos.texto}>{AVISO_IA}</Texto>`.

`src/components/CardAnaliseIA.tsx`: `<Card titulo="Análise por IA" icone="brilho" tomIcone="ia">` (corpo inalterado).

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/components` → PASS (o teste existente de `AvisoIA`/`CardAnaliseIA` prova o texto exato `AVISO_IA`). Os três testes antigos de `VariacaoBadge` em `dominio.test.tsx` (cor do texto) continuam valendo com `coresEscuro`. `npm run verificar` → verde. Confirme `grep -rn "fontWeight" src app` vazio.

- [ ] **Step 5: Commit**

```bash
git add src/components
git commit -m "feat(ui): adiciona Pill e usa nos badges de variação e blocos de IA

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Campos, seletor e estados no estilo do web

**Files:**
- Modify: `src/components/Campo.tsx`, `CampoData.tsx`, `SeletorSegmentado.tsx`, `SugestoesTicker.tsx`, `EstadoVazio.tsx`, `ErroComRetry.tsx`, `Linha.tsx`, `Tela.tsx`
- Test: `src/components/campo.test.tsx` (novo)

**Interfaces:**
- Consumes: `useTema` (`cores`, `tons`, `sombras`), `familia`, `raio`/`espaco`, `Icone`, `Texto`.
- Produces: `Campo` com as props atuais mais `icone?: NomeIcone` e `alternarSenha?: boolean` (só faz efeito com `secureTextEntry`); `Tela` com prop nova `centralizar?: boolean`.

- [ ] **Step 1: Escrever o teste (falhando)**

`src/components/campo.test.tsx`:

```tsx
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';

import { Campo } from '@/components/Campo';
import { coresEscuro } from '@/theme/cores';

function CampoDeSenha({ inicial = '' }: { inicial?: string }) {
  const [valor, setValor] = useState(inicial);
  return <Campo rotulo="Senha" valor={valor} aoMudar={setValor} secureTextEntry alternarSenha icone="cadeado" />;
}

describe('Campo (padrão do web)', () => {
  it('mostra o ícone à esquerda quando informado', async () => {
    await render(<Campo rotulo="E-mail" valor="" aoMudar={() => undefined} icone="email" />);
    expect(screen.getByTestId('icone-email')).toBeOnTheScreen();
  });

  it('foco pinta a borda com a cor primária', async () => {
    await render(<Campo rotulo="E-mail" valor="" aoMudar={() => undefined} />);
    expect(screen.getByTestId('campo-moldura')).toHaveStyle({ borderColor: coresEscuro.bordaForte });
    await fireEvent(screen.getByLabelText('E-mail'), 'focus');
    expect(screen.getByTestId('campo-moldura')).toHaveStyle({ borderColor: coresEscuro.primaria });
    await fireEvent(screen.getByLabelText('E-mail'), 'blur');
    expect(screen.getByTestId('campo-moldura')).toHaveStyle({ borderColor: coresEscuro.bordaForte });
  });

  it('erro pinta a borda de negativo', async () => {
    await render(<Campo rotulo="E-mail" valor="" aoMudar={() => undefined} erro="Inválido" />);
    expect(screen.getByTestId('campo-moldura')).toHaveStyle({ borderColor: coresEscuro.negativo });
    expect(screen.getByText('Inválido')).toBeOnTheScreen();
  });

  it('alternarSenha mostra/oculta sem apagar o texto, e aria-pressed acompanha', async () => {
    const user = userEvent.setup();
    await render(<CampoDeSenha inicial="segredo123" />);
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);

    const botao = screen.getByRole('button', { name: 'Mostrar senha' });
    expect(botao.props['aria-pressed']).toBe(false);
    await user.press(botao);

    const campo = screen.getByLabelText('Senha');
    expect(campo.props.secureTextEntry).toBe(false);
    expect(campo.props.value).toBe('segredo123');
    expect(screen.getByRole('button', { name: 'Ocultar senha' }).props['aria-pressed']).toBe(true);

    await user.press(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);
    expect(screen.getByLabelText('Senha').props.value).toBe('segredo123');
  });

  it('sem alternarSenha não mostra o botão de olho', async () => {
    await render(<Campo rotulo="Senha" valor="" aoMudar={() => undefined} secureTextEntry />);
    expect(screen.queryByRole('button', { name: 'Mostrar senha' })).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/components/campo.test.tsx` → FAIL.

- [ ] **Step 3: Implementar**

`src/components/Campo.tsx` (substituição completa):

```tsx
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { Icone, type NomeIcone } from '@/components/Icone';
import { Texto } from '@/components/Texto';
import { espaco, fonte, raio } from '@/theme/escala';
import { familia } from '@/theme/familias';
import { useTema } from '@/theme/useTema';

type PropsRepassadas = Pick<
  TextInputProps,
  'placeholder' | 'secureTextEntry' | 'keyboardType' | 'autoCapitalize' | 'autoComplete' | 'editable'
>;

interface Props extends PropsRepassadas {
  rotulo: string;
  valor: string;
  aoMudar: (texto: string) => void;
  erro?: string;
  /** Ícone à esquerda (padrão `field-icon` do web); fica azul no foco. */
  icone?: NomeIcone;
  /** Botão de olho para mostrar/ocultar a senha (só com `secureTextEntry`). */
  alternarSenha?: boolean;
}

export function Campo({ rotulo, valor, aoMudar, erro, icone, alternarSenha = false, secureTextEntry, ...resto }: Props) {
  const { cores, sombras } = useTema();
  const [focado, setFocado] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const comOlho = Boolean(secureTextEntry) && alternarSenha;
  const ocultar = Boolean(secureTextEntry) && !(comOlho && senhaVisivel);
  const corDaBorda = erro ? cores.negativo : focado ? cores.primaria : cores.bordaForte;

  return (
    <View style={estilos.container}>
      <Texto variante="rotulo" cor="secundario">
        {rotulo}
      </Texto>
      <View
        testID="campo-moldura"
        style={[
          estilos.moldura,
          {
            backgroundColor: cores.superficieElevada,
            borderColor: corDaBorda,
            boxShadow: focado ? sombras.foco : undefined,
          },
        ]}
      >
        {icone ? <Icone nome={icone} tamanho={17} cor={focado ? 'primaria' : 'textoTerciario'} /> : null}
        <TextInput
          aria-label={rotulo}
          value={valor}
          onChangeText={aoMudar}
          placeholderTextColor={cores.textoTerciario}
          secureTextEntry={ocultar}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          style={[estilos.entrada, { color: cores.texto, fontFamily: familia.corpo }]}
          {...resto}
        />
        {comOlho ? (
          <Pressable
            role="button"
            aria-label={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={senhaVisivel}
            hitSlop={8}
            onPress={() => setSenhaVisivel((visivel) => !visivel)}
          >
            <Icone nome={senhaVisivel ? 'olho-fechado' : 'olho'} tamanho={18} cor="textoTerciario" />
          </Pressable>
        ) : null}
      </View>
      {erro ? (
        <Texto variante="legenda" cor="negativo">
          {erro}
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { gap: espaco.xs },
  moldura: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    borderWidth: 1,
    borderRadius: raio.sm,
    paddingHorizontal: espaco.md,
  },
  entrada: { flex: 1, minHeight: 46, fontSize: fonte.corpo },
});
```

`CampoData.tsx`: o rótulo vira `<Texto variante="rotulo" cor="secundario">{rotulo}</Texto>` (sem `negrito`); o `Pressable` do Android passa a `style={[estilos.campo, { backgroundColor: cores.superficieElevada, borderColor: erro ? cores.negativo : cores.bordaForte }]}` e `estilos.campo.borderRadius` a `raio.sm`. (Fora do foco do Task 7 o iOS usa o seletor nativo.)

`SeletorSegmentado.tsx`: grupo `{ borderColor: cores.bordaForte, backgroundColor: cores.superficieElevada }`; `estilos.opcao.minHeight: 44`; `estilos.grupo.borderRadius: raio.sm`.

`SugestoesTicker.tsx`: chip com `style={[estilos.chip, { borderColor: cores.primaria, backgroundColor: tons.azulFundo }]}` (`const { cores, tons } = useTema();`) e `hitSlop={8}` no `Pressable`.

`EstadoVazio.tsx`: acrescente `<Icone nome="caixa-vazia" tamanho={22} cor="textoTerciario" />` antes do texto, com `estilos.container.alignItems: 'center'`, e o texto passa a `cor="terciario"`.

`ErroComRetry.tsx`: acrescente `<Icone nome="erro" tamanho={22} cor="negativo" />` antes do texto e `alignItems: 'center'` no container (texto e botão continuam iguais).

`Linha.tsx`: o valor em string passa a `<Texto negrito numerico cor={cor}>`.

`Tela.tsx`: nova prop `centralizar?: boolean`; o `contentContainerStyle` vira `[estilos.conteudo, centralizar && estilos.centralizado]` com `centralizado: { justifyContent: 'center' }`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/components __tests__/telas` → PASS. Ajuste só asserções de estilo dos testes existentes que dependiam do estilo antigo. `npm run verificar` → verde.

- [ ] **Step 5: Commit**

```bash
git add src/components
git commit -m "feat(ui): restiliza campos, seletor e estados vazios no padrão do web

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Login e cadastro no padrão do web

**Files:**
- Create: `assets/icone.png`, `src/components/CartaoAuth.tsx`
- Modify: `app/(auth)/login.tsx`, `app/(auth)/cadastro.tsx`
- Test: `__tests__/telas/login.test.tsx`, `__tests__/telas/cadastro.test.tsx` (ajustes) e `src/components/cartaoAuth.test.tsx` (novo)
- Dependência: `npx expo install expo-linear-gradient`

**Interfaces:**
- Consumes: `Campo` com `icone`/`alternarSenha` (Task 7), `Tela` com `centralizar` (Task 7), `Texto`, `Botao`, `useTema` (`cores`, `sombras`), `raio`/`espaco`.
- Produces: `CartaoAuth({ titulo, subtitulo, children, rodape? })`.

- [ ] **Step 1: Obter o logo do web e instalar o gradiente**

```bash
npx expo install expo-linear-gradient
GH_TOKEN="$(gh auth token --user brunoosouza09)" gh api repos/InsightF-AI/Insight-flow-web/contents/public/icone.png -H "Accept: application/vnd.github.raw" > assets/icone.png
file assets/icone.png   # deve dizer "PNG image data"
```

(Somente leitura no repositório web, com a conta que tem acesso; não altere a conta ativa do `gh`. Se o arquivo não vier como PNG, pare e reporte.)

- [ ] **Step 2: Escrever o teste (falhando)**

`src/components/cartaoAuth.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { CartaoAuth } from '@/components/CartaoAuth';

describe('CartaoAuth', () => {
  it('mostra marca, título, subtítulo, conteúdo e rodapé', async () => {
    await render(
      <CartaoAuth titulo="Entrar" subtitulo="Acesse sua conta" rodape={<Text>rodapé</Text>}>
        <Text>conteúdo</Text>
      </CartaoAuth>,
    );
    expect(screen.getByText('InsightFlow')).toBeOnTheScreen();
    expect(screen.getByText('Análise de ativos · B3 & Cripto')).toBeOnTheScreen();
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeOnTheScreen();
    expect(screen.getByText('Acesse sua conta')).toBeOnTheScreen();
    expect(screen.getByText('conteúdo')).toBeOnTheScreen();
    expect(screen.getByText('rodapé')).toBeOnTheScreen();
  });
});
```

Nos testes de tela existentes de login e cadastro, acrescente ao teste de renderização (ou crie um `it` novo): `expect(screen.getByLabelText('Mostrar senha')).toBeOnTheScreen()` e o heading do título. Ajuste consultas que dependiam do texto antigo do subtítulo/cabeçalho.

- [ ] **Step 3: Rodar (falha) e implementar**

Run: `npx jest src/components/cartaoAuth.test.tsx` → FAIL.

`src/components/CartaoAuth.tsx`:

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

// O alias `@/` aponta para `src/`, então o asset entra por caminho relativo. Se o lint reclamar de `require`,
// use `import LOGO from '../../assets/icone.png';` (os tipos do Expo declaram módulos de imagem).
const LOGO = require('../../assets/icone.png');

interface Props {
  titulo: string;
  subtitulo: string;
  children: ReactNode;
  rodape?: ReactNode;
}

/** Card de login/cadastro do web: barra de gradiente azul→verde, logo, marca e título da tela. */
export function CartaoAuth({ titulo, subtitulo, children, rodape }: Props) {
  const { cores, sombras } = useTema();
  return (
    <View
      style={[
        estilos.cartao,
        { backgroundColor: cores.superficie, borderColor: cores.bordaForte, boxShadow: `${sombras.lg}, ${sombras.brilho}` },
      ]}
    >
      <LinearGradient
        colors={[cores.primaria, cores.positivo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={estilos.barra}
      />
      <Image source={LOGO} style={estilos.logo} aria-hidden accessibilityIgnoresInvertColors />
      <Texto variante="titulo" style={estilos.centro}>
        InsightFlow
      </Texto>
      <Texto variante="rotulo" cor="terciario" style={[estilos.centro, estilos.linhaDaMarca]}>
        Análise de ativos · B3 & Cripto
      </Texto>
      <View style={estilos.cabecalho}>
        <Texto variante="titulo" role="heading">
          {titulo}
        </Texto>
        <Texto cor="secundario">{subtitulo}</Texto>
      </View>
      <View style={estilos.conteudo}>{children}</View>
      {rodape ? <View style={estilos.rodape}>{rodape}</View> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: { borderWidth: 1, borderRadius: raio.xl, padding: espaco.xl, gap: espaco.sm, overflow: 'hidden' },
  barra: { position: 'absolute', top: 0, left: '18%', right: '18%', height: 2, borderRadius: 2 },
  logo: { width: 64, height: 64, alignSelf: 'center' },
  centro: { textAlign: 'center' },
  linhaDaMarca: { fontSize: 10, letterSpacing: 2 },
  cabecalho: { gap: espaco.xs, marginTop: espaco.lg },
  conteudo: { gap: espaco.md, marginTop: espaco.md },
  rodape: { alignItems: 'center', marginTop: espaco.md },
});
```

`app/(auth)/login.tsx`: mantenha **toda** a lógica (estados, `aoEnviar`, `enviando`, mensagens) e troque só o JSX/estilos:

```tsx
return (
  <Tela areaSegura centralizar>
    <CartaoAuth
      titulo="Entrar"
      subtitulo="Acesse sua conta para ver sua watchlist e sua carteira simulada."
      rodape={
        <Link href="/cadastro" replace asChild>
          <Pressable role="link" style={estilos.link}>
            <Texto cor="secundario">
              Não tem conta? <Texto cor="primaria" negrito>Criar conta</Texto>
            </Texto>
          </Pressable>
        </Link>
      }
    >
      <Campo
        rotulo="E-mail"
        valor={email}
        aoMudar={setEmail}
        erro={erros.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        icone="email"
      />
      <Campo
        rotulo="Senha"
        valor={senha}
        aoMudar={setSenha}
        erro={erros.senha}
        secureTextEntry
        alternarSenha
        autoComplete="password"
        icone="cadeado"
      />
      {erroGeral ? (
        <Texto role="alert" cor="negativo">
          {erroGeral}
        </Texto>
      ) : null}
      <Botao titulo="Entrar" onPress={aoEnviar} carregando={enviando} />
    </CartaoAuth>
    <Texto variante="legenda" cor="terciario" style={estilos.rodape}>
      Ferramenta educacional de análise. Não constitui recomendação de investimento.
    </Texto>
  </Tela>
);
```

com `estilos = { link: { padding: espaco.sm }, rodape: { textAlign: 'center' } }` (remova `cabecalho`); imports: `CartaoAuth`.

Atenção ao `Link asChild` + texto aninhado: o `Pressable` com `role="link"` precisa continuar acessível pelo nome "Criar conta" (os testes existentes usam `getByRole('link', { name: 'Criar conta' })`); se o texto aninhado alterar o nome acessível, dê `aria-label="Criar conta"` ao `Pressable`.

`app/(auth)/cadastro.tsx`: idem — `CartaoAuth titulo="Criar conta" subtitulo="Monte sua watchlist e registre operações simuladas, sem dinheiro real."`, rodapé `Já tem conta? <Criar/Entrar>` como link `href="/login"` com `aria-label="Já tenho conta"` (mantém o nome acessível atual), `Campo` de nome com `icone="usuario"`, e-mail `icone="email"`, senha `icone="cadeado"` + `alternarSenha`. Toda a lógica (`enviando`, `409`) permanece.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/components/cartaoAuth.test.tsx __tests__/telas/login.test.tsx __tests__/telas/cadastro.test.tsx` → PASS. `npm run verificar` → verde; `npx expo export --platform android --output-dir "$(mktemp -d)"` resolve o `require` do PNG.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json assets/icone.png src/components app "__tests__"
git commit -m "feat(auth): aplica o card de login do web com logo, gradiente e campos com ícone

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Abas e cabeçalhos de navegação

**Files:**
- Modify: `app/(tabs)/_layout.tsx`, `app/_layout.tsx`

**Interfaces:**
- Consumes: `useTema`, `familia`, `Icone` (com `corExata`), `useNaoLidas` (existente).
- Produces: nada novo (só estilo). Sem teste unitário do layout (Expo Router exige mocks de navegação fora do escopo); a verificação é typecheck + export do bundle + captura de tela (Task 12).

- [ ] **Step 1: Estilizar as abas**

`app/(tabs)/_layout.tsx` (substituição completa):

```tsx
import { router, Tabs } from 'expo-router';

import { BotaoCabecalho } from '@/components/BotaoCabecalho';
import { Icone } from '@/components/Icone';
import { useNaoLidas } from '@/hooks/useNotificacoes';
import { familia } from '@/theme/familias';
import { useTema } from '@/theme/useTema';

export default function TabsLayout() {
  const { cores } = useTema();
  // Montar as abas liga o polling de notificações (só acontece com sessão ativa).
  const naoLidas = useNaoLidas();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: cores.superficie },
        headerTitleStyle: { fontFamily: familia.tituloSemi, color: cores.texto },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: cores.fundo },
        tabBarStyle: { backgroundColor: cores.superficie, borderTopColor: cores.borda },
        tabBarActiveTintColor: cores.primaria,
        tabBarInactiveTintColor: cores.textoTerciario,
        tabBarLabelStyle: { fontFamily: familia.medio, fontSize: 11 },
        tabBarBadgeStyle: {
          backgroundColor: cores.negativo,
          color: cores.textoSobrePrimaria,
          fontFamily: familia.negrito,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Watchlist',
          tabBarIcon: ({ color, size }) => <Icone nome="estrela" corExata={color} tamanho={size} />,
          headerRight: () => <BotaoCabecalho icone="mais" rotulo="Buscar ativo" onPress={() => router.push('/buscar')} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfólio',
          tabBarIcon: ({ color, size }) => <Icone nome="grafico-pizza" corExata={color} tamanho={size} />,
          headerRight: () => (
            <BotaoCabecalho icone="mensagem" rotulo="Perguntar à IA" onPress={() => router.push('/chat')} />
          ),
        }}
      />
      <Tabs.Screen
        name="alertas"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color, size }) => <Icone nome="sino" corExata={color} tamanho={size} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Icone nome="usuario" corExata={color} tamanho={size} />,
          tabBarBadge: naoLidas > 0 ? naoLidas : undefined,
        }}
      />
    </Tabs>
  );
}
```

`app/_layout.tsx`: no `<Stack screenOptions=...>` do layout raiz, use

```tsx
<Stack
  screenOptions={{
    headerBackTitle: 'Voltar',
    headerStyle: { backgroundColor: tema.cores.superficie },
    headerTintColor: tema.cores.primaria,
    headerTitleStyle: { fontFamily: familia.tituloSemi, color: tema.cores.texto },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: tema.cores.fundo },
  }}
>
```

e importe `familia` de `@/theme/familias`. Se o tipo de `sceneStyle`/`headerTitleStyle.color` não existir na versão instalada do React Navigation, use a opção equivalente da versão (consulte `node_modules/@react-navigation/bottom-tabs` e `native-stack` types) e registre no relatório.

- [ ] **Step 2: Verificar**

Run: `npm run verificar` → verde (typecheck valida as opções). `npx expo export --platform android --output-dir "$(mktemp -d)"` e `--platform ios` → bundles gerados.

- [ ] **Step 3: Commit**

```bash
git add app
git commit -m "feat(nav): aplica o tema do web nas abas e nos cabeçalhos de navegação

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: Itens de lista e gráficos

**Files:**
- Modify: `src/components/LinhaAtivo.tsx`, `LinhaResultadoBusca.tsx`, `ItemPosicao.tsx`, `ItemOperacao.tsx`, `ItemAlerta.tsx`, `ItemNotificacao.tsx`, `IndicadorItem.tsx`, `SinalCard.tsx`, `GraficoPreco.tsx`, `GraficoDistribuicao.tsx`, `src/dominio/graficos.ts`
- Test: `src/dominio/graficos.test.ts` (acrescentar), testes de componente existentes (ajustes de estilo)

**Interfaces:**
- Consumes: `useTema` (`cores`, `sombras`, `grafico`), `Pill` (Task 6), `Icone`, `Texto` com `numerico`, `CoresGrafico` (Task 1).
- Produces: `corDaVariacao(variacao: number, grafico: Pick<CoresGrafico, 'alta' | 'baixa'>): string` em `@/dominio/graficos`.

- [ ] **Step 1: Escrever o teste (falhando)**

Acrescente a `src/dominio/graficos.test.ts`:

```ts
import { corDaVariacao } from '@/dominio/graficos';

describe('corDaVariacao', () => {
  const grafico = { alta: '#00ff00', baixa: '#ff0000' };

  it('variação positiva ou zero usa a cor de alta', () => {
    expect(corDaVariacao(1.5, grafico)).toBe('#00ff00');
    expect(corDaVariacao(0, grafico)).toBe('#00ff00');
  });

  it('variação negativa usa a cor de baixa', () => {
    expect(corDaVariacao(-0.01, grafico)).toBe('#ff0000');
  });
});
```

(Se o arquivo já importa de `@/dominio/graficos`, junte o import ao existente.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/dominio/graficos.test.ts` → FAIL (`corDaVariacao` inexistente).

- [ ] **Step 3: Implementar**

`src/dominio/graficos.ts`: acrescente ao final (e `import type { CoresGrafico } from '@/theme/cores';` no topo)

```ts
/** Cor da série de preço: alta (ou zero) em verde, queda em vermelho. */
export function corDaVariacao(variacao: number, grafico: Pick<CoresGrafico, 'alta' | 'baixa'>): string {
  return variacao >= 0 ? grafico.alta : grafico.baixa;
}
```

`GraficoPreco.tsx`: `const { grafico } = useTema();` (não precisa mais de `cores`), `const cor = corDaVariacao(serie.variacaoPercentual, grafico);` e use `color={cor}` em `<Area ... opacity={0.15} />` e `<Line ... />`.

`GraficoDistribuicao.tsx`: percentuais da legenda com `<Texto negrito numerico>`.

Itens de lista (mesmos textos, `aria-label`, roles e dados; muda só o visual):

- `LinhaAtivo.tsx`: `const { cores, sombras } = useTema();`; estilo do `Pressable` → `{ backgroundColor: cores.superficie, borderColor: cores.borda, boxShadow: sombras.sm, opacity: pressed ? 0.85 : 1 }`; `estilos.linha.borderWidth: 1`; o preço `<Texto negrito numerico>`.
- `LinhaResultadoBusca.tsx`: sem mudança além do ícone (Task 4) e `borderBottomColor` (`cores.borda`, já) — apenas confirme fontes via `Texto`.
- `ItemPosicao.tsx`: `<Texto negrito numerico>` no valor de mercado e `<Texto variante="legenda" cor={corLucro} numerico>` no lucro.
- `ItemOperacao.tsx`: `<Texto negrito numerico>` no total.
- `ItemAlerta.tsx`: `const { cores, sombras } = useTema();`; container com `boxShadow: sombras.sm`; `estilos.item.borderWidth: 1`; `Switch trackColor={{ true: cores.primaria, false: cores.bordaForte }}`.
- `ItemNotificacao.tsx`: `const { cores, sombras } = useTema();` container com `boxShadow: sombras.sm` e `borderWidth: 1`; troque o ponto azul por `<Pill tom="azul">Nova</Pill>` (quando `naoLida`) — o `aria-label` do item (`Não lida. …`) continua igual.
- `IndicadorItem.tsx`: `<Texto negrito numerico>{indicador.valor}</Texto>`.
- `SinalCard.tsx`: `<Card titulo={sinal.regra_nome} icone="atividade" tomIcone="positivo">`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/dominio src/components __tests__/telas` → PASS (ajuste só asserções de estilo/consultas que dependiam do ponto azul ou de cores antigas). `npm run verificar` → verde.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat(ui): restiliza itens de lista e gráficos com os tokens do web

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: Telas com cabeçalhos de seção e alternador de tema no Perfil

**Files:**
- Modify: `app/buscar.tsx`, `app/ativo/[id].tsx`, `app/(tabs)/portfolio.tsx`, `app/(tabs)/alertas.tsx`, `app/(tabs)/perfil.tsx`, `app/chat.tsx`
- Test: `__tests__/telas/perfil.test.tsx` (acrescentar), `__tests__/telas/chat.test.tsx` (verificar que segue verde)

**Interfaces:**
- Consumes: `Card` com `icone`/`tomIcone`, `Pill`, `Icone`, `SeletorSegmentado`, `usePreferencias`/`EsquemaTema` (Task 2), `ROTULO_TIPO_ATIVO`, `useTema`.
- Produces: seção "Aparência" no Perfil.

- [ ] **Step 1: Escrever o teste do alternador (falhando)**

Em `__tests__/telas/perfil.test.tsx`, dentro do `beforeEach` existente acrescente `usePreferencias.setState({ tema: 'escuro' });` (import `{ usePreferencias } from '@/store/preferencias'`; importe também `coresClaro, coresEscuro` de `@/theme/cores` e `userEvent` se ainda não houver) e acrescente:

```tsx
describe('Aparência (tema)', () => {
  it('abre no escuro por padrão', async () => {
    await renderizar(<Perfil />);
    expect(await screen.findByRole('radio', { name: 'Escuro' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Claro' })).not.toBeChecked();
  });

  it('alternar para claro reestiliza a tela na hora e persiste a escolha', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);
    const titulo = await screen.findByRole('heading', { name: 'Aparência' });
    expect(titulo).toHaveStyle({ color: coresEscuro.texto });

    await user.press(screen.getByRole('radio', { name: 'Claro' }));

    expect(screen.getByRole('radio', { name: 'Claro' })).toBeChecked();
    expect(screen.getByRole('heading', { name: 'Aparência' })).toHaveStyle({ color: coresClaro.texto });
    expect(usePreferencias.getState().tema).toBe('claro');
    expect(armazenamento.get('insightflow.tema')).toBe('claro');
  });

  it('voltar para escuro também persiste', async () => {
    const user = userEvent.setup();
    usePreferencias.setState({ tema: 'claro' });
    await renderizar(<Perfil />);
    await user.press(await screen.findByRole('radio', { name: 'Escuro' }));
    expect(armazenamento.get('insightflow.tema')).toBe('escuro');
  });
});
```

(`armazenamento` é o `Map` do mock que o arquivo já obtém; siga o mesmo padrão de import/`renderizar` do arquivo.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest __tests__/telas/perfil.test.tsx` → FAIL (não há seção "Aparência").

- [ ] **Step 3: Implementar**

`app/(tabs)/perfil.tsx`: importe `SeletorSegmentado`, `usePreferencias`, `type EsquemaTema`; no componente:

```tsx
const tema = usePreferencias((estado) => estado.tema);
const definirTema = usePreferencias((estado) => estado.definirTema);
const TEMAS: readonly { valor: EsquemaTema; rotulo: string }[] = [
  { valor: 'escuro', rotulo: 'Escuro' },
  { valor: 'claro', rotulo: 'Claro' },
];
```

(defina `TEMAS` no escopo do módulo). No `ListHeaderComponent`, substitua o `Card` de conta e acrescente a aparência:

```tsx
<View style={estilos.cabecalho}>
  <Card titulo="Conta" icone="usuario">
    <Texto cor="secundario">Conectado como</Texto>
    <Texto negrito>{email ?? '—'}</Texto>
  </Card>
  <Card titulo="Aparência" icone="lua" tomIcone="destaque">
    <SeletorSegmentado
      rotulo="Tema do aplicativo"
      opcoes={TEMAS}
      selecionado={tema}
      aoSelecionar={(valor) => void definirTema(valor)}
    />
  </Card>
  <Texto variante="subtitulo" role="heading">
    Notificações
  </Texto>
</View>
```

Demais telas (mesma lógica, mesmos textos; só ícones/pills/estilos):

- `app/buscar.tsx`: `<Campo rotulo="Ticker ou nome" ... icone="busca" />`.
- `app/ativo/[id].tsx`: primeiro `Card` — ao lado do nome do ativo, uma linha com `<Pill tom="azul">{ROTULO_TIPO_ATIVO[ativo.tipo]}</Pill>` e `<Pill>{ativo.moeda}</Pill>` (quando `ativo` existe; import `ROTULO_TIPO_ATIVO` de `@/dominio/rotulos` e `Pill`); `Card titulo="Histórico de fechamento" icone="tendencia"`; `Card titulo="Indicadores técnicos" icone="atividade"`.
- `app/(tabs)/portfolio.tsx`: `icone` nos cards — Resumo da carteira `carteira`, Comparativo `tendencia`, Distribuição `grafico-pizza`, Posições `lista`, Operações simuladas `lista`.
- `app/(tabs)/alertas.tsx`: `Card titulo="Novo alerta de preço" icone="sino"`; `Campo` do ticker com `icone="busca"`.
- `app/chat.tsx`: balão com `boxShadow: sombras.sm` (`const { cores, sombras } = useTema();`), `TextInput` com `fontFamily: familia.corpo`, `borderColor: cores.bordaForte`, `backgroundColor: cores.superficieElevada`, `placeholderTextColor={cores.textoTerciario}`, `borderRadius: raio.sm`; texto do assistente `Texto negrito` mantém. O `AvisoIA` continua no rodapé.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest __tests__/telas` → PASS (o `chat.test.tsx` segue provando o `AVISO_IA` exato — Review Focus 6). `npm run verificar` → verde.

- [ ] **Step 5: Commit**

```bash
git add app __tests__
git commit -m "feat(telas): aplica cabeçalhos de seção do web e adiciona o alternador de tema no Perfil

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 12: Documentação, verificação final e conferência visual

**Files:**
- Modify: `CLAUDE.md`, `README.md`

**Interfaces:**
- Consumes: o app completo (Tasks 1–11).
- Produces: regras visuais registradas para agentes e README atualizado.

- [ ] **Step 1: Atualizar `CLAUDE.md`**

Acrescente ao final da seção "Fronteiras" e crie a seção "Regras visuais":

```md
## Regras visuais (identidade do web)
- Cores, sombras e séries só via `useTema()` (`cores`, `tons`, `grafico`, `sombras`, `serie`); hex/`rgba` literais só em `src/theme/`. O tema padrão é o escuro; a preferência fica em `src/store/preferencias.ts`.
- Nunca use `fontWeight`: a fonte é escolhida pela família (`Texto` ou `familia.*` de `@/theme/familias`).
- Ícones só pelo wrapper `Icone` (lucide); novos ícones entram no mapa de `src/components/Icone.tsx` com nome em pt-BR.
- Contraste ≥ 4,5:1 nos dois temas (`src/theme/cores.test.ts`); alvos de toque ≥ 44 pt.
- Referência visual: spec `docs/superpowers/specs/2026-09-26-redesign-visual-web-design.md`.
```

No `README.md`, na lista de funcionalidades, troque "Tema claro e escuro, seguindo o sistema" por "Tema escuro (padrão) e claro, alternável no Perfil, com a mesma identidade visual do cliente web".

- [ ] **Step 2: Verificações automáticas**

```bash
npm run verificar
npm run test:ci -- --no-cache
npx expo-doctor
npx expo install --check
npx expo export --platform android --output-dir "$(mktemp -d)"
npx expo export --platform ios --output-dir "$(mktemp -d)"
grep -rn "vector-icons\|Ionicons" app src || echo "sem Ionicons"
grep -rn "fontWeight" app src || echo "sem fontWeight"
grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(" app src --include=*.ts --include=*.tsx | grep -v "src/theme/" | grep -v "\.test\." || echo "sem cores literais fora do tema"
grep -rniE "\b(compre|comprar|vender|invista|investir)\b" app src --include=*.tsx --include=*.ts | grep -v "\.test\." || echo "RN-01 ok"
```

Expected: tudo verde; os quatro `grep` imprimem as mensagens "sem …"/"RN-01 ok". Corrija qualquer ocorrência (exceto rótulos "Compra"/"Venda" de tipo de operação, que o quarto `grep` não pega por ser sensível a palavras inteiras).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: registra as regras visuais e o tema no README e no CLAUDE.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Conferência visual (executada pelo controlador, com OK do usuário para ligar o Docker)**

Não faz parte do trabalho do implementador. Com a prévia web **local e descartável** (nada disso é commitado; ver `git status` limpo ao final):

1. `npx expo install react-native-web @expo/metro-runtime`, um `metro.config.js` local que troque `expo-secure-store` por um shim de `localStorage` na plataforma web e `.env` com `EXPO_PUBLIC_API_URL=http://localhost:8000` (as três coisas ficam fora do git via `.git/info/exclude`/`git checkout` no fim).
2. Subir o backend (`docker compose up`, com override de `DATABASE_URL=postgresql+psycopg2://…` fora do repositório) e `CI=1 npx expo start --web --port 8081`.
3. Capturas com `chrome --headless=new --disable-web-security --screenshot` (perfil temporário) de login, cadastro, watchlist, detalhe, portfólio e perfil nos dois temas, e comparar com o web.
4. Derrubar tudo e `git checkout -- package.json package-lock.json tsconfig.json expo-env.d.ts`, remover `.env`/`metro.config.js`.

---

## Self-review (feita ao escrever o plano)

- **Cobertura da spec:** tokens (T1), preferência/tema (T2), tipografia + splash (T3), ícones (T4), Card/Botão (T5), Pill/IA (T6), Campo/seletor/estados (T7), login/cadastro (T8), abas/cabeçalhos (T9), listas/gráficos (T10), telas + alternador (T11), docs/verificação/visual (T12). Desvios da spec estão listados em "Ajustes em relação à spec".
- **Placeholders:** nenhum "TBD"; onde o texto diz "ajuste só a asserção de estilo" é porque o teste existente depende do estilo antigo e não pode ser reescrito às cegas — o implementador vê a falha real e corrige a asserção.
- **Consistência de tipos:** `Tema` (T2) traz `cores, tons, grafico, sombras, serie`; `Icone`/`NomeIcone` (T4) usados por `Card`, `Pill`, `Campo`, `BotaoCabecalho`; `TomChip` (T4) usado por `Card.tomIcone`; `TomPill` (T6); `Sombras.foco` (T1) usado por `Campo` (T7).
- **Review Focus:** 1→T2, 2→T3, 3→T1, 4→T11, 5→T7, 6→T6/T11.
