import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ValvulaRow } from './ValvulaRow';
import { Valvula } from '../../domain/valvulas';
import { theme } from '../../theme';

const DISPONIVEL: Valvula = {
  tipo: 'acesso_rapido',
  titulo: 'Acesso rápido',
  descricao: '2 minutos, depois de 5s',
  meta: '2 DE 3 HOJE',
  disponivel: true,
};

const INDISPONIVEL: Valvula = {
  tipo: 'acesso_rapido',
  titulo: 'Acesso rápido',
  descricao: 'Próximo disponível em 8 min',
  meta: 'EM 8 MIN',
  disponivel: false,
};

describe('HU-11 RN02 · ValvulaRow', () => {
  it('mostra título, descrição e meta; toca chama onPress', async () => {
    const onPress = jest.fn();
    await render(<ValvulaRow valvula={DISPONIVEL} onPress={onPress} />);

    expect(screen.getByText('Acesso rápido')).toBeTruthy();
    expect(screen.getByText('2 minutos, depois de 5s')).toBeTruthy();
    expect(screen.getByText('2 DE 3 HOJE')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: /Acesso rápido/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('Cenário 13: indisponível não é tocável e usa cor esmaecida (Terra Suave), nunca Cobre', async () => {
    const onPress = jest.fn();
    await render(<ValvulaRow valvula={INDISPONIVEL} onPress={onPress} />);

    expect(screen.getByText('Próximo disponível em 8 min')).toBeTruthy();
    expect(screen.getByText('EM 8 MIN')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();

    const titulo = screen.getByText('Acesso rápido');
    const { StyleSheet } = require('react-native');
    const estilo = StyleSheet.flatten(titulo.props.style);
    expect(estilo.color).toBe(theme.colors.terraSuave);
    expect(estilo.color).not.toBe(theme.colors.cobre);
  });

  it('RN11: sem meta (tarefas extras sem pendentes) não mostra nada no lugar da meta', async () => {
    const semMeta: Valvula = {
      tipo: 'tarefas_extras',
      titulo: 'Tarefas extras',
      descricao: 'Concluir uma devolve uma sessão',
      meta: '',
      disponivel: true,
    };
    await render(<ValvulaRow valvula={semMeta} onPress={jest.fn()} />);

    expect(screen.getByText('Tarefas extras')).toBeTruthy();
    expect(screen.queryByTestId('valvula-meta')).toBeNull();
  });
});
