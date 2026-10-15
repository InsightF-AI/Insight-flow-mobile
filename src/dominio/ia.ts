import type { AnaliseIA, MensagemChatApi, PapelMensagem } from '@/api/tipos';
import { AVISO_IA } from '@/dominio/regulatorio';
import { formatarDataHora } from '@/utils/formatacao';

/** Limites do `POST /chat` no backend (`chat_max_mensagens` e `chat_max_caracteres_mensagem`). */
export const MAXIMO_DE_MENSAGENS = 20;
export const MAXIMO_DE_CARACTERES = 2000;

/** As mesmas sugestões do cliente web: perguntas que o assistente responde com as ferramentas da carteira. */
export const SUGESTOES_DO_CHAT: readonly string[] = [
  'Qual foi meu ativo mais rentável?',
  'Como está minha exposição por setor?',
  'A carteira está acima do CDI?',
  'Quais sinais estão ativos agora?',
  'Qual é o resultado da carteira?',
  'Quais foram minhas últimas operações?',
];

export interface MensagemLocal {
  id: string;
  papel: PapelMensagem;
  texto: string;
  /** Só nas respostas da IA. */
  modelo?: string;
  avisoLegal?: string;
  /** Pergunta que não obteve resposta (rede, cota, guardrail...). Não entra no histórico enviado. */
  falhou?: boolean;
}

/** RN-05: o aviso da API quando veio preenchido; o texto fixo caso contrário. */
export function avisoLegalDe(aviso: string | null | undefined): string {
  const texto = aviso?.trim();
  return texto ? texto : AVISO_IA;
}

export function descreverProcedencia(analise: Pick<AnaliseIA, 'gerado_em' | 'em_cache' | 'desatualizada'>): string {
  const quando = formatarDataHora(analise.gerado_em);
  if (analise.desatualizada) {
    return `Análise de ${quando}. Pode estar desatualizada: o provedor de IA não respondeu agora.`;
  }
  if (analise.em_cache) return `Reaproveitada de ${quando}: os dados do ativo não mudaram desde então.`;
  return `Gerada em ${quando}.`;
}

export type ValidacaoDaPergunta = { valida: true; texto: string } | { valida: false; motivo: string };

export function validarPergunta(entrada: string): ValidacaoDaPergunta {
  const texto = entrada.trim();
  if (texto === '') return { valida: false, motivo: 'Escreva uma pergunta.' };
  if (texto.length > MAXIMO_DE_CARACTERES) {
    return {
      valida: false,
      motivo: `A pergunta tem ${texto.length} caracteres; o limite é ${MAXIMO_DE_CARACTERES}.`,
    };
  }
  return { valida: true, texto };
}

/** Corta em `maximo` unidades sem deixar a primeira metade de um par substituto (emoji) no fim. */
function cortar(texto: string, maximo: number): string {
  if (texto.length <= maximo) return texto;
  const corte = texto.slice(0, maximo);
  const ultimo = corte.charCodeAt(corte.length - 1);
  return ultimo >= 0xd800 && ultimo <= 0xdbff ? corte.slice(0, -1) : corte;
}

/**
 * Corpo do `POST /chat` a partir da conversa exibida. O backend valida o histórico inteiro (até 20 mensagens, nenhuma
 * em branco, nenhuma com mais de 2000 caracteres, a última do usuário), então o app o deixa válido: sem pergunta que
 * falhou, resposta longa cortada e janela que não começa por resposta da IA.
 */
export function montarMensagensDaApi(mensagens: readonly MensagemLocal[]): MensagemChatApi[] {
  const validas = mensagens
    .filter((m) => !m.falhou && m.texto.trim() !== '')
    .map((m): MensagemChatApi => ({ papel: m.papel, texto: cortar(m.texto, MAXIMO_DE_CARACTERES) }));
  const recentes = validas.slice(-MAXIMO_DE_MENSAGENS);
  while (recentes[0]?.papel === 'assistente') recentes.shift();
  return recentes;
}

/** O texto sai do app na área de transferência: o aviso legal vai junto (RN-05). */
export function textoParaCopiar(mensagem: Pick<MensagemLocal, 'texto' | 'avisoLegal'>): string {
  return `${mensagem.texto}\n\n${avisoLegalDe(mensagem.avisoLegal)}`;
}
