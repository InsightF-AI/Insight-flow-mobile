import { formatarDataHora } from '@/utils/formatacao';

/** Com o app aberto, a volta ao primeiro plano procura versão nova no máximo a cada 15 min (cada busca é uma chamada). */
export const INTERVALO_ENTRE_VERIFICACOES_MS = 15 * 60 * 1000;

export function deveVerificar(
  ultimaVerificacao: number | null,
  agora: number,
  intervalo = INTERVALO_ENTRE_VERIFICACOES_MS,
): boolean {
  return ultimaVerificacao === null || agora - ultimaVerificacao >= intervalo;
}

/**
 * Linha do Perfil que diz qual versão está rodando: a do APK instalado ou uma atualização baixada depois (com a data em
 * que foi publicada). Serve para conferir se a atualização chegou.
 */
export function descreverVersao({ versao, atualizadaEm }: { versao: string; atualizadaEm: Date | null }): string {
  if (!atualizadaEm) return `Versão ${versao} (a que veio com o app instalado)`;
  return `Versão ${versao} · atualização de ${formatarDataHora(atualizadaEm.toISOString())}`;
}
