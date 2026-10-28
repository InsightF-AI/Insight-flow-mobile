import {
  extrairCodigoDeRedefinicao,
  validarAlteracaoDeSenha,
  validarCadastro,
  validarLogin,
  validarRecuperacao,
  validarRedefinicao,
} from '@/dominio/credenciais';

describe('validarLogin', () => {
  it('aceita e-mail com espaços nas pontas e senha preenchida', () => {
    expect(validarLogin({ email: ' ana@exemplo.com ', senha: 'x' })).toEqual({});
  });

  it('exige e-mail válido e senha', () => {
    expect(validarLogin({ email: 'ana@', senha: '' })).toEqual({
      email: 'Informe um e-mail válido',
      senha: 'Informe a senha',
    });
  });
});

describe('validarCadastro', () => {
  it('aceita dados válidos', () => {
    expect(validarCadastro({ nome: 'Ana', email: 'ana@exemplo.com', senha: '12345678' })).toEqual({});
  });

  it('exige nome, e-mail válido e senha com 8+ caracteres (regra do backend)', () => {
    expect(validarCadastro({ nome: '  ', email: 'x', senha: '1234567' })).toEqual({
      nome: 'Informe seu nome',
      email: 'Informe um e-mail válido',
      senha: 'A senha precisa ter pelo menos 8 caracteres',
    });
  });

  it('respeita os limites máximos do backend', () => {
    expect(validarCadastro({ nome: 'a'.repeat(256), email: 'ana@exemplo.com', senha: 'a'.repeat(129) })).toEqual({
      nome: 'Use no máximo 255 caracteres',
      senha: 'Use no máximo 128 caracteres',
    });
  });
});

describe('extrairCodigoDeRedefinicao', () => {
  it('pega o código do link inteiro', () => {
    expect(extrairCodigoDeRedefinicao('https://app.exemplo.com/redefinir-senha?token=abc.def-123&x=1')).toBe('abc.def-123');
  });

  it('aceita o código solto, com espaços e quebras de linha', () => {
    expect(extrairCodigoDeRedefinicao('  abc.def\n-123 ')).toBe('abc.def-123');
  });
});

describe('validarRecuperacao', () => {
  it('exige e-mail válido', () => {
    expect(validarRecuperacao({ email: 'ana' })).toEqual({ email: 'Informe um e-mail válido' });
    expect(validarRecuperacao({ email: 'ana@exemplo.com' })).toEqual({});
  });
});

describe('validarRedefinicao', () => {
  it('exige código, senha com 8+ caracteres e confirmação igual', () => {
    expect(validarRedefinicao({ token: ' ', novaSenha: '1234567', confirmacao: '1234567' })).toEqual({
      token: 'Cole o código do e-mail',
      novaSenha: 'A senha precisa ter pelo menos 8 caracteres',
    });
    expect(validarRedefinicao({ token: 'abc', novaSenha: '12345678', confirmacao: '12345679' })).toEqual({
      confirmacao: 'As senhas não coincidem',
    });
    expect(validarRedefinicao({ token: 'abc', novaSenha: '12345678', confirmacao: '12345678' })).toEqual({});
  });
});

describe('validarAlteracaoDeSenha', () => {
  it('exige a senha atual e uma nova senha válida e diferente', () => {
    expect(validarAlteracaoDeSenha({ senhaAtual: '', novaSenha: '12345678', confirmacao: '12345678' })).toEqual({
      senhaAtual: 'Informe a senha atual',
    });
    expect(validarAlteracaoDeSenha({ senhaAtual: '12345678', novaSenha: '12345678', confirmacao: '12345678' })).toEqual({
      novaSenha: 'Escolha uma senha diferente da atual',
    });
    expect(validarAlteracaoDeSenha({ senhaAtual: 'antiga123', novaSenha: 'nova12345', confirmacao: 'nova12345' })).toEqual({});
  });
});
