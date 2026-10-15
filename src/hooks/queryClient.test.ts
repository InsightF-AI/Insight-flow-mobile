import { ApiError } from '@/api/client';
import { deveRepetir } from '@/hooks/queryClient';

it.each([
  ['sem conexão, 1ª falha', 0, new ApiError(0, 'x'), true],
  ['503, 2ª falha', 1, new ApiError(503, 'x'), true],
  ['503, 3ª falha', 2, new ApiError(503, 'x'), false],
  ['404', 0, new ApiError(404, 'x'), false],
  ['401', 0, new ApiError(401, 'x'), false],
  ['422', 0, new ApiError(422, 'x'), false],
  ['erro que não é da API', 0, new Error('x'), false],
])('%s → %p', (_caso, falhas, erro, esperado) => {
  expect(deveRepetir(falhas as number, erro)).toBe(esperado);
});
