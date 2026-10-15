import type { ConfigContext } from 'expo/config';

import configurar from '../app.config';

const base = {
  name: 'InsightFlow',
  slug: 'insight-flow-mobile',
  extra: { outro: 'valor' },
} as ConfigContext['config'];

const original = process.env.EAS_PROJECT_ID;

afterEach(() => {
  if (original === undefined) delete process.env.EAS_PROJECT_ID;
  else process.env.EAS_PROJECT_ID = original;
});

it('sem EAS_PROJECT_ID mantém a configuração do app.json como está', () => {
  delete process.env.EAS_PROJECT_ID;
  const config = configurar({ config: base } as ConfigContext);
  expect(config.name).toBe('InsightFlow');
  expect(config.extra).toEqual({ outro: 'valor' });
});

it('com EAS_PROJECT_ID injeta o projectId do EAS sem perder o resto de extra', () => {
  process.env.EAS_PROJECT_ID = ' 11111111-2222-3333-4444-555555555555 ';
  const config = configurar({ config: base } as ConfigContext);
  expect(config.extra).toEqual({
    outro: 'valor',
    eas: { projectId: '11111111-2222-3333-4444-555555555555' },
  });
});
