# Progress — HU-06
Planejamento: HU pronta, branch feature/HU-06-rotina-noturna

## Proposta de mudança P-01 (HU-06, spec v1)
- **CA afetados:** CA-01, CA-07, CA-08 (e RN-01, RN-02, RN-10); CA-02 e CA-03 dependem da estimativa existir
- **Tipo:** técnico
- **Motivo:** a RN-01 manda estimar "acordar" pelo horário do primeiro uso do dia e "dormir" pelo último uso antes de uma pausa de 3 h, "sobre `dailyLogs/{data}.usoApps` já coletados (HU-02)". Esse dado não tem horário: `UsoApp` em `src/domain/types.ts:62` guarda só `{ segundos, aberturas }` por pacote e dia, e a spec da HU-02 não prevê nenhum timestamp. Os eventos com `ts` (`EventoUso`, `src/domain/usoApps.ts:9`) são agregados por `agregarUsoPorDia` e descartados; nada os persiste. A estimativa da RN-01 não pode ser calculada com o que existe, e o "5 dias de dados" (CA-01, CA-07) fica sem base de contagem de horários.
- **Sugestão de texto:** escolher uma das duas e refletir na spec:
  - (a) Ampliar o escopo da HU-06 para persistir, junto do `usoApps` do dia, `primeiroUsoEm` e `ultimoUsoAntesDePausaEm` (ou a lista de trechos de uso com horário) derivados dos mesmos eventos, mudando a coleta da HU-02 (`agregarUsoPorDia`, `gravarUsoAppsNoDia`, `RootoraUsoAppsModule.kt`, regras do Firestore); a RN-01 passa a ler esses campos. Só vale a partir da data da mudança: os 5 dias contam a partir daí.
  - (b) Abrir uma HU nova de coleta de horários de uso (pré-requisito) e deixar a HU-06 depender dela.
  O "Então" dos CA-01 e CA-07 não muda; só a origem do dado na RN-01 e a seção "Dados e LGPD" (novo dado derivado de horário de uso).
- **Impacto em tasks:** plano não escrito. A parte que não depende da mudança (janela noturna RN-05, dobro da sequência RN-06 com teto de 120 s, banco `noturno` e rotação RN-07, botão da alternativa RN-08, fora da janela RN-09, CA-04, CA-05, CA-06) poderia seguir, mas sem a estimativa nada grava `rotina.*` em produção; recomendo decidir antes de planejar.
- **Estado:** decidida — opção (a), spec v2 importada

Entrega: plano aprovado
Task ativa: TASK-01
TASK-01: horariosUsoPorDia em domain/usoApps.ts (pausa longa de 3h, ISO local sem fuso, ultimoUsoAntesPausaLonga ausente sem pausa); agregarUsoPorDia intacto. Suite verde; um timeout isolado em OnboardingScreen passou ao rodar sozinho.
Task ativa: nenhuma
Task ativa: TASK-02
TASK-02: gravarUsoAppsNoDia aceita horarios opcionais e grava primeiroUsoDia/ultimoUsoAntesPausaLonga como chaves irmas dos pacotes em usoApps; useColetaUsoApps passa horariosUsoPorDia. Leitores futuros de usoApps devem ignorar essas duas chaves. Suite verde (1272).
Task ativa: nenhuma
Task ativa: TASK-03
TASK-03: estimarRotina em domain/rotina.ts (mediana de minutos, minimo 5 dias com os dois campos, null em modoManual, virada da meia-noite); tipo Rotina em types.ts. Suite verde (1276). Construtor escreveu teste e codigo juntos, sem vermelho observado.
Task ativa: nenhuma
Task ativa: TASK-04
TASK-04: users/{uid}.rotina no service (confirmarRotina, salvarAlternativaNoturna, editarHorarioRotinaManual, recalcularRotinaAutomatica) com merge aninhado; schema-firebase.md atualizado. Suite verde (1280).
Task ativa: nenhuma
