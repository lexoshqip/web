/// <reference types="vite/client" />

declare module "*.svg" {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_APP_LINKS?: { appstore?: string; playstore?: string };
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
