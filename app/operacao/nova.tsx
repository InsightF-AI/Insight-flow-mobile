import { router } from 'expo-router';
import { useState } from 'react';

import type { TipoOperacao } from '@/api/tipos';
import { Botao } from '@/components/Botao';
import { Campo } from '@/components/Campo';
import { CampoData } from '@/components/CampoData';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { SugestoesTicker } from '@/components/SugestoesTicker';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { type ErrosOperacao, mensagemErroOperacao, validarOperacao } from '@/dominio/operacao';
import { useCotacao } from '@/hooks/useAtivo';
import { useRegistrarOperacao } from '@/hooks/usePortfolio';
import { useResolverAtivo } from '@/hooks/useResolverAtivo';
import { useWatchlist } from '@/hooks/useWatchlist';
import { ehStatus } from '@/utils/erros';
import { formatarMoeda } from '@/utils/formatacao';

// Tipo da operação simulada que o próprio usuário registra (rótulos permitidos pela RN-01).
const TIPOS: readonly { valor: TipoOperacao; rotulo: string }[] = [
  { valor: 'COMPRA', rotulo: 'Compra' },
  { valor: 'VENDA', rotulo: 'Venda' },
];

export default function NovaOperacao() {
  const watchlist = useWatchlist();
  const resolver = useResolverAtivo();
  const registrar = useRegistrarOperacao();
  const [tipo, setTipo] = useState<TipoOperacao>('COMPRA');
  const [ticker, setTicker] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [precoUnitario, setPrecoUnitario] = useState('');
  const [data, setData] = useState(() => new Date());
  const [erros, setErros] = useState<ErrosOperacao>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  // Atalho de preço só para ativos já na watchlist: digitar um ticker não deve adicioná-lo.
  const tickerNormalizado = ticker.trim().toUpperCase();
  const itemConhecido = watchlist.data?.find((item) => item.ativo.ticker.toUpperCase() === tickerNormalizado);
  const cotacao = useCotacao(itemConhecido?.ativo.id);
  const precoAtual = cotacao.data?.preco;
  const enviando = resolver.isPending || registrar.isPending;

  async function aoRegistrar() {
    setErroGeral(null);
    const resultado = validarOperacao({ tipo, ticker, quantidade, precoUnitario, data });
    if (!resultado.ok) {
      setErros(resultado.erros);
      return;
    }
    setErros({});
    const { dados } = resultado;
    try {
      const { ativoId } = await resolver.mutateAsync(dados.ticker);
      await registrar.mutateAsync({
        ativo_id: ativoId,
        tipo: dados.tipo,
        quantidade: dados.quantidade,
        preco_unitario: dados.precoUnitario,
        data: dados.data,
      });
      router.back();
    } catch (erro) {
      if (ehStatus(erro, 404)) setErros({ ticker: 'Ativo não encontrado' });
      else setErroGeral(mensagemErroOperacao(erro, 'registrar'));
    }
  }

  return (
    <Tela>
      <Texto cor="secundario">Operação simulada: nenhuma ordem real é enviada a corretoras.</Texto>
      <SeletorSegmentado rotulo="Tipo da operação" opcoes={TIPOS} selecionado={tipo} aoSelecionar={setTipo} />
      <Campo
        rotulo="Ativo (ticker)"
        valor={ticker}
        aoMudar={setTicker}
        erro={erros.ticker}
        autoCapitalize="characters"
        placeholder="Ex.: PETR4"
      />
      <SugestoesTicker tickers={watchlist.data?.map((item) => item.ativo.ticker) ?? []} aoEscolher={setTicker} />
      <Campo
        rotulo="Quantidade"
        valor={quantidade}
        aoMudar={setQuantidade}
        erro={erros.quantidade}
        keyboardType="decimal-pad"
        placeholder="Ex.: 100"
      />
      <Campo
        rotulo="Preço unitário"
        valor={precoUnitario}
        aoMudar={setPrecoUnitario}
        erro={erros.precoUnitario}
        keyboardType="decimal-pad"
        placeholder="Ex.: 38,50"
      />
      {precoAtual ? (
        <Botao
          variante="secundario"
          titulo={`Usar cotação atual (${formatarMoeda(precoAtual, itemConhecido?.ativo.moeda)})`}
          onPress={() => setPrecoUnitario(precoAtual.replace('.', ','))}
        />
      ) : null}
      <CampoData rotulo="Data da operação" valor={data} aoMudar={setData} maximo={new Date()} erro={erros.data} />
      {erroGeral ? (
        <Texto role="alert" cor="negativo">
          {erroGeral}
        </Texto>
      ) : null}
      <Botao titulo="Registrar operação" onPress={aoRegistrar} carregando={enviando} />
    </Tela>
  );
}
