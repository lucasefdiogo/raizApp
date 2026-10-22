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
