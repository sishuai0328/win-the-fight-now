/**
 * Environment variable management utilities
 */

// Type-safe environment variable getter
export function getEnvVar(key: string): string {
  const value = import.meta.env[key];
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
}

// API configuration
export const API_CONFIG = {
  baseUrl: getEnvVar('VITE_API_BASE_URL'),
  timeout: parseInt(getEnvVar('VITE_API_TIMEOUT'), 10),
} as const;

// Model API keys
export const MODEL_API_KEYS = {
  deepseek: getEnvVar('VITE_DEEPSEEK_API_KEY'),
} as const;

// Feature flags
export const FEATURE_FLAGS = {
  enableAI: getEnvVar('VITE_ENABLE_AI_FEATURES') === 'true',
  enableAnalytics: getEnvVar('VITE_ENABLE_ANALYTICS') === 'true',
} as const;

// App configuration
export const APP_CONFIG = {
  env: getEnvVar('VITE_APP_ENV'),
  version: getEnvVar('VITE_APP_VERSION'),
} as const;

// Type definitions for environment variables
declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_API_TIMEOUT: string;
    readonly VITE_DEEPSEEK_API_KEY: string;
    readonly VITE_ENABLE_AI_FEATURES: string;
    readonly VITE_ENABLE_ANALYTICS: string;
    readonly VITE_APP_ENV: string;
    readonly VITE_APP_VERSION: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
} 