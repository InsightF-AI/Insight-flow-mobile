import { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';

import {
  atualizacoesLigadas,
  baixarAtualizacaoSeHouver,
  reiniciarNaVersaoNova,
  useAtualizacaoBaixada,
} from '@/atualizacoes/atualizacoes';
import { deveVerificar } from '@/dominio/atualizacao';

/**
 * Mantém o app na versão mais nova publicada com `eas update`. A abertura já verifica sozinha (configuração
 * `updates` do app.json, com até 3 s de espera); aqui o app também verifica ao voltar do segundo plano e, quando uma
 * versão nova termina de baixar, pergunta se pode reiniciar. Se a pessoa adiar, a versão entra na próxima abertura.
 */
export function useAtualizacaoDoApp(): void {
  const { pronta, id } = useAtualizacaoBaixada();
  const ultimaVerificacao = useRef<number | null>(null);
  const jaPerguntou = useRef<string | null>(null);

  useEffect(() => {
    if (!atualizacoesLigadas()) return;
    // A verificação da abertura (feita pelo `expo-updates`) conta como a primeira.
    ultimaVerificacao.current = Date.now();
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active') return;
      const agora = Date.now();
      if (!deveVerificar(ultimaVerificacao.current, agora)) return;
      ultimaVerificacao.current = agora;
      // Sem rede, nada a avisar: tenta de novo na próxima volta ao app.
      baixarAtualizacaoSeHouver().catch(() => undefined);
    });
    return () => assinatura.remove();
  }, []);

  useEffect(() => {
    if (!pronta || !id || jaPerguntou.current === id) return;
    jaPerguntou.current = id;
    // Reiniciar sem perguntar apagaria um formulário pela metade.
    Alert.alert(
      'Nova versão disponível',
      'O InsightFlow baixou uma atualização. Reinicie para usá-la agora; se preferir, ela entra sozinha na próxima vez que o app abrir.',
      [
        { text: 'Depois', style: 'cancel' },
        { text: 'Reiniciar agora', onPress: () => void reiniciarNaVersaoNova().catch(() => undefined) },
      ],
    );
  }, [pronta, id]);
}
