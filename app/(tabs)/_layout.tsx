import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';

import { BotaoCabecalho } from '@/components/BotaoCabecalho';
import { useTema } from '@/theme/useTema';

export default function TabsLayout() {
  const { cores } = useTema();
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
        }}
      />
      <Tabs.Screen
        name="alertas"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color, size }) => <Ionicons name="alarm-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
