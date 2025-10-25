/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// (보수용) 가끔 에디터가 계속 못 찾을 때를 대비한 선언
declare module 'virtual:pwa-register' {
  export function registerSW(options?: { immediate?: boolean }): (reloadPage?: boolean) => void;
}
