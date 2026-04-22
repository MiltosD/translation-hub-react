/**
 * Application Configuration
 * Edit this file to configure API endpoints, Keycloak, and other settings
 */

import { s } from "node_modules/vite/dist/node/types.d-aGj9QkWt";

export const appConfig = {
  // Keycloak OIDC Configuration
  keycloak: {
    url: 'https://ldssetupdev.ilsp.gr/authreg/',
    realm: 'TRANSLATION',
    clientId: 'translation-hub-pub',
  },

  // API Configuration - Base URL for Django backend
  api: {
    baseUrl: 'http://localhost:8000/api/v1/', // Will be same-origin in production
    endpoints: {
      translations: 'translations',
      import: 'translations/import',
      export: 'translations/export',
    },
  },

  // Available languages for translations
  languages: [
    { code: 'bg', name: 'Bulgarian' },
    { code: 'hr', name: 'Croatian' },
    { code: 'de', name: 'German' },
    { code: 'fr', name: 'French' },
    { code: 'es', name: 'Spanish' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'nl', name: 'Dutch' },
    { code: 'pl', name: 'Polish' },
    { code: 'sv', name: 'Swedish' },
    { code: 'da', name: 'Danish' },
    { code: 'fi', name: 'Finnish' },
    { code: 'el', name: 'Greek' },
    { code: 'cs', name: 'Czech' },
    { code: 'ro', name: 'Romanian' },
    { code: 'hu', name: 'Hungarian' },
    { code: "ga", name: "Irish" },
    { code: 'lv', name: 'Latvian' },
    { code: 'lt', name: 'Lithuanian' },
    { code: 'et', name: 'Estonian' },
    { code: 'mt', name: 'Maltese' },
    { code: 'sk', name: 'Slovak' },
    { code: 'sl', name: 'Slovenian' }
  ],

  // Bucket options (admin only)
  buckets: [
    { id: 'DCAT-AP', name: 'DCAT-AP' },
    { id: 'METADATA', name: 'METADATA' },
    { id: 'MESSAGES', name: 'MESSAGES' },
  ],

  // Category options (admin only)
  categories: [
    { id: 'CONNECTOR', name: 'CONNECTOR' },
    { id: 'FC', name: 'FC' },
  ],

  // Table display settings
  table: {
    textTruncateLength: 40,
    pageSize: 20,
  },
};

export type Language = (typeof appConfig.languages)[number];
export type Bucket = (typeof appConfig.buckets)[number];
export type Category = (typeof appConfig.categories)[number];
