# Graph Report - raizApp  (2026-10-24)

## Corpus Check
- 462 files · ~290,351 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 39 file(s) not represented in the graph (top: .xml 8, (none) 6, .ttf 6)

## Summary
- 2303 nodes · 6756 edges · 127 communities (84 shown, 43 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 218 edges (avg confidence: 0.85)
- Token cost: 0 input · 1,770,254 output

## Community Hubs (Navigation)
- Analytics & Tour Hooks
- App List & Config Section Components
- Navigation Links & Back Button
- Shutdown Warning Alarm Scheduler
- Toggle & Task Form Components
- HU-12/13 Window & Usage Filter Rules
- Session Info Sheet & Date Picker
- Dev Dependencies (package.json)
- App Chip & Wait Count Components
- Quick Access & Emergency Rules
- Navigation & Architecture Docs
- Block Rule Decision Logic
- Accessibility Permission & Cooldown Hooks
- Theoretical Foundation: Procrastination & Self-Efficacy
- Daily Tasks Hook & Firestore
- Challenges Domain Logic
- SVG Icons & Empty/Watering States
- SaldoBloqueio State Machine (Kotlin)
- Recovery State Card Component
- Accessibility Service (Native Android)
- Onboarding Steps Domain
- SaldoBloqueio Machine Tests (Kotlin)
- Feature Tour Overlay Component
- App Usage Aggregation Domain
- Weekly/Daily History Domain
- Streak & Date Domain Logic
- Block Rules Preferences (Kotlin)
- Session Balance Notification Scheduler (Kotlin)
- Usage Access Hook & Profile Stack
- Task Completed Overlay & Chip
- Accessibility Module Bridge (Native)
- Onboarding Step Components
- Accessibility Event Sync Domain
- Weekly Network Usage Summary Domain
- Account Deletion & Consent Hooks
- Shutdown Warning Machine (Kotlin)
- HU-03/04/05 Progress Records
- Progress Screen Detail Components
- Rotina (Night Routine) Hook Domain
- Intercept Confusion Timers Domain
- Feature Tour Steps & Night Alternative Hook
- Nighttime Pause Messages Domain
- Intercept Activity (Native Android)
- App Entry Point & Toast
- Project Dependencies (package.json)
- Daily Tasks Essential Limit Domain
- Block Rules Hook (Installed Apps)
- Intercept Screen Action Handlers
- iOS App Delegate (Swift)
- Google/Firebase Auth Setup
- Firestore Mock & Storage
- Tutorial Slide & Step Dots
- Block Phase State Enum (Kotlin)
- Loading Indicator & Selo Components
- Routine Confirmation Screen & Back Gesture
- Shutdown Warning Display Conditions
- Auth Error Mapping & Crashlytics Flags
- Routine Domain (Night Window)
- Block Config Resolver Domain
- Focus Session Hook Domain
- Accessibility Native Bridge Methods
- Shutdown Warning Receiver (Kotlin)
- Usage Apps Native Module (Kotlin)
- Intercept Feature Architecture Overview
- Firebase Auth Mock
- Notification Destination Hook
- Progress Screen Test Setup
- Weekly Reflection & Network Card
- Project Architecture & Build Docs
- Intercept Screen State Domain
- Session Warning Scheduling Tests (Kotlin)
- Intercept Types & Hook
- Social Network Apps Domain
- Main Application Entry (Kotlin)
- Dev Workflow Conventions (CLAUDE.md)
- Motivational Phrase Themes
- Notifee Mock Module
- Accessibility Package Registration (Kotlin)
- Product Vision Key Decisions
- Biblical Verse Bank & Themes
- Project Foundations & Principles Docs
- Visual Identity & Typography Docs
- NPM Scripts
- Task List & Item Components
- Streak Milestone Hook
- Color Palette & Component Tokens
- Crashlytics Mock Module
- Home Header Component
- Architecture Notes & Tech Debt
- Metro Bundler Config
- Analytics Mock Module
- Google Sign-In Mock Module
- Challenge Card Status Domain
- Navigation Prop Types
- TypeScript Config
- Open Font License Texts
- Project README & Build TODO
- Docs Source-of-Truth Pointer
- Launcher Icon (mdpi foreground)
- Async Storage Mock
- Android Dev Shell Script
- Launcher Icon (hdpi foreground)
- Launcher Icon (hdpi)
- Launcher Icon (hdpi round)
- Launcher Icon (mdpi)
- Launcher Icon (mdpi round)
- Launcher Icon (xhdpi foreground)
- Launcher Icon (xhdpi)
- Launcher Icon (xhdpi round)
- Launcher Icon (xxhdpi foreground)
- Launcher Icon (xxhdpi)
- Launcher Icon (xxhdpi round)
- Launcher Icon (xxxhdpi foreground)
- Launcher Icon (xxxhdpi)
- Launcher Icon (xxxhdpi round)
- Theme & Icon Notes
- TODO: Local Env Setup
- TODO: Manual Device Test

## God Nodes (most connected - your core abstractions)
1. `react` - 216 edges
2. `react-native` - 148 edges
3. `@testing-library/react-native` - 115 edges
4. `Theme` - 90 edges
5. `registrarErro()` - 70 edges
6. `buscarUsuario()` - 63 edges
7. `PrimaryButton()` - 55 edges
8. `useToast()` - 45 edges
9. `react-native-safe-area-context` - 44 edges
10. `EstadoSaldo` - 39 edges

## Surprising Connections (you probably didn't know these)
- `Protótipo — Rotina e janela noturna` --conceptually_related_to--> `Navegação e Componentes — React Native (estado real)`  [INFERRED]
  docs/design/prototipo/rotina-noturna.html → definition/navegacao-componentes.md
- `App()` --calls--> `RootNavigator()`  [EXTRACTED]
  App.tsx → src/navigation/RootNavigator.tsx
- `signInWithGoogle()` --references--> `GoogleSignin`  [EXTRACTED]
  src/services/auth.ts → __mocks__/@react-native-google-signin/google-signin.js
- `Protótipo — Bloqueio de apps (normal, carregando, vazio)` --conceptually_related_to--> `Navegação e Componentes — React Native (estado real)`  [INFERRED]
  docs/design/prototipo/bloqueio-apps.html → definition/navegacao-componentes.md
- `Protótipo — Interceptação: sessões (pausa de intenção, sessão ativa, cooldown)` --conceptually_related_to--> `Root separado 'Intercept' — segundo componente AppRegistry, InterceptActivity nativa`  [INFERRED]
  docs/design/prototipo/intercept-sessoes.html → definition/navegacao-componentes.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Fluxo SDD Leve: HU -> build -> revisor -> Definição de Pronto** — claude_lux_hu, claude_lux_build, claude_lux_revisor, claude_definicao_de_pronto [EXTRACTED 1.00]
- **Checklist da Definição de Pronto cruza princípios, convenções e camadas** — claude_principios_inegociaveis, claude_convencoes_codigo, claude_separacao_camadas, claude_definicao_de_pronto [INFERRED 0.85]
- **Mecanismo de Interceptação e Fuga de Tarefa** — definition_09_ponte_fuga_tarefa_e_estou_travado_interceptscreen, definition_09_ponte_fuga_tarefa_e_estou_travado_travadoflow, definition_09_ponte_fuga_tarefa_e_estou_travado_sessaofocoscreen, android_app_src_main_java_com_luxthorapps_rootora_saldobloqueiomaquina [INFERRED 0.90]
- **Implementação da Identidade Visual Raiz no Design System** — definition_02_identidade_visual_raiz, definition_02_identidade_visual_paleta, definition_design_system_rootora_tokens_cor, definition_design_system_rootora_rootprogressicon [EXTRACTED 1.00]
- **Governança dos 5 Princípios Inegociáveis sobre Conteúdo e Regras** — definition_00_instrucoes_do_projeto_principios_inegociaveis, definition_01_visao_geral_projeto_principios_fundamentais, definition_banco_de_frases_frases_proibidas, definition_banco_de_versiculos_versiculos_excluidos [INFERRED 0.85]
- **HU-01 — ciclo de vida da feature lista curada de redes sociais (tasks → progress → verification)** — docs_historico_hu_01_tasks_documento, docs_historico_hu_01_progress_documento, docs_historico_hu_01_verification_documento [EXTRACTED 1.00]
- **HU-02 — ciclo de vida da feature coleta de uso das redes (tasks → progress → verification)** — docs_historico_hu_02_tasks_documento, docs_historico_hu_02_progress_documento, docs_historico_hu_02_verification_documento [EXTRACTED 1.00]
- **Protótipos do motor de interceptação: sessões, válvulas de escape e rotina noturna formam um mesmo fluxo de produto** — docs_design_prototipo_intercept_sessoes_documento, docs_design_prototipo_acesso_rapido_emergencia_documento, docs_design_prototipo_rotina_noturna_documento [INFERRED 0.85]
- **Ordem do Facelift 2026: HU-07 → HU-10 → HU-09 → HU-11 → HU-08** — docs_hu_hu_07_hoje_alternativas_hu, docs_hu_hu_10_rotina_noturna_hu, docs_hu_hu_09_bloqueio_config_hu, docs_hu_hu_11_interceptacao_hu, docs_hu_hu_08_progresso_redes_hu [EXTRACTED 1.00]
- **Pipeline da rotina noturna: estimativa (HU-06) → confirmação/alternativa (HU-10) → aplicação na interceptação (HU-11)** — docs_historico_hu_06_tasks, docs_hu_hu_10_rotina_noturna_hu, docs_hu_hu_11_interceptacao_hu [EXTRACTED 1.00]
- **Loop SDD Leve da HU-06: progress (decisão P-01) + tasks (TASK-01 a 11) + verification (8/8 verdes)** — docs_historico_hu_06_progress, docs_historico_hu_06_tasks, docs_historico_hu_06_verification [EXTRACTED 1.00]
- **HU-12/13/14 — segunda onda do facelift 2026 sobre funcionalidades já implementadas (HU-07 a HU-11)** — docs_hu_hu_12_janela_dia_todo_doc, docs_hu_hu_13_historico_apps_bloqueados_doc, docs_hu_hu_14_timers_sessao_doc [EXTRACTED 1.00]
- **Conjunto de documentos legais do Rootora publicados via Firebase Hosting** — docs_legal_readme_doc, docs_legal_politica_privacidade_doc, docs_legal_termos_de_uso_doc [EXTRACTED 1.00]
- **Trio canônico de especificação em docs/projeto (arquitetura, schema, spec) como fonte única de verdade** — docs_projeto_arquitetura_doc, docs_projeto_schema_doc, docs_projeto_spec_doc [EXTRACTED 1.00]

## Communities (127 total, 43 thin omitted)

### Community 0 - "Analytics & Tour Hooks"
Cohesion: 0.07
Nodes (59): @notifee/react-native@^9.1.8, @notifee/react-native, @react-native-async-storage/async-storage, @react-native-firebase/analytics, TOTAL_PASSOS_TOUR, useAnalytics(), navigate, useFeatureTour() (+51 more)

### Community 1 - "App List & Config Section Components"
Cohesion: 0.06
Nodes (41): lucide-react-native, AppListItem(), styles, APP, SecaoConfig(), SecaoConfigProps, styles, DIAS (+33 more)

### Community 2 - "Navigation Links & Back Button"
Cohesion: 0.06
Nodes (42): @react-navigation/native, BackButton(), LinkExterno(), LinkExternoProps, styles, ROTULO_POLITICA_PRIVACIDADE, ROTULO_TERMOS_DE_USO, URL_POLITICA_PRIVACIDADE (+34 more)

### Community 3 - "Shutdown Warning Alarm Scheduler"
Cohesion: 0.09
Nodes (5): AvisoDesligamentoAgendador, AvisoDesligamentoBootReceiver, AvisoDesligamentoPrefs, EventoAcessibilidadeNativo, AvisoDesligamentoPrefsTest

### Community 4 - "Toggle & Task Form Components"
Cohesion: 0.07
Nodes (41): styles, ToggleIndicator(), ToggleIndicatorProps, AddTaskForm(), adicionar(), fechar(), limpar(), styles (+33 more)

### Community 5 - "HU-12/13 Window & Usage Filter Rules"
Cohesion: 0.05
Nodes (59): HU-12 — Janela de horário opcional (o dia todo), Pré-compromisso aplicado à troca de janela de horário (HU-12 RN05), resumoCurtoBloqueio reconhece 00:00–23:59 como 'o dia todo', Seletor 'O dia todo' / 'Horário específico' no bloqueio, HU-13 — Tempo nas redes só dos apps bloqueados (spec), Filtro de uso só por regrasBloqueio.apps (HU-13 RN01/03/04), HU-13 — protótipo HTML, Lista de tempo por app no ResumoRedesCard (HU-13 RN02) (+51 more)

### Community 6 - "Session Info Sheet & Date Picker"
Cohesion: 0.06
Nodes (24): react, react-native-safe-area-context, @testing-library/react-native, SessoesInfoSheet(), SessoesInfoSheetProps, styles, propsPadrao, CooldownBanner() (+16 more)

### Community 7 - "Dev Dependencies (package.json)"
Cohesion: 0.06
Nodes (47): devDependencies, @babel/core@^7.25.2, @babel/preset-env@^7.25.3, @babel/runtime@^7.25.0, eslint@^8.19.0, firebase-admin@^14.3.0, jest@^29.6.3, jest-junit@^17.0.0 (+39 more)

### Community 8 - "App Chip & Wait Count Components"
Cohesion: 0.07
Nodes (33): AppChip(), AppChipProps, styles, ContagemEspera(), ContagemEsperaProps, styles, InterceptLayout(), InterceptLayoutProps (+25 more)

### Community 9 - "Quick Access & Emergency Rules"
Cohesion: 0.11
Nodes (43): acessoRapidoDisponivel(), ACESSOS_RAPIDOS_DIARIOS, DURACAO_LIBERACAO_RAPIDA_MIN, emergenciaOferecida(), EntradaEmergencia, INTERVALOS_ACESSO_RAPIDO_MIN, msAteProximoAcessoRapido(), estado() (+35 more)

### Community 10 - "Navigation & Architecture Docs"
Cohesion: 0.08
Nodes (41): Navegação e Componentes — React Native (estado real), Root separado 'Intercept' — segundo componente AppRegistry, InterceptActivity nativa, RootNavigator — Stack.Navigator único com todas as rotas de topo, Assinatura com 7 dias grátis — verificação via Cloud Function, plano Blaze, RTDN, react-native-iap, Procedimento da Loja — Rootora, Aviso de bloqueio desligado — lembretes locais após desligar o Accessibility Service, Configuração do bloqueio de apps — Accessibility Service, lista curada, janela única, divulgação em destaque, Regras de Negócio — Rootora (+33 more)

### Community 11 - "Block Rule Decision Logic"
Cohesion: 0.09
Nodes (35): AppListItemProps, aplicarRegrasBloqueioPendentesSeVencidas(), decidirGravacaoRegrasBloqueio(), DecisaoRegrasBloqueio, ehJanelaDiaTodo(), formatarDiasResumoCurto(), formatarDiasSemana(), HORARIOS_DIA_TODO (+27 more)

### Community 12 - "Accessibility Permission & Cooldown Hooks"
Cohesion: 0.12
Nodes (28): minutosRestantesCooldown(), useAccessibilityPermission(), UseAccessibilityPermissionResultado, visao(), visaoEmCooldown(), useCooldownRestante(), UseCooldownRestanteResultado, concluirEmergencia() (+20 more)

### Community 13 - "Theoretical Foundation: Procrastination & Self-Efficacy"
Cohesion: 0.11
Nodes (36): Autocompaixão (autobondade, humanidade compartilhada, mindfulness) — associada a mais saúde física e comportamentos promotores de saúde; reduz atrito psicológico pós-falha sem ser permissividade, Autoeficácia (Bandura) — crença na própria capacidade de executar o comportamento; constrói-se por experiências de domínio (vitórias pequenas e frequentes), Bandura, A. (1977). Self-efficacy: toward a unifying theory of behavioral change. Psychological Review, 84(2), 191–215; Bandura, A. (1997). Self-Efficacy: The Exercise of Control. Freeman., Berridge, K. C. (2007). The debate over dopamine's role in reward: The case for incentive salience. Psychopharmacology, 191(3), 391–431., Berridge, K. C. (2012). From prediction error to incentive salience: Mesolimbic computation of reward motivation. European Journal of Neuroscience, 35(7), 1124–1143., Ciclo gatilho de desconforto → fuga para o celular → captura total da atenção → culpa → aumento de aversividade → reforço do ciclo (6 etapas), Controle de estímulo (restringir acesso ao gatilho) e exposição e prevenção de resposta (tolerar desconforto sem suprimir) — ferramentas clássicas de TCC; reduções graduais bastam, abstinência total pode gerar efeito rebote, Fundamentação Teórica do Projeto (Rootora/Raiz) — procrastinação, dopamina, uso problemático de telas, vídeos curtos, perfeccionismo, reconstrução de autocontrole; v2, ago/2026 (+28 more)

### Community 14 - "Daily Tasks Hook & Firestore"
Cohesion: 0.15
Nodes (27): @react-native-firebase/firestore, StatusDia, TAREFAS_EXEMPLO, showToast, useDailyTasks(), UseDailyTasksResultado, useReturnAfterPause(), UseReturnAfterPauseResultado (+19 more)

### Community 15 - "Challenges Domain Logic"
Cohesion: 0.11
Nodes (30): calcularPeriodoMensal(), calcularPeriodoSemanal(), calcularProgressoDesafio(), CATALOGO, contarDiasAtivos(), contarExerciciosConcluidos(), DefinicaoDesafio, EPOCA_SEMANAL (+22 more)

### Community 16 - "SVG Icons & Empty/Watering States"
Cohesion: 0.10
Nodes (23): react-native-svg@^15.15.5, react-native-svg, EmptyStateProps, styles, AnimatedCircle, AnimatedPath, RootWateringOverlay(), RootWateringOverlayProps (+15 more)

### Community 17 - "SaldoBloqueio State Machine (Kotlin)"
Cohesion: 0.22
Nodes (8): ConfigBloco, EstadoSaldo, LiberacaoRapida, ACESSO_RAPIDO, EMERGENCIA, NENHUMA, ResultadoTransicao, SaldoBloqueioMaquina

### Community 18 - "Recovery State Card Component"
Cohesion: 0.10
Nodes (21): react-native, @react-navigation/native-stack, EYEBROW, RecoveryStateCard(), RecoveryStateCardProps, styles, ReturnAfterPauseCard(), ReturnAfterPauseCardProps (+13 more)

### Community 20 - "Onboarding Steps Domain"
Cohesion: 0.16
Nodes (24): onboardingEstaCompleto(), PASSO_ONBOARDING, passoInicialOnboarding(), TOTAL_PASSOS_ONBOARDING, validarFocoProcrastinacao(), validarPorqueTexto(), validarTempoTelaEstimado(), FocoProcrastinacao (+16 more)

### Community 22 - "Feature Tour Overlay Component"
Cohesion: 0.09
Nodes (23): FeatureTourOverlay(), styles, MOCK_FRAME, MOCK_INSETS, navigate, useVoltarParaAbaHoje(), HojeTabIcon(), MainTabNavigator() (+15 more)

### Community 23 - "App Usage Aggregation Domain"
Cohesion: 0.13
Nodes (19): HorariosUsoDia, agregarUsoPorDia(), doisDigitos(), EventoUso, horariosUsoPorDia(), paraISOLocalComHora(), Sessao, JANELA_FIM (+11 more)

### Community 24 - "Weekly/Daily History Domain"
Cohesion: 0.13
Nodes (20): paraISOLocal(), avaliarStatusHistoricoDia(), construirHistoricoIntervalo(), construirHistoricoSemana(), DiaHistorico, inicioDoDiaLocal(), OpcoesIntervalo, statusDoLog() (+12 more)

### Community 25 - "Streak & Date Domain Logic"
Cohesion: 0.18
Nodes (24): dataDeAmanhaLocal(), dataDeOntemLocal(), dataLocalDeISO(), diferencaEmDiasLocal(), aplicarResultadoDia(), avaliarDiaCumprido(), calcularProgressoProximoMarco(), calcularStatusDia() (+16 more)

### Community 28 - "Usage Access Hook & Profile Stack"
Cohesion: 0.12
Nodes (19): @react-native-community/datetimepicker, useAcessoUso(), UseAcessoUsoResultado, PerfilStackParamList, PerfilStackProps, screenOptions, Stack, DivulgacaoAcessoUsoScreen() (+11 more)

### Community 29 - "Task Completed Overlay & Chip"
Cohesion: 0.10
Nodes (16): styles, TaskCompletedOverlay(), TaskCompletedOverlayProps, Chip(), ChipProps, styles, formatarMMSS(), SessaoFocoScreen() (+8 more)

### Community 31 - "Onboarding Step Components"
Cohesion: 0.11
Nodes (20): OnboardingStepFoco(), OnboardingStepFocoProps, styles, OnboardingStepPorque(), OnboardingStepPorqueProps, styles, OnboardingStepPrimeiraTarefa(), OnboardingStepPrimeiraTarefaProps (+12 more)

### Community 32 - "Accessibility Event Sync Domain"
Cohesion: 0.18
Nodes (15): AcessibilidadeDoDia, agruparEventosPorDia(), EventoAcessibilidade, DIA, useSincronizarAcessibilidade(), sincronizar(), espelharNotificacoesAtivas(), EventoAcessibilidadePendente (+7 more)

### Community 33 - "Weekly Network Usage Summary Domain"
Cohesion: 0.19
Nodes (25): AppComTempo, appsPorTempoDesc(), barrasDaSemana(), ContadoresBloqueio, detalheRedesDoDia, DIA_SEMANA_ABREV, diasComUsoApps(), formatarDuracao() (+17 more)

### Community 34 - "Account Deletion & Consent Hooks"
Cohesion: 0.16
Nodes (17): showToast, useAccountDeletion(), showToast, useConsentimentoAcessibilidade(), UseConsentimentoAcessibilidadeResultado, showToast, useConsentimentoAcessoUso(), UseConsentimentoAcessoUsoResultado (+9 more)

### Community 35 - "Shutdown Warning Machine (Kotlin)"
Cohesion: 0.18
Nodes (5): AvisoDesligamentoMaquina, CondicoesExibicao, LembreteAgendavel, TextoLembrete, AvisoDesligamentoMaquinaTest

### Community 36 - "HU-03/04/05 Progress Records"
Cohesion: 0.10
Nodes (23): HU-03 tasks.md — aviso de bloqueio desligado (lembretes, acessibilidade, notificação), HU-03 verification.md — 8/8 critérios verdes, aprovado, HU-04 tasks.md — máquina de estados AGUARDANDO_LIBERACAO/SESSAO_ATIVA/COOLDOWN, HU-04 verification.md — 7/7 critérios verdes, aprovado, HU-05 tasks.md — acesso rápido (cota 3, intervalos 15/30/60) e emergência (respiração 60s), Acesso rápido (cota 3/dia, intervalos 15/30/60min) e emergência (respiração 60s) — válvulas do motor de saldo, HU-05 verification.md — 7/7 critérios verdes, aprovado, HU-06 tasks.md — estimativa de rotina (dormir/acordar), janela noturna, pausa dobrada, banco de mensagens noturno (+15 more)

### Community 37 - "Progress Screen Detail Components"
Cohesion: 0.13
Nodes (21): ChallengeCard(), EmptyState(), DayDetailSheet(), DayDetailSheetProps, LABEL_STATUS, styles, APARENCIA, DayStatusPill() (+13 more)

### Community 38 - "Rotina (Night Routine) Hook Domain"
Cohesion: 0.17
Nodes (22): espelharSeConfirmada(), Horarios, paraDiaRotina(), dia(), ESTIMATIVA, logs(), montar(), showToast (+14 more)

### Community 39 - "Intercept Confusion Timers Domain"
Cohesion: 0.14
Nodes (19): TaskItemProps, distanciaEmMinutos(), DURACAO_SEG_CONFUSAO, DURACAO_SEG_CONTINUAR, DURACAO_SEG_DESCANSO_ENERGIA, DURACAO_SEG_FAZER_2_MINUTOS, DURACAO_SEG_MEDO, DURACAO_SEG_SESSAO_BLOQUEIO (+11 more)

### Community 40 - "Feature Tour Steps & Night Alternative Hook"
Cohesion: 0.16
Nodes (14): MedidaAlvoTour, ALTURA_MINIMA_TOOLTIP_TOUR, TOUR_PASSOS, TourAlvoId, TourPasso, useAlternativaNoturna(), useNomeUsuario(), ALVOS_ROLAVEIS_TOUR (+6 more)

### Community 41 - "Nighttime Pause Messages Domain"
Cohesion: 0.15
Nodes (17): MENSAGENS_NOTURNAS, proximaMensagemNoturna(), duracaoPausaIntencaoNoturnaSeg(), duracaoPausaIntencaoSeg(), PausaNoturna, DENTRO, FORA, montar() (+9 more)

### Community 42 - "Intercept Activity (Native Android)"
Cohesion: 0.15
Nodes (3): InterceptActivity, DefaultReactActivityDelegate, MainActivity

### Community 43 - "App Entry Point & Toast"
Cohesion: 0.14
Nodes (14): App(), displayName, name, styles, renderToast(), Toast(), ToastProps, DURACAO_TOAST_MS (+6 more)

### Community 44 - "Project Dependencies (package.json)"
Cohesion: 0.09
Nodes (22): dependencies, lucide-react-native@^1.43.0, react@19.2.3, react-native@0.87.0, @react-native-async-storage/async-storage@^3.1.1, @react-native-community/datetimepicker@^9.2.1, @react-native-firebase/analytics@^26.4.0, @react-native-firebase/app@^26.4.0 (+14 more)

### Community 45 - "Daily Tasks Essential Limit Domain"
Cohesion: 0.17
Nodes (19): AddTaskFormProps, TaskTypeToggleProps, adicionarTarefa(), contarEssenciais(), contarEssenciaisConcluidas(), editarTarefa(), LIMITE_TAREFAS_ESSENCIAIS, limiteEssenciaisAtingido() (+11 more)

### Community 46 - "Block Rules Hook (Installed Apps)"
Cohesion: 0.26
Nodes (18): limparAppsForaDaListaCurada(), hojeISOLocal(), filtrarRedesSociaisInstaladas(), APPS_INSTALADOS, JANELA, showToast, useRegrasBloqueio(), carregar() (+10 more)

### Community 47 - "Intercept Screen Action Handlers"
Cohesion: 0.12
Nodes (13): CONFIG_BLOCO_PADRAO, abrirApp(), InterceptScreen(), abrirAppEFechar(), handleAcessoRapido(), handleEmergenciaConcluida(), handleLiberarBloco(), handleSessaoDeFoco() (+5 more)

### Community 48 - "iOS App Delegate (Swift)"
Cohesion: 0.12
Nodes (6): AppDelegate, ReactNativeDelegate, React, React_RCTAppDelegate, ReactAppDependencyProvider, UIKit

### Community 49 - "Google/Firebase Auth Setup"
Cohesion: 0.12
Nodes (10): GoogleAuthProvider, @react-native-firebase/auth@^26.4.0, @react-native-google-signin/google-signin@^16.1.5, @react-native-firebase/auth, @react-native-google-signin/google-signin, ReauthPromptModalProps, UseAccountDeletionResultado, ProvedorConta (+2 more)

### Community 50 - "Firestore Mock & Storage"
Cohesion: 0.12
Nodes (11): armazenamento, arrayUnion, deleteDoc, ehMapa(), getDoc, getDocs, increment, resolverArrayUnion() (+3 more)

### Community 51 - "Tutorial Slide & Step Dots"
Cohesion: 0.16
Nodes (14): StepDots(), StepDotsProps, styles, styles, TutorialSlide(), TutorialSlideBotao, TutorialSlideProps, CicloList() (+6 more)

### Community 52 - "Block Phase State Enum (Kotlin)"
Cohesion: 0.19
Nodes (6): FaseBloqueio, AGUARDANDO_LIBERACAO, COOLDOWN, SALDO_ZERADO, SESSAO_ATIVA, SaldoBloqueioPrefsTest

### Community 53 - "Loading Indicator & Selo Components"
Cohesion: 0.16
Nodes (12): LoadingIndicator(), LoadingIndicatorProps, styles, TAMANHO_ICONE, Selo(), SeloProps, styles, BLOCOS (+4 more)

### Community 54 - "Routine Confirmation Screen & Back Gesture"
Cohesion: 0.21
Nodes (12): LuaDecorativa(), styles, useVoltarFisico(), Campo, dateParaHorario(), horarioParaDate(), Horarios, LinhaHorario() (+4 more)

### Community 55 - "Shutdown Warning Display Conditions"
Cohesion: 0.18
Nodes (13): CondicoesExibicao, CondicoesRegistroNaAbertura, deveExibirLembrete(), deveRegistrarDesligamentoNaAbertura(), horariosLembretes(), LembreteAgendavel, lembretesAgendaveis(), noveHorasDepois() (+5 more)

### Community 56 - "Auth Error Mapping & Crashlytics Flags"
Cohesion: 0.24
Nodes (9): @react-native-firebase/crashlytics, MOSTRAR_TESTAR_CRASHLYTICS, mapearErroAuth(), MENSAGENS_POR_CODIGO, erroMapeado(), useAuth(), crashlytics(), setUsuarioId() (+1 more)

### Community 57 - "Routine Domain (Night Window)"
Cohesion: 0.23
Nodes (13): dentroDaJanelaNoturna(), DiaRotina, estimarRotina(), FormaResumoRotina, formatar(), horarioPausaMaior(), horariosRotinaValidos(), mediana() (+5 more)

### Community 58 - "Block Config Resolver Domain"
Cohesion: 0.26
Nodes (14): avisoUmMinutoAtivo(), ConfigBloco, msAteAviso(), msAteEsgotar(), msRestantes(), permiteUso(), resolverConfigBloco(), valorObservado() (+6 more)

### Community 59 - "Focus Session Hook Domain"
Cohesion: 0.21
Nodes (13): OrigemSessaoFoco, ResultadoSessaoFoco, SessaoFoco, FaseSessaoFoco, useFocusSession(), UseFocusSessionParams, UseFocusSessionResultado, limparSessaoAtiva() (+5 more)

### Community 63 - "Intercept Feature Architecture Overview"
Cohesion: 0.17
Nodes (15): Acesso Rápido, Cooldown (45 min), HU-04 (Sessões com Cooldown), HU-05 (Válvulas de Escape), HU-11 (Outras Saídas / Janela Noturna), Interceptação de Bloqueio, InterceptScreen (Máquina de Estados), Métricas (Firebase Analytics) (+7 more)

### Community 64 - "Firebase Auth Mock"
Cohesion: 0.13
Nodes (10): createUserWithEmailAndPassword, deleteUser, EmailAuthProvider, listeners, reauthenticateWithCredential, sendPasswordResetEmail, signInWithCredential, signInWithEmailAndPassword (+2 more)

### Community 65 - "Notification Destination Hook"
Cohesion: 0.24
Nodes (9): ACAO_BLOQUEIO, consumirMock, mockDispatch, useAbrirDestinoDaNotificacao(), abrir(), consumirDestinoNotificacao(), EVENTO_DESTINO_NOTIFICACAO, moduloNativo() (+1 more)

### Community 66 - "Progress Screen Test Setup"
Cohesion: 0.14
Nodes (9): aoTocarMedirTempoPadrao, buscarDiaPadrao, DESAFIO_MENSAL, DESAFIO_SEMANAL, limparSelecaoPadrao, recarregarDesafiosPadrao, recarregarPadrao, recarregarResumoRedesPadrao (+1 more)

### Community 68 - "Weekly Reflection & Network Card"
Cohesion: 0.22
Nodes (11): ReflexaoSemanalSheetProps, alturaPct(), ResumoRedesCard(), ResumoRedesCardProps, ROTULO_BARRA, styles, RESUMO_BASE, BarraDia (+3 more)

### Community 70 - "Project Architecture & Build Docs"
Cohesion: 0.17
Nodes (12): HU-02 (Coleta de Uso), HU-06 (Fricção Noturna), Integração Nativa Android, Rotina Estimada e Janela Noturna, Aviso de Bloqueio Desligado (HU-03), Comandos de Build/Teste, Dependências do Projeto, Estrutura de Pastas (+4 more)

### Community 71 - "Intercept Screen State Domain"
Cohesion: 0.21
Nodes (11): SnapshotDia, saldoDisponivel(), EstadoTravado, ParametrosSessaoTravado, UseTravadoFlowResultado, SessaoAtivaNativa, InterceptScreenProps, Modo (+3 more)

### Community 73 - "Intercept Types & Hook"
Cohesion: 0.33
Nodes (8): AcaoIntercept, DailyLog, EstadoTela, Interceptacao, UsoApp, useIntercept(), UseInterceptResultado, registrarInterceptacaoNoDia()

### Community 74 - "Social Network Apps Domain"
Cohesion: 0.29
Nodes (6): appsIniciaisSelecionados(), NOME_APP_POR_PACOTE, nomeDoApp(), PACOTE_YOUTUBE, PACOTES_REDES_SOCIAIS, manifesto

### Community 76 - "Dev Workflow Conventions (CLAUDE.md)"
Cohesion: 0.25
Nodes (4): /lux-build (Claude Code), lux-hu (skill claude.ai), lux-revisor, Verificação (npm install, tsc, junit)

### Community 77 - "Motivational Phrase Themes"
Cohesion: 0.22
Nodes (9): Elemento-Assinatura: Sistema de Raízes, Banco de Frases Motivacionais Neutras, Tema: Desconforto e Tolerância, Tema: Disciplina e Ação, Tema: Foco e Distração, Tema: Identidade e Consistência, Tema: Pequenos Passos, Tema: Recomeço e Recaída (+1 more)

### Community 78 - "Notifee Mock Module"
Cohesion: 0.22
Nodes (7): cancelAllNotifications, cancelTriggerNotification, cancelTriggerNotifications, createChannel, createTriggerNotification, notifee, requestPermission

### Community 80 - "Product Vision Key Decisions"
Cohesion: 0.25
Nodes (8): Bloqueio de Apps (Decisão), Decisões Já Fechadas, Monetização (Assinatura), Ciclo Celular→Distração→Culpa→Procrastinação, Decisões-Chave Já Tomadas, Métrica de Sucesso: Retenção em 7 Dias, Organização por Domínio Funcional, Rootora (Visão Geral)

### Community 81 - "Biblical Verse Bank & Themes"
Cohesion: 0.25
Nodes (7): Banco de Versículos (Toggle Opcional Futuro), Schema biblicalPhrases no Firestore, Tema: Ação Diante da Paralisia, Tema: Domínio Próprio e Foco, Tema: Identidade e Propósito, Tema: Pequenos Começos e Constância, Tema: Recomeço Sem Vergonha

### Community 82 - "Project Foundations & Principles Docs"
Cohesion: 0.29
Nodes (4): Arquitetura (Resumo de Camadas), Regras de Texto (Copy), Rootora (Instruções do Projeto), Fundamentação Teórica do Projeto (PDF)

### Community 83 - "Visual Identity & Typography Docs"
Cohesion: 0.29
Nodes (5): Princípios de Layout, Identidade Visual Raiz, Tipografia Raiz, Tom de Voz Raiz, Tipografia (theme/typography.ts)

### Community 84 - "NPM Scripts"
Cohesion: 0.29
Nodes (7): scripts, android, android:wsl, ios, lint, start, test

### Community 85 - "Task List & Item Components"
Cohesion: 0.33
Nodes (4): TaskItem(), styles, TaskList(), TaskListProps

### Community 86 - "Streak Milestone Hook"
Cohesion: 0.48
Nodes (5): carregar(), useStreakMilestone(), buscar(), UseStreakMilestoneResultado, buscarSystemMessage()

### Community 87 - "Color Palette & Component Tokens"
Cohesion: 0.33
Nodes (5): Paleta de Cores Raiz, Componentes Base (Átomos), Componentes Compostos (Moléculas), Cores de Status (Histórico Semanal), Tokens de Cor (theme/colors.ts)

### Community 88 - "Crashlytics Mock Module"
Cohesion: 0.33
Nodes (3): crash, recordError, setUserId

### Community 89 - "Home Header Component"
Cohesion: 0.47
Nodes (4): HomeHeader(), HomeHeaderProps, saudacaoPeloHorario(), styles

### Community 91 - "Metro Bundler Config"
Cohesion: 0.40
Nodes (3): config, @react-native/metro-config@0.87.0, @react-native/metro-config

### Community 94 - "Challenge Card Status Domain"
Cohesion: 0.50
Nodes (4): ChallengeCardProps, MENSAGEM_STATUS, styles, StatusDesafio

### Community 95 - "Navigation Prop Types"
Cohesion: 0.50
Nodes (5): FeatureTourOverlayProps, RefAlvoTour, HojeStackProps, TabBarButtonComRefProps, HomeScreenProps

### Community 96 - "TypeScript Config"
Cohesion: 0.40
Nodes (4): exclude, extends, include, @react-native/typescript-config

### Community 97 - "Open Font License Texts"
Cohesion: 0.50
Nodes (4): IBM Plex Sans font (OFL license), Space Mono font (OFL license), Zilla Slab font (OFL license), SIL Open Font License v1.1

### Community 99 - "Project README & Build TODO"
Cohesion: 0.67
Nodes (3): Comandos (npm start/android/lint/test), README do projeto React Native (bootstrap @react-native-community/cli), TODO: Build nativo (RootoraUsoAppsModule.kt compilado fora do sandbox)

### Community 100 - "Docs Source-of-Truth Pointer"
Cohesion: 0.67
Nodes (3): /definition (origem/histórico do conteúdo migrado), docs/projeto/ (fonte única de verdade), Rootora (app mobile)

## Knowledge Gaps
- **108 isolated node(s):** `AGUARDANDO_LIBERACAO`, `SESSAO_ATIVA`, `COOLDOWN`, `SALDO_ZERADO`, `NENHUMA` (+103 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 673 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Session Info Sheet & Date Picker` to `Analytics & Tour Hooks`, `App List & Config Section Components`, `Navigation Links & Back Button`, `Toggle & Task Form Components`, `Dev Dependencies (package.json)`, `App Chip & Wait Count Components`, `Block Rule Decision Logic`, `Accessibility Permission & Cooldown Hooks`, `Daily Tasks Hook & Firestore`, `Challenges Domain Logic`, `SVG Icons & Empty/Watering States`, `Recovery State Card Component`, `Onboarding Steps Domain`, `Feature Tour Overlay Component`, `App Usage Aggregation Domain`, `Weekly/Daily History Domain`, `Streak & Date Domain Logic`, `Usage Access Hook & Profile Stack`, `Task Completed Overlay & Chip`, `Onboarding Step Components`, `Accessibility Event Sync Domain`, `Account Deletion & Consent Hooks`, `Progress Screen Detail Components`, `Rotina (Night Routine) Hook Domain`, `Intercept Confusion Timers Domain`, `Feature Tour Steps & Night Alternative Hook`, `Nighttime Pause Messages Domain`, `App Entry Point & Toast`, `Project Dependencies (package.json)`, `Block Rules Hook (Installed Apps)`, `Intercept Screen Action Handlers`, `Tutorial Slide & Step Dots`, `Loading Indicator & Selo Components`, `Routine Confirmation Screen & Back Gesture`, `Auth Error Mapping & Crashlytics Flags`, `Block Config Resolver Domain`, `Focus Session Hook Domain`, `Notification Destination Hook`, `Progress Screen Test Setup`, `Weekly Reflection & Network Card`, `Intercept Screen State Domain`, `Intercept Types & Hook`, `Task List & Item Components`, `Streak Milestone Hook`, `Home Header Component`, `Challenge Card Status Domain`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Are the 21 inferred relationships involving `registrarErro()` (e.g. with `useAbrirDestinoDaNotificacao.test.ts` and `useAccountDeletion.test.ts`) actually correct?**
  _`registrarErro()` has 21 INFERRED edges - model-reasoned connections that need verification._
- **What connects `AGUARDANDO_LIBERACAO`, `SESSAO_ATIVA`, `COOLDOWN` to the rest of the system?**
  _108 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Analytics & Tour Hooks` be split into smaller, more focused modules?**
  _Cohesion score 0.07425907425907426 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `Recovery State Card Component` to `App List & Config Section Components`, `Navigation Links & Back Button`, `Toggle & Task Form Components`, `Session Info Sheet & Date Picker`, `Dev Dependencies (package.json)`, `App Chip & Wait Count Components`, `Accessibility Permission & Cooldown Hooks`, `Daily Tasks Hook & Firestore`, `SVG Icons & Empty/Watering States`, `Onboarding Steps Domain`, `Feature Tour Overlay Component`, `App Usage Aggregation Domain`, `Streak & Date Domain Logic`, `Usage Access Hook & Profile Stack`, `Task Completed Overlay & Chip`, `Onboarding Step Components`, `Accessibility Event Sync Domain`, `Account Deletion & Consent Hooks`, `Progress Screen Detail Components`, `Rotina (Night Routine) Hook Domain`, `Feature Tour Steps & Night Alternative Hook`, `App Entry Point & Toast`, `Project Dependencies (package.json)`, `Intercept Screen Action Handlers`, `Tutorial Slide & Step Dots`, `Loading Indicator & Selo Components`, `Routine Confirmation Screen & Back Gesture`, `Notification Destination Hook`, `Weekly Reflection & Network Card`, `Intercept Screen State Domain`, `Task List & Item Components`, `Home Header Component`, `Challenge Card Status Domain`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `App List & Config Section Components` be split into smaller, more focused modules?**
  _Cohesion score 0.055944055944055944 - nodes in this community are weakly interconnected._
- **Why does `@testing-library/react-native` connect `Session Info Sheet & Date Picker` to `Analytics & Tour Hooks`, `App List & Config Section Components`, `Navigation Links & Back Button`, `Toggle & Task Form Components`, `Dev Dependencies (package.json)`, `App Chip & Wait Count Components`, `Block Rule Decision Logic`, `Accessibility Permission & Cooldown Hooks`, `Daily Tasks Hook & Firestore`, `Challenges Domain Logic`, `SVG Icons & Empty/Watering States`, `Recovery State Card Component`, `Onboarding Steps Domain`, `Feature Tour Overlay Component`, `App Usage Aggregation Domain`, `Weekly/Daily History Domain`, `Usage Access Hook & Profile Stack`, `Task Completed Overlay & Chip`, `Onboarding Step Components`, `Accessibility Event Sync Domain`, `Account Deletion & Consent Hooks`, `Progress Screen Detail Components`, `Rotina (Night Routine) Hook Domain`, `Intercept Confusion Timers Domain`, `Feature Tour Steps & Night Alternative Hook`, `Nighttime Pause Messages Domain`, `App Entry Point & Toast`, `Block Rules Hook (Installed Apps)`, `Intercept Screen Action Handlers`, `Tutorial Slide & Step Dots`, `Loading Indicator & Selo Components`, `Routine Confirmation Screen & Back Gesture`, `Auth Error Mapping & Crashlytics Flags`, `Block Config Resolver Domain`, `Focus Session Hook Domain`, `Notification Destination Hook`, `Progress Screen Test Setup`, `Weekly Reflection & Network Card`, `Intercept Types & Hook`, `Streak Milestone Hook`, `Home Header Component`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._