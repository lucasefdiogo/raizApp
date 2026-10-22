# TODO

Pendências abertas do projeto que não pertencem a uma feature específica.
Histórico das HUs antigas (formato lux kit, abandonado): `docs/historico/`.

## Teste manual em aparelho

- [ ] **Aviso de bloqueio desligado** (origem: `docs/historico/HU-03/progress.md`), com APK
      release standalone:
  - [ ] disparo do alarme com o aparelho em Doze
  - [ ] reagendamento após reboot
  - [ ] notificação real exibida
  - [ ] toque na notificação com o app em primeiro plano, em segundo plano e fechado
  - [ ] comportamento sem a permissão `POST_NOTIFICATIONS`

## Documentação

- [ ] `definition/navegacao-componentes.md`: incluir `RotinaConfirmacao` e
      `AlternativaNoturna` na árvore do `HojeStack` e a rota `RotinaPerfil` no
      `PerfilStack` (já existem em `src/navigation/HojeStack.tsx` e `PerfilStack.tsx`).
      Origem: `docs/historico/HU-06/progress.md`.

## Ambiente local

- [ ] Acrescentar `.bash_profile` ao `.git/info/exclude` (nó `/dev/null` criado pelo
      sandbox; faz a checagem de árvore limpa falhar). Origem:
      `docs/historico/HU-02/progress.md`.
