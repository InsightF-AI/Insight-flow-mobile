# Guia de Contribuição: InsightFlow Mobile

Este repositório segue o fluxo da organização InsightF-AI, descrito no
[`CONTRIBUTING.md` do backend](https://github.com/InsightF-AI/Insight-flow-backend/blob/develop/CONTRIBUTING.md).
Abaixo está o que vale aqui, com o que é específico do app.

## Modelo de branches (Git Flow)

| Branch | Papel |
| --- | --- |
| `main` | Código estável. Cada merge gera uma versão |
| `develop` | Integração das próximas funcionalidades |
| `feature/*` | Novas funcionalidades. Nascem de `develop` e voltam a ela por Pull Request |
| `release/*` | Preparação de uma versão |
| `hotfix/*` | Correções urgentes em produção. Nascem de `main` |

```bash
git checkout develop && git pull origin develop
git checkout -b feature/nome-curto
# ... desenvolve, commita ...
git push -u origin feature/nome-curto
# abre o Pull Request: feature/nome-curto -> develop
```

## Padrão de commits (Conventional Commits)

`feat:`, `fix:`, `docs:`, `refactor:`, `test:` e `chore:`, com escopo opcional, em português e no imperativo ou na
forma descritiva já usada no histórico:

```
fix(operacao): chips de ticker não esticam na vertical em formulário curto
feat: Etapa 7: análise por IA e chat
docs: roteiro de teste no aparelho
chore(deps): atualiza expo e expo-router para os patches do SDK 57
```

## Antes de abrir o Pull Request

1. `npm run verificar` verde (lint, typecheck e testes: o mesmo do CI).
2. Todo comportamento novo ou corrigido nasce de um **teste que falhou antes** (veja `__tests__/telas/` para telas e
   `src/**/*.test.ts(x)` ao lado do código).
3. Nada de segredo: `.env`, chaves e tokens não entram no repositório (use o `.env.example` só com nomes de variáveis).
4. No corpo do PR: o que muda, o resultado do `npm run verificar` e **o que não foi testado em aparelho**.
5. Documentação junto da mudança: README, `docs/checkpoint-02.md` e o plano da etapa em `docs/superpowers/plans/`.

## Regras do produto (valem para qualquer tela)

- **Sem recomendação.** Nenhum botão ou texto manda "comprar" ou "vender". "Compra" e "Venda" aparecem só como o tipo da
  operação simulada que o usuário registra. A linguagem é informativa e factual; verde e vermelho indicam só valor
  positivo ou negativo.
- **Aviso legal em todo texto de IA:** "Análise gerada por IA. Não constitui recomendação de investimento." (em resumo,
  análise, chat e no texto copiado).
- **Carteira simulada:** nenhuma ordem real é enviada.
- Mensagens e rótulos em português do Brasil; valores ausentes nunca viram zero (use "—" ou "indisponível").

## Regras de Pull Request

1. Todo merge em `main` e `develop` passa por Pull Request.
2. O PR só pode ser mesclado com o CI verde (lint, typecheck e testes).
3. É necessária a aprovação de ao menos 1 revisor.
4. Alterações em áreas com dono no `CODEOWNERS` exigem a aprovação do dono.

## Pull Requests empilhados (como o histórico atual foi publicado)

O trabalho do app saiu em PRs pequenos, cada um sobre o anterior (#1 a #11; o mapa está em
[`docs/README.md`](docs/README.md#mapa-dos-pull-requests)). Esses entraram na `develop` de uma vez, pelo PR do topo da
pilha (#11). Para uma pilha nova, o caminho de baixo para cima é:

1. Mesclar o PR da base da pilha (o #1, que aponta para `develop`) com **merge commit** (não use squash: os PRs de cima
   dependem dos commits de baixo).
2. Conferir que o PR seguinte passou a apontar para `develop`. O GitHub faz isso sozinho quando a branch mesclada é
   apagada; se não fizer, **Edit** no PR e trocar a base para `develop`.
3. Repetir até o último. Se algum PR mostrar conflito, atualizar a branch com `develop` e rodar `npm run verificar` de novo.

## Como rodar e testar

Passo a passo em [`README.md`](README.md#como-rodar) e em [`docs/PLANO.md` §9](docs/PLANO.md#9-como-testar-no-celular-ou-no-emulador).
Ferramentas de apoio (IA falsa, conferência do backend e prévia web) estão em [`tools/`](tools/README.md).
