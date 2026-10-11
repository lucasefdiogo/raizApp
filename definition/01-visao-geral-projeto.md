# Visão Geral do Projeto

## 1. O que é

Rootora é um aplicativo mobile para ajudar pessoas presas no ciclo **celular → distração → culpa → procrastinação** a recuperarem foco e constância — através de planejamento de tarefas fatiadas, streak com sistema de proteção (perdão), recaída sem culpa e bloqueio de apps, sem apelar para culpa ou pressão.

## 2. O problema que resolve

Procrastinação não é preguiça — é um comportamento ativo de evitação emocional: o cérebro percebe uma tarefa como ameaça e busca alívio imediato no celular. Esse alívio consome a atenção por completo (scroll infinito sem ponto de saída natural), e o retorno à realidade gera culpa. A culpa, por sua vez, aumenta a aversão à tarefa original — alimentando o mesmo ciclo, agora mais forte.

*(Fundamentação completa, com fontes, no documento "Fundamentação Teórica do Projeto".)*

## 3. Público-alvo

Pessoas que sentem que perdem tempo/atenção de forma repetida no celular e querem recuperar controle sobre rotina, foco e produtividade pessoal — sem julgamento religioso ou moralista.

## 4. Princípios fundamentais do produto

Toda decisão de produto (mecânica, copy, gamificação) deve respeitar estes cinco princípios, derivados da fundamentação teórica:

1. **Reduzir a ameaça percebida da tarefa**, não aumentar a cobrança — tarefas fatiadas em passos pequenos, clareza, tempo estimado visível
2. **Comunicação honesta sobre neurociência** — nunca prometer "resetar o cérebro" ou "esvaziar dopamina"; o produto é recondicionamento comportamental, não milagre neuroquímico
3. **Recaída sem vergonha** — falha é informação, não sentença; toda comunicação pós-falha reconhece sem punir e redireciona para a próxima ação
4. **Autoeficácia por acúmulo de pequenas vitórias** — streaks e desafios fáceis no início constroem confiança real, não são só estética de gamificação
5. **Ressignificação constante do "porquê"** — o motivo pessoal do usuário (capturado no onboarding) reaparece nos momentos de recaída para reduzir a resposta de evitação

## 5. Decisões-chave já tomadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Conteúdo bíblico | Fora do produto por ora; possível toggle opcional no futuro (pendente de decisão) | Simplifica o público-alvo inicial e evita viés religioso não solicitado |
| Plataforma inicial | Android primeiro, iOS depois | Foco de recursos; iOS exige macOS/Xcode e a aprovação de loja é mais rígida para o bloqueio de apps |
| Stack mobile | React Native CLI (bare workflow), não Expo | Integrações nativas profundas (Accessibility Service para o bloqueio de apps, widget planejado) |
| Backend | Firebase (Auth, Firestore). Cloud Functions só para verificação de assinatura, no futuro | Velocidade de desenvolvimento, integração nativa madura com RN |
| Notificações | Locais (`@notifee/react-native`), não FCM | Lembrete diário e alerta de risco dependem de horário/estado local |
| Bloqueio de apps | Accessibility Service + regra de pré-compromisso (alteração só vale amanhã) | Fricção sem punição; o sistema antigo de custo crescente foi removido |
| Identidade visual | Raiz (ver documento de Identidade Visual) | Metáfora de fundação/consistência ao invés de urgência/chama |
| Monetização | Assinatura do app inteiro, 7 dias grátis | Verificação via Cloud Function, ver `procedimento-loja.md` |
| Ambiente de desenvolvimento | WSL2 (Ubuntu) + Android Studio no Windows | Configuração do desenvolvedor já existente |

## 6. Organização do escopo

O projeto não é mais dividido em MVP / Fase 2 / Fase 3. O escopo é organizado por **domínio funcional** (autenticação, onboarding, tarefas, streak e proteção, progresso, desafios, bloqueio de apps, notificações, conta e conformidade, monetização), cada um com status próprio (pronto, aguardando confirmação, planejado, removido) em `roadmap-e-status.md`. Esse documento é a fonte de verdade do que existe e do que falta.

O diferencial técnico do produto é a integração com o SO: o bloqueio de apps via Accessibility Service e a interceptação que leva da fuga para a tarefa (spec `09-ponte-fuga-tarefa-e-estou-travado.md`).

## 7. Métrica de sucesso

**Retenção em 7 dias** — a pessoa volta a usar o app depois de uma semana. Métrica mais honesta que número de downloads para validar se a mecânica de streak sem culpa realmente sustenta o hábito.

## 8. Documentos relacionados

Todos em `/definition`:

- `fundamentacaoteoricaprojeto.pdf` — base científica/conceitual, com fontes
- `02-identidade-visual.md` — conceito de marca
- `design-system-rootora.md` — tokens e componentes
- `roadmap-e-status.md` — o que existe, o que está em andamento, o que é planejado
- `regras-de-negocio.md` — streak/proteção, desafios, bloqueio de apps, textos exatos
- `schema-firebase.md` — dados do Firestore
- `navegacao-componentes.md` — telas e navegação
- `stack-tecnico.md` — bibliotecas, ambiente, dívida técnica
- `procedimento-loja.md` — publicação e assinatura
- `09-ponte-fuga-tarefa-e-estou-travado.md` — spec da interceptação de apps
- `banco-de-frases.md`, `banco-de-versiculos.md` — conteúdo motivacional
- `wireframes/` — wireframes e mockups de tela (HTML)
