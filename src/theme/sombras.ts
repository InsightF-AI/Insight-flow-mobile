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
