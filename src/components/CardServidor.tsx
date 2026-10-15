import type { ResultadoDaConexao } from '@/api/saude';
import { Botao } from '@/components/Botao';
import { Card } from '@/components/Card';
import { Texto } from '@/components/Texto';

interface Props {
  url: string;
  resultado?: ResultadoDaConexao;
  testando: boolean;
  aoTestar: () => void;
}

function descrever(resultado: ResultadoDaConexao): string {
  if (resultado.ok) return `Conectado (${resultado.ms} ms)`;
  if (resultado.motivo === 'rede') return 'Sem conexão com o servidor. Confira o Wi-Fi e o endereço.';
  if (resultado.motivo === 'tempo') return 'O servidor demorou demais para responder.';
  return `O servidor respondeu com erro ${resultado.status ?? ''}.`.replace(' .', '.');
}

export function CardServidor({ url, resultado, testando, aoTestar }: Props) {
  return (
    <Card titulo="Servidor" icone="atividade" tomIcone="neutro">
      <Texto cor="secundario">Endereço configurado</Texto>
      <Texto negrito selectable>
        {url}
      </Texto>
      {resultado ? (
        <Texto role="status" cor={resultado.ok ? 'positivo' : 'negativo'}>
          {descrever(resultado)}
        </Texto>
      ) : null}
      <Botao titulo="Testar conexão" variante="secundario" onPress={aoTestar} carregando={testando} />
      <Texto variante="legenda" cor="terciario">
        O endereço vem de EXPO_PUBLIC_API_URL: para trocá-lo, reinicie o Metro com `npx expo start -c`.
      </Texto>
    </Card>
  );
}
