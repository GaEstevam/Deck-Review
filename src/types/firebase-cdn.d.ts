// Os módulos do Firebase vêm do CDN em tempo de execução; os tipos vêm do pacote npm "firebase".
// Ao trocar a versão, atualize as URLs aqui, em src/firebase/sdk.ts, src/firebase/*.ts e o pacote no package.json.
declare module 'https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js' {
  export * from 'firebase/app';
}
declare module 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js' {
  export * from 'firebase/auth';
}
declare module 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js' {
  export * from 'firebase/firestore';
}
