import { router } from 'expo-router';
import { Alert } from 'react-native';

import { Botao } from '@/components/Botao';
import { Card } from '@/components/Card';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { useNaoLidas } from '@/hooks/useNotificacoes';
import { type EsquemaTema, usePreferencias } from '@/store/preferencias';
import { useSessao } from '@/store/sessao';

const TEMAS: readonly { valor: EsquemaTema; rotulo: string }[] = [
  { valor: 'escuro', rotulo: 'Escuro' },
  { valor: 'claro', rotulo: 'Claro' },
];

export default function Perfil() {
  const tema = usePreferencias((estado) => estado.tema);
  const definirTema = usePreferencias((estado) => estado.definirTema);
  const email = useSessao((estado) => estado.email);
  const sair = useSessao((estado) => estado.sair);
  const naoLidas = useNaoLidas();

  function confirmarSaida() {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        // `sair` limpa o estado antes de tocar no armazenamento seguro: se ele falhar, a sessão já foi encerrada.
        onPress: () => {
          void sair().catch(() => {
            Alert.alert(
              'Não foi possível concluir a saída',
              'A sessão foi encerrada neste aparelho, mas o acesso salvo pode voltar ao reabrir o app.',
            );
          });
        },
      },
    ]);
  }

  return (
    <Tela>
      <Card titulo="Conta" icone="usuario">
        <Texto cor="secundario">Conectado como</Texto>
        <Texto negrito>{email ?? '—'}</Texto>
      </Card>
      <Card titulo="Notificações" icone="sino">
        <Texto cor="secundario">{naoLidas === 1 ? '1 não lida' : naoLidas > 0 ? `${naoLidas} não lidas` : 'Nenhuma não lida'}</Texto>
        <Botao titulo="Abrir notificações" variante="secundario" onPress={() => router.push('/notificacoes')} />
      </Card>
      <Card titulo="Aparência" icone="lua" tomIcone="destaque">
        <SeletorSegmentado
          rotulo="Tema do aplicativo"
          opcoes={TEMAS}
          selecionado={tema}
          aoSelecionar={(valor) => void definirTema(valor)}
        />
      </Card>
      <Botao titulo="Sair" variante="perigo" onPress={confirmarSaida} />
      <Texto variante="legenda" cor="secundario" style={{ textAlign: 'center' }}>
        Ferramenta educacional de análise. Não constitui recomendação de investimento.
      </Texto>
    </Tela>
  );
}
