import { Pressable, StyleSheet, View } from 'react-native';

import type { PapelMensagem } from '@/api/tipos';
import { Icone } from '@/components/Icone';
import { IconeChip } from '@/components/IconeChip';
import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  papel: PapelMensagem;
  texto: string;
  /** Pergunta que não obteve resposta. */
  falhou?: boolean;
  /** Balão de "consultando…": enquanto a resposta da IA não chega. */
  pendente?: boolean;
  /** Só nas respostas da IA. */
  aoCopiar?: () => void;
  copiado?: boolean;
}

export function BalaoMensagem({ papel, texto, falhou = false, pendente = false, aoCopiar, copiado = false }: Props) {
  const { cores } = useTema();
  const doUsuario = papel === 'usuario';
  const cor = doUsuario ? { backgroundColor: cores.primaria, borderColor: cores.primaria } : null;

  return (
    <View style={[estilos.linha, doUsuario && estilos.linhaDoUsuario]}>
      {doUsuario ? null : <IconeChip nome="brilho" tom="ia" tamanho={28} />}
      <View style={[estilos.coluna, doUsuario && estilos.colunaDoUsuario]}>
        <View
          aria-busy={pendente}
          style={[
            estilos.balao,
            cor ?? { backgroundColor: cores.superficieElevada, borderColor: cores.borda },
            falhou && { borderColor: cores.negativo },
          ]}
        >
          <Texto selectable cor={doUsuario ? 'sobrePrimaria' : pendente ? 'secundario' : 'padrao'}>
            {texto}
          </Texto>
        </View>
        {falhou ? (
          <Texto variante="legenda" cor="negativo">
            Não enviada
          </Texto>
        ) : null}
        {aoCopiar ? (
          <Pressable
            role="button"
            aria-label={copiado ? 'Resposta copiada' : 'Copiar resposta'}
            onPress={aoCopiar}
            style={estilos.copiar}
          >
            <Icone nome={copiado ? 'confirmado' : 'copiar'} tamanho={14} cor="textoSecundario" />
            <Texto variante="legenda" cor="secundario">
              {copiado ? 'Copiado' : 'Copiar'}
            </Texto>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'flex-start', gap: espaco.sm },
  linhaDoUsuario: { justifyContent: 'flex-end' },
  coluna: { flexShrink: 1, maxWidth: '85%', gap: espaco.xs },
  colunaDoUsuario: { alignItems: 'flex-end' },
  balao: { borderWidth: 1, borderRadius: raio.lg, paddingHorizontal: espaco.md, paddingVertical: espaco.sm },
  copiar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: espaco.xs },
});
