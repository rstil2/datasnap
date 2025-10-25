/// <reference types="node" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_APP_ENV?: string;
  readonly DEV?: boolean;
  readonly PROD?: boolean;
  readonly MODE?: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Webpack environment variables
declare const process: {
  env: {
    NODE_ENV: 'development' | 'production' | 'test';
    [key: string]: any;
  };
};