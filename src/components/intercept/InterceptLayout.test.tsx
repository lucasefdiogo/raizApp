import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { InterceptLayout } from './InterceptLayout';
import { Valvula } from '../../domain/valvulas';

const VALVULA: Valvula = {
  tipo: 'sessao_foco',
  titulo: 'Sessão de foco',
  descricao: '5 minutos, sem tarefa',
  meta: '5 MIN',
  disponivel: true,
};

describe('HU-11 RN01 · InterceptLayout', () => {
  it('Cenário 1: esqueleto comum — chip, eyebrow, headline e "Sair"', async () => {
    const onVoltarAoInicio = jest.fn();
    await render(
      <InterceptLayout
        appIconeBase64="abc"
        appNome="Instagram"
        eyebrow="PAUSA ENTRE SESSÕES"
        headline="32 min"
        onVoltarAoInicio={onVoltarAoInicio}
      >
        <Text>Conteúdo do estado</Text>
      </InterceptLayout>,
    );

    expect(screen.getByText('Instagram')).toBeTruthy();
    expect(screen.getByText('PAUSA ENTRE SESSÕES')).toBeTruthy();
    expect(screen.getByText('32 min')).toBeTruthy();
    expect(screen.getByText('Conteúdo do estado')).toBeTruthy();

    await fireEvent.press(screen.getByText('Sair'));
    expect(onVoltarAoInicio).toHaveBeenCalledTimes(1);
  });

  it('mostra a ação principal quando fornecida', async () => {
    await render(
      <InterceptLayout
        appIconeBase64="abc"
        appNome="Instagram"
        eyebrow="1ª SESSÃO HOJE"
        headline="O que você vai fazer agora?"
        onVoltarAoInicio={jest.fn()}
        acaoPrincipal={<Text>Liberar em 10s</Text>}
      />,
    );

    expect(screen.getByText('Liberar em 10s')).toBeTruthy();
  });

  it('Cenário 10: mostra "OUTRAS SAÍDAS" com as válvulas, e tocar chama onValvula com o tipo', async () => {
    const onValvula = jest.fn();
    await render(
      <InterceptLayout
        appIconeBase64="abc"
        appNome="Instagram"
        eyebrow="PAUSA ENTRE SESSÕES"
        headline="32 min"
        onVoltarAoInicio={jest.fn()}
        valvulas={[VALVULA]}
        onValvula={onValvula}
      />,
    );

    expect(screen.getByText('OUTRAS SAÍDAS')).toBeTruthy();
    expect(screen.getByText('Sessão de foco')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: /Sessão de foco/ }));
    expect(onValvula).toHaveBeenCalledWith('sessao_foco');
  });

  it('sem válvulas, não mostra o bloco "OUTRAS SAÍDAS"', async () => {
    await render(
      <InterceptLayout
        appIconeBase64="abc"
        appNome="Instagram"
        eyebrow="1ª SESSÃO HOJE"
        headline="O que você vai fazer agora?"
        onVoltarAoInicio={jest.fn()}
      />,
    );

    expect(screen.queryByText('OUTRAS SAÍDAS')).toBeNull();
  });

  it('RN12: sem onVoltarAoInicio, não mostra o link (emergência não pode ser pulada)', async () => {
    await render(
      <InterceptLayout
        appIconeBase64="abc"
        appNome="Instagram"
        eyebrow="SAÍDA DE EMERGÊNCIA"
        headline="Respire um instante"
      />,
    );

    expect(screen.queryByText('Sair')).toBeNull();
  });

  it('headline itálico (frase noturna) aplica o estilo sem mudar o texto', async () => {
    await render(
      <InterceptLayout
        appIconeBase64="abc"
        appNome="Instagram"
        eyebrow="JANELA NOTURNA · 3ª SESSÃO"
        headline="O feed vai estar do mesmo jeito de manhã."
        headlineItalico
        onVoltarAoInicio={jest.fn()}
      />,
    );

    const headline = screen.getByText('O feed vai estar do mesmo jeito de manhã.');
    const { StyleSheet } = require('react-native');
    expect(StyleSheet.flatten(headline.props.style).fontStyle).toBe('italic');
  });
});
