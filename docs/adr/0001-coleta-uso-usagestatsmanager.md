# 0001. Coleta de uso das redes sociais via UsageStatsManager

- Status: aceita
- Data: 2026-10-19
- HU: HU-02

## Contexto
A revisão semanal e a calibragem do motor de liberação precisam de tempo de uso e número de aberturas por rede social. O dado tem de existir também quando o Accessibility Service está desligado, que é o período mais importante de medir. O app hoje não coleta uso: só registra interceptações e o resumo do saldo de blocos.

## Decisão
Ler o `UsageStatsManager` do Android por um módulo nativo Kotlin, com a permissão especial `PACKAGE_USAGE_STATS`, coletando ao abrir o app e recalculando os últimos 7 dias, porque é a única fonte que funciona com o Accessibility desligado e já guarda histórico no sistema.

### Alternativas descartadas
- Eventos do Accessibility Service: param de existir quando o serviço é desligado, exatamente quando o dado mais importa.
- Coleta em segundo plano com WorkManager: traria dependência Gradle nova e complexidade de agendamento; recalcular 7 dias a cada abertura cobre o uso esperado. Pode ser reavaliada se houver lacunas de dados.
- Guardar só localmente (SharedPreferences/AsyncStorage): reinstalar zeraria o histórico da revisão semanal.

## Dependências
Nenhuma.

## Consequências
- Ganhos: dados de uso disponíveis mesmo com o Accessibility desligado; nenhum pacote novo; gravação idempotente.
- Custos e riscos: nova permissão especial a explicar na ficha da Play e na política de privacidade; dias sem abrir o app por mais tempo do que o histórico do Android ficam sem dado; regra de agregação em Kotlin tem teste fora do CI (Gradle local).
- Custo mensal estimado: R$ 0. Até 7 escritas no Firestore por abertura do app, dentro da cota gratuita do plano Spark na escala atual.
