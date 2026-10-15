import { ApiError, configurarApi, request } from '@/api/client';

type RespostaFalsa = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  headers: { get: (nome: string) => string | null };
};

function resposta(status: number, corpo?: unknown, cabecalhos: Record<string, string> = {}): RespostaFalsa {
  const porNome = new Map(Object.entries(cabecalhos).map(([nome, valor]) => [nome.toLowerCase(), valor]));
  return {
    ok: status >= 200 && status < 300,
    status,
    json: corpo === undefined ? () => Promise.reject(new SyntaxError('sem corpo')) : () => Promise.resolve(corpo),
    headers: { get: (nome) => porNome.get(nome.toLowerCase()) ?? null },
  };
}

/** fetch que só termina quando o client aborta (para testar o tempo limite). */
function pendurado(_url: string, init: RequestInit): Promise<never> {
  return new Promise((_resolver, rejeitar) => {
    init.signal?.addEventListener('abort', () => rejeitar(new Error('abortado')));
  });
}

const fetchMock = jest.fn();
const renovarToken = jest.fn<Promise<string | null>, []>();
let token: string | null = null;
let pertoDeVencer = false;
let geracao = 0;

beforeEach(() => {
  fetchMock.mockReset();
  renovarToken.mockReset();
  token = null;
  pertoDeVencer = false;
  geracao = 0;
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  configurarApi({
    baseUrl: 'http://api.teste/',
    obterToken: () => token,
    tokenPertoDeVencer: () => pertoDeVencer,
    renovarToken,
    geracaoDaSessao: () => geracao,
  });
});

function autorizacaoDaChamada(indice: number): string | undefined {
  return fetchMock.mock.calls[indice][1].headers.Authorization;
}

describe('montagem da requisição', () => {
  it('monta a URL com /api/v1 e query string codificada, ignorando undefined', async () => {
    fetchMock.mockResolvedValue(resposta(200, []));
    await request('/ativos/buscar', { query: { termo: 'petr 4', vazio: undefined } });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.teste/api/v1/ativos/buscar?termo=petr%204',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('envia Authorization quando há token', async () => {
    token = 'abc';
    fetchMock.mockResolvedValue(resposta(200, {}));
    await request('/watchlist');
    expect(autorizacaoDaChamada(0)).toBe('Bearer abc');
  });

  it('não envia Authorization sem token', async () => {
    fetchMock.mockResolvedValue(resposta(200, {}));
    await request('/watchlist');
    expect(autorizacaoDaChamada(0)).toBeUndefined();
  });

  it('nunca envia Authorization nas rotas /auth/, mesmo com sessão', async () => {
    token = 'abc';
    fetchMock.mockResolvedValue(resposta(200, {}));
    await request('/auth/refresh', { metodo: 'POST', corpo: { refresh_token: 'r' } });
    expect(autorizacaoDaChamada(0)).toBeUndefined();
  });

  it('serializa o corpo como JSON', async () => {
    fetchMock.mockResolvedValue(resposta(201, { ok: true }));
    await request('/watchlist', { metodo: 'POST', corpo: { ticker: 'PETR4' } });
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"ticker":"PETR4"}');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('envia um X-Request-ID no formato aceito pelo backend', async () => {
    fetchMock.mockResolvedValue(resposta(200, {}));
    await request('/watchlist');
    expect(fetchMock.mock.calls[0][1].headers['X-Request-ID']).toMatch(/^[A-Za-z0-9._-]{1,64}$/);
  });
});

describe('respostas de sucesso', () => {
  it('devolve o JSON em 2xx', async () => {
    fetchMock.mockResolvedValue(resposta(200, [{ id: 1 }]));
    await expect(request('/watchlist')).resolves.toEqual([{ id: 1 }]);
  });

  it('204 devolve undefined', async () => {
    fetchMock.mockResolvedValue(resposta(204));
    await expect(request('/watchlist/x', { metodo: 'DELETE' })).resolves.toBeUndefined();
  });

  it('2xx com corpo que não é JSON vira ApiError de status 0', async () => {
    fetchMock.mockResolvedValue(resposta(200));
    const erro = await request('/x').catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro).toMatchObject({ status: 0, message: 'Resposta inválida do servidor' });
  });
});

describe('erros', () => {
  it('detail string vira a mensagem do erro', async () => {
    fetchMock.mockResolvedValue(resposta(409, { detail: 'Ativo ja esta na watchlist' }));
    await expect(request('/watchlist')).rejects.toMatchObject({ status: 409, message: 'Ativo ja esta na watchlist' });
  });

  it('detail lista (422 do Pydantic) une as mensagens', async () => {
    fetchMock.mockResolvedValue(
      resposta(422, {
        detail: [
          { loc: ['body', 'quantidade'], msg: 'Input should be greater than 0', type: 'greater_than' },
          { loc: ['body', 'data'], msg: 'Field required', type: 'missing' },
        ],
      }),
    );
    await expect(request('/operacoes')).rejects.toMatchObject({
      status: 422,
      message: 'Input should be greater than 0; Field required',
    });
  });

  it('corpo sem detail usa mensagem padrão', async () => {
    fetchMock.mockResolvedValue(resposta(500, {}));
    await expect(request('/x')).rejects.toMatchObject({ status: 500, message: 'Erro 500' });
  });

  it('corpo que não é JSON usa mensagem padrão', async () => {
    fetchMock.mockResolvedValue(resposta(502));
    await expect(request('/x')).rejects.toMatchObject({ status: 502, message: 'Erro 502' });
  });

  it('o erro guarda o X-Request-ID devolvido pelo servidor', async () => {
    fetchMock.mockResolvedValue(resposta(500, {}, { 'X-Request-ID': 'srv-123' }));
    await expect(request('/x')).rejects.toMatchObject({ requestId: 'srv-123' });
  });

  it('sem o header na resposta, o erro guarda o id enviado', async () => {
    fetchMock.mockResolvedValue(resposta(404, { detail: 'x' }));
    const erro = (await request('/x').catch((e: unknown) => e)) as ApiError;
    expect(erro.requestId).toBe(fetchMock.mock.calls[0][1].headers['X-Request-ID']);
  });

  it('Retry-After em segundos vira retryAfterSegundos', async () => {
    fetchMock.mockResolvedValue(resposta(503, { detail: 'Cota do provedor de IA excedida' }, { 'Retry-After': '42' }));
    await expect(request('/chat')).rejects.toMatchObject({ status: 503, retryAfterSegundos: 42 });
  });

  it('Retry-After que não é um número de segundos é ignorado', async () => {
    fetchMock.mockResolvedValue(resposta(503, {}, { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' }));
    const erro = (await request('/chat').catch((e: unknown) => e)) as ApiError;
    expect(erro.retryAfterSegundos).toBeUndefined();
  });

  it('falha de rede vira status 0 com causa rede e o endereço do servidor', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const erro = await request('/x').catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro).toMatchObject({ status: 0, causa: 'rede', message: 'Sem conexão com o servidor (http://api.teste)' });
  });
});

describe('tempo limite', () => {
  it('o padrão de 20 s aborta e vira causa tempo', async () => {
    jest.useFakeTimers();
    try {
      fetchMock.mockImplementation(pendurado);
      const promessa = request('/lento');
      jest.advanceTimersByTime(20_000);
      await expect(promessa).rejects.toMatchObject({
        status: 0,
        causa: 'tempo',
        message: 'O servidor demorou demais para responder (http://api.teste)',
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('timeoutMs da chamada substitui o padrão', async () => {
    jest.useFakeTimers();
    try {
      fetchMock.mockImplementation(pendurado);
      let terminou = false;
      const promessa = request('/ativos/a-1/analise', { timeoutMs: 70_000 }).finally(() => {
        terminou = true;
      });
      // O matcher é anexado antes de avançar o relógio: senão a rejeição ocorre sem tratador e o Jest reprova o teste.
      const rejeitou = expect(promessa).rejects.toMatchObject({ causa: 'tempo' });
      await jest.advanceTimersByTimeAsync(20_000);
      expect(terminou).toBe(false);
      await jest.advanceTimersByTimeAsync(50_000);
      await rejeitou;
      expect(terminou).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('renovação de sessão', () => {
  it('401 renova e repete uma vez com o token novo', async () => {
    token = 'velho';
    fetchMock.mockResolvedValueOnce(resposta(401, { detail: 'Token invalido' })).mockResolvedValueOnce(resposta(200, { ok: true }));
    renovarToken.mockImplementation(async () => {
      token = 'novo';
      return 'novo';
    });
    await expect(request('/watchlist')).resolves.toEqual({ ok: true });
    expect(renovarToken).toHaveBeenCalledTimes(1);
    expect(autorizacaoDaChamada(1)).toBe('Bearer novo');
  });

  it('um segundo 401 depois de renovar vai para quem chamou', async () => {
    token = 'velho';
    fetchMock.mockResolvedValue(resposta(401, { detail: 'Usuario nao encontrado' }));
    renovarToken.mockImplementation(async () => {
      token = 'novo';
      return 'novo';
    });
    await expect(request('/watchlist')).rejects.toMatchObject({ status: 401, message: 'Usuario nao encontrado' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(renovarToken).toHaveBeenCalledTimes(1);
  });

  it('renovação recusada (sessão acabou) não repete e devolve o 401', async () => {
    token = 'velho';
    fetchMock.mockResolvedValue(resposta(401, { detail: 'Token invalido' }));
    renovarToken.mockResolvedValue(null);
    await expect(request('/watchlist')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falha de rede ao renovar vira o erro da requisição', async () => {
    token = 'velho';
    fetchMock.mockResolvedValue(resposta(401, { detail: 'Token invalido' }));
    renovarToken.mockRejectedValue(new ApiError(0, 'Sem conexão com o servidor (http://api.teste)', { causa: 'rede' }));
    await expect(request('/watchlist')).rejects.toMatchObject({ status: 0, causa: 'rede' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('401 quando outra requisição já renovou repete com o token vigente, sem renovar de novo', async () => {
    token = 'velho';
    fetchMock
      .mockImplementationOnce(async () => {
        token = 'novo';
        return resposta(401, { detail: 'Token invalido' });
      })
      .mockResolvedValueOnce(resposta(200, []));
    await expect(request('/watchlist')).resolves.toEqual([]);
    expect(renovarToken).not.toHaveBeenCalled();
    expect(autorizacaoDaChamada(1)).toBe('Bearer novo');
  });

  it('401 depois do logout não repete', async () => {
    token = 'tok';
    fetchMock.mockImplementationOnce(async () => {
      token = null;
      return resposta(401, { detail: 'Token invalido' });
    });
    await expect(request('/watchlist')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(renovarToken).not.toHaveBeenCalled();
  });

  it('sessão trocada com a requisição no ar: o 401 não é repetido nem renova', async () => {
    token = 'velho';
    fetchMock.mockImplementationOnce(async () => {
      geracao += 1; // logout e login de outra conta enquanto a resposta voltava
      token = 'de-outra-conta';
      return resposta(401, { detail: 'Token invalido' });
    });
    await expect(request('/operacoes', { metodo: 'POST', corpo: {} })).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(renovarToken).not.toHaveBeenCalled();
  });

  it('renovação antecipada que estoura o tempo não envia a requisição e devolve o erro de tempo', async () => {
    token = 'velho';
    pertoDeVencer = true;
    renovarToken.mockRejectedValue(
      new ApiError(0, 'O servidor demorou demais para responder (http://api.teste)', { causa: 'tempo' }),
    );
    await expect(request('/watchlist')).rejects.toMatchObject({ status: 0, causa: 'tempo' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('401 numa rota /auth/ não renova', async () => {
    token = 'tok';
    fetchMock.mockResolvedValue(resposta(401, { detail: 'Credenciais inválidas' }));
    await expect(request('/auth/login', { metodo: 'POST', corpo: {} })).rejects.toMatchObject({ status: 401 });
    expect(renovarToken).not.toHaveBeenCalled();
  });

  it('token perto de vencer é renovado antes de enviar', async () => {
    token = 'velho';
    pertoDeVencer = true;
    renovarToken.mockImplementation(async () => {
      token = 'novo';
      return 'novo';
    });
    fetchMock.mockResolvedValue(resposta(200, []));
    await request('/watchlist');
    expect(renovarToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(autorizacaoDaChamada(0)).toBe('Bearer novo');
  });

  it('renovação antecipada sem rede segue com o token atual', async () => {
    token = 'velho';
    pertoDeVencer = true;
    renovarToken.mockRejectedValue(new ApiError(0, 'Sem conexão', { causa: 'rede' }));
    fetchMock.mockResolvedValue(resposta(200, []));
    await expect(request('/watchlist')).resolves.toEqual([]);
    expect(autorizacaoDaChamada(0)).toBe('Bearer velho');
  });

  it('renovação antecipada recusada encerra sem enviar a requisição', async () => {
    token = 'velho';
    pertoDeVencer = true;
    renovarToken.mockResolvedValue(null);
    await expect(request('/watchlist')).rejects.toMatchObject({ status: 401, message: 'Sessão encerrada. Entre novamente.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
