# Senha e dividendos (backend v0.1.1)

Data: 28/10/2026 · Branch: `feature/senha-e-dividendos` · Backend: `develop` em `2d9850d` (tag `v0.1.1`).

O backend ganhou rotas que o mobile ainda não usava. Esta entrega as liga ao app.

## Rotas usadas

| Método | Rota | Uso no app | Erros tratados |
| --- | --- | --- | --- |
| POST | `/auth/recuperar-senha` | Tela `(auth)/recuperar-senha`, passo 1. Responde `202` mesmo para e-mail desconhecido | rede/5xx |
| POST | `/auth/redefinir-senha` | Mesma tela, passo 2: `{token, nova_senha}` → `204` | `400` "Token de redefinicao invalido" |
| PUT | `/usuarios/me/senha` | Card "Segurança" do Perfil: `{senha_atual, nova_senha}` → `204` | `400` "Senha atual incorreta" |
| GET | `/ativos/{id}/dividendos` | Card "Dividendos" no detalhe do ativo (não consulta cripto nem índice) | `503` fonte de proventos indisponível |
| GET | `/portfolio/dividendos` | Card "Dividendos recebidos" na carteira | `503` idem |

Nova senha: 8 a 128 caracteres (mesmos limites do cadastro).

## Decisões

- **Código do e-mail colado à mão.** O link do e-mail aponta para o web (`RECUPERACAO_SENHA_URL`, `.../redefinir-senha?token=`). O app não abre esse link; a pessoa cola o link inteiro ou só o código, e `extrairCodigoDeRedefinicao` (`src/dominio/credenciais.ts`) tira o `token=`. Deep link fica para quando houver domínio/esquema do app.
- **Trocar a senha encerra a sessão do aparelho.** O backend revoga todos os refresh tokens (`revogar_do_usuario`). O app desregistra o push, avisa e sai sem chamar `/auth/logout` (`sair({ revogarNoServidor: false })`).
- **Recuperação não revela se a conta existe.** O app mostra o mesmo passo 2 para qualquer e-mail válido.
- **Dividendos do ativo:** soma por cota dos últimos 12 meses (`somaDosUltimos12Meses`) e as 8 datas-ex mais recentes. Valores em decimal string, convertidos com `paraNumero`.
- `request` do client passou a aceitar `PUT`.

## Fora do escopo (de propósito)

- **Backtest embutido em `/ativos/{id}/sinais`** (RF-08): o mobile continua com `/sinais/{regra}/backtest`; trocar é só otimização.
- **Notícias e ranking da watchlist** do web: o web usa Google News e cálculo próprio; não há endpoint no backend.
- Edição de perfil (não há rota).

## Verificação

`npm run verificar`: lint, typecheck e 1046 testes (99 suítes) passando. Testes novos: contratos das rotas (`src/api/recursos.test.ts`), validações e extração do código (`credenciais.test.ts`), soma de 12 meses (`proventos.test.ts`) e componentes (`src/components/senhaProventos.test.tsx`).

**Pendente:** teste em aparelho e contra o backend rodando (o e-mail de recuperação só sai com SMTP/Brevo configurado; sem isso o backend registra o link no log).
