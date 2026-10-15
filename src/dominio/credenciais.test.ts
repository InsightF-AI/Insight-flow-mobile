import { validarCadastro, validarLogin } from '@/dominio/credenciais';

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
