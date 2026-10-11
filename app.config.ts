import type { ConfigContext, ExpoConfig } from 'expo/config';

// Estende o app.json. O `projectId` do EAS (necessário ao push, Etapa 8) vem do ambiente para não ficar no
// repositório: `EAS_PROJECT_ID=<uuid>` no `.env` (o Expo CLI o carrega). Sem ele o app roda normalmente e o Perfil
// explica que o push depende do projeto.
export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId = process.env.EAS_PROJECT_ID?.trim();
  return {
    ...config,
    name: config.name ?? 'InsightFlow',
    slug: config.slug ?? 'insight-flow-mobile',
    extra: {
      ...config.extra,
      ...(projectId ? { eas: { ...config.extra?.eas, projectId } } : {}),
    },
  };
};
