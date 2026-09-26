import { Pressable, StyleSheet, View } from 'react-native';

import type { Notificacao } from '@/api/tipos';
import { Texto } from '@/components/Texto';
import { ROTULO_TIPO_NOTIFICACAO } from '@/dominio/rotulos';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { formatarDataHora } from '@/utils/formatacao';

interface Props {
  notificacao: Notificacao;
  ticker: string | null;
  aoPressionar: () => void;
}

export function ItemNotificacao({ notificacao, ticker, aoPressionar }: Props) {
  const { cores } = useTema();
  const tipo = ROTULO_TIPO_NOTIFICACAO[notificacao.tipo];
  const titulo = ticker ? `${tipo} · ${ticker}` : tipo;
  const naoLida = !notificacao.lida;

  return (
    <Pressable
      role="button"
      aria-label={`${naoLida ? 'Não lida. ' : ''}${titulo}. ${notificacao.mensagem}`}
      onPress={aoPressionar}
      style={({ pressed }) => [
        estilos.item,
        {
          backgroundColor: cores.superficie,
          borderColor: naoLida ? cores.primaria : cores.borda,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={estilos.cabecalho}>
        {naoLida ? <View style={[estilos.ponto, { backgroundColor: cores.primaria }]} /> : null}
        <Texto variante="legenda" cor="secundario" negrito={naoLida}>
          {titulo}
        </Texto>
      </View>
      <Texto negrito={naoLida}>{notificacao.mensagem}</Texto>
      <Texto variante="legenda" cor="secundario">
        {formatarDataHora(notificacao.criado_em)}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  item: { padding: espaco.lg, gap: espaco.xs, borderWidth: 1, borderRadius: raio.lg },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  ponto: { width: 8, height: 8, borderRadius: 4 },
});
