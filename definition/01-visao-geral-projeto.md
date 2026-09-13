# Visão Geral do Projeto

## 1. O que é

Aplicativo mobile para ajudar pessoas presas no ciclo **celular → distração → culpa → procrastinação** a recuperarem foco e constância — através de planejamento de tarefas, streak com sistema de perdão, e reforço motivacional, sem apelar para culpa ou pressão.

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
| Conteúdo bíblico | Fora do MVP (toggle na Fase 2) | Simplifica o público-alvo inicial e evita viés religioso não solicitado |
| Plataforma inicial | Android primeiro, iOS depois | Foco de recursos; iOS exige macOS/Xcode e aprovação mais rígida para funcionalidades de Fase 3 |
| Stack mobile | React Native CLI (bare workflow), não Expo | Integrações nativas profundas previstas para Fase 3 (bloqueio de apps, widget) |
| Backend | Firebase (Auth, Firestore, Cloud Functions, Cloud Messaging) | Velocidade de desenvolvimento, integração nativa madura com RN |
| Identidade visual | Raiz (ver documento de Identidade Visual) | Metáfora de fundação/consistência ao invés de urgência/chama |
| Ambiente de desenvolvimento | WSL2 (Ubuntu) + Android Studio no Windows | Configuração do desenvolvedor já existente |

## 6. Estrutura de fases

| Fase | Foco | Complexidade técnica |
|---|---|---|
| **MVP** | Validar a hipótese central: streak + recaída sem culpa reduz procrastinação melhor que um to-do list comum | Baixa-média — client + Firestore |
| **Fase 2** | Ampliar profundidade do produto já validado (exercício, desafios de médio prazo, conteúdo bíblico opcional) | Baixa — ainda sem APIs nativas sensíveis |
| **Fase 3** | Diferenciação forte via integração profunda com o SO (bloqueio de apps com desafio, widget nativo) | Alta — módulos nativos, permissões sensíveis, aprovação de loja |

## 7. Métrica de sucesso do MVP

**Retenção em 7 dias** — a pessoa volta a usar o app depois de uma semana. Métrica mais honesta que número de downloads para validar se a mecânica de streak sem culpa realmente sustenta o hábito.

## 8. Documentos relacionados

- Fundamentação Teórica do Projeto (base científica/conceitual, com fontes)
- Identidade Visual
- MVP
- Fase 2
- Fase 3
- Stack de Desenvolvimento
- Regras de Streak/Escudo e Textos do Produto (detalhamento de copy)
- Schema Firebase (detalhamento técnico de dados)
- Navegação e Componentes React Native (detalhamento técnico de telas)
- Wireframes e mockups de tela (arquivos HTML)
