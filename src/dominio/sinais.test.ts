import type { Sinal } from '@/api/tipos';
import { valorNoDisparo } from '@/dominio/sinais';

function sinal(regraId: string, contexto: Record<string, unknown>): Sinal {
  return {
    id: 's-1',
    ativo_id: 'a-1',
    regra_id: regraId,
    regra_nome: 'Regra',
    regra_descricao: 'Descrição',
    data_ativacao: '2026-10-09T13:00:00Z',
    contexto,
    data_desativacao: null,
  };
}

const SOBREVENDA = 'a1a1a1a1-0000-0000-0000-000000000001';
const SOBRECOMPRA = 'a1a1a1a1-0000-0000-0000-000000000002';
const VOLUME = 'a1a1a1a1-0000-0000-0000-000000000003';

describe('valorNoDisparo', () => {
  it('RSI com uma casa decimal', () => {
    expect(valorNoDisparo(sinal(SOBREVENDA, { valor: '28.4' }))).toEqual({ rotulo: 'RSI (14)', valor: '28,4' });
    expect(valorNoDisparo(sinal(SOBRECOMPRA, { valor: '74.31' }))).toEqual({ rotulo: 'RSI (14)', valor: '74,3' });
  });

  it('volume relativo com o ×', () => {
    expect(valorNoDisparo(sinal(VOLUME, { valor: '1.8234' }))).toEqual({
      rotulo: 'Volume relativo (20)',
      valor: '1,82×',
    });
  });

  it('regra desconhecida usa um rótulo genérico', () => {
    expect(valorNoDisparo(sinal('outra', { valor: 5 }))).toEqual({ rotulo: 'Indicador', valor: '5,00' });
  });

  it.each([{}, { valor: 'abc' }, { valor: null }, { valor: '' }, { valor: '   ' }, { valor: true }])(
    'contexto sem valor utilizável (%o) é null, nunca zero',
    (contexto) => {
      expect(valorNoDisparo(sinal(SOBREVENDA, contexto))).toBeNull();
    },
  );
});
