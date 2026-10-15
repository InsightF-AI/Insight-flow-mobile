import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Opcao<T extends string> {
  valor: T;
  rotulo: string;
}

interface Props<T extends string> {
  rotulo: string;
  opcoes: readonly Opcao<T>[];
  selecionado: T;
  aoSelecionar: (valor: T) => void;
}

export function SeletorSegmentado<T extends string>({ rotulo, opcoes, selecionado, aoSelecionar }: Props<T>) {
  const { cores } = useTema();
  return (
    <View
      role="radiogroup"
      aria-label={rotulo}
      style={[estilos.grupo, { borderColor: cores.bordaForte, backgroundColor: cores.superficieElevada }]}
    >
      {opcoes.map((opcao) => {
        const ativo = opcao.valor === selecionado;
        return (
          <Pressable
            key={opcao.valor}
            role="radio"
            aria-checked={ativo}
            aria-label={opcao.rotulo}
            onPress={() => aoSelecionar(opcao.valor)}
            style={[estilos.opcao, ativo && { backgroundColor: cores.primaria }]}
          >
            <Texto variante="legenda" negrito cor={ativo ? 'sobrePrimaria' : 'padrao'}>
              {opcao.rotulo}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { flexDirection: 'row', borderWidth: 1, borderRadius: raio.sm, padding: 2 },
  opcao: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: raio.sm },
});
