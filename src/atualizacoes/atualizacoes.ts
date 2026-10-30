import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

// Único arquivo que fala com o `expo-updates` (EAS Update): o resto do app usa estas funções.

/** Só o APK de release com o EAS Update configurado busca atualizações; no Expo Go e em desenvolvimento, não. */
export function atualizacoesLigadas(): boolean {
  return Updates.isEnabled && !__DEV__;
}

/** Procura versão nova no canal do APK e, se houver, baixa. Ela passa a valer ao reiniciar (ou na próxima abertura). */
export async function baixarAtualizacaoSeHouver(): Promise<void> {
  const verificacao = await Updates.checkForUpdateAsync();
  if (verificacao.isAvailable) await Updates.fetchUpdateAsync();
}

/** Reinicia o app já na versão baixada. Nada depois desta chamada tem garantia de rodar. */
export function reiniciarNaVersaoNova(): Promise<void> {
  return Updates.reloadAsync();
}

/** Há versão nova baixada e esperando o reinício (também a que a verificação da abertura baixou). */
export function useAtualizacaoBaixada(): { pronta: boolean; id: string | null } {
  const { isUpdatePending, downloadedUpdate } = Updates.useUpdates();
  return { pronta: isUpdatePending, id: downloadedUpdate?.updateId ?? (isUpdatePending ? 'baixada' : null) };
}

/** Versão do app e, se o que roda é uma atualização baixada, quando ela foi publicada. */
export function versaoEmUso(): { versao: string; atualizadaEm: Date | null } {
  const versao = Constants.expoConfig?.version ?? '—';
  const atualizadaEm = atualizacoesLigadas() && !Updates.isEmbeddedLaunch ? (Updates.createdAt ?? null) : null;
  return { versao, atualizadaEm };
}
