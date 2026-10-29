import { HeaderHeightContext } from 'expo-router/react-navigation';
import { type ReactNode, useContext } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { conteudoLimitado, espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  children: ReactNode;
  /** Use em telas sem cabeçalho (login/cadastro). */
  areaSegura?: boolean;
  aoAtualizar?: () => void;
  atualizando?: boolean;
  /** Centraliza o conteúdo verticalmente (login/cadastro). */
  centralizar?: boolean;
}

export function Tela({ children, areaSegura = false, aoAtualizar, atualizando = false, centralizar = false }: Props) {
  const { cores } = useTema();
  // Sob um cabeçalho, o teclado do iOS cobriria o fim do formulário sem este deslocamento (0 em login e cadastro).
  const alturaDoCabecalho = useContext(HeaderHeightContext) ?? 0;
  const conteudo = (
    <KeyboardAvoidingView
      style={estilos.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={alturaDoCabecalho}
    >
      <ScrollView
        style={[estilos.flex, { backgroundColor: cores.fundo }]}
        contentContainerStyle={[estilos.conteudo, centralizar && estilos.centralizado]}
        keyboardShouldPersistTaps="handled"
        // Arrastar a tela fecha o teclado (no iOS, acompanhando o dedo).
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
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
  conteudo: { ...conteudoLimitado, padding: espaco.lg, gap: espaco.lg, flexGrow: 1 },
  centralizado: { justifyContent: 'center' },
});
