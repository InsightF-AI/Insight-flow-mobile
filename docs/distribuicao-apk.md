# Distribuir o app como APK (sem Play Store nem App Store)

O app é distribuído por um **link de download do APK** gerado no EAS Build (nuvem da Expo, plano gratuito). Quem tem o link baixa e instala direto no Android. **iPhone fica de fora**: instalar fora da App Store exige a conta paga da Apple (US$ 99 por ano); no iPhone só roda pelo Expo Go, com o PC ligado.

## Quem faz o quê

| Parte | Responsável | Por quê |
| --- | --- | --- |
| Conta Expo, `eas init`, rodar a build e compartilhar o link | **Bruno** (mobile) | A build sai da conta Expo de quem a roda. Nada disso mexe no servidor |
| **URL pública do backend com HTTPS** | **Vinicius / Gustavo** (backend e servidor) | O APK leva a URL da API gravada na build. IP de rede local só funciona na rede de quem gerou |
| Chave do Firebase (FCM) para push com o app fechado | A definir (dono do projeto Firebase) | Pendência da Etapa 8B; sem ela o APK funciona e o Perfil informa que o push está indisponível |

Ou seja: o Bruno consegue gerar o APK sozinho, mas só terá um app que funciona fora da sua máquina quando o Vinicius ou o Gustavo informarem a URL do backend publicado. O `cd.yml` do backend já tem o deploy de produção por tag `v*.*.*`; falta confirmar com eles se está no ar e qual é o endereço.

## Passo a passo

1. Crie uma conta gratuita em <https://expo.dev> e entre: `npx eas-cli login`.
2. Dentro de `Insight-flow-mobile`, vincule o projeto: `npx eas-cli init`. Ele mostra o `projectId`; coloque em `EAS_PROJECT_ID` no `.env` (o arquivo não vai para o git; ver `app.config.ts`).
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

## Cuidados

- O link é público para quem o tiver. Não coloque chaves no app: tudo que começa com `EXPO_PUBLIC_` vai dentro do APK e pode ser lido.
- Trocou a URL do backend? É preciso **gerar outro APK**.
- A cada build o EAS pode pedir para criar a chave de assinatura Android; aceite (fica guardada na conta Expo e mantém as atualizações instaláveis por cima).
- Para o push com o app fechado, além da chave FCM é preciso configurar `google-services.json` no projeto (Etapa 8B, ver [`PLANO.md`](PLANO.md)).
- HTTP puro (sem HTTPS) é bloqueado pelo Android em builds de release: o backend precisa responder em HTTPS.

## Estado

- 29/10/2026: primeiro APK gerado na conta Expo `brngstzz` (projeto `@brngstzz/insight-flow-mobile`), apontando para a produção `https://api-insight.agilesoftware.net.br` (endereço do `cd.yml` do backend; homologação em `https://hom-api-insight.agilesoftware.net.br`). O link fica em expo.dev → projeto → Builds.
- O `app.json` ganhou `owner`, `extra.eas.projectId` (o `.env` não vai para a build na nuvem) e `android.package` (`br.com.insightflow.mobile`).
- A primeira build falhou com `resource drawable/splashscreen_logo not found`: o plugin `expo-splash-screen` precisa de `image`. O Expo Go não acusa isso, só a build nativa.
- Push com o app fechado continua pendente (FCM).
