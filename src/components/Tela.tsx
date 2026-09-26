import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  children: ReactNode;
  /** Use em telas sem cabeçalho (login/cadastro). */
  areaSegura?: boolean;
  aoAtualizar?: () => void;
  atualizando?: boolean;
}

export function Tela({ children, areaSegura = false, aoAtualizar, atualizando = false }: Props) {
  const { cores } = useTema();
  const conteudo = (
    <KeyboardAvoidingView style={estilos.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={[estilos.flex, { backgroundColor: cores.fundo }]}
        contentContainerStyle={estilos.conteudo}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          aoAtualizar ? (
            <RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} tintColor={cores.primaria} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (!areaSegura) return conteudo;
  return <SafeAreaView style={[estilos.flex, { backgroundColor: cores.fundo }]}>{conteudo}</SafeAreaView>;
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  conteudo: { padding: espaco.lg, gap: espaco.lg, flexGrow: 1 },
});
