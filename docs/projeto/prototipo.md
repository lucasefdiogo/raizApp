# Protótipo e Telas — Rootora

> Consolidado de `docs/design/prototipo/*.html` (protótipos atuais, por estado de tela),
> `definition/wireframes/*.html` (histórico, desatualizado) e `definition/navegacao-componentes.md`
> (árvore real de navegação).

## Protótipos atuais (`docs/design/prototipo/`)

HTML estático, um arquivo por funcionalidade, cada um mostrando os **estados reais da tela**
lado a lado (normal / carregando / vazio / erro — nomenclatura de `data-estado`), já na paleta e
tipografia do design system (`design-system.md`). Refletem o motor de sessões/válvulas/rotina
noturna (ver `spec.md`, regra de negócio seção 5).

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

Árvore completa e lógica de decisão em `definition/navegacao-componentes.md` (ainda não
migrado integralmente para `docs/projeto/` — este resumo cobre as telas, não os detalhes de
composição por componente).

**`RootNavigator`** (Stack único): Splash → Tutorial (4 slides) → SignIn/SignUp/ForgotPassword
→ Onboarding (1 tela, 4 passos internos: Foco, TempoTela, Porquê, PrimeiraTarefa) →
NotificationPriming (uma vez) → Main.

**`Main` → `MainTabNavigator`** (abas Hoje / Progresso / Perfil):

- **HojeStack:** HomeScreen (padrão) · RecoveryStateScreen (condicional, dia perdido/protegido
  de ontem) · ReturnAfterPauseScreen (condicional, streak pausado) · RotinaConfirmacaoScreen
  (condicional, estimativa de rotina calculada) · AlternativaNoturnaScreen (condicional, uma
  vez, após confirmar rotina)
- **ProgressoStack:** ProgressoScreen
- **PerfilStack:** PerfilScreen · BloqueioAppsScreen · RotinaPerfilScreen ·
  DivulgacaoAcessibilidadeScreen · DivulgacaoAcessoUsoScreen

**Root separado `Intercept`** (fora do `RootNavigator`, Activity Android própria): monta
`InterceptScreen`, que decide entre `PausaIntencaoScreen`, aviso de sessão ativa,
`EsperaBloqueioScreen` (cooldown/saldo zerado, com acesso rápido/emergência/sessão de foco/
tarefas extras). TravadoFlow (4 chips) só existe no root principal, acessível pela Home e por
toque longo numa tarefa — não é montado pelo root `Intercept`.

## Histórico (desatualizado) — `definition/wireframes/`

Os 3 arquivos abaixo são de fases anteriores do projeto (antes do motor de sessões/cooldown e
da identidade visual final) e **não refletem o design system ou a navegação atuais**. Mantidos
como referência histórica, não como fonte de verdade de UI:

| Arquivo | Conteúdo |
|---|---|
| `comparacao-3-identidades-9-telas.html` | Comparação exploratória de 3 identidades visuais candidatas, 3 telas cada — fase de decisão de marca, já resolvida em favor de "Raiz" |
| `telas-raiz-completo.html` | Conjunto mais completo de telas da identidade Raiz, de uma versão anterior do app (antes do motor de sessões atual) |
| `wireframes-mvp.html` | Wireframes da fase "MVP" original — terminologia de fase (MVP/Fase2/Fase3) está aposentada no projeto atual, ver `CLAUDE.md` |

Ao desenhar uma tela nova, usar `docs/design/prototipo/` e `design-system.md` como referência —
nunca os arquivos desta seção.
