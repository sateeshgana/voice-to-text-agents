import { LANGUAGES } from '@shared/languages'
import { useAppStore } from '../store/appStore'

export function LanguageSelector() {
  const { language, setLanguage } = useAppStore()

  return (
    <select
      value={language.code}
      onChange={(e) => setLanguage(LANGUAGES.find(l => l.code === e.target.value)!)}
      className="bg-white/20 text-white font-semibold rounded-lg px-3 py-1.5 text-sm
                 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50
                 cursor-pointer"
      aria-label="Select language"
    >
      {LANGUAGES.map(lang => (
        <option key={lang.code} value={lang.code} className="text-gray-800 bg-white">
          {lang.flag} {lang.nativeName} ({lang.name})
        </option>
      ))}
    </select>
  )
}
