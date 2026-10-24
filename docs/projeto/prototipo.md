# Protótipo e Telas — Rootora

> Protótipos HTML atuais (`docs/design/prototipo/`) e lista de telas reais do app.

## Protótipos atuais (`docs/design/prototipo/`)

HTML estático, um arquivo por funcionalidade, cada um mostrando os **estados reais da tela**
lado a lado (normal / carregando / vazio / erro — nomenclatura de `data-estado`), já na paleta e
tipografia do design system (`design-system.md`). Refletem o motor de sessões/válvulas/rotina
noturna ((ver `regras-de-negocio.md` §7 e §8)).

| Arquivo | Tela/fluxo | Estados mostrados |
|---|---|---|
| `bloqueio-apps.html` | Configuração de bloqueio (`BloqueioAppsScreen`) | Primeira configuração (lista de redes com checkbox, YouTube desmarcado por padrão) · carregando (esqueleto) · vazio ("Nenhuma rede social encontrada neste aparelho") |
| `divulgacao-acesso-uso.html` | `DivulgacaoAcessoUsoScreen` | Normal (pedido de consentimento) · sem-permissão (acesso de uso desligado, aviso que o bloqueio continua funcionando) |
| `intercept-sessoes.html` | `InterceptScreen` — pausa de intenção, sessão, cooldown | Pausa de intenção (textarea opcional + botão "Liberar" desabilitado por contagem) · sessão ativa (timer regressivo + aviso "1 minuto restante") · cooldown (contagem + atalhos de sessão de foco/tarefas extras) |
| `acesso-rapido-emergencia.html` | Válvulas de escape dentro do cooldown | Normal (botão "Acesso rápido (2 min)") · carregando (respiração guiada de emergência, 60s) · vazio (acesso rápido indisponível, mostra "próximo acesso rápido em X min" + opção de emergência) |
| `rotina-noturna.html` | Rotina estimada e janela noturna | Normal (confirmar horário estimado de dormir) · pergunta de alternativa noturna (uma vez, opcional) · pausa de intenção estendida dentro da janela noturna (espera dobrada + mensagem do banco `noturno`) |

Todos os 5 arquivos são abríveis direto no navegador (sem build), usam as mesmas fontes
(Zilla Slab/IBM Plex Sans/Space Mono via Google Fonts) e os tokens de cor do design system
hardcoded em `:root` — refletir qualquer mudança de paleta aqui também, se o protótipo
continuar em uso como referência.

## Lista de telas reais (estado atual do app)

A composição detalhada de cada tela é a do código (`src/screens/`, `src/navigation/`).

**`RootNavigator`** (Stack único): Splash → Tutorial (4 slides) → SignIn/SignUp/ForgotPassword
→ Onboarding (1 tela, 4 passos internos: Foco, TempoTela, Porquê, PrimeiraTarefa) →
NotificationPriming (uma vez) → Main.

**`Main` → `MainTabNavigator`** (abas Hoje / Progresso / Perfil):

- **HojeStack:** HomeScreen (padrão) · RecoveryStateScreen (condicional, dia perdido/protegido
  de ontem) · ReturnAfterPauseScreen (condicional, streak pausado) · RotinaConfirmacaoScreen
  (condicional, estimativa de rotina calculada) · AlternativaNoturnaScreen (condicional, uma
  vez, após confirmar rotina)
- **ProgressoStack:** ProgressoScreen (HU-08: `ResumoRedesCard`, bloco "Nas redes" no
  `DayDetailSheet`, `ReflexaoSemanalSheet` às segundas) · DivulgacaoAcessoUsoScreen
  (via link "Medir tempo", HU-08)
- **PerfilStack:** PerfilScreen · BloqueioAppsScreen · RotinaPerfilScreen ·
  DivulgacaoAcessibilidadeScreen · DivulgacaoAcessoUsoScreen

**Root separado `Intercept`** (fora do `RootNavigator`, Activity Android própria): monta
`InterceptScreen`, que decide entre `PausaIntencaoScreen`, aviso de sessão ativa,
`EsperaBloqueioScreen` (cooldown/saldo zerado, com acesso rápido/emergência/sessão de foco/
tarefas extras). TravadoFlow (4 chips) só existe no root principal, acessível pela Home e por
toque longo numa tarefa — não é montado pelo root `Intercept`.

