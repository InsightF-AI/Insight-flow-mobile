import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import type { NotificationResponse } from 'expo-notifications';
import { Platform } from 'react-native';

import { avaliarAmbiente, type Suporte } from '@/dominio/push';

// Única fronteira com `expo-notifications`. O módulo só é carregado (require sob demanda) em ambiente que recebe
// push: no Expo Go ele registra avisos de erro e nada funcionaria mesmo.

const CANAL_PADRAO = 'default';

export function lerSuporte(): Suporte {
  const configurado = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  return avaliarAmbiente({
    expoGo: isRunningInExpoGo(),
    aparelhoFisico: Device.isDevice,
    projectId: typeof configurado === 'string' && configurado.trim() !== '' ? configurado.trim() : null,
  });
}

function carregar() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga sob demanda: nada de expo-notifications no Expo Go
  return require('expo-notifications') as typeof import('expo-notifications');
}

export type Preparo = { estado: 'pronto'; token: string } | { estado: 'negado'; podePedirDeNovo: boolean };

/**
 * Canal Android, permissão e token do Expo. A permissão só é pedida quando ainda não foi decidida
 * (`undetermined`) ou quando o usuário pediu no Perfil (`pedirPermissao`): depois de uma negação, o login não pergunta
 * de novo. Falhas de rede ao obter o token propagam: quem chama mostra o erro.
 */
export async function prepararPush(projectId: string, { pedirPermissao }: { pedirPermissao: boolean }): Promise<Preparo> {
  const Notificacoes = await carregar();
  if (Platform.OS === 'android') {
    // O backend não manda `channelId`: sem o canal `default` o Android usa um canal genérico. No Android 13+ o canal
    // precisa existir antes do pedido de permissão, ou o diálogo não aparece.
    await Notificacoes.setNotificationChannelAsync(CANAL_PADRAO, {
      name: 'Avisos do InsightFlow',
      importance: Notificacoes.AndroidImportance.HIGH,
    });
  }

  let permissao = await Notificacoes.getPermissionsAsync();
  const naoDecidida = permissao.status === 'undetermined';
  if (!permissao.granted && permissao.canAskAgain && (naoDecidida || pedirPermissao)) {
    permissao = await Notificacoes.requestPermissionsAsync();
  }
  if (!permissao.granted) return { estado: 'negado', podePedirDeNovo: permissao.canAskAgain };

  const { data } = await Notificacoes.getExpoPushTokenAsync({ projectId });
  return { estado: 'pronto', token: data };
}

/** Com o app aberto o WebSocket já mostra o banner do aplicativo: o do sistema fica suprimido. */
export async function configurarExibicaoEmPrimeiroPlano(): Promise<void> {
  if (!lerSuporte().suportado) return;
  const Notificacoes = await carregar();
  Notificacoes.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

const SEM_ASSINATURA = () => {};
// O toque que abriu o app (partida a frio) continua disponível enquanto o processo vive: não repetir a navegação.
const toquesTratados = new Set<string>();

/** Assina os toques em notificações do sistema e entrega o `data` de cada um. Devolve a função que cancela. */
export async function observarToques(aoToque: (dados: unknown) => void): Promise<() => void> {
  if (!lerSuporte().suportado) return SEM_ASSINATURA;
  const Notificacoes = await carregar();

  function tratar(resposta: NotificationResponse) {
    const identificador = resposta.notification.request.identifier;
    if (toquesTratados.has(identificador)) return;
    toquesTratados.add(identificador);
    aoToque(resposta.notification.request.content.data);
  }

  const assinatura = Notificacoes.addNotificationResponseReceivedListener(tratar);
  const inicial = await Notificacoes.getLastNotificationResponseAsync();
  if (inicial) tratar(inicial);
  return () => assinatura.remove();
}

/** Avisa quando o token do aparelho muda (o app registra de novo no backend). */
export async function observarMudancaDeToken(aoMudar: () => void): Promise<() => void> {
  if (!lerSuporte().suportado) return SEM_ASSINATURA;
  const Notificacoes = await carregar();
  const assinatura = Notificacoes.addPushTokenListener(() => aoMudar());
  return () => assinatura.remove();
}
