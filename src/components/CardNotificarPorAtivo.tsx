import { StyleSheet, Switch, View } from 'react-native';

import type { ItemWatchlist, Uuid } from '@/api/tipos';
import { Card } from '@/components/Card';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  itens?: ItemWatchlist[];
  carregando?: boolean;
  erro?: unknown;
  aoAlternar: (ativoId: Uuid, notificar: boolean) => void;
  aoTentarNovamente: () => void;
}

/** Quais ativos da watchlist geram aviso (sinal novo e alerta de preço), no mesmo PATCH do sino do Início. */
export function CardNotificarPorAtivo({ itens, carregando = false, erro, aoAlternar, aoTentarNovamente }: Props) {
  const { cores } = useTema();

  return (
    <Card titulo="Notificar por ativo" icone="sino-desligado" tomIcone="destaque">
      {carregando && !itens ? <Carregando /> : null}
      {erro && !itens ? <ErroComRetry erro={erro} aoTentarNovamente={aoTentarNovamente} /> : null}
      {itens && itens.length === 0 ? (
        <EstadoVazio mensagem="Sua watchlist está vazia. Adicione ativos pela busca no Início." />
      ) : null}
      {itens?.map((item) => (
        <View key={item.ativo.id} style={estilos.linha}>
          <View style={estilos.textos}>
            <Texto negrito>{item.ativo.ticker}</Texto>
            <Texto variante="legenda" cor="secundario" numberOfLines={1}>
              {item.ativo.nome}
            </Texto>
          </View>
          <Switch
            role="switch"
            aria-label={`Notificar ${item.ativo.ticker}`}
            value={item.notificar}
            onValueChange={(valor) => aoAlternar(item.ativo.id, valor)}
            trackColor={{ true: cores.primaria, false: cores.bordaForte }}
          />
        </View>
      ))}
    </Card>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, minHeight: 48 },
  textos: { flex: 1 },
});
