import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { dataParaISOLocal, formatarData } from '@/utils/formatacao';

interface Props {
  rotulo: string;
  valor: Date;
  aoMudar: (data: Date) => void;
  maximo?: Date;
  erro?: string;
}

export function CampoData({ rotulo, valor, aoMudar, maximo, erro }: Props) {
  const { cores } = useTema();
  const texto = formatarData(dataParaISOLocal(valor));

  function abrirNoAndroid() {
    DateTimePickerAndroid.open({
      value: valor,
      mode: 'date',
      maximumDate: maximo,
      onValueChange: (_evento, data) => aoMudar(data),
    });
  }

  return (
    <View style={estilos.container}>
      <Texto variante="rotulo" cor="secundario">
        {rotulo}
      </Texto>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={valor}
          mode="date"
          display="compact"
          locale="pt-BR"
          maximumDate={maximo}
          onValueChange={(_evento, data) => aoMudar(data)}
          style={estilos.seletorIos}
        />
      ) : (
        <Pressable
          role="button"
          aria-label={`${rotulo}: ${texto}`}
          onPress={abrirNoAndroid}
          style={[estilos.campo, { backgroundColor: cores.superficieElevada, borderColor: erro ? cores.negativo : cores.bordaForte }]}
        >
          <Texto>{texto}</Texto>
        </Pressable>
      )}
      {erro ? (
        <Texto variante="legenda" cor="negativo">
          {erro}
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { gap: espaco.xs },
  seletorIos: { alignSelf: 'flex-start' },
  campo: { minHeight: 48, borderWidth: 1, borderRadius: raio.sm, paddingHorizontal: espaco.md, justifyContent: 'center' },
});
