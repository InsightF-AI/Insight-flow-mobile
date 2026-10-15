import type { Decimal } from '@/api/tipos';
import { Pill, type TomPill } from '@/components/Pill';
import { type EscalaPercentual, formatarPercentual } from '@/utils/formatacao';

interface Props {
  valor: Decimal | number;
  escala: EscalaPercentual;
}

export function VariacaoBadge({ valor, escala }: Props) {
  const texto = formatarPercentual(valor, escala);
  const alta = texto.startsWith('+');
  const baixa = texto.startsWith('-');
  const tom: TomPill = alta ? 'verde' : baixa ? 'vermelho' : 'cinza';
  const seta = alta ? '▲' : baixa ? '▼' : '•';

  return (
    <Pill tom={tom} aria-label={`Variação ${texto}`}>
      {`${seta} ${texto}`}
    </Pill>
  );
}
