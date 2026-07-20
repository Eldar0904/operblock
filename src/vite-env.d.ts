/// <reference types="vite/client" />



interface ImportMetaEnv {

  readonly VITE_CLERK_PUBLISHABLE_KEY: string;

  readonly VITE_API_URL?: string;

}



interface ImportMeta {

  readonly env: ImportMetaEnv;

}



declare global {

  interface Window {

    REPLIT_APP_THEME_TOKENS?: Record<string, unknown>;

  }

}



export {};

