import { useColorScheme } from 'react-native';

import { type Cores, coresClaro, coresEscuro, criarSerie, graficoClaro, graficoEscuro } from '@/theme/cores';

export interface Tema {
  esquema: 'claro' | 'escuro';
  cores: Cores;
  serie: readonly string[];
}

const temaClaro: Tema = { esquema: 'claro', cores: coresClaro, serie: criarSerie(coresClaro, graficoClaro) };
const temaEscuro: Tema = { esquema: 'escuro', cores: coresEscuro, serie: criarSerie(coresEscuro, graficoEscuro) };

export function useTema(): Tema {
  return useColorScheme() === 'dark' ? temaEscuro : temaClaro;
}
