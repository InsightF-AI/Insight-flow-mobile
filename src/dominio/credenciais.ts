export type ErrosCredenciais = Partial<Record<'nome' | 'email' | 'senha', string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mesmos limites do CadastroRequest do backend.
const SENHA_MINIMA = 8;
const SENHA_MAXIMA = 128;
const NOME_MAXIMO = 255;

function validarEmail(email: string, erros: ErrosCredenciais): void {
  if (!EMAIL.test(email.trim())) erros.email = 'Informe um e-mail válido';
}

export function validarLogin({ email, senha }: { email: string; senha: string }): ErrosCredenciais {
  const erros: ErrosCredenciais = {};
  validarEmail(email, erros);
  if (!senha) erros.senha = 'Informe a senha';
  return erros;
}

export function validarCadastro({ nome, email, senha }: { nome: string; email: string; senha: string }): ErrosCredenciais {
  const erros: ErrosCredenciais = {};
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) erros.nome = 'Informe seu nome';
  else if (nomeLimpo.length > NOME_MAXIMO) erros.nome = 'Use no máximo 255 caracteres';
  validarEmail(email, erros);
  if (senha.length < SENHA_MINIMA) erros.senha = 'A senha precisa ter pelo menos 8 caracteres';
  else if (senha.length > SENHA_MAXIMA) erros.senha = 'Use no máximo 128 caracteres';
  return erros;
}
