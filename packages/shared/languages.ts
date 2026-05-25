import type { Language, LanguageCode } from './types'

export const LANGUAGES: Language[] = [
  { code: 'hi',    name: 'Hindi',            nativeName: 'हिंदी',        script: 'Devanagari', flag: '🇮🇳', tagline: 'बोलो, लिखो' },
  { code: 'bn',    name: 'Bengali',          nativeName: 'বাংলা',        script: 'Bengali',    flag: '🇮🇳', tagline: 'বলো, লেখো' },
  { code: 'te',    name: 'Telugu',           nativeName: 'తెలుగు',       script: 'Telugu',     flag: '🇮🇳', tagline: 'మాట్లాడు, రాయి' },
  { code: 'mr',    name: 'Marathi',          nativeName: 'मराठी',        script: 'Devanagari', flag: '🇮🇳', tagline: 'बोला, लिहा' },
  { code: 'ta',    name: 'Tamil',            nativeName: 'தமிழ்',        script: 'Tamil',      flag: '🇮🇳', tagline: 'பேசு, எழுது' },
  { code: 'ur',    name: 'Urdu',             nativeName: 'اردو',         script: 'Arabic',     flag: '🇮🇳', tagline: 'بولو، لکھو',   rtl: true },
  { code: 'gu',    name: 'Gujarati',         nativeName: 'ગુજરાતી',     script: 'Gujarati',   flag: '🇮🇳', tagline: 'બોલો, લખો' },
  { code: 'kn',    name: 'Kannada',          nativeName: 'ಕನ್ನಡ',       script: 'Kannada',    flag: '🇮🇳', tagline: 'ಮಾತಾಡಿ, ಬರೆಯಿರಿ' },
  { code: 'ml',    name: 'Malayalam',        nativeName: 'മലയാളം',      script: 'Malayalam',  flag: '🇮🇳', tagline: 'സംസാരിക്കൂ, എഴുതൂ' },
  { code: 'or',    name: 'Odia',             nativeName: 'ଓଡ଼ିଆ',       script: 'Odia',       flag: '🇮🇳', tagline: 'କୁହ, ଲେଖ' },
  { code: 'pa',    name: 'Punjabi',          nativeName: 'ਪੰਜਾਬੀ',     script: 'Gurmukhi',   flag: '🇮🇳', tagline: 'ਬੋਲੋ, ਲਿਖੋ' },
  { code: 'as',    name: 'Assamese',         nativeName: 'অসমীয়া',     script: 'Bengali',    flag: '🇮🇳', tagline: 'কোৱা, লিখা' },
  { code: 'mai',   name: 'Maithili',         nativeName: 'मैथिली',      script: 'Devanagari', flag: '🇮🇳', tagline: 'बोलू, लिखू' },
  { code: 'sa',    name: 'Sanskrit',         nativeName: 'संस्कृतम्',   script: 'Devanagari', flag: '🇮🇳', tagline: 'वद, लिख' },
  { code: 'sat',   name: 'Santali',          nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ',   script: 'Ol Chiki',   flag: '🇮🇳', tagline: 'ᱵᱟᱲᱟᱣ, ᱞᱤᱠᱷᱟ' },
  { code: 'ks',    name: 'Kashmiri',         nativeName: 'کٲشُر',        script: 'Arabic',     flag: '🇮🇳', tagline: 'وانٛوو، لیکھو', rtl: true },
  { code: 'ne',    name: 'Nepali',           nativeName: 'नेपाली',      script: 'Devanagari', flag: '🇮🇳', tagline: 'बोल, लेख' },
  { code: 'sd',    name: 'Sindhi',           nativeName: 'سنڌي',        script: 'Arabic',     flag: '🇮🇳', tagline: 'ڳالهايو، لکو',  rtl: true },
  { code: 'kok',   name: 'Konkani',          nativeName: 'कोंकणी',      script: 'Devanagari', flag: '🇮🇳', tagline: 'उलय, बर' },
  { code: 'doi',   name: 'Dogri',            nativeName: 'डोगरी',       script: 'Devanagari', flag: '🇮🇳', tagline: 'बोलो, लिखो' },
  { code: 'mni',   name: 'Manipuri',         nativeName: 'মৈতৈলোন্',    script: 'Bengali',    flag: '🇮🇳', tagline: 'ꯃꯇꯦꯡ ꯄꯤꯕꯤ, ꯄꯣꯠꯊꯣꯛ' },
  { code: 'brx',   name: 'Bodo',             nativeName: 'बड़ो',         script: 'Devanagari', flag: '🇮🇳', tagline: 'बोलो, लिखो' },
  { code: 'en-IN', name: 'English (Indian)', nativeName: 'English',      script: 'Latin',      flag: '🇮🇳', tagline: 'Speak, Write' },
]

export const DEFAULT_LANGUAGE = LANGUAGES[0] // Hindi

export function getLanguageByCode(code: string): Language {
  return LANGUAGES.find(l => l.code === code) ?? DEFAULT_LANGUAGE
}

export function isValidLanguageCode(code: string): code is LanguageCode {
  return LANGUAGES.some(l => l.code === code)
}
