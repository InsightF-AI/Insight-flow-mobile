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

  it('texto sobre a cor negativa (badge da aba) atinge contraste AA', () => {
    expect(contraste(cores.textoSobrePrimaria, cores.negativo)).toBeGreaterThanOrEqual(4.5);
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
