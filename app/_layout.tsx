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
import { BannerNotificacao } from '@/components/BannerNotificacao';
import { ConfiguracaoInvalida } from '@/components/ConfiguracaoInvalida';
import { lerUrlDaApi, urlDoWebSocket } from '@/config/ambiente';
import { queryClient } from '@/hooks/queryClient';
import { useBannerNotificacao } from '@/hooks/useBannerNotificacao';
import { useTempoReal } from '@/hooks/useTempoReal';
import { usePreferencias } from '@/store/preferencias';
import { geracaoDaSessao, pertoDeVencer, useSessao } from '@/store/sessao';
import { FONTES } from '@/theme/carregarFontes';
import { familia, fontesProntas } from '@/theme/familias';
import { type Tema, useTema } from '@/theme/useTema';

void SplashScreen.preventAutoHideAsync();

// A URL é embutida no bundle pelo Metro. Inválida, o app mostra como corrigir em vez de "sem conexão" em toda tela.
let erroDeConfiguracao: string | null = null;
let baseUrl = '';
try {
  baseUrl = lerUrlDaApi(process.env.EXPO_PUBLIC_API_URL);
} catch (erro) {
  erroDeConfiguracao = erro instanceof Error ? erro.message : String(erro);
}

configurarApi({
  baseUrl,
  obterToken: () => useSessao.getState().token,
  tokenPertoDeVencer: () => pertoDeVencer(useSessao.getState().expiraEm),
  // A store serializa as renovações e, se o refresh for recusado, encerra a sessão (o app volta ao login).
  renovarToken: () => useSessao.getState().renovar(),
  geracaoDaSessao,
});

// Com a sessão ativa: mantém o WebSocket de notificações aberto e mostra o banner de cada notificação recebida.
function SessaoAtiva() {
  useTempoReal(erroDeConfiguracao ? null : urlDoWebSocket(baseUrl));
  const { banner, aoPressionar, aoDispensar } = useBannerNotificacao();
  if (!banner) return null;
  return (
    <BannerNotificacao titulo={banner.titulo} mensagem={banner.mensagem} aoPressionar={aoPressionar} aoDispensar={aoDispensar} />
  );
}

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
  if (erroDeConfiguracao) {
    return (
      <SafeAreaProvider>
        <ConfiguracaoInvalida mensagem={erroDeConfiguracao} />
      </SafeAreaProvider>
    );
  }
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
                <Stack.Screen name="notificacoes" options={{ title: 'Notificações' }} />
                <Stack.Screen name="notificacao/[id]" options={{ title: 'Notificação' }} />
              </Stack.Protected>
              <Stack.Protected guard={!autenticado}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              </Stack.Protected>
            </Stack>
            {autenticado ? <SessaoAtiva /> : null}
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
});
