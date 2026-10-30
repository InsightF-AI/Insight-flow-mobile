import { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import { Texto } from '@/components/Texto';

interface Props {
  /** Sem mensagem, nada é mostrado. */
  mensagem: string | null | undefined;
}

/** Erro geral de um formulário: visível em vermelho e anunciado pelo leitor de tela assim que aparece. */
export function MensagemErro({ mensagem }: Props) {
  // O VoiceOver não lê sozinho um texto que surge na tela (o TalkBack lê pela região viva do `Texto`).
  useEffect(() => {
    if (mensagem && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(mensagem);
  }, [mensagem]);

  if (!mensagem) return null;
  return (
    <Texto role="alert" cor="negativo">
      {mensagem}
    </Texto>
  );
}
