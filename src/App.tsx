import { LanguageSelector } from './components/LanguageSelector'
import { Recorder }         from './components/Recorder'
import { TextPreview }      from './components/TextPreview'
import { ExportPanel }      from './components/ExportPanel'
import { HistoryDrawer }    from './components/HistoryDrawer'
import { useAppStore }      from './store/appStore'

export default function App() {
  const { history } = useAppStore()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#ff6b35] to-[#e63946] shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-xl leading-tight">🎙 VoiceIndia</h1>
            <p className="text-white/70 text-xs">बोलो, लिखो — Speak, Write</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            {history.length > 0 && <HistoryDrawer />}
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
          Powered by Groq · Gemini · Hosted free on Netlify
        </p>
      </main>
    </div>
  )
}
