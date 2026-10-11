// Prévia web: Alert.alert do react-native-web não faz nada. Aqui vira window.confirm/alert.
const { Alert, Platform } = require('react-native');

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (titulo, mensagem, botoes) => {
    const texto = [titulo, mensagem].filter(Boolean).join('\n\n');
    const lista = botoes ?? [];
    const cancelar = lista.find((botao) => botao.style === 'cancel');
    const confirmar = lista.find((botao) => botao.style !== 'cancel');
    if (!confirmar) {
      window.alert(texto);
      if (cancelar && cancelar.onPress) cancelar.onPress();
      return;
    }
    if (window.confirm(texto)) {
      if (confirmar.onPress) confirmar.onPress();
    } else if (cancelar && cancelar.onPress) {
      cancelar.onPress();
    }
  };
}
