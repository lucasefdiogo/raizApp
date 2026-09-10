# Documentos legais do Rootora

> **MINUTA.** `politica-privacidade.html` e `termos-de-uso.html` são rascunhos
> gerados automaticamente a partir do que o app tecnicamente coleta. **Precisam
> de revisão jurídica antes de irem para a Play Store.** O aviso em destaque no
> topo de cada arquivo não deve ser removido até essa revisão acontecer.

## O que tem aqui

| Arquivo | Conteúdo |
|---|---|
| `politica-privacidade.html` | Política de Privacidade (LGPD) |
| `termos-de-uso.html` | Termos de Uso |

O app referencia essas páginas por `src/config/legalLinks.ts` — a URL não é
hardcoded em tela nenhuma.

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

- Política de Privacidade: `https://raiz-app-71d02.web.app/privacidade`
- Termos de Uso: `https://raiz-app-71d02.web.app/termos`
- Mesmo conteúdo também em `https://raiz-app-71d02.firebaseapp.com/...`

São essas URLs que vão na ficha do app na Play Store (configurar a ficha está
fora do escopo desta tarefa). Se o site do Hosting for renomeado, atualizar
`src/config/legalLinks.ts` junto.

## Ainda pendente antes de publicar

- [ ] Revisão jurídica dos dois textos
- [ ] Confirmar / trocar o e-mail de contato (`lucasdiogo.s.i@gmail.com`)
- [ ] Definir data de vigência real em cada documento
- [ ] `firebase deploy --only hosting` e conferir as duas URLs no ar
- [ ] Preencher as URLs na ficha da Play Store
