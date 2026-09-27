import { useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import type { Alerta, TipoCondicaoAlerta } from '@/api/tipos';
import { Botao } from '@/components/Botao';
import { Campo } from '@/components/Campo';
import { Card } from '@/components/Card';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { ItemAlerta } from '@/components/ItemAlerta';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { Texto } from '@/components/Texto';
import { type ErrosAlerta, ROTULO_CONDICAO, validarAlerta } from '@/dominio/alerta';
import { useAlertas, useAtualizarAlerta, useCriarAlerta, useRemoverAlerta } from '@/hooks/useAlertas';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { ehStatus, mensagemDeErro } from '@/utils/erros';

const CONDICOES: readonly { valor: TipoCondicaoAlerta; rotulo: string }[] = [
  { valor: 'PRECO_MAIOR_IGUAL', rotulo: ROTULO_CONDICAO.PRECO_MAIOR_IGUAL },
  { valor: 'PRECO_MENOR_IGUAL', rotulo: ROTULO_CONDICAO.PRECO_MENOR_IGUAL },
];

function FormNovoAlerta() {
  const criar = useCriarAlerta();
  const [ticker, setTicker] = useState('');
  const [tipoCondicao, setTipoCondicao] = useState<TipoCondicaoAlerta>('PRECO_MAIOR_IGUAL');
  const [valorAlvo, setValorAlvo] = useState('');
  const [erros, setErros] = useState<ErrosAlerta>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  async function aoCriar() {
    setErroGeral(null);
    const resultado = validarAlerta({ ticker, tipoCondicao, valorAlvo });
    if (!resultado.ok) {
      setErros(resultado.erros);
      return;
    }
    setErros({});
    try {
      await criar.mutateAsync(resultado.dados);
      setTicker('');
      setValorAlvo('');
    } catch (erro) {
      if (ehStatus(erro, 404)) setErros({ ticker: 'Ativo não encontrado' });
      else setErroGeral(mensagemDeErro(erro));
    }
  }

  return (
    <Card titulo="Novo alerta de preço" icone="sino">
      <Campo
        rotulo="Ticker"
        valor={ticker}
        aoMudar={setTicker}
        erro={erros.ticker}
        autoCapitalize="characters"
        placeholder="Ex.: PETR4"
        icone="busca"
      />
      <SeletorSegmentado rotulo="Condição do alerta" opcoes={CONDICOES} selecionado={tipoCondicao} aoSelecionar={setTipoCondicao} />
      <Campo
        rotulo="Valor alvo"
        valor={valorAlvo}
        aoMudar={setValorAlvo}
        erro={erros.valorAlvo}
        keyboardType="decimal-pad"
        placeholder="Ex.: 40,00"
      />
      {erroGeral ? (
        <Texto role="alert" cor="negativo">
          {erroGeral}
        </Texto>
      ) : null}
      <Botao titulo="Criar alerta" onPress={aoCriar} carregando={criar.isPending} />
    </Card>
  );
}

export default function Alertas() {
  const { cores } = useTema();
  const alertas = useAlertas();
  const atualizar = useAtualizarAlerta();
  const remover = useRemoverAlerta();

  function alternar(alerta: Alerta, habilitado: boolean) {
    atualizar.mutate(
      { id: alerta.id, dados: { ativo: habilitado } },
      { onError: (erro) => Alert.alert('Não foi possível atualizar', mensagemDeErro(erro)) },
    );
  }

  function confirmarRemocao(alerta: Alerta) {
    Alert.alert('Remover alerta', `Remover o alerta de ${alerta.ativo.ticker}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () =>
          remover.mutate(alerta.id, {
            onError: (erro) => Alert.alert('Não foi possível remover', mensagemDeErro(erro)),
          }),
      },
    ]);
  }

  function listaVazia() {
    if (alertas.isPending) return <Carregando />;
    if (alertas.isError) return <ErroComRetry erro={alertas.error} aoTentarNovamente={() => void alertas.refetch()} />;
    return <EstadoVazio mensagem="Nenhum alerta cadastrado." />;
  }

  return (
    <FlatList
      style={{ backgroundColor: cores.fundo }}
      contentContainerStyle={estilos.lista}
      keyboardShouldPersistTaps="handled"
      data={alertas.data ?? []}
      keyExtractor={(alerta) => alerta.id}
      refreshControl={
        <RefreshControl refreshing={alertas.isRefetching} onRefresh={() => void alertas.refetch()} tintColor={cores.primaria} />
      }
      ListHeaderComponent={
        <View style={estilos.cabecalho}>
          <FormNovoAlerta />
          <Texto variante="subtitulo" role="heading">
            Seus alertas
          </Texto>
        </View>
      }
      ListEmptyComponent={listaVazia()}
      renderItem={({ item }) => (
        <ItemAlerta
          alerta={item}
          ocupado={
            (atualizar.isPending && atualizar.variables?.id === item.id) ||
            (remover.isPending && remover.variables === item.id)
          }
          aoAlternar={(habilitado) => alternar(item, habilitado)}
          aoRemover={() => confirmarRemocao(item)}
        />
      )}
    />
  );
}

const estilos = StyleSheet.create({
  lista: { padding: espaco.lg, gap: espaco.md, flexGrow: 1 },
  cabecalho: { gap: espaco.lg },
});
