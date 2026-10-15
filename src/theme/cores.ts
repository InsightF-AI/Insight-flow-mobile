export interface Cores {
  fundo: string;
  superficie: string;
  superficieElevada: string;
  texto: string;
  textoSecundario: string;
  borda: string;
  primaria: string;
  textoSobrePrimaria: string;
  positivo: string;
  negativo: string;
  alerta: string;
}

export const coresClaro: Cores = {
  fundo: '#F5F7FA',
  superficie: '#FFFFFF',
  superficieElevada: '#EEF2F7',
  texto: '#0F172A',
  textoSecundario: '#475569',
  borda: '#D8DEE8',
  primaria: '#1D4ED8',
  textoSobrePrimaria: '#FFFFFF',
  positivo: '#047857',
  negativo: '#B91C1C',
  alerta: '#92400E',
};

export const coresEscuro: Cores = {
  fundo: '#0B1120',
  superficie: '#131C2E',
  superficieElevada: '#1C2740',
  texto: '#E6EDF7',
  textoSecundario: '#94A3B8',
  borda: '#26324A',
  primaria: '#60A5FA',
  textoSobrePrimaria: '#0B1120',
  positivo: '#34D399',
  negativo: '#F87171',
  alerta: '#FBBF24',
};

/** Cores de série para gráficos categóricos (a legenda sempre traz rótulo e valor). */
export const paletaClaro: readonly string[] = ['#1D4ED8', '#0E7490', '#7C3AED', '#BE185D', '#C2410C', '#4D7C0F'];
export const paletaEscuro: readonly string[] = ['#60A5FA', '#22D3EE', '#A78BFA', '#F472B6', '#FB923C', '#A3E635'];
