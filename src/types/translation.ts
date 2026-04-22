import { S } from "vitest/dist/chunks/config.d.D2ROskhv.js";
import { B } from "vitest/dist/chunks/worker.d.1GmBbd7G.js";

export interface TranslationValue {
  language: string;
  value: string;
  auto?: boolean;
}

export interface Translation {
  id: number;
  text: string;
  translations: TranslationValue[];
  bucket?: string;
  client: string | null;
  message_field_name: string | null;
  category: string | null;
}

export interface User {
  id: string;
  username: string;
  client: string;
  roles: ('admin' | 'editor')[];
}

export type ExportFormat = 'json' | 'tsv' | 'xml' | 'yaml';
