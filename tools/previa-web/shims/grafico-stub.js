// Prévia web: o Skia precisa de CanvasKit (WASM); os gráficos só podem ser vistos no aparelho.
const React = require('react');
const { Text, View } = require('react-native');

function Stub() {
  return React.createElement(
    View,
    { testID: 'grafico-stub', style: { padding: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#7683a0', borderRadius: 8 } },
    React.createElement(Text, { style: { color: '#a7b3c9' } }, '[prévia web] gráfico desenhado com Skia: só no aparelho'),
  );
}

module.exports = { GraficoCandles: Stub, GraficoIndicador: Stub, GraficoDistribuicao: Stub };
