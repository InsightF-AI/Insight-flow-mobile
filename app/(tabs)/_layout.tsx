import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

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
        }}
      />
    </Tabs>
  );
}
