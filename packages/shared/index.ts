// packages/shared/index.ts
export type { Language, TranscribeRequest, TranscribeResponse, TranscribeError, HistoryItem } from './types'
export type { LanguageCode } from './types'
export { LANGUAGES, DEFAULT_LANGUAGE, getLanguageByCode, isValidLanguageCode } from './languages'
