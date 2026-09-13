# Procedimento da Loja — Rootora

> Passos adiados deliberadamente para depois do MVP/polimento — não bloqueiam
> desenvolvimento ou teste, mas são obrigatórios antes de publicar.

## 1. Conta de desenvolvedor Google Play
Criar a conta de desenvolvedor (taxa única) antes de qualquer submissão.

## 2. Publicação do app na Play Store
- Ficha da loja (descrição, screenshots, ícone — já pronto)
- Política de Privacidade e Termos de Uso — conteúdo já redigido (minuta), mas
  **precisa de revisão jurídica antes de publicar** e de hospedagem pública (Firebase
  Hosting já é parte do stack, não exige serviço novo)
- Justificativa de uso do **Accessibility Service** — obrigatória no formulário de
  submissão, é a permissão mais escrutinada pela revisão da loja. Usar como base o
  texto já validado na `AccessibilityPrimingScreen` (o que o app vê e o que não vê)
- Declaração de uso do `QUERY_ALL_PACKAGES` (necessário pra listar apps instaláveis no
  bloqueio de apps) — formulário próprio de justificativa, separado do anterior

## 3. Assinatura com 7 dias grátis

Escopo decidido: bloqueia o app inteiro sem assinatura ativa nem trial válido;
verificação via Cloud Function (servidor), não client-side.

Ordem de execução:
1. Criar o produto de assinatura no Google Play Console (plano base + oferta de 7
   dias grátis)
2. Migrar o projeto Firebase pro plano **Blaze** (pay-as-you-go — necessário pra
   Cloud Functions; tem faixa gratuita generosa, mas exige cartão cadastrado)
3. Configurar Real-time Developer Notifications (RTDN) via Pub/Sub no Google Cloud
4. Cloud Function de verificação de compra — chama a Google Play Developer API,
   confirma a assinatura, grava status no Firestore
5. Fluxo de compra no app (`react-native-iap`) — inicia a compra, aciona o trial,
   chama a verificação
6. Paywall — bloqueia o app quando não há assinatura ativa nem trial válido, com
   contagem regressiva dos 7 dias e "Restaurar compra"

Nenhum desses 6 passos foi iniciado ainda.
