import { Schema } from 'mongoose';

export const LANGS = ['en', 'hi'] as const;
export type Lang = (typeof LANGS)[number];

/** A translatable string. English is mandatory and is the fallback for missing translations. */
export interface Localized {
  en: string;
  hi?: string | null;
}

export const LocalizedSchema = new Schema<Localized>(
  {
    en: { type: String, required: true, trim: true },
    hi: { type: String, trim: true },
  },
  { _id: false },
);

export const localize = (value: Localized | null | undefined, lang: Lang): string =>
  value ? (value[lang] || value.en) : '';
