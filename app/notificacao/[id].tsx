import { useLocalSearchParams } from 'expo-router';

import { AvisoIA } from '@/components/AvisoIA';
import { Card } from '@/components/Card';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { ultimoResumoDiario } from '@/dominio/inicio';
import { tituloDaNotificacao } from '@/dominio/notificacoes';
import { mapaAtivos } from '@/dominio/portfolio';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { useWatchlist } from '@/hooks/useWatchlist';
import { formatarDataHora } from '@/utils/formatacao';

export default function DetalheNotificacao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const notificacoes = useNotificacoes();
  const watchlist = useWatchlist();
  const notificacao = notificacoes.data?.find((item) => item.id === id);

  if (notificacoes.isPending) {
    return (
      <Tela>
        <Carregando />
      </Tela>
    );
  }
  if (notificacoes.isError && !notificacao) {
    return (
      <Tela>
        <ErroComRetry erro={notificacoes.error} aoTentarNovamente={() => void notificacoes.refetch()} />
      </Tela>
    );
  }
  if (!notificacao) {
    return (
      <Tela>
        <EstadoVazio mensagem="Notificação não encontrada." />
      </Tela>
    );
  }

  const ticker = notificacao.ativo_id ? mapaAtivos(undefined, watchlist.data).get(notificacao.ativo_id)?.ticker : null;
  const resumo = notificacao.tipo === 'RESUMO_DIARIO' ? ultimoResumoDiario([notificacao]) : null;

  return (
    <Tela>
      <Card titulo={tituloDaNotificacao(notificacao, ticker)} icone={resumo ? 'brilho' : 'sino'} tomIcone={resumo ? 'ia' : 'destaque'}>
        {notificacao.tipo === 'RESUMO_DIARIO' ? (
          resumo ? (
            <>
              <Texto>{resumo.texto}</Texto>
              <Texto variante="legenda" cor="secundario">
                {`Gerado em ${formatarDataHora(resumo.geradoEm)}`}
              </Texto>
              <AvisoIA texto={resumo.avisoLegal} />
            </>
          ) : (
            <Texto cor="secundario">Esta notificação não tem texto para mostrar.</Texto>
          )
        ) : (
          <>
            <Texto>{notificacao.mensagem}</Texto>
            <Texto variante="legenda" cor="secundario">
              {formatarDataHora(notificacao.criado_em)}
            </Texto>
          </>
        )}
      </Card>
    </Tela>
  );
}
