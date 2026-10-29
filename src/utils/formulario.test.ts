import { focarPrimeiroComErro } from '@/utils/formulario';

function campoFalso() {
  return { current: { focus: jest.fn() } };
}

test('foca o primeiro campo com erro, na ordem da tela', () => {
  const email = campoFalso();
  const senha = campoFalso();
  focarPrimeiroComErro({ senha: 'Informe a senha', email: 'E-mail inválido' }, [
    ['email', email],
    ['senha', senha],
  ]);
  expect(email.current.focus).toHaveBeenCalledTimes(1);
  expect(senha.current.focus).not.toHaveBeenCalled();
});

test('ignora chave sem mensagem e não faz nada sem erros', () => {
  const email = campoFalso();
  const senha = campoFalso();
  focarPrimeiroComErro({ email: undefined, senha: 'Informe a senha' }, [
    ['email', email],
    ['senha', senha],
  ]);
  expect(senha.current.focus).toHaveBeenCalledTimes(1);

  focarPrimeiroComErro({}, [['email', email]]);
  expect(email.current.focus).not.toHaveBeenCalled();
});

test('campo ainda não montado (ref nula) não quebra', () => {
  expect(() => focarPrimeiroComErro({ email: 'x' }, [['email', { current: null }]])).not.toThrow();
});
