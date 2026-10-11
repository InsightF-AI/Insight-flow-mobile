import type { Uuid } from '@/api/tipos';

export type MotivoDeIndisponibilidade = 'expo-go' | 'aparelho-fisico' | 'sem-projeto';

/** O que o aparelho está fazendo agora; a preferência do usuário (ligar/desligar) é outra coisa. */
export type SituacaoDoPush = 'verificando' | 'ligado' | 'desligado' | 'negado' | 'indisponivel' | 'erro';

export interface AmbienteDoPush {
  /** Rodando no Expo Go: ele não recebe push remoto (Android, desde o SDK 53). */
  expoGo: boolean;
  /** Falso em simulador e emulador. */
  aparelhoFisico: boolean;
  projectId: string | null;
}

export type Suporte = { suportado: true; projectId: string } | { suportado: false; motivo: MotivoDeIndisponibilidade };

export function avaliarAmbiente({ expoGo, aparelhoFisico, projectId }: AmbienteDoPush): Suporte {
  if (expoGo) return { suportado: false, motivo: 'expo-go' };
  if (!aparelhoFisico) return { suportado: false, motivo: 'aparelho-fisico' };
  if (!projectId) return { suportado: false, motivo: 'sem-projeto' };
  return { suportado: true, projectId };
}

/** `data` do push enviado pelo backend (MAPEAMENTO §6.3). */
export interface DadosDoPush {
  notificacao_id?: Uuid;
  tipo?: string;
  ativo_id?: Uuid;
}

function textoUtil(valor: unknown): string | undefined {
  if (typeof valor !== 'string') return undefined;
  const texto = valor.trim();
  return texto === '' ? undefined : texto;
}

/** O payload vem de fora do app: lê só o que reconhece e ignora o resto. */
export function lerDadosDoPush(dados: unknown): DadosDoPush {
  if (dados === null || typeof dados !== 'object' || Array.isArray(dados)) return {};
  const bruto = dados as Record<string, unknown>;
  const resultado: DadosDoPush = {};
  const notificacaoId = textoUtil(bruto.notificacao_id);
  const tipo = textoUtil(bruto.tipo);
  const ativoId = textoUtil(bruto.ativo_id);
  if (notificacaoId) resultado.notificacao_id = notificacaoId;
  if (tipo) resultado.tipo = tipo;
  if (ativoId) resultado.ativo_id = ativoId;
  return resultado;
}

export type DestinoDoPush =
  | { pathname: '/ativo/[id]' | '/notificacao/[id]'; params: { id: Uuid } }
  | { pathname: '/notificacoes' };

/** Sinal e alerta abrem o ativo; o resumo diário, o detalhe da notificação; sem dados, a caixa. */
export function destinoDoPush(dados: DadosDoPush): DestinoDoPush {
  if (dados.ativo_id) return { pathname: '/ativo/[id]', params: { id: dados.ativo_id } };
  if (dados.notificacao_id) return { pathname: '/notificacao/[id]', params: { id: dados.notificacao_id } };
  return { pathname: '/notificacoes' };
}

const DETALHE_INDISPONIVEL: Record<MotivoDeIndisponibilidade, string> = {
  'expo-go': 'O Expo Go não recebe push: é preciso uma development build do aplicativo. Os avisos seguem na caixa de notificações.',
  'aparelho-fisico': 'Simuladores e emuladores não recebem push: use um aparelho físico.',
  'sem-projeto': 'Falta configurar o projeto Expo (EAS) do aplicativo para registrar este aparelho.',
};

export function descreverSituacao(
  situacao: SituacaoDoPush,
  motivo?: MotivoDeIndisponibilidade | null,
): { titulo: string; detalhe: string } {
  switch (situacao) {
    case 'ligado':
      return {
        titulo: 'Ligadas neste aparelho',
        detalhe: 'Sinais, alertas e o resumo diário chegam mesmo com o aplicativo fechado.',
      };
    case 'desligado':
      return {
        titulo: 'Desligadas neste aparelho',
        detalhe: 'Os avisos continuam na caixa de notificações do aplicativo.',
      };
    case 'negado':
      return {
        titulo: 'Bloqueadas pelo sistema',
        detalhe: 'O sistema não deixa o InsightFlow enviar notificações. Libere nas configurações do aparelho.',
      };
    case 'verificando':
      return { titulo: 'Verificando', detalhe: 'Conferindo a permissão e registrando este aparelho.' };
    case 'erro':
      return {
        titulo: 'Não foi possível registrar este aparelho',
        detalhe: 'O servidor não confirmou o registro. Tente novamente.',
      };
    case 'indisponivel':
      return {
        titulo: 'Indisponíveis neste aparelho',
        detalhe: motivo ? DETALHE_INDISPONIVEL[motivo] : 'Este aparelho não recebe notificações push.',
      };
  }
}
