import { router, Tabs } from 'expo-router';
import { View } from 'react-native';

import { BotaoCabecalho } from '@/components/BotaoCabecalho';
import { Icone } from '@/components/Icone';
import { useNaoLidas } from '@/hooks/useNotificacoes';
import { familia } from '@/theme/familias';
import { useTema } from '@/theme/useTema';

export default function TabsLayout() {
  const { cores } = useTema();
  // Montar as abas liga a lista de notificações (só acontece com sessão ativa); o tempo real fica na raiz.
  const naoLidas = useNaoLidas();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: cores.superficie },
        headerTitleStyle: { fontFamily: familia.tituloSemi, color: cores.texto },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: cores.fundo },
        tabBarStyle: { backgroundColor: cores.superficie, borderTopColor: cores.borda },
        tabBarActiveTintColor: cores.primaria,
        tabBarInactiveTintColor: cores.textoTerciario,
        tabBarLabelStyle: { fontFamily: familia.medio, fontSize: 11 },
        // Contagem de não lidas não é "negativo": usa a cor primária (vermelho só para valor negativo).
        tabBarBadgeStyle: {
          backgroundColor: cores.primaria,
          color: cores.textoSobrePrimaria,
          fontFamily: familia.negrito,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Icone nome="casa" corExata={color} tamanho={size} />,
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <BotaoCabecalho
                icone="sino"
                rotulo="Notificações"
                selo={naoLidas}
                onPress={() => router.push('/notificacoes')}
              />
              <BotaoCabecalho icone="mais" rotulo="Buscar ativo" onPress={() => router.push('/buscar')} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Carteira',
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
          tabBarBadge: naoLidas > 0 ? naoLidas : undefined,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Icone nome="usuario" corExata={color} tamanho={size} />,
        }}
      />
    </Tabs>
  );
}
