import type { Provento, ProventoRecebido } from '@/api/tipos';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Linha } from '@/components/Linha';
import { Texto } from '@/components/Texto';
import { somaDosUltimos12Meses } from '@/dominio/proventos';
import { formatarData, formatarMoeda, formatarQuantidade } from '@/utils/formatacao';

const LIMITE_DE_LINHAS = 8;

interface PropsAtivo {
  proventos: Provento[];
  moeda?: string;
}

/** Proventos pagos por cota por um ativo (os mais recentes primeiro, como a API devolve). */
export function ListaProventosDoAtivo({ proventos, moeda }: PropsAtivo) {
  if (proventos.length === 0) return <EstadoVazio mensagem="Sem proventos registrados para este ativo." />;
  return (
    <>
      <Linha rotulo="Por cota nos últimos 12 meses" valor={formatarMoeda(somaDosUltimos12Meses(proventos), moeda)} />
      {proventos.slice(0, LIMITE_DE_LINHAS).map((provento) => (
        <Linha
          key={provento.data_ex}
          rotulo={`Data-ex ${formatarData(provento.data_ex)}`}
          valor={formatarMoeda(provento.valor_por_cota, moeda)}
        />
      ))}
      {proventos.length > LIMITE_DE_LINHAS ? (
        <Texto variante="legenda" cor="terciario">
          Mostrando os {LIMITE_DE_LINHAS} mais recentes de {proventos.length}.
        </Texto>
      ) : null}
    </>
  );
}

interface PropsCarteira {
  totalBrl: string;
  proventos: ProventoRecebido[];
}

/** Proventos que a carteira teria recebido, com base nas quantidades na data-ex. */
export function ListaProventosRecebidos({ totalBrl, proventos }: PropsCarteira) {
  if (proventos.length === 0) return <EstadoVazio mensagem="Nenhum provento recebido pelas posições da carteira." />;
  return (
    <>
      <Linha rotulo="Total recebido" valor={formatarMoeda(totalBrl, 'BRL')} cor="positivo" />
      {proventos.slice(0, LIMITE_DE_LINHAS).map((provento) => (
        <Linha
          key={`${provento.ativo_id}-${provento.data_ex}`}
          rotulo={`${provento.ticker} · ${formatarData(provento.data_ex)} · ${formatarQuantidade(provento.quantidade)} cotas`}
          valor={formatarMoeda(provento.total_brl, 'BRL')}
        />
      ))}
      {proventos.length > LIMITE_DE_LINHAS ? (
        <Texto variante="legenda" cor="terciario">
          Mostrando os {LIMITE_DE_LINHAS} mais recentes de {proventos.length}.
        </Texto>
      ) : null}
    </>
  );
}
