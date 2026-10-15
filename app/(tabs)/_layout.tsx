import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';

import { BotaoCabecalho } from '@/components/BotaoCabecalho';
import { useNaoLidas } from '@/hooks/useNotificacoes';
import { useTema } from '@/theme/useTema';

export default function TabsLayout() {
  const { cores } = useTema();
  // Montar as abas liga o polling de notificações (só acontece com sessão ativa).
  const naoLidas = useNaoLidas();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: cores.primaria, tabBarInactiveTintColor: cores.textoSecundario }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Watchlist',
          tabBarIcon: ({ color, size }) => <Ionicons name="eye-outline" color={color} size={size} />,
          headerRight: () => <BotaoCabecalho icone="add" rotulo="Buscar ativo" onPress={() => router.push('/buscar')} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfólio',
          tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart-outline" color={color} size={size} />,
          headerRight: () => (
            <BotaoCabecalho icone="chatbubbles-outline" rotulo="Perguntar à IA" onPress={() => router.push('/chat')} />
          ),
        }}
      />
      <Tabs.Screen
        name="alertas"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color, size }) => <Ionicons name="alarm-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} />,
          tabBarBadge: naoLidas > 0 ? naoLidas : undefined,
        }}
      />
    </Tabs>
  );
}
