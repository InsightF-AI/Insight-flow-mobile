// Prévia web: SecureStore em localStorage. Também carrega o polyfill de Alert.alert (carrega cedo, junto da sessão).
require('./alert-polyfill.js');

const prefixo = 'insightflow-preview:';

module.exports = {
  getItemAsync: async (chave) => {
    try {
      return window.localStorage.getItem(prefixo + chave);
    } catch {
      return null;
    }
  },
  setItemAsync: async (chave, valor) => {
    window.localStorage.setItem(prefixo + chave, valor);
  },
  deleteItemAsync: async (chave) => {
    window.localStorage.removeItem(prefixo + chave);
  },
};
