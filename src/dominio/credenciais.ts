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

export type ErrosNovaSenha = Partial<Record<'senhaAtual' | 'token' | 'novaSenha' | 'confirmacao', string>>;

function validarNovaSenha(novaSenha: string, confirmacao: string, erros: ErrosNovaSenha): void {
  if (novaSenha.length < SENHA_MINIMA) erros.novaSenha = 'A senha precisa ter pelo menos 8 caracteres';
  else if (novaSenha.length > SENHA_MAXIMA) erros.novaSenha = 'Use no máximo 128 caracteres';
  else if (confirmacao !== novaSenha) erros.confirmacao = 'As senhas não coincidem';
}

export function validarRecuperacao({ email }: { email: string }): ErrosCredenciais {
  const erros: ErrosCredenciais = {};
  validarEmail(email, erros);
  return erros;
}

export function validarRedefinicao(dados: { token: string; novaSenha: string; confirmacao: string }): ErrosNovaSenha {
  const erros: ErrosNovaSenha = {};
  if (!dados.token.trim()) erros.token = 'Cole o código do e-mail';
  validarNovaSenha(dados.novaSenha, dados.confirmacao, erros);
  return erros;
}

export function validarAlteracaoDeSenha(dados: {
  senhaAtual: string;
  novaSenha: string;
  confirmacao: string;
}): ErrosNovaSenha {
  const erros: ErrosNovaSenha = {};
  if (!dados.senhaAtual) erros.senhaAtual = 'Informe a senha atual';
  validarNovaSenha(dados.novaSenha, dados.confirmacao, erros);
  if (!erros.novaSenha && !erros.confirmacao && dados.novaSenha === dados.senhaAtual) {
    erros.novaSenha = 'Escolha uma senha diferente da atual';
  }
  return erros;
}

/**
 * O e-mail de recuperação leva um link `.../redefinir-senha?token=<código>`. No celular o usuário cola o link
 * inteiro ou só o código: devolve sempre o código, sem espaços nem quebras de linha.
 */
export function extrairCodigoDeRedefinicao(texto: string): string {
  const limpo = texto.trim();
  const achado = /[?&]token=([^&#\s]+)/.exec(limpo);
  return (achado ? achado[1] : limpo).replace(/\s+/g, '');
}
