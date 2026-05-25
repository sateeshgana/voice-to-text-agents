import { useState }          from 'react'
import { LanguageSelector } from './components/LanguageSelector'
import { Recorder }         from './components/Recorder'
import { TextPreview }      from './components/TextPreview'
import { ExportPanel }      from './components/ExportPanel'
import { HistoryDrawer }    from './components/HistoryDrawer'
import { SupportForm }      from './components/SupportForm'
import { useAppStore }      from './store/appStore'
// Auth is disabled for now — re-enable by uncommenting useAuth below
// import { useAuth }       from './hooks/useAuth'

export default function App() {
  const { history, language } = useAppStore()
  // const { user, login, logout } = useAuth()
  const [supportOpen, setSupportOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#ff6b35] to-[#e63946] shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-xl leading-tight">🎙 VoiceIndia</h1>
            <p className="text-white/70 text-xs" dir={language.rtl ? 'rtl' : 'ltr'}>
              {language.code === 'en-IN'
                ? 'Speak, Write'
                : `${language.tagline} — Speak, Write`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            {history.length > 0 && <HistoryDrawer />}
            {/* Sign In / Sign Out — disabled; uncomment when auth is re-enabled
            {user ? (
              <button onClick={logout} className="text-white/80 hover:text-white text-xs font-medium">
                Sign Out
              </button>
            ) : (
              <button onClick={login} className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                Sign In
              </button>
            )}
            */}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Mobile: single column | Desktop: two columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Left panel: Recorder */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Record</h2>
            <Recorder />
          </section>

          {/* Right panel: Transcript + Export */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5">
            <TextPreview />
            <hr className="border-orange-100" />
            <ExportPanel />
          </section>

        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-300 mt-8">
          Powered by Groq · DeepSeek · Hosted free on Netlify
        </p>
      </main>

      {/* Floating help button — bottom right */}
      <button
        onClick={() => setSupportOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full shadow-lg
          bg-gradient-to-br from-[#ff6b35] to-[#e63946] text-white text-xl
          flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        aria-label="Open support form"
        title="Help &amp; Support"
      >
        ?
      </button>

      {/* Support / Help modal */}
      <SupportForm open={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  )
}
