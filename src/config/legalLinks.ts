/**
 * URLs públicas dos documentos legais do Rootora, hospedados no Firebase
 * Hosting do projeto (raiz-app-71d02). Fonte única da verdade — SignUpScreen
 * e PerfilScreen importam daqui, ninguém hardcoda a URL de novo.
 *
 * O HTML dessas páginas vive em `docs/legal/` e é publicado com
 * `firebase deploy --only hosting` (ver docs/legal/README.md). As rotas
 * `/privacidade` e `/termos` são reescritas para os arquivos .html no
 * `firebase.json`.
 */
const BASE_HOSTING = 'https://raiz-app-71d02.web.app';

export const URL_POLITICA_PRIVACIDADE = `${BASE_HOSTING}/privacidade`;
export const URL_TERMOS_DE_USO = `${BASE_HOSTING}/termos`;

export const ROTULO_POLITICA_PRIVACIDADE = 'Política de Privacidade';
export const ROTULO_TERMOS_DE_USO = 'Termos de Uso';
