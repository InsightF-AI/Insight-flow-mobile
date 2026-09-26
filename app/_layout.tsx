import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, type Theme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { configurarApi } from '@/api/client';
import { queryClient } from '@/hooks/queryClient';
import { useSessao } from '@/store/sessao';
import { type Tema, useTema } from '@/theme/useTema';

void SplashScreen.preventAutoHideAsync();

configurarApi({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000',
  obterToken: () => useSessao.getState().token,
  // Token vencido ou inválido: volta ao login (não há refresh token no backend).
  // `sair` propaga falhas do SecureStore e vários 401 podem disparar em paralelo: sem o `.catch` haveria rejeição não tratada.
  aoNaoAutorizado: () => {
    void useSessao
      .getState()
      .sair()
      .catch(() => {});
  },
});

function temaDeNavegacao(tema: Tema): Theme {
  const base = tema.esquema === 'escuro' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: tema.cores.fundo,
      card: tema.cores.superficie,
      text: tema.cores.texto,
      border: tema.cores.borda,
      primary: tema.cores.primaria,
    },
  };
}

export default function RootLayout() {
  const status = useSessao((estado) => estado.status);
  const hidratar = useSessao((estado) => estado.hidratar);
  const tema = useTema();

  useEffect(() => {
    void hidratar();
  }, [hidratar]);

  useEffect(() => {
    if (status !== 'carregando') void SplashScreen.hideAsync();
  }, [status]);

  useEffect(() => {
    // Sem isso o TanStack não sabe quando o app volta ao primeiro plano no React Native.
    const assinatura = AppState.addEventListener('change', (estado) => focusManager.setFocused(estado === 'active'));
    return () => assinatura.remove();
  }, []);

  if (status === 'carregando') return null;
  const autenticado = status === 'autenticado';

  return (
    <GestureHandlerRootView style={estilos.raiz}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={temaDeNavegacao(tema)}>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerBackTitle: 'Voltar' }}>
              <Stack.Protected guard={autenticado}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack.Protected>
              <Stack.Protected guard={!autenticado}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              </Stack.Protected>
            </Stack>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
});
