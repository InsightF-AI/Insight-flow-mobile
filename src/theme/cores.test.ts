import { type Cores, coresClaro, coresEscuro } from '@/theme/cores';

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

const TEXTOS: (keyof Cores)[] = ['texto', 'textoSecundario', 'primaria', 'positivo', 'negativo', 'alerta'];
const FUNDOS: (keyof Cores)[] = ['fundo', 'superficie', 'superficieElevada'];
const PARES = TEXTOS.flatMap((texto) => FUNDOS.map((fundo) => [texto, fundo] as [keyof Cores, keyof Cores]));

describe.each([
  ['claro', coresClaro],
  ['escuro', coresEscuro],
])('tema %s', (_nome, cores) => {
  it.each(PARES)('%s sobre %s atinge contraste AA (≥ 4,5)', (texto, fundo) => {
    expect(contraste(cores[texto], cores[fundo])).toBeGreaterThanOrEqual(4.5);
  });

  it('texto sobre a cor primária atinge contraste AA', () => {
    expect(contraste(cores.textoSobrePrimaria, cores.primaria)).toBeGreaterThanOrEqual(4.5);
  });
});

it('os dois temas têm as mesmas chaves', () => {
  expect(Object.keys(coresEscuro).sort()).toEqual(Object.keys(coresClaro).sort());
});
