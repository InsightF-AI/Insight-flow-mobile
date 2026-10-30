import { deveVerificar, descreverVersao, INTERVALO_ENTRE_VERIFICACOES_MS } from '@/dominio/atualizacao';

describe('deveVerificar', () => {
  it('verifica quando nunca verificou', () => {
    expect(deveVerificar(null, 1_000)).toBe(true);
  });

  it('respeita o intervalo entre verificações', () => {
    const ultima = 1_000_000;
    expect(deveVerificar(ultima, ultima + INTERVALO_ENTRE_VERIFICACOES_MS - 1)).toBe(false);
    expect(deveVerificar(ultima, ultima + INTERVALO_ENTRE_VERIFICACOES_MS)).toBe(true);
  });
});

describe('descreverVersao', () => {
  it('sem atualização baixada, fala da versão instalada', () => {
    expect(descreverVersao({ versao: '0.1.0', atualizadaEm: null })).toBe('Versão 0.1.0 (a que veio com o app instalado)');
  });

  it('com atualização, mostra a data e a hora locais da publicação', () => {
    const publicada = new Date(2026, 9, 29, 14, 5);
    expect(descreverVersao({ versao: '0.1.0', atualizadaEm: publicada })).toBe(
      'Versão 0.1.0 · atualização de 29/10/2026 14:05',
    );
  });
});
