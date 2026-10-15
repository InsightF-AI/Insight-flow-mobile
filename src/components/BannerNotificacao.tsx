import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone } from '@/components/Icone';
import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  titulo: string;
  mensagem: string;
  aoPressionar: () => void;
  aoDispensar: () => void;
}

/** Aviso in-app de uma notificação recebida com o app aberto. Flutua sobre a tela, abaixo da área segura. */
export function BannerNotificacao({ titulo, mensagem, aoPressionar, aoDispensar }: Props) {
  const { cores, sombras } = useTema();
  const insets = useSafeAreaInsets();
  // Aviso transitório: anuncia o texto em vez de depender de o leitor de tela focar o banner a tempo.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${titulo}. ${mensagem}`);
  }, [titulo, mensagem]);
  return (
    <View
      style={[
        estilos.contenedor,
        { top: insets.top + espaco.sm, backgroundColor: cores.superficieAlta, borderColor: cores.primaria, boxShadow: sombras.sm },
      ]}
    >
      <Pressable
        role="button"
        aria-label={`Abrir: ${titulo}. ${mensagem}`}
        onPress={aoPressionar}
        style={estilos.conteudo}
      >
        <Icone nome="sino" tamanho={20} cor="primaria" />
        <View style={estilos.textos}>
          <Texto variante="legenda" cor="secundario" negrito>
            {titulo}
          </Texto>
          <Texto numberOfLines={2}>{mensagem}</Texto>
        </View>
      </Pressable>
      <Pressable role="button" aria-label="Dispensar aviso" onPress={aoDispensar} style={estilos.fechar}>
        <Icone nome="fechar" tamanho={18} cor="textoSecundario" />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    position: 'absolute',
    left: espaco.lg,
    right: espaco.lg,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: raio.lg,
  },
  conteudo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: espaco.md, padding: espaco.md, minHeight: 44 },
  textos: { flex: 1, gap: 2 },
  fechar: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
