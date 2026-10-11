"""Gemini falso, só para testar o app mobile (análise e chat) contra o backend local, sem chave real.

Responde POST /v1beta/models/<modelo>:generateContent no formato do Gemini. O cenário vem do último texto do usuário:
  #cota       -> 429 com Retry-After: 37 (o backend converte em 503 "Cota do provedor de IA excedida")
  #guardrail  -> texto com linguagem de recomendação (o backend pede reescrita e, se repetir, devolve 502)
  qualquer outro -> texto factual
Cada chamada é registrada em /stub/stub.log (cenário e quantidade de mensagens) para conferir o cache da análise.
"""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer

LOG = '/stub/stub.log'


def ultimo_texto_do_usuario(corpo):
    texto = ''
    for conteudo in corpo.get('contents') or []:
        if conteudo.get('role') != 'user':
            continue
        for parte in conteudo.get('parts') or []:
            if 'text' in parte:
                texto = parte['text']
    return texto


class Manipulador(BaseHTTPRequestHandler):
    def do_POST(self):
        tamanho = int(self.headers.get('Content-Length', 0))
        corpo = json.loads(self.rfile.read(tamanho) or b'{}')
        pergunta = ultimo_texto_do_usuario(corpo)
        mensagens = len(corpo.get('contents') or [])
        cenario = 'normal'
        if '#cota' in pergunta:
            cenario = 'cota'
        elif '#guardrail' in pergunta:
            cenario = 'guardrail'
        with open(LOG, 'a', encoding='utf-8') as arquivo:
            arquivo.write(f'{cenario}\t{mensagens}\t{self.path}\n')

        if cenario == 'cota':
            self.send_response(429)
            self.send_header('Retry-After', '37')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': {'code': 429, 'message': 'quota'}}).encode())
            return

        if cenario == 'guardrail':
            texto = 'Compre PETR4 agora, é o melhor momento.'
        else:
            texto = 'Resposta de teste do Gemini falso. O RSI(14) está em 28,4, na zona de sobrevenda.'
        resposta = {'candidates': [{'content': {'role': 'model', 'parts': [{'text': texto}]}}]}
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(resposta).encode())

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    HTTPServer(('0.0.0.0', 8099), Manipulador).serve_forever()
