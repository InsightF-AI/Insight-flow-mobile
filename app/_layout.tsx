import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, type Theme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { configurarApi } from '@/api/client';
import { queryClient } from '@/hooks/queryClient';
import { usePreferencias } from '@/store/preferencias';
import { useSessao } from '@/store/sessao';
import { FONTES } from '@/theme/carregarFontes';
import { familia, fontesProntas } from '@/theme/familias';
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
  const preferenciasHidratadas = usePreferencias((estado) => estado.hidratado);
  const hidratarPreferencias = usePreferencias((estado) => estado.hidratar);
  const [carregouFontes, erroFontes] = useFonts(FONTES);
  const tema = useTema();

  useEffect(() => {
    void hidratar();
    void hidratarPreferencias();
  }, [hidratar, hidratarPreferencias]);

  // Splash presa até sessão, preferência de tema e fontes estarem prontas (erro de fonte não trava: usa a do sistema).
  const pronto = status !== 'carregando' && preferenciasHidratadas && fontesProntas(carregouFontes, erroFontes);

  useEffect(() => {
    if (pronto) void SplashScreen.hideAsync();
  }, [pronto]);

  useEffect(() => {
    // Sem isso o TanStack não sabe quando o app volta ao primeiro plano no React Native.
    const assinatura = AppState.addEventListener('change', (estado) => focusManager.setFocused(estado === 'active'));
    return () => assinatura.remove();
  }, []);

  if (!pronto) return null;
  const autenticado = status === 'autenticado';

  return (
    <GestureHandlerRootView style={estilos.raiz}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={temaDeNavegacao(tema)}>
            <StatusBar style={tema.esquema === 'escuro' ? 'light' : 'dark'} />
            <Stack
              screenOptions={{
                headerBackTitle: 'Voltar',
                headerStyle: { backgroundColor: tema.cores.superficie },
                headerTintColor: tema.cores.primaria,
                headerTitleStyle: { fontFamily: familia.tituloSemi, color: tema.cores.texto },
                headerShadowVisible: false,
                contentStyle: { backgroundColor: tema.cores.fundo },
              }}
            >
              <Stack.Protected guard={autenticado}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="buscar" options={{ title: 'Buscar ativo' }} />
                <Stack.Screen name="ativo/[id]" options={{ title: 'Ativo' }} />
                <Stack.Screen name="operacao/nova" options={{ title: 'Nova operação', presentation: 'modal' }} />
                <Stack.Screen name="chat" options={{ title: 'Perguntar à IA' }} />
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
