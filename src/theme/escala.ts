export const espaco = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
// sm: botões e campos; lg: cards; xl: card de login (mesmos raios do web: 8/14/20).
export const raio = { sm: 8, lg: 14, xl: 20, pilula: 999 } as const;
export const fonte = { legenda: 12, corpo: 15, secao: 14, subtitulo: 17, titulo: 22, destaque: 28 } as const;
// Em tablet ou paisagem o conteúdo não estica de ponta a ponta: fica centralizado até esta largura.
export const LARGURA_MAXIMA_CONTEUDO = 720;
export const conteudoLimitado = { width: '100%', maxWidth: LARGURA_MAXIMA_CONTEUDO, alignSelf: 'center' } as const;
