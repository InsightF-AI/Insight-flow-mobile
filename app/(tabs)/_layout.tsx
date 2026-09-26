import { router, Tabs } from 'expo-router';

import { BotaoCabecalho } from '@/components/BotaoCabecalho';
import { Icone } from '@/components/Icone';
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
          tabBarIcon: ({ color, size }) => <Icone nome="estrela" corExata={color} tamanho={size} />,
          headerRight: () => <BotaoCabecalho icone="mais" rotulo="Buscar ativo" onPress={() => router.push('/buscar')} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfólio',
          tabBarIcon: ({ color, size }) => <Icone nome="grafico-pizza" corExata={color} tamanho={size} />,
          headerRight: () => (
            <BotaoCabecalho icone="mensagem" rotulo="Perguntar à IA" onPress={() => router.push('/chat')} />
          ),
        }}
      />
      <Tabs.Screen
        name="alertas"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color, size }) => <Icone nome="sino" corExata={color} tamanho={size} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Icone nome="usuario" corExata={color} tamanho={size} />,
          tabBarBadge: naoLidas > 0 ? naoLidas : undefined,
        }}
      />
    </Tabs>
  );
}
