// Fixa o fuso dos testes: as regras de data (DataISO local vs. UTC) dependem dele.
module.exports = async () => {
  process.env.TZ = 'America/Sao_Paulo';
};
