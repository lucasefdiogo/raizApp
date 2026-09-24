// Fixa o fuso ANTES de qualquer worker do Jest subir (fork herda o
// process.env do processo principal) — sem isso os testes rodam no fuso da
// máquina/CI (normalmente UTC), e um caso que só falha em GMT-3 (ex: 22h
// local virando o dia errado por causa de toISOString) passaria por
// acidente. Ver domain/data.ts pro racional completo do bug.
process.env.TZ = 'America/Sao_Paulo';

module.exports = {
  preset: '@react-native/jest-preset',
  transform: {
    '^.+\\.(js|ts|tsx|mjs)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens|lucide-react-native)/)',
  ],
};
