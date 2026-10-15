import { AvisoIA } from '@/components/AvisoIA';
import { Card } from '@/components/Card';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Skeleton } from '@/components/Skeleton';
import { Texto } from '@/components/Texto';
import type { ResumoDiario } from '@/dominio/inicio';
import { formatarDataHora } from '@/utils/formatacao';

interface Props {
  estado: 'carregando' | 'erro' | 'ok';
  erro?: unknown;
  resumo: ResumoDiario | null;
  aoTentarNovamente: () => void;
}

/** Resumo diário da carteira gerado por IA. Todo texto de IA vem acompanhado do aviso legal (RN-05). */
export function ResumoDiarioCard({ estado, erro, resumo, aoTentarNovamente }: Props) {
  return (
    <Card titulo="Resumo diário" icone="brilho" tomIcone="ia">
      {estado === 'carregando' ? (
        <>
          <Skeleton />
          <Skeleton />
          <Skeleton largura="60%" />
        </>
      ) : null}
      {estado === 'erro' ? (
        <ErroComRetry erro={erro} mensagem="Resumo diário indisponível no momento." aoTentarNovamente={aoTentarNovamente} />
      ) : null}
      {estado === 'ok' && resumo ? (
        <>
          <Texto>{resumo.texto}</Texto>
          <Texto variante="legenda" cor="secundario">
            {`Gerado em ${formatarDataHora(resumo.geradoEm)}`}
          </Texto>
          <AvisoIA texto={resumo.avisoLegal} />
        </>
      ) : null}
      {estado === 'ok' && !resumo ? (
        <EstadoVazio mensagem="Nenhum resumo gerado ainda. O resumo diário é gerado ao fim do pregão (18h30) para quem tem operações simuladas registradas." />
      ) : null}
    </Card>
  );
}
