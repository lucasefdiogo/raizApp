# Documentos legais do Rootora

> **Versão de 11/10/2026 — revisada e pronta para publicação.**
> `politica-privacidade.html` e `termos-de-uso.html` foram reescritos com base no
> que o app realmente coleta (`schema-firebase.md`, `regras-de-negocio.md`,
> `stack-tecnico.md`) e revisados quanto à LGPD, ao CDC e às políticas da Google
> Play. A revisão não substitui parecer de advogado com registro na OAB — vale
> buscar um antes de escalar a base de usuários ou de lançar a assinatura.

## O que tem aqui

| Arquivo | Conteúdo |
|---|---|
| `politica-privacidade.html` | Política de Privacidade (LGPD) |
| `termos-de-uso.html` | Termos de Uso |

O app referencia essas páginas por `src/config/legalLinks.ts` — a URL não é
hardcoded em tela nenhuma.

## Mantendo os textos alinhados ao código

Os dois documentos descrevem o comportamento real do app. **Atualize a Política
(e a data no topo) sempre que:**

- um campo ou subcoleção nova passar a ser gravado em `users/{uid}`;
- entrar um SDK novo que colete dados (ex.: FCM, `react-native-iap`);
- mudar o que o Accessibility Service lê ou registra;
- a assinatura for lançada (seção 13 da Política e seção 9 dos Termos);
- o app passar a ser operado pela Luxthor (trocar o controlador/responsável nos
  dois textos).

Os dois arquivos precisam continuar coerentes entre si: idade mínima (18+),
"não é serviço de saúde", responsável e e-mail de contato.

Mudança relevante na Política exige aviso prévio ao usuário (seção 15 dela).

## Hospedagem (Firebase Hosting)

A config está em `firebase.json` (raiz do repo):

- `public` aponta para `docs/legal/` — os `.html` são a fonte única da verdade,
  sem cópia.
- Reescritas: `/privacidade` → `politica-privacidade.html`,
  `/termos` → `termos-de-uso.html`.
- `.firebaserc` fixa o projeto `raiz-app-71d02`.

### Publicar

Precisa do Firebase CLI autenticado (`npm i -g firebase-tools` e
`firebase login`) — passo manual, não roda no CI nem via Claude Code.

```bash
firebase deploy --only hosting
```

### URLs públicas resultantes

| Uso | URL |
|---|---|
| Política de Privacidade (ficha da loja) | `https://raiz-app-71d02.web.app/privacidade` |
| Termos de Uso | `https://raiz-app-71d02.web.app/termos` |
| Exclusão de conta (formulário "Segurança dos dados") | `https://raiz-app-71d02.web.app/privacidade#excluir-conta` |

Mesmo conteúdo também em `https://raiz-app-71d02.firebaseapp.com/...`. Se o
site do Hosting for renomeado, atualizar `src/config/legalLinks.ts` junto.

## Ainda pendente antes de publicar

- [x] Revisão dos dois textos (LGPD, CDC, políticas da Google Play)
- [x] Definir data de vigência em cada documento (11/10/2026)
- [ ] Confirmar o e-mail de contato (`lucasdiogo.s.i@gmail.com`) ou trocar em
      todas as ocorrências dos dois arquivos
- [ ] Confirmar a retenção do Analytics no console do Firebase — a Política diz
      "até 14 meses" (o padrão do Firebase é 2 meses)
- [ ] `@react-native-firebase/messaging` está instalado mas sem uso: desativar o
      auto-init do FCM ou declarar o token de notificação na Política
- [ ] Conferir que a idade mínima (18+) bate com o "Público-alvo" no Play Console
- [ ] `firebase deploy --only hosting` e conferir as duas URLs no ar, incluindo
      a âncora `#excluir-conta`
- [ ] Preencher as URLs na ficha da Play Store e no formulário "Segurança dos dados"
