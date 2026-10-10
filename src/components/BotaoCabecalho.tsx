import { Pressable, StyleSheet, View } from 'react-native';

import { Icone, type NomeIcone } from '@/components/Icone';
import { Texto } from '@/components/Texto';
import { useTema } from '@/theme/useTema';

interface Props {
  icone: NomeIcone;
  rotulo: string;
  onPress: () => void;
  /** Contagem sobre o ícone (notificações não lidas). Zero ou ausente não mostra nada. */
  selo?: number;
}

export function BotaoCabecalho({ icone, rotulo, onPress, selo }: Props) {
  const { cores } = useTema();
  const contagem = selo && selo > 0 ? selo : 0;
  return (
    <Pressable
      role="button"
      aria-label={contagem > 0 ? `${rotulo}, ${contagem} não lidas` : rotulo}
      onPress={onPress}
      style={estilos.botao}
    >
      <Icone nome={icone} tamanho={22} cor="primaria" />
      {contagem > 0 ? (
        <View style={[estilos.selo, { backgroundColor: cores.primaria }]}>
          <Texto variante="legenda" cor="sobrePrimaria" negrito>
            {contagem > 99 ? '99+' : String(contagem)}
          </Texto>
        </View>
      ) : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  selo: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
