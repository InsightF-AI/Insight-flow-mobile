import { router } from 'expo-router';
import { useRef, useState } from 'react';
import type { TextInput } from 'react-native';

import type { TipoOperacao } from '@/api/tipos';
import { Botao } from '@/components/Botao';
import { Campo } from '@/components/Campo';
import { CampoData } from '@/components/CampoData';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { MensagemErro } from '@/components/MensagemErro';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { SugestoesTicker } from '@/components/SugestoesTicker';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { type ErrosOperacao, mensagemErroOperacao, validarOperacao } from '@/dominio/operacao';
import { quantidadeDisponivel } from '@/dominio/portfolio';
import { sugerirTickers, juntarAtivos } from '@/dominio/catalogo';
import { useCotacao } from '@/hooks/useAtivo';
import { useCatalogo } from '@/hooks/useBusca';
import { useOperacoes, useRegistrarOperacao } from '@/hooks/usePortfolio';
import { useWatchlist } from '@/hooks/useWatchlist';
import { ehStatus } from '@/utils/erros';
import { formatarMoeda, formatarQuantidade } from '@/utils/formatacao';
import { focarPrimeiroComErro } from '@/utils/formulario';

// Tipo da operação simulada que o próprio usuário registra (rótulos permitidos pela RN-01).
const TIPOS: readonly { valor: TipoOperacao; rotulo: string }[] = [
  { valor: 'COMPRA', rotulo: 'Compra' },
  { valor: 'VENDA', rotulo: 'Venda' },
];

const LIMITE_SUGESTOES = 12;

export default function NovaOperacao() {
  const watchlist = useWatchlist();
  const catalogo = useCatalogo();
  const operacoes = useOperacoes();
  const registrar = useRegistrarOperacao();
  const [tipo, setTipo] = useState<TipoOperacao>('COMPRA');
  const [ticker, setTicker] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [precoUnitario, setPrecoUnitario] = useState('');
  const [data, setData] = useState(() => new Date());
  const [erros, setErros] = useState<ErrosOperacao>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const campoTicker = useRef<TextInput>(null);
  const campoQuantidade = useRef<TextInput>(null);
  const campoPreco = useRef<TextInput>(null);

  // O ativo vem da watchlist ou do catálogo do servidor: digitar um ticker nunca o adiciona em silêncio (decisão D6).
  const ativos = juntarAtivos(
    watchlist.data?.map((item) => item.ativo),
    catalogo.data,
  );
  const tickerNormalizado = ticker.trim().toUpperCase();
  const ativoEscolhido = ativos.find((ativo) => ativo.ticker.toUpperCase() === tickerNormalizado);
  const cotacao = useCotacao(ativoEscolhido?.id);
  const precoAtual = cotacao.data?.preco;
  // Saldo vindo das operações (não de /portfolio/posicoes: ela omite o ativo sem cotação). null = ainda não se sabe.
  const disponivel =
    ativoEscolhido && operacoes.data ? quantidadeDisponivel(operacoes.data, ativoEscolhido.id) : null;

  // O erro de quantidade de uma venda não vale para a compra (e vice-versa): some junto com a troca.
  function aoMudarTipo(novo: TipoOperacao) {
    setTipo(novo);
    setErros((atuais) => ({ ...atuais, quantidade: undefined }));
    setErroGeral(null);
  }

  async function aoRegistrar() {
    if (registrar.isPending) return;
    setErroGeral(null);
    const resultado = validarOperacao({ tipo, ticker, quantidade, precoUnitario, data }, new Date(), {
      tickersPermitidos: ativos.map((ativo) => ativo.ticker),
      disponivel: tipo === 'VENDA' ? disponivel : null,
    });
    if (!resultado.ok) {
      setErros(resultado.erros);
      focarPrimeiroComErro(resultado.erros, [
        ['ticker', campoTicker],
        ['quantidade', campoQuantidade],
        ['precoUnitario', campoPreco],
      ]);
      return;
    }
    setErros({});
    const { dados } = resultado;
    const ativo = ativos.find((item) => item.ticker.toUpperCase() === dados.ticker);
    if (!ativo) {
      setErros({ ticker: 'Escolha um ativo da lista' });
      campoTicker.current?.focus();
      return;
    }
    try {
      await registrar.mutateAsync({
        ativo_id: ativo.id,
        tipo: dados.tipo,
        quantidade: dados.quantidade,
        preco_unitario: dados.precoUnitario,
        data: dados.data,
      });
      router.back();
    } catch (erro) {
      if (ehStatus(erro, 404)) {
        setErros({ ticker: 'Ativo não encontrado' });
        campoTicker.current?.focus();
      } else setErroGeral(mensagemErroOperacao(erro, 'registrar'));
    }
  }

  if (watchlist.isPending || catalogo.isPending) {
    return (
      <Tela>
        <Carregando />
      </Tela>
    );
  }
  if (watchlist.isError && catalogo.isError) {
    return (
      <Tela>
        <ErroComRetry
          erro={watchlist.error}
          aoTentarNovamente={() => {
            void watchlist.refetch();
            void catalogo.refetch();
          }}
        />
      </Tela>
    );
  }
  if (ativos.length === 0) {
    return (
      <Tela>
        <EstadoVazio
          mensagem="Nenhum ativo disponível para operar no momento. Busque o ativo e adicione-o à watchlist."
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
        ref={campoTicker}
        rotulo="Ativo (ticker)"
        valor={ticker}
        aoMudar={setTicker}
        erro={erros.ticker}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="Ex.: PETR4"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => campoQuantidade.current?.focus()}
      />
      <SugestoesTicker tickers={sugerirTickers(ativos, ticker, LIMITE_SUGESTOES)} aoEscolher={setTicker} />
      <Campo
        ref={campoQuantidade}
        rotulo="Quantidade"
        valor={quantidade}
        aoMudar={setQuantidade}
        erro={erros.quantidade}
        keyboardType="decimal-pad"
        placeholder="Ex.: 100"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => campoPreco.current?.focus()}
      />
      {tipo === 'VENDA' && ativoEscolhido && disponivel !== null ? (
        <Texto variante="legenda" cor="secundario">
          {disponivel > 0
            ? `Disponível para venda: ${formatarQuantidade(disponivel)}`
            : 'Sem posição em carteira neste ativo.'}
        </Texto>
      ) : null}
      <Campo
        ref={campoPreco}
        rotulo="Preço unitário"
        valor={precoUnitario}
        aoMudar={setPrecoUnitario}
        erro={erros.precoUnitario}
        keyboardType="decimal-pad"
        placeholder="Ex.: 38,50"
        returnKeyType="done"
      />
      {precoAtual ? (
        <Botao
          variante="secundario"
          titulo={`Usar cotação atual (${formatarMoeda(precoAtual, ativoEscolhido?.moeda)})`}
          onPress={() => setPrecoUnitario(precoAtual.replace('.', ','))}
        />
      ) : null}
      <CampoData rotulo="Data da operação" valor={data} aoMudar={setData} maximo={new Date()} erro={erros.data} />
      <MensagemErro mensagem={erroGeral} />
      <Botao titulo="Registrar operação" onPress={aoRegistrar} carregando={registrar.isPending} />
    </Tela>
  );
}
