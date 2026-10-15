import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { Icone, type NomeIcone } from '@/components/Icone';
import { Texto } from '@/components/Texto';
import { espaco, fonte, raio } from '@/theme/escala';
import { familia } from '@/theme/familias';
import { useTema } from '@/theme/useTema';

type PropsRepassadas = Pick<
  TextInputProps,
  'placeholder' | 'secureTextEntry' | 'keyboardType' | 'autoCapitalize' | 'autoComplete' | 'editable'
>;

interface Props extends PropsRepassadas {
  rotulo: string;
  valor: string;
  aoMudar: (texto: string) => void;
  erro?: string;
  /** Ícone à esquerda (padrão `field-icon` do web); fica azul no foco. */
  icone?: NomeIcone;
  /** Botão de olho para mostrar/ocultar a senha (só com `secureTextEntry`). */
  alternarSenha?: boolean;
}

export function Campo({ rotulo, valor, aoMudar, erro, icone, alternarSenha = false, secureTextEntry, ...resto }: Props) {
  const { cores, sombras } = useTema();
  const [focado, setFocado] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const comOlho = Boolean(secureTextEntry) && alternarSenha;
  const ocultar = Boolean(secureTextEntry) && !(comOlho && senhaVisivel);
  const corDaBorda = erro ? cores.negativo : focado ? cores.primaria : cores.bordaForte;

  return (
    <View style={estilos.container}>
      <Texto variante="rotulo" cor="secundario">
        {rotulo}
      </Texto>
      <View
        testID="campo-moldura"
        style={[
          estilos.moldura,
          {
            backgroundColor: cores.superficieElevada,
            borderColor: corDaBorda,
            boxShadow: focado ? sombras.foco : undefined,
          },
        ]}
      >
        {icone ? <Icone nome={icone} tamanho={17} cor={focado ? 'primaria' : 'textoTerciario'} /> : null}
        <TextInput
          aria-label={rotulo}
          value={valor}
          onChangeText={aoMudar}
          placeholderTextColor={cores.textoTerciario}
          secureTextEntry={ocultar}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          style={[estilos.entrada, { color: cores.texto, fontFamily: familia.corpo }]}
          {...resto}
        />
        {comOlho ? (
          <Pressable
            role="button"
            aria-label={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={senhaVisivel}
            onPress={() => setSenhaVisivel((visivel) => !visivel)}
            style={estilos.olho}
          >
            <Icone nome={senhaVisivel ? 'olho-fechado' : 'olho'} tamanho={18} cor="textoTerciario" />
          </Pressable>
        ) : null}
      </View>
      {erro ? (
        <Texto variante="legenda" cor="negativo">
          {erro}
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { gap: espaco.xs },
  moldura: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    borderWidth: 1,
    borderRadius: raio.sm,
    paddingHorizontal: espaco.md,
  },
  entrada: { flex: 1, minHeight: 46, fontSize: fonte.corpo },
  olho: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: -espaco.sm },
});
