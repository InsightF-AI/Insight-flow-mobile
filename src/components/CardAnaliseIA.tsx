import type { AnaliseIA } from '@/api/tipos';
import { AvisoIA } from '@/components/AvisoIA';
import { Botao } from '@/components/Botao';
import { Card } from '@/components/Card';
import { ErroComRetry } from '@/components/ErroComRetry';
import { Skeleton } from '@/components/Skeleton';
import { Texto } from '@/components/Texto';
import { avisoLegalDe, descreverProcedencia } from '@/dominio/ia';
import { mensagemDeErroDaIA } from '@/utils/erros';

interface Props {
  analise?: AnaliseIA;
  gerando: boolean;
  erro?: unknown;
  aoGerar: () => void;
}

/** Análise textual por IA sob demanda. Todo texto de IA vem com o aviso legal (RN-05), em qualquer estado. */
export function CardAnaliseIA({ analise, gerando, erro, aoGerar }: Props) {
  // Enquanto uma nova tentativa corre, o erro anterior fica guardado pela consulta: só aparece quando parou.
  const falhou = Boolean(erro) && !gerando;

  return (
    <Card titulo="Análise por IA" icone="brilho" tomIcone="ia">
      {analise ? (
        <>
          <Texto selectable>{analise.texto}</Texto>
          <Texto variante="legenda" cor="secundario">
            {descreverProcedencia(analise)}
          </Texto>
          <Texto variante="legenda" cor="terciario">
            {`Modelo: ${analise.modelo}`}
          </Texto>
        </>
      ) : null}

      {!analise && !gerando && !falhou ? (
        <Texto cor="secundario">
          A análise é gerada sob demanda, a partir dos indicadores e dos sinais deste ativo. Pode levar até 1 minuto.
        </Texto>
      ) : null}

      {gerando ? (
        <>
          {!analise ? (
            <>
              <Skeleton />
              <Skeleton />
              <Skeleton largura="60%" />
            </>
          ) : null}
          <Texto cor="secundario" role="status">
            Gerando análise… pode levar até 1 minuto.
          </Texto>
        </>
      ) : null}

      {falhou ? (
        <ErroComRetry erro={erro} mensagem={mensagemDeErroDaIA(erro, 'analise')} aoTentarNovamente={aoGerar} />
      ) : null}

      {!gerando && !falhou ? (
        <Botao
          titulo={analise ? 'Atualizar análise' : 'Gerar análise por IA'}
          variante={analise ? 'secundario' : 'primario'}
          onPress={aoGerar}
        />
      ) : null}

      <AvisoIA texto={avisoLegalDe(analise?.aviso_legal)} />
    </Card>
  );
}
