import { ApiError } from '@/api/client';
import { mensagemDeErro } from '@/utils/erros';

it('"data nao pode ser futura" do backend aparece em português', () => {
  expect(mensagemDeErro(new ApiError(422, 'data nao pode ser futura'))).toBe('A data da operação não pode ser futura');
});
