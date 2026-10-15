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
