import { StyleSheet, Switch, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { Card } from '@/components/Card';
import { ErroComRetry } from '@/components/ErroComRetry';
import { Texto } from '@/components/Texto';
import { descreverSituacao, type MotivoDeIndisponibilidade, type SituacaoDoPush } from '@/dominio/push';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { mensagemDeErro } from '@/utils/erros';

interface Props {
  situacao: SituacaoDoPush;
  motivo?: MotivoDeIndisponibilidade | null;
  erro?: unknown;
  /** Valor do interruptor: a vontade do usuário, quando o aparelho consegue atendê-la. */
  ligado: boolean;
  ocupado: boolean;
  aoAlternar: (ligar: boolean) => void;
  aoTentarNovamente: () => void;
  aoAbrirConfiguracoes: () => void;
}

export function CardPush({ situacao, motivo, erro, ligado, ocupado, aoAlternar, aoTentarNovamente, aoAbrirConfiguracoes }: Props) {
  const { cores } = useTema();
  const texto = descreverSituacao(situacao, motivo);
  const indisponivel = situacao === 'indisponivel';

  return (
    <Card titulo="Notificações push" icone="sino">
      <View style={estilos.linha}>
        <View style={estilos.textos}>
          <Texto negrito>{texto.titulo}</Texto>
          <Texto variante="legenda" cor="secundario">
            {texto.detalhe}
          </Texto>
        </View>
        <Switch
          role="switch"
          aria-label="Notificações push"
          value={ligado}
          onValueChange={aoAlternar}
          disabled={indisponivel || ocupado}
          aria-disabled={indisponivel || ocupado}
          trackColor={{ true: cores.primaria, false: cores.bordaForte }}
        />
      </View>
      {situacao === 'negado' ? (
        <Botao titulo="Abrir configurações do sistema" variante="secundario" onPress={aoAbrirConfiguracoes} />
      ) : null}
      {situacao === 'erro' ? (
        <ErroComRetry erro={erro} mensagem={mensagemDeErro(erro)} aoTentarNovamente={aoTentarNovamente} />
      ) : null}
    </Card>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  textos: { flex: 1, gap: espaco.xs },
});
