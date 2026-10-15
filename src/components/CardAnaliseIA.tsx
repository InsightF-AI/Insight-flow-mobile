import { AvisoIA } from '@/components/AvisoIA';
import { Card } from '@/components/Card';
import { Texto } from '@/components/Texto';

export function CardAnaliseIA() {
  return (
    <Card titulo="Análise por IA">
      <Texto cor="secundario">Análise textual por IA — disponível em breve.</Texto>
      <AvisoIA />
    </Card>
  );
}
