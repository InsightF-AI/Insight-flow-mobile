import type { Notificacao } from '@/api/tipos';
import {
  CODIGO_NAO_AUTENTICADO,
  criarClienteTempoReal,
  ESTABILIDADE_MS,
  type EstadoTempoReal,
  MARGEM_RENOVACAO_MS,
  SILENCIO_MAXIMO_MS,
  type SocketLike,
} from '@/api/tempoReal';

class SocketFalso implements SocketLike {
  static todos: SocketFalso[] = [];
  enviados: string[] = [];
  fechado = false;
  onopen: (() => void) | null = null;
  onmessage: ((evento: { data: unknown }) => void) | null = null;
  onclose: ((evento: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public url: string) {
    SocketFalso.todos.push(this);
  }
  send(dados: string) {
    this.enviados.push(dados);
  }
  close() {
    this.fechado = true;
  }
  abrir() {
    this.onopen?.();
  }
  receber(conteudo: unknown) {
    this.onmessage?.({ data: typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo) });
  }
  cair(codigo = 1006) {
    this.onclose?.({ code: codigo });
  }
  mensagensEnviadas() {
    return this.enviados.map((texto) => JSON.parse(texto) as { tipo: string; token?: string });
  }
}

const AGORA = new Date('2026-10-10T12:00:00Z').getTime();

function notificacao(id: string): Notificacao {
  return {
    id,
    ativo_id: 'a-1',
    tipo: 'ALERTA_DISPARADO',
    mensagem: 'Preço atingiu o alvo',
    contexto: {},
    lida: false,
    criado_em: '2026-10-10T12:00:00Z',
  };
}

async function avancar(ms: number) {
  await jest.advanceTimersByTimeAsync(ms);
}

function montar() {
  const sessao = { token: 'tok-1' as string | null, expiraEm: AGORA + 30 * 60_000 as number | null };
  const aoNotificacao = jest.fn();
  const aoAutenticar = jest.fn();
  const estados: EstadoTempoReal[] = [];
  const renovarToken = jest.fn(async (): Promise<string | null> => {
    sessao.token = 'tok-2';
    sessao.expiraEm = Date.now() + 30 * 60_000;
    return 'tok-2';
  });
  const cliente = criarClienteTempoReal({
    url: 'ws://servidor/api/v1/notificacoes/ws',
    obterToken: () => sessao.token,
    obterExpiracao: () => sessao.expiraEm,
    renovarToken,
    aoNotificacao,
    aoAutenticar,
    aoMudarEstado: (estado) => estados.push(estado),
    criarSocket: (url) => new SocketFalso(url),
  });
  return { cliente, sessao, aoNotificacao, aoAutenticar, estados, renovarToken };
}

/** Abre o socket mais recente e conclui a autenticação. */
async function autenticar(socket: SocketFalso) {
  socket.abrir();
  await avancar(0);
  socket.receber({ tipo: 'autenticado' });
}

beforeEach(() => {
  SocketFalso.todos = [];
  jest.useFakeTimers({ now: AGORA });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('autenticação', () => {
  it('abre o socket, autentica com o token e fica conectado só depois do "autenticado"', async () => {
    const { cliente, aoAutenticar, estados } = montar();
    expect(cliente.conectar()).toBe(true);
    const socket = SocketFalso.todos[0];
    expect(socket.url).toBe('ws://servidor/api/v1/notificacoes/ws');
    socket.abrir();
    await avancar(0);
    expect(socket.mensagensEnviadas()).toEqual([{ tipo: 'autenticar', token: 'tok-1' }]);
    expect(estados).toEqual(['conectando']);
    socket.receber({ tipo: 'autenticado' });
    expect(estados).toEqual(['conectando', 'conectado']);
    expect(aoAutenticar).toHaveBeenCalledTimes(1);
  });

  it('conectar de novo com a conexão ativa não abre outro socket', () => {
    const { cliente } = montar();
    expect(cliente.conectar()).toBe(true);
    expect(cliente.conectar()).toBe(false);
    expect(SocketFalso.todos).toHaveLength(1);
  });

  it('token perto de vencer é renovado antes de autenticar', async () => {
    const { cliente, sessao, renovarToken } = montar();
    sessao.expiraEm = AGORA + MARGEM_RENOVACAO_MS - 1;
    cliente.conectar();
    SocketFalso.todos[0].abrir();
    await avancar(0);
    expect(renovarToken).toHaveBeenCalledTimes(1);
    expect(SocketFalso.todos[0].mensagensEnviadas()).toEqual([{ tipo: 'autenticar', token: 'tok-2' }]);
  });

  it('sem sessão (renovação devolve null) desconecta e não tenta de novo', async () => {
    const { cliente, sessao, renovarToken, estados } = montar();
    sessao.token = null;
    renovarToken.mockResolvedValue(null);
    cliente.conectar();
    SocketFalso.todos[0].abrir();
    await avancar(0);
    expect(estados[estados.length - 1]).toBe('desconectado');
    await avancar(120_000);
    expect(SocketFalso.todos).toHaveLength(1);
  });
});

describe('mensagens', () => {
  it('entrega cada notificação ao callback e ignora mensagens que não entende', async () => {
    const { cliente, aoNotificacao } = montar();
    cliente.conectar();
    const socket = SocketFalso.todos[0];
    await autenticar(socket);
    socket.receber({ tipo: 'notificacao', notificacao: notificacao('n-1') });
    socket.receber('isto não é json');
    socket.receber({ tipo: 'desconhecida' });
    socket.receber({ tipo: 'notificacao' });
    expect(aoNotificacao).toHaveBeenCalledTimes(1);
    expect(aoNotificacao).toHaveBeenCalledWith(notificacao('n-1'));
  });
});

describe('reconexão', () => {
  it('queda reconecta com espera crescente (1 s, 2 s, 4 s) e zera depois de autenticar', async () => {
    const { cliente } = montar();
    cliente.conectar();
    await autenticar(SocketFalso.todos[0]);

    SocketFalso.todos[0].cair(1011);
    await avancar(999);
    expect(SocketFalso.todos).toHaveLength(1);
    await avancar(1);
    expect(SocketFalso.todos).toHaveLength(2);

    SocketFalso.todos[1].cair(1006);
    await avancar(1_999);
    expect(SocketFalso.todos).toHaveLength(2);
    await avancar(1);
    expect(SocketFalso.todos).toHaveLength(3);

    SocketFalso.todos[2].cair(1006);
    await avancar(4_000);
    expect(SocketFalso.todos).toHaveLength(4);

    // Só uma conexão que ficou de pé por um tempo zera a espera.
    await autenticar(SocketFalso.todos[3]);
    await avancar(ESTABILIDADE_MS);
    SocketFalso.todos[3].cair(1006);
    await avancar(1_000);
    expect(SocketFalso.todos).toHaveLength(5);
  });

  it('servidor que autentica e cai logo depois não zera a espera: ela segue crescendo', async () => {
    const { cliente } = montar();
    cliente.conectar();
    const esperas: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const socket = SocketFalso.todos[SocketFalso.todos.length - 1];
      await autenticar(socket);
      await avancar(5_000); // de pé por alguns segundos, mas menos que ESTABILIDADE_MS
      socket.cair(1011);
      const antes = SocketFalso.todos.length;
      let decorrido = 0;
      while (SocketFalso.todos.length === antes && decorrido < 40_000) {
        await avancar(500);
        decorrido += 500;
      }
      esperas.push(decorrido);
    }
    expect(esperas).toEqual([1_000, 2_000, 4_000, 8_000]);
  });

  it('a espera não passa de 30 s', async () => {
    const { cliente } = montar();
    cliente.conectar();
    for (let i = 0; i < 8; i += 1) {
      SocketFalso.todos[SocketFalso.todos.length - 1].cair(1006);
      await avancar(30_000);
    }
    const antes = SocketFalso.todos.length;
    SocketFalso.todos[antes - 1].cair(1006);
    await avancar(29_999);
    expect(SocketFalso.todos).toHaveLength(antes);
    await avancar(1);
    expect(SocketFalso.todos).toHaveLength(antes + 1);
  });

  it('90 s sem nenhuma mensagem é conexão morta: fecha e reabre', async () => {
    const { cliente } = montar();
    cliente.conectar();
    const socket = SocketFalso.todos[0];
    await autenticar(socket);
    await avancar(SILENCIO_MAXIMO_MS - 1_000);
    socket.receber({ tipo: 'ping' });
    await avancar(SILENCIO_MAXIMO_MS - 1_000);
    expect(SocketFalso.todos).toHaveLength(1);
    await avancar(1_000);
    expect(socket.fechado).toBe(true);
    await avancar(1_000);
    expect(SocketFalso.todos).toHaveLength(2);
  });

  it('desconectar fecha o socket e não reconecta, nem com eventos tardios do socket antigo', async () => {
    const { cliente, estados, aoNotificacao } = montar();
    cliente.conectar();
    const socket = SocketFalso.todos[0];
    await autenticar(socket);
    cliente.desconectar();
    expect(socket.fechado).toBe(true);
    expect(estados[estados.length - 1]).toBe('desconectado');
    socket.receber({ tipo: 'notificacao', notificacao: notificacao('n-1') });
    socket.cair(1006);
    await avancar(60_000);
    expect(SocketFalso.todos).toHaveLength(1);
    expect(aoNotificacao).not.toHaveBeenCalled();
  });
});

describe('fechamento 4401 (não autenticado)', () => {
  it('renova o token e reconecta na hora com o token novo', async () => {
    const { cliente, renovarToken } = montar();
    cliente.conectar();
    await autenticar(SocketFalso.todos[0]);

    SocketFalso.todos[0].cair(CODIGO_NAO_AUTENTICADO);
    await avancar(0);
    expect(renovarToken).toHaveBeenCalledTimes(1);
    expect(SocketFalso.todos).toHaveLength(2);
    SocketFalso.todos[1].abrir();
    await avancar(0);
    expect(SocketFalso.todos[1].mensagensEnviadas()).toEqual([{ tipo: 'autenticar', token: 'tok-2' }]);
  });

  it('refresh recusado (null) encerra de vez: sessão acabou', async () => {
    const { cliente, renovarToken, estados } = montar();
    renovarToken.mockResolvedValue(null);
    cliente.conectar();
    await autenticar(SocketFalso.todos[0]);
    SocketFalso.todos[0].cair(CODIGO_NAO_AUTENTICADO);
    await avancar(0);
    await avancar(120_000);
    expect(SocketFalso.todos).toHaveLength(1);
    expect(estados[estados.length - 1]).toBe('desconectado');
  });

  it('4401 em sequência sem conseguir autenticar para de renovar e passa a esperar', async () => {
    const { cliente, renovarToken } = montar();
    cliente.conectar();
    for (let i = 0; i < 3; i += 1) {
      SocketFalso.todos[SocketFalso.todos.length - 1].cair(CODIGO_NAO_AUTENTICADO);
      await avancar(0);
    }
    expect(renovarToken).toHaveBeenCalledTimes(3);
    expect(SocketFalso.todos).toHaveLength(4);

    SocketFalso.todos[3].cair(CODIGO_NAO_AUTENTICADO);
    await avancar(0);
    expect(renovarToken).toHaveBeenCalledTimes(3);
    expect(SocketFalso.todos).toHaveLength(4);
    await avancar(1_000);
    expect(SocketFalso.todos).toHaveLength(5);
  });

  it('4401 logo depois de autenticar, em sequência, para de renovar na quarta vez', async () => {
    const { cliente, renovarToken } = montar();
    cliente.conectar();
    for (let i = 0; i < 3; i += 1) {
      await autenticar(SocketFalso.todos[SocketFalso.todos.length - 1]);
      await avancar(5_000);
      SocketFalso.todos[SocketFalso.todos.length - 1].cair(CODIGO_NAO_AUTENTICADO);
      await avancar(0);
    }
    expect(renovarToken).toHaveBeenCalledTimes(3);
    await autenticar(SocketFalso.todos[SocketFalso.todos.length - 1]);
    await avancar(5_000);
    SocketFalso.todos[SocketFalso.todos.length - 1].cair(CODIGO_NAO_AUTENTICADO);
    await avancar(0);
    expect(renovarToken).toHaveBeenCalledTimes(3);
  });

  it('renovação sem rede (rejeita) cai no backoff em vez de ficar parado', async () => {
    const { cliente, renovarToken } = montar();
    renovarToken.mockRejectedValue(new Error('sem rede'));
    cliente.conectar();
    await autenticar(SocketFalso.todos[0]);
    SocketFalso.todos[0].cair(CODIGO_NAO_AUTENTICADO);
    await avancar(0);
    expect(SocketFalso.todos).toHaveLength(1);
    await avancar(1_000);
    expect(SocketFalso.todos).toHaveLength(2);
  });
});

describe('reautenticação na mesma conexão', () => {
  it('antes de o token vencer renova e reautentica sem trocar de socket nem repetir o aoAutenticar', async () => {
    const { cliente, sessao, renovarToken, aoAutenticar } = montar();
    sessao.expiraEm = AGORA + 2 * 60_000;
    cliente.conectar();
    const socket = SocketFalso.todos[0];
    await autenticar(socket);
    expect(aoAutenticar).toHaveBeenCalledTimes(1);

    await avancar(60_000);
    expect(renovarToken).toHaveBeenCalledTimes(1);
    expect(socket.mensagensEnviadas().map((m) => m.token)).toEqual(['tok-1', 'tok-2']);
    socket.receber({ tipo: 'autenticado' });
    expect(aoAutenticar).toHaveBeenCalledTimes(1);
    expect(SocketFalso.todos).toHaveLength(1);
  });

  it('se o HTTP já renovou o token, só reautentica com ele (sem outra renovação)', async () => {
    const { cliente, sessao, renovarToken } = montar();
    sessao.expiraEm = AGORA + 2 * 60_000;
    cliente.conectar();
    const socket = SocketFalso.todos[0];
    await autenticar(socket);

    sessao.token = 'tok-http';
    sessao.expiraEm = AGORA + 30 * 60_000;
    await avancar(60_000);
    expect(renovarToken).not.toHaveBeenCalled();
    expect(socket.mensagensEnviadas().map((m) => m.token)).toEqual(['tok-1', 'tok-http']);
  });
});
