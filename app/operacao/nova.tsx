import { router } from 'expo-router';
import { useState } from 'react';

import type { TipoOperacao } from '@/api/tipos';
import { Botao } from '@/components/Botao';
import { Campo } from '@/components/Campo';
import { CampoData } from '@/components/CampoData';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { SugestoesTicker } from '@/components/SugestoesTicker';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { type ErrosOperacao, mensagemErroOperacao, validarOperacao } from '@/dominio/operacao';
import { quantidadeDisponivel } from '@/dominio/portfolio';
import { useCotacao } from '@/hooks/useAtivo';
import { useOperacoes, useRegistrarOperacao } from '@/hooks/usePortfolio';
import { useWatchlist } from '@/hooks/useWatchlist';
import { ehStatus } from '@/utils/erros';
import { formatarMoeda, formatarQuantidade } from '@/utils/formatacao';

// Tipo da operação simulada que o próprio usuário registra (rótulos permitidos pela RN-01).
const TIPOS: readonly { valor: TipoOperacao; rotulo: string }[] = [
  { valor: 'COMPRA', rotulo: 'Compra' },
  { valor: 'VENDA', rotulo: 'Venda' },
];

export default function NovaOperacao() {
  const watchlist = useWatchlist();
  const operacoes = useOperacoes();
  const registrar = useRegistrarOperacao();
  const [tipo, setTipo] = useState<TipoOperacao>('COMPRA');
  const [ticker, setTicker] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [precoUnitario, setPrecoUnitario] = useState('');
  const [data, setData] = useState(() => new Date());
  const [erros, setErros] = useState<ErrosOperacao>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const itens = watchlist.data ?? [];
  // O ativo da operação precisa estar na watchlist: digitar um ticker nunca o adiciona em silêncio (decisão D6).
  const tickerNormalizado = ticker.trim().toUpperCase();
  const itemEscolhido = itens.find((item) => item.ativo.ticker.toUpperCase() === tickerNormalizado);
  const cotacao = useCotacao(itemEscolhido?.ativo.id);
  const precoAtual = cotacao.data?.preco;
  // Saldo vindo das operações (não de /portfolio/posicoes: ela omite o ativo sem cotação). null = ainda não se sabe.
  const disponivel =
    itemEscolhido && operacoes.data ? quantidadeDisponivel(operacoes.data, itemEscolhido.ativo.id) : null;

  // O erro de quantidade de uma venda não vale para a compra (e vice-versa): some junto com a troca.
  function aoMudarTipo(novo: TipoOperacao) {
    setTipo(novo);
    setErros((atuais) => ({ ...atuais, quantidade: undefined }));
    setErroGeral(null);
  }

  async function aoRegistrar() {
    setErroGeral(null);
    const resultado = validarOperacao({ tipo, ticker, quantidade, precoUnitario, data }, new Date(), {
      tickersPermitidos: itens.map((item) => item.ativo.ticker),
      disponivel: tipo === 'VENDA' ? disponivel : null,
    });
    if (!resultado.ok) {
      setErros(resultado.erros);
      return;
    }
    setErros({});
    const { dados } = resultado;
    const ativo = itens.find((item) => item.ativo.ticker.toUpperCase() === dados.ticker);
    if (!ativo) {
      setErros({ ticker: 'Escolha um ativo da sua watchlist' });
      return;
    }
    try {
      await registrar.mutateAsync({
        ativo_id: ativo.ativo.id,
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

  if (watchlist.isPending) {
    return (
      <Tela>
        <Carregando />
      </Tela>
    );
  }
  if (watchlist.isError) {
    return (
      <Tela>
        <ErroComRetry erro={watchlist.error} aoTentarNovamente={() => void watchlist.refetch()} />
      </Tela>
    );
  }
  if (itens.length === 0) {
    return (
      <Tela>
        <EstadoVazio
          mensagem="Para registrar uma operação, o ativo precisa estar na sua watchlist. Busque o ativo e adicione-o primeiro."
          acao={{ titulo: 'Buscar ativo', onPress: () => router.push('/buscar') }}
        />
      </Tela>
    );
  }

  return (
    <Tela>
      <Texto cor="secundario">Operação simulada: nenhuma ordem real é enviada a corretoras.</Texto>
      <SeletorSegmentado rotulo="Tipo da operação" opcoes={TIPOS} selecionado={tipo} aoSelecionar={aoMudarTipo} />
      <Campo
        rotulo="Ativo (ticker)"
        valor={ticker}
        aoMudar={setTicker}
        erro={erros.ticker}
        autoCapitalize="characters"
        placeholder="Ex.: PETR4"
      />
      <SugestoesTicker tickers={itens.map((item) => item.ativo.ticker)} aoEscolher={setTicker} />
      <Campo
        rotulo="Quantidade"
        valor={quantidade}
        aoMudar={setQuantidade}
        erro={erros.quantidade}
        keyboardType="decimal-pad"
        placeholder="Ex.: 100"
      />
      {tipo === 'VENDA' && itemEscolhido && disponivel !== null ? (
        <Texto variante="legenda" cor="secundario">
          {disponivel > 0
            ? `Disponível para venda: ${formatarQuantidade(disponivel)}`
            : 'Sem posição em carteira neste ativo.'}
        </Texto>
      ) : null}
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
          titulo={`Usar cotação atual (${formatarMoeda(precoAtual, itemEscolhido?.ativo.moeda)})`}
          onPress={() => setPrecoUnitario(precoAtual.replace('.', ','))}
        />
      ) : null}
      <CampoData rotulo="Data da operação" valor={data} aoMudar={setData} maximo={new Date()} erro={erros.data} />
      {erroGeral ? (
        <Texto role="alert" cor="negativo">
          {erroGeral}
        </Texto>
      ) : null}
      <Botao titulo="Registrar operação" onPress={aoRegistrar} carregando={registrar.isPending} />
    </Tela>
  );
}
