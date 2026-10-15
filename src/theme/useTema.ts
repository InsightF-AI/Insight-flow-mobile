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
