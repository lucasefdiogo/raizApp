# Spec do Projeto — Rootora

> Visão do produto, princípios, decisões, restrições e loja. As **regras de negócio** vivem em
> `regras-de-negocio.md` (fonte única).

## O que é

Rootora é um app mobile (Android, React Native CLI bare workflow + TypeScript + Firebase) para
ajudar pessoas presas no ciclo **celular → distração → culpa → procrastinação** a recuperarem
foco e constância — via tarefas fatiadas, streak com sistema de proteção (perdão), recaída sem
culpa e bloqueio de apps (diferencial competitivo), sem apelar para culpa, pressão ou viés
religioso.

## Problema

Procrastinação não é preguiça — é evitação emocional ativa: o cérebro percebe a tarefa como
ameaça e busca alívio imediato no celular. O alívio consome a atenção por completo (scroll sem
ponto de saída natural), o retorno à realidade gera culpa, e a culpa aumenta a aversão à tarefa
original, realimentando o ciclo. Fundamentação completa, com fontes, em
`fundamentacao-teorica.pdf` (nesta pasta).

## Público-alvo

Pessoas que sentem que perdem tempo/atenção de forma repetida no celular e querem recuperar
controle sobre rotina, foco e produtividade pessoal — sem julgamento religioso ou moralista.

## Métrica de sucesso

**Retenção em 7 dias** — a pessoa volta a usar o app depois de uma semana. Mais honesta que
downloads para validar se a mecânica de streak sem culpa sustenta o hábito.

## Princípios inegociáveis do produto

Toda decisão de produto (mecânica, copy, gamificação) deve respeitar estes cinco princípios:

1. **Reduzir a ameaça percebida da tarefa**, nunca aumentar cobrança — tarefas fatiadas, clareza,
   tempo estimado visível
2. **Comunicação honesta sobre neurociência** — nunca prometer "resetar o cérebro" ou "esvaziar
   dopamina"; o produto é recondicionamento comportamental, não milagre neuroquímico
3. **Recaída sem vergonha** — falha é informação, não sentença. Fricção é aceitável (ex.: regra
   de pré-compromisso do bloqueio — ver abaixo), punição não
4. **Autoeficácia por acúmulo de pequenas vitórias** — desconfiar de gamificação vazia
5. **Ressignificação constante do "porquê"** — o motivo pessoal do usuário (onboarding) reaparece
   nos momentos de recaída/retorno

Se uma tarefa pedir algo que contradiga isso, apontar o conflito antes de implementar.

## Regras de texto (copy)

- Frases curtas, verbo no início
- Sem ponto de exclamação, sem tom de cobrança, sem pedido de desculpas
- Ao usuário é "proteção"; o nome interno no código e no Firestore continua "escudo"
- Evitar a palavra "streak" em texto exibido

## Decisões-chave já tomadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Conteúdo bíblico | Fora do produto por ora; possível toggle opcional no futuro (pendente) | Simplifica o público inicial, evita viés religioso não solicitado |
| Plataforma inicial | Android primeiro, iOS depois | Foco de recursos; iOS exige macOS/Xcode e aprovação mais rígida para bloqueio de apps |
| Stack mobile | React Native CLI (bare workflow), não Expo | Integrações nativas profundas (Accessibility Service, widget planejado) |
| Backend | Firebase (Auth, Firestore). Cloud Functions só para verificação de assinatura, no futuro | Velocidade de desenvolvimento |
| Notificações | Locais (`@notifee/react-native`), não FCM | Lembrete diário/alerta de streak dependem de horário/estado local |
| Bloqueio de apps | Accessibility Service + regra de pré-compromisso (alteração só vale amanhã) | Fricção sem punição; sistema antigo de custo crescente foi removido |
| Identidade visual | Raiz, tema único no MVP | Metáfora de fundação/consistência |
| Monetização | Assinatura do app inteiro, 7 dias grátis, verificação via Cloud Function | Ver seção "Loja e publicação" abaixo |
| Pacote Android | `com.luxthorapps.rootora` (permanente após 1ª publicação) | — |
| Pendente de decisão | XP/níveis, micro-reflexão pós-recaída, conteúdo bíblico (toggle), seleção de tema | Ver `regras-de-negocio.md` §14 |

## Regras de Negócio

Todas em [`regras-de-negocio.md`](regras-de-negocio.md) — streak e proteção, Home, tarefas,
desafios, Progresso, bloqueio de apps, interceptação (sessões/válvulas), rotina noturna,
TravadoFlow, Perfil, privacidade/Analytics e pendências.

## Restrições importantes

- **LGPD/privacidade:** Política de Privacidade e Termos de Uso (`docs/legal/`) descrevem o
  comportamento real do app e precisam ser atualizados sempre que um campo novo for gravado em
  `users/{uid}`, um SDK novo coletar dados, o Accessibility Service mudar o que lê, a assinatura
  for lançada, ou o controlador mudar. Mudança relevante na Política exige aviso prévio ao
  usuário (seção 15 dela). Revisão jurídica formal (advogado OAB) ainda pendente antes de
  escalar a base de usuários ou lançar a assinatura.
- **Idade mínima:** 18+ nos dois documentos legais — precisa bater com "Público-alvo" no Play
  Console antes de publicar.
- **Accessibility Service:** permissão mais escrutinada na revisão da Play Store — exige
  justificativa no formulário de submissão, usando o texto já validado na tela de divulgação.
- **Dados sensíveis:** `intencoes` (texto livre da pausa de intenção) é dado pessoal, fica só no
  documento do próprio usuário, nunca enviado ao Analytics com identificador.
- **Acessibilidade:** rótulos, foco, contraste e tamanho de toque não são opcionais (ver
  `boas-praticas.md`).

## Loja e publicação

- Conta de desenvolvedor Google Play: taxa única, necessária antes de qualquer submissão.
  Pacote `com.luxthorapps.rootora` (permanente após 1ª publicação).
- Declaração de Advertising ID: "não usa" (coleta desligada, permissões `AD_ID`/
  `ACCESS_ADSERVICES_*` removidas do manifesto).
- Lista de apps do bloqueio usa `<queries>` curado no manifesto, não `QUERY_ALL_PACKAGES` — sem
  formulário extra de justificativa.
- **Assinatura (7 dias grátis), nenhum dos passos iniciado ainda:**
  1. Criar produto de assinatura no Google Play Console (plano base + oferta 7 dias)
  2. Migrar o projeto Firebase para o plano **Blaze** (pay-as-you-go, cartão cadastrado — avisar
     e confirmar com o Lucas antes, por custo)
  3. Configurar Real-time Developer Notifications (RTDN) via Pub/Sub
  4. Cloud Function de verificação de compra (Google Play Developer API)
  5. Fluxo de compra no app (`react-native-iap`)
  6. Paywall com contagem regressiva dos 7 dias e "Restaurar compra"
