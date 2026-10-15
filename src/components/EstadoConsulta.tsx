import type { ReactNode } from 'react';

import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';

/** Subconjunto de UseQueryResult que o componente usa (recebido por props, sem chamar hooks). */
interface Consulta<T> {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: T | undefined;
  refetch: () => unknown;
}

interface Props<T> {
  consulta: Consulta<T>;
  children: (dados: T) => ReactNode;
  mensagemErro?: (erro: unknown) => string | undefined;
}

export function EstadoConsulta<T>({ consulta, children, mensagemErro }: Props<T>) {
  if (consulta.isPending) return <Carregando />;
  if (consulta.isError || consulta.data === undefined) {
    return (
      <ErroComRetry
        erro={consulta.error}
        mensagem={mensagemErro?.(consulta.error)}
        aoTentarNovamente={() => {
          void consulta.refetch();
        }}
      />
    );
  }
  return <>{children(consulta.data)}</>;
}
