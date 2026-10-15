import { useColorScheme } from 'react-native';

import { type Cores, coresClaro, coresEscuro, paletaClaro, paletaEscuro } from '@/theme/cores';

export interface Tema {
  esquema: 'claro' | 'escuro';
  cores: Cores;
  serie: readonly string[];
}

const temaClaro: Tema = { esquema: 'claro', cores: coresClaro, serie: paletaClaro };
const temaEscuro: Tema = { esquema: 'escuro', cores: coresEscuro, serie: paletaEscuro };

export function useTema(): Tema {
  return useColorScheme() === 'dark' ? temaEscuro : temaClaro;
}
