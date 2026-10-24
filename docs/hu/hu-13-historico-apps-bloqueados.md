# HU-13 — [Progresso] Tempo nas redes só dos apps bloqueados, por app

> Facelift 2026 · correção sobre a HU-08 (já implementada)
> Protótipo: `docs/hu/hu-13-historico-apps-bloqueados.html` (telas 13.1 e 13.2) · visão geral em `docs/hu/rootora-facelift-visao-geral.html`
> Fontes: `schema-firebase.md` §3 (`dailyLogs.usoApps`, por pacote), `regras-de-negocio.md` §4, HU-08 (`docs/hu/hu-08-progresso-redes.md`)

---

## 1. Título

**[Progresso] Tempo nas redes só dos apps bloqueados, por app**

## 2. Cartão da HU

* **Como um(a):** pessoa que bloqueia algumas redes mas usa outras de propósito (ex.: YouTube para estudar, com o bloqueio desmarcado)
* **Eu quero:** ver o tempo de uso separado por app, só dos apps que eu realmente escolhi bloquear
* **Para que eu possa:** acompanhar o padrão que me importa, sem ele ser inflado por um app que uso de boa vontade

## 3. Protótipo / UX UI

Arquivo `docs/hu/hu-13-historico-apps-bloqueados.html`:

| Tela | Estado | O que muda |
|---|---|---|
| 13.1 | `ResumoRedesCard` com lista por app | Abaixo do total da semana, uma lista "Instagram 4h10min · TikTok 2h30min", só dos apps bloqueados |
| 13.2 | `DayDetailSheet` com apps filtrados | O bloco "NAS REDES" lista só os apps bloqueados do dia, não a lista curada inteira |

**O problema que corrige:** `usoApps` já é gravado por pacote no Firestore, mas a HU-08 soma **todos os pacotes da lista curada instalados** (RN02/RN07 daquela HU) — inclusive apps como o YouTube, que por padrão vem desmarcado do bloqueio justamente porque muita gente o usa para estudar. O número mostrado hoje mistura o que a pessoa quer acompanhar com o que ela decidiu deixar livre.

Arquivos impactados (confirmar no código):
- `src/domain/resumoRedes.ts`: `agregarUsoPorDia`/equivalente passa a filtrar por `regrasBloqueio.apps`, não pela lista curada inteira
- `src/components/progress/ResumoRedesCard.tsx`: nova lista por app
- `src/components/progress/DayDetailSheet.tsx`: bloco "NAS REDES" com a lista já filtrada

## 4. Regras de Negócio

* **RN01 — Filtro:** `ResumoRedesCard` e o bloco "NAS REDES" do `DayDetailSheet` somam e listam só os pacotes presentes em `regrasBloqueio.apps` — nunca a lista curada inteira. Corrige a RN02 e a RN07 da HU-08.
* **RN02 — Lista por app:** o card ganha uma lista abaixo do total da semana, ordenada do maior pro menor tempo: "Instagram 4h10min · TikTok 2h30min". Com só 1 app bloqueado, a lista não aparece — o total já é esse app, não há o que separar.
* **RN03 — Filtro é sempre pela lista vigente:** mudar quais apps estão bloqueados (marcar/desmarcar na `BloqueioAppsScreen`) não reescreve nenhum `dailyLog` antigo. O filtro usado para mostrar o card e o detalhe do dia é sempre a lista de apps bloqueados **no momento em que a tela é aberta**, não a lista que estava vigente em cada dia histórico.
* **RN04 — Desmarcar um app:** a partir da próxima vez que a pessoa abre o Progresso, um app desmarcado do bloqueio para de aparecer no card e no detalhe de qualquer dia, inclusive dias passados. O dado continua existindo em `usoApps` — só não é mais mostrado.
* **RN05 — Sem limite de "2 apps":** o teto de "os 2 apps com mais tempo" do detalhe do dia (RN07 da HU-08) é removido — com a lista já filtrada aos apps bloqueados, o bloco mostra todos eles (na prática, poucos, pelo tamanho da lista curada).
* **RN06 — Nenhum app bloqueado:** com `regrasBloqueio.apps` vazio ou `regrasBloqueio` nunca configurado, o card usa o mesmo estado já previsto pra "sem acesso de uso" (RN04 da HU-08) — não há o que medir sem nenhum app selecionado.
* **RN07 — Sem efeito colateral:** é um filtro de leitura. Nenhuma mudança de schema, Firestore, streak ou `statusDia`.

## 5. Critérios de Aceite (BDD/Gherkin)

```gherkin
Cenário 1: Card mostra só apps bloqueados
  Dado que bloqueei Instagram e TikTok, com YouTube desmarcado
  E usei os três apps esta semana
  Quando abro a aba Progresso
  Então o tempo total do card soma só Instagram e TikTok
  E o YouTube não aparece em nenhum lugar do card

Cenário 2: Lista por app ordenada por tempo
  Dado que bloqueei Instagram (4h10min) e TikTok (2h30min) esta semana
  Quando vejo o ResumoRedesCard
  Então vejo "Instagram 4h10min · TikTok 2h30min", nessa ordem

Cenário 3: Um único app bloqueado não mostra lista
  Dado que só o Instagram está bloqueado
  Quando vejo o ResumoRedesCard
  Então não vejo a lista por app, só o total da semana

Cenário 4: Desmarcar um app o remove do histórico mostrado
  Dado que o TikTok estava bloqueado e tem uso registrado em dias passados
  Quando desmarco o TikTok do bloqueio e reabro o Progresso
  Então o TikTok não aparece mais no card nem no detalhe de nenhum dia
  E o dado de uso do TikTok continua existindo no Firestore

Cenário 5: Nenhum app bloqueado mostra o estado vazio
  Dado que regrasBloqueio.apps está vazio
  Quando abro a aba Progresso
  Então vejo o mesmo estado hoje usado para "sem acesso de uso"

Cenário 6: Detalhe do dia sem o teto de 2 apps
  Dado que bloqueei 3 apps e todos têm uso num mesmo dia
  Quando toco na pílula desse dia
  Então vejo os 3 apps no bloco "NAS REDES", não só os 2 com mais tempo
```

## 6. Testes sugeridos

Seguindo o CLAUDE.md: `describe('HU-13 · Histórico só dos apps bloqueados', ...)` e `it('Cenário N: ...')`.

- `domain/resumoRedes.ts` (prioridade): filtro por `regrasBloqueio.apps`, ordenação da lista por app, caso de app único (sem lista), caso de lista vazia (estado vazio), ausência do teto de 2 apps
- `ResumoRedesCard`: variante com lista por app e variante sem (1 app só)
- `DayDetailSheet`: bloco "NAS REDES" com N apps, sem teto

## 7. Pendências

Nenhuma decisão de produto em aberto.
