# Progress — HU-04

Planejamento: HU pronta, branch feature/HU-04-motor-sessoes
Entrega: plano aprovado
TASK-01: padrão novo (sessão 15, cooldown 45, sem limite, sem tolerância) e pausa V2 em domain/saldoBloqueio.ts. Escopo ampliado para 2 arquivos de teste (hook e InterceptScreen) que dependiam do padrão antigo; usam toleranciaMin 3 até TASK-07/08 reescrevê-los. Auditoria ok na rodada 1.
TASK-02: máquina AGUARDANDO_LIBERACAO → SESSAO_ATIVA → COOLDOWN em domain/saldoBloqueio.ts, fixtures reescritas (15 casos). Shim @deprecated temporário (fases/campos de tolerância, toleranciaDisponivel, estadoInicialSaldo) mantém hook e InterceptScreen compilando; sai na TASK-07/08. Crédito do essencial removido; crédito por tarefa extra mantido só para a TASK-03 redefinir no CA-07. toleranciaMin segue em ConfigBloco como legado. Auditoria ok na rodada 2 (1 correção).
Task ativa: nenhuma
