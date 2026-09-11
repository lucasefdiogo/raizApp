import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AppBlockStatusCard } from './AppBlockStatusCard';

const APPS = [
  { nome: 'Instagram', icone: 'data:image/png;base64,QQ==' },
  { nome: 'WhatsApp', icone: null },
];

describe('AppBlockStatusCard', () => {
  it('ativo e ativoAgora true: mostra o indicador "ativo até" e o texto de reforço', async () => {
    await render(
      <AppBlockStatusCard
        apps={APPS}
        ativo={true}
        ativoAgora={true}
        horarioInicio="09:00"
        horarioFim="18:00"
      />,
    );

    expect(screen.getByText('ativo até 18:00')).toBeTruthy();
    expect(
      screen.getByText(
        'Se sua tarefa essencial já estiver concluída, o desbloqueio é imediato ao abrir um desses apps.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Bloqueio começa às 09:00')).toBeNull();
    expect(screen.queryByText('Bloqueio desativado')).toBeNull();
  });

  it('ativo true e ativoAgora false: mostra texto neutro "começa às", sem afirmar ativo e sem o reforço', async () => {
    await render(
      <AppBlockStatusCard
        apps={APPS}
        ativo={true}
        ativoAgora={false}
        horarioInicio="09:00"
        horarioFim="18:00"
      />,
    );

    expect(screen.getByText('Bloqueio começa às 09:00')).toBeTruthy();
    expect(screen.queryByText('ativo até 18:00')).toBeNull();
    expect(screen.queryByText('Bloqueio desativado')).toBeNull();
    expect(
      screen.queryByText(
        'Se sua tarefa essencial já estiver concluída, o desbloqueio é imediato ao abrir um desses apps.',
      ),
    ).toBeNull();
  });

  it('ativo false (toggle geral desligado): mostra "Bloqueio desativado", mesmo com apps selecionados e horário salvo', async () => {
    await render(
      <AppBlockStatusCard
        apps={APPS}
        ativo={false}
        ativoAgora={false}
        horarioInicio="09:00"
        horarioFim="18:00"
      />,
    );

    expect(screen.getByText('Bloqueio desativado')).toBeTruthy();
    // Não pode dizer "começa às" nem "ativo até" — o toggle geral está
    // desligado, não vai começar sozinho em hora nenhuma.
    expect(screen.queryByText('Bloqueio começa às 09:00')).toBeNull();
    expect(screen.queryByText('ativo até 18:00')).toBeNull();
  });

  it('renderiza um chip por app recebido', async () => {
    await render(
      <AppBlockStatusCard
        apps={APPS}
        ativo={true}
        ativoAgora={false}
        horarioInicio="09:00"
        horarioFim="18:00"
      />,
    );

    expect(screen.getByText('Instagram')).toBeTruthy();
    expect(screen.getByText('WhatsApp')).toBeTruthy();
  });

  it('sem apps: não quebra, só não renderiza nenhum chip', async () => {
    await render(
      <AppBlockStatusCard
        apps={[]}
        ativo={true}
        ativoAgora={false}
        horarioInicio="09:00"
        horarioFim="18:00"
      />,
    );

    expect(screen.getByTestId('app-block-status-card')).toBeTruthy();
  });
});
