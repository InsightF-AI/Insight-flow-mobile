# Distribuir o app como APK (sem Play Store nem App Store)

O app é distribuído por um **link de download do APK** gerado no EAS Build (nuvem da Expo, plano gratuito). Quem tem o link baixa e instala direto no Android. **iPhone fica de fora**: instalar fora da App Store exige a conta paga da Apple (US$ 99 por ano); no iPhone só roda pelo Expo Go, com o PC ligado.

## Quem faz o quê

| Parte | Responsável | Por quê |
| --- | --- | --- |
| Conta Expo, `eas init`, rodar a build e compartilhar o link | **Bruno** (mobile) | A build sai da conta Expo de quem a roda. Nada disso mexe no servidor |
| **URL pública do backend com HTTPS** | **Vinicius / Gustavo** (backend e servidor) | O APK leva a URL da API gravada na build. IP de rede local só funciona na rede de quem gerou |
| Chave do Firebase (FCM) para push com o app fechado | A definir (dono do projeto Firebase) | Pendência da Etapa 8B; sem ela o APK funciona e o Perfil informa que o push está indisponível |

O backend publicado está no `cd.yml` do backend: produção em `https://api-insight.agilesoftware.net.br` (deploy por tag `v*.*.*`) e homologação em `https://hom-api-insight.agilesoftware.net.br`. Os APKs apontam para a produção.

## Passo a passo

1. Crie uma conta gratuita em <https://expo.dev> e entre: `npx eas-cli login`.
2. O projeto já está vinculado (`extra.eas.projectId` e `owner` no `app.json`, conta `brngstzz`). Numa conta Expo nova, rode `npx eas-cli init` e troque esses dois campos (e `updates.url`) pelos do projeto novo. O `.env` não vai para a build na nuvem, por isso o `projectId` fica no `app.json`; não é segredo.
3. Cadastre a URL do backend como variável do EAS (só a raiz, sem `/api/v1`), no ambiente `preview`:
   ```
   npx eas-cli env:create --name EXPO_PUBLIC_API_URL --value https://<endereco-do-backend> --environment preview --visibility plaintext
   ```
   Variáveis do seu terminal **não** vão para a build na nuvem; por isso este passo. A URL fica gravada no APK.
4. Gere o APK (usa o perfil `preview` de `eas.json`, que pede `apk` em vez de `aab`):
   ```
   npx eas-cli build --platform android --profile preview
   ```
   Leva de 10 a 20 minutos. No fim o terminal mostra um **link** (`expo.dev/artifacts/...`) e um QR code. O mesmo link fica em <https://expo.dev> → projeto → Builds.
5. Compartilhe o link. Quem instalar precisa permitir "instalar apps desconhecidos" para o navegador ou gerenciador de arquivos.

## Atualizações automáticas (EAS Update)

Quem já instalou o APK recebe as mudanças de código **sem baixar outro APK**. Publicar uma atualização leva 1 a 2 minutos, contra 10 a 20 de uma build.

### Como o app se atualiza

1. **Ao abrir**, o app pergunta ao servidor da Expo se há versão nova para o canal dele (`preview`) e espera **até 3 s** por ela (`updates.fallbackToCacheTimeout` no `app.json`). Se baixar nesse tempo, já abre na versão nova. Se a rede estiver lenta, abre a versão que tem e termina o download em segundo plano.
2. **Com o app aberto**, a volta do segundo plano procura versão nova de novo, no máximo a cada 15 min (`src/hooks/useAtualizacaoDoApp.ts`).
3. Quando uma versão nova termina de baixar, o app pergunta **"Nova versão disponível"**: "Reiniciar agora" aplica na hora; "Depois" deixa para a próxima abertura. O app não reinicia sem perguntar para não apagar um formulário pela metade.
4. O rodapé do **Perfil** mostra a versão em uso: "Versão 0.1.0 (a que veio com o app instalado)" ou "Versão 0.1.0 · atualização de 29/10/2026 14:05". É o jeito de conferir se a atualização chegou.

No Expo Go e no `npx expo start` nada disso roda (o `expo-updates` fica desligado em desenvolvimento).

### Publicar uma atualização

Depois de mesclar a mudança na branch que os APKs devem receber:

```
npx eas-cli update --channel preview --environment preview --message "o que mudou"
```

- `--environment preview` leva o `EXPO_PUBLIC_API_URL` do EAS para o bundle (sem ele a atualização apontaria para `localhost`).
- Para conferir: abrir o app, fechar por completo e abrir de novo (ou aceitar o "Reiniciar agora"), e ver a data no rodapé do Perfil.
- Para desfazer: `npx eas-cli update:republish --group <id do grupo anterior>` publica de novo a versão anterior (os ids estão em `npx eas-cli update:list`). `npx eas-cli update:roll-back-to-embedded --channel preview` volta todos para o código que veio no APK.

### O que exige APK novo

O EAS Update só leva **JavaScript/TypeScript e imagens usadas pelo código**. Exige APK novo (e trocar a versão, abaixo):

- ícone, nome, splash, permissões ou pacote Android (`app.json`);
- biblioteca nova com código nativo (`npx expo install` de algo que não é só JS) ou plugin novo no `app.json`;
- atualização do Expo SDK.

Trocar o `EXPO_PUBLIC_API_URL` **não** exige APK: ele entra no bundle, então vai junto numa atualização publicada com `--environment preview`.

A `runtimeVersion` segue a **versão do app** (`"runtimeVersion": { "policy": "appVersion" }`, hoje `0.1.0`). Uma atualização só chega aos APKs da mesma versão. Por isso, a cada mudança nativa: suba `version` no `app.json` (por exemplo para `0.2.0`), gere o APK novo e distribua o link. Os APKs antigos continuam na versão deles e não recebem atualizações feitas para a nova, o que evita abrir um bundle que depende de código nativo que eles não têm.

### Limites

O EAS Update funciona no plano gratuito da Expo, com limite de usuários ativos por mês e de banda (ver <https://expo.dev/pricing>). Para o uso da disciplina sobra; se o app passar a ter muitos usuários, rever.

## Cuidados

- O link é público para quem o tiver. Não coloque chaves no app: tudo que começa com `EXPO_PUBLIC_` vai dentro do APK e pode ser lido.
- Trocou a URL do backend? Atualize a variável do EAS (`npx eas-cli env:update`) e publique uma atualização com `--environment preview`; APK novo só se quiser que instalações novas já venham com ela.
- A cada build o EAS pode pedir para criar a chave de assinatura Android; aceite (fica guardada na conta Expo e mantém as atualizações instaláveis por cima).
- Para o push com o app fechado, além da chave FCM é preciso configurar `google-services.json` no projeto (Etapa 8B, ver [`PLANO.md`](PLANO.md)).
- HTTP puro (sem HTTPS) é bloqueado pelo Android em builds de release: o backend precisa responder em HTTPS.

## Estado

- 29/10/2026: primeiro APK gerado na conta Expo `brngstzz` (projeto `@brngstzz/insight-flow-mobile`), apontando para a produção `https://api-insight.agilesoftware.net.br` (endereço do `cd.yml` do backend; homologação em `https://hom-api-insight.agilesoftware.net.br`). O link fica em expo.dev → projeto → Builds.
- O `app.json` ganhou `owner`, `extra.eas.projectId` (o `.env` não vai para a build na nuvem) e `android.package` (`br.com.insightflow.mobile`).
- A primeira build falhou com `resource drawable/splashscreen_logo not found`: o plugin `expo-splash-screen` precisa de `image`. O Expo Go não acusa isso, só a build nativa.
- Push com o app fechado continua pendente (FCM).
- 29/10/2026: EAS Update configurado (`expo-updates`, canal `preview`, `runtimeVersion` pela versão do app). **Só os APKs gerados a partir daqui recebem atualizações**; quem instalou um APK anterior precisa baixar o novo uma última vez.
