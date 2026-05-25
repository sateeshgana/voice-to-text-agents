import type { Language } from './types'

export const LANGUAGES: Language[] = [
  { code: 'hi', name: 'Hindi',      nativeName: 'हिंदी',      script: 'Devanagari', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali',    nativeName: 'বাংলা',      script: 'Bengali',    flag: '🇮🇳' },
  { code: 'te', name: 'Telugu',     nativeName: 'తెలుగు',     script: 'Telugu',     flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi',    nativeName: 'मराठी',      script: 'Devanagari', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil',      nativeName: 'தமிழ்',      script: 'Tamil',      flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu',       nativeName: 'اردو',       script: 'Arabic',     flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati',   nativeName: 'ગુજરાતી',   script: 'Gujarati',   flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada',    nativeName: 'ಕನ್ನಡ',     script: 'Kannada',    flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam',  nativeName: 'മലയാളം',    script: 'Malayalam',  flag: '🇮🇳' },
  { code: 'or', name: 'Odia',       nativeName: 'ଓଡ଼ିଆ',     script: 'Odia',       flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi',    nativeName: 'ਪੰਜਾਬੀ',   script: 'Gurmukhi',   flag: '🇮🇳' },
  { code: 'as', name: 'Assamese',   nativeName: 'অসমীয়া',   script: 'Bengali',    flag: '🇮🇳' },
  { code: 'mai',name: 'Maithili',   nativeName: 'मैथिली',    script: 'Devanagari', flag: '🇮🇳' },
  { code: 'sa', name: 'Sanskrit',   nativeName: 'संस्कृतम्', script: 'Devanagari', flag: '🇮🇳' },
  { code: 'sat',name: 'Santali',    nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', script: 'Ol Chiki',   flag: '🇮🇳' },
  { code: 'ks', name: 'Kashmiri',   nativeName: 'कॉशुर',      script: 'Devanagari', flag: '🇮🇳' },
  { code: 'ne', name: 'Nepali',     nativeName: 'नेपाली',    script: 'Devanagari', flag: '🇮🇳' },
  { code: 'sd', name: 'Sindhi',     nativeName: 'سنڌي',      script: 'Arabic',     flag: '🇮🇳' },
  { code: 'kok',name: 'Konkani',    nativeName: 'कोंकणी',    script: 'Devanagari', flag: '🇮🇳' },
  { code: 'doi',name: 'Dogri',      nativeName: 'डोगरी',     script: 'Devanagari', flag: '🇮🇳' },
  { code: 'mni',name: 'Manipuri',   nativeName: 'মৈতৈলোন্',  script: 'Bengali',    flag: '🇮🇳' },
  { code: 'brx',name: 'Bodo',       nativeName: 'बड़ो',       script: 'Devanagari', flag: '🇮🇳' },
  { code: 'en-IN', name: 'English (Indian)', nativeName: 'English', script: 'Latin', flag: '🇮🇳' },
]

export const DEFAULT_LANGUAGE = LANGUAGES[0] // Hindi

export function getLanguageByCode(code: string): Language {
  return LANGUAGES.find(l => l.code === code) ?? DEFAULT_LANGUAGE
}
