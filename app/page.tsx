"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Upload, Zap, Loader2, CheckCircle, FileSpreadsheet, 
  FileArchive, Copy, Download, Crown, LogIn, Globe, LogOut 
} from 'lucide-react';
import JSZip from 'jszip';
// @ts-ignore
import { saveAs } from 'file-saver';

const supabaseUrl = 'https://geixfrhlbaznjxaxpvrm.supabase.co';
const supabaseKey = 'sb_publishable_-vedbc51MiECfsLoEDXpPg_gaxVFs5x';
const supabase = createClient(supabaseUrl, supabaseKey);
const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export default function SEOWizard() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [lang, setLang] = useState('en');

  // 1. Detección de idioma y Sesión
  useEffect(() => {
    const browserLang = navigator.language.startsWith('es') ? 'es' : 'en';
    setLang(browserLang);

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        fetchCredits(session.user.email);
      } else {
        fetchCredits();
      }
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchCredits(session.user.email);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Traducciones Globales
  const t = {
    es: {
      title: "SEO WIZARD PRO",
      upgrade: "Mejora a Prime",
      limit: "Has alcanzado el límite gratuito. Inicia sesión para continuar.",
      btn: "Entrar con Google",
      upload: "Subir Imágenes",
      unlock: "Obtener Créditos",
      exit: "Salir",
      copy: "Copiado",
      prompt: "Analiza la imagen y responde solo JSON: {\"fileName\": \"nombre-archivo-seo\", \"altText\": \"descripcion alt detallada en español\"}"
    },
    en: {
      title: "SEO WIZARD PRO",
      upgrade: "Upgrade to Prime",
      limit: "Free limit reached. Sign in to access global premium features.",
      btn: "Sign in with Google",
      upload: "Upload Images",
      unlock: "Get Credits",
      exit: "Exit",
      copy: "Copied",
      prompt: "Analyze the image and respond only JSON: {\"fileName\": \"seo-file-name\", \"altText\": \"detailed alt description in english\"}"
    }
  }[lang === 'es' ? 'es' : 'en'];

  const fetchCredits = useCallback(async (email?: string) => {
    const targetEmail = email || "cliente_nuevo@test.com";
    const { data: profile } = await supabase.from('profiles').select('usage_count').eq('email', targetEmail).maybeSingle();
    if (profile) setCredits(profile.usage_count);
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://seo-wizard-nine.vercel.app/' }
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !GEMINI_KEY || credits <= 0) return;
    setLoading(true);
    let currentDbCredits = credits;
    const targetEmail = user?.email || "cliente_nuevo@test.com";

    for (const file of files) {
      if (currentDbCredits <= 0) break;
      try {
        const base64Data = await new Promise<string>((res) => {
          const reader = new FileReader(); reader.readAsDataURL(file);
          reader.onload = () => res((reader.result as string).split(',')[1]);
        });
        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [
              { text: t.prompt },
              { inlineData: { mimeType: file.type, data: base64Data } }
            ]}]
          })
        });
        const resJson = await resp.json();
        const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const data = JSON.parse(rawText.replace(/```json|```/g, "").trim());
          const newCount = currentDbCredits - 1;
          await supabase.from('profiles').update({ usage_count: newCount }).eq('email', targetEmail);
          setResults(prev => [{ ...data, id: Math.random().toString(), preview: `data:${file.type};base64,${base64Data}` }, ...prev]);
          setCredits(newCount);
          currentDbCredits = newCount;
        }
      } catch (err) { console.error(err); }
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); alert(t.copy); };
  
  const downloadZIP = async () => {
    const zip = new JSZip();
    results.forEach((res) => { zip.file(`${res.fileName}.jpg`, res.preview.split(',')[1], { base64: true }); });
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "seo_wizard_images.zip");
  };

  const downloadExcel = () => {
    const header = "\uFEFFFile Name,Alt Text\n";
    const rows = results.map(res => `${res.fileName}.jpg,"${res.altText}"`).join("\n");
    saveAs(new Blob([header + rows], { type: 'text/csv;charset=utf-8;' }), "seo_report.csv");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-6 font-sans">
      {/* HEADER DINÁMICO */}
      <nav className="max-w-5xl mx-auto flex justify-between items-center mb-12 py-4 border-b border-white/5">
        <div className="flex items-center gap-2 text-violet-500">
           <Globe className="w-5 h-5" />
           <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">{t.title}</h1>
        </div>
        
        <div className="flex items-center gap-3 md:gap-6">
          {user && (
            <div className="hidden md:flex items-center gap-2 bg-white/5 pr-3 pl-1 py-1 rounded-full border border-white/10">
              <img src={user.user_metadata.avatar_url} className="w-6 h-6 rounded-full" alt="profile" />
              <span className="text-[10px] font-bold text-gray-300">{user.user_metadata.full_name.split(' ')[0]}</span>
            </div>
          )}
          
          <div className="bg-violet-500/10 px-3 py-2 rounded-full border border-violet-500/30 flex items-center gap-2">
            <Zap className="w-3 h-3 text-yellow-500 fill-current" />
            <span className="text-[10px] font-black tracking-widest">{credits}</span>
          </div>

          {user && (
            <button onClick={() => supabase.auth.signOut()} className="text-gray-500 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto">
        {/* PANEL DE UPGRADE */}
        {credits <= 0 && !loading && (
          <div className="bg-gradient-to-br from-violet-900/40 to-black border border-violet-500/50 p-8 rounded-[2.5rem] text-center mb-8 shadow-2xl shadow-violet-500/10">
            <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black uppercase mb-2">{t.upgrade}</h2>
            <p className="text-gray-400 mb-8 text-sm">{t.limit}</p>
            
            <div className="flex flex-col gap-4 max-w-xs mx-auto">
              {!user ? (
                <button onClick={handleLogin} className="cursor-pointer bg-white text-black p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all shadow-xl">
                  <LogIn className="w-5 h-5" /> {t.btn}
                </button>
              ) : (
                <button className="cursor-pointer bg-violet-600 p-4 rounded-2xl font-bold shadow-lg shadow-violet-500/20 hover:scale-105 transition-transform uppercase tracking-tighter">
                  {t.unlock}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ZONA DE CARGA */}
        <div className={`transition-all duration-500 ${credits <= 0 ? 'opacity-20 grayscale pointer-events-none' : 'opacity-100'}`}>
          <div className="border-2 border-dashed border-violet-500/20 bg-black rounded-[2rem] p-12 md:p-16 text-center hover:border-violet-500 transition-all mb-8 group relative overflow-hidden">
            <label className="cursor-pointer block">
              {loading ? (
                <Loader2 className="w-10 h-10 text-violet-500 animate-spin mx-auto" />
              ) : (
                <>
                  <Upload className="w-10 h-10 text-violet-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <h2 className="text-lg font-bold uppercase tracking-tight">{t.upload}</h2>
                </>
              )}
              <input type="file" className="hidden" onChange={handleUpload} accept="image/*" multiple disabled={loading || credits <= 0} />
            </label>
          </div>
        </div>

        {/* CONTROLES DE DESCARGA MASIVA */}
        {results.length > 0 && (
          <div className="flex gap-2 mb-6 justify-center">
            <button onClick={downloadExcel} className="bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-4 py-2 rounded-xl text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-all">
              <FileSpreadsheet className="w-3 h-3" /> CSV Report
            </button>
            <button onClick={downloadZIP} className="bg-violet-600/20 text-violet-400 border border-violet-600/30 px-4 py-2 rounded-xl text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-violet-600 hover:text-white transition-all">
              <FileArchive className="w-3 h-3" /> Download ZIP
            </button>
          </div>
        )}

        {/* RESULTADOS */}
        <div className="space-y-4">
          {results.map(res => (
            <div key={res.id} className="bg-white/[0.03] p-4 rounded-3xl flex flex-col md:flex-row items-center gap-5 border border-white/5 group hover:bg-white/[0.05] transition-colors">
              <img src={res.preview} className="w-20 h-20 rounded-2xl object-cover border border-white/10 shadow-lg" />
              <div className="flex-1 text-left min-w-0">
                <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">{res.fileName}.jpg</p>
                <p className="text-[13px] text-gray-300 italic leading-relaxed truncate md:whitespace-normal">"{res.altText}"</p>
              </div>
              <div className="flex gap-2 bg-black/40 p-2 rounded-2xl border border-white/5">
                <button onClick={() => copyToClipboard(res.altText)} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all"><Copy className="w-4 h-4" /></button>
                <button onClick={() => { const l = document.createElement('a'); l.href = res.preview; l.download = `${res.fileName}.jpg`; l.click(); }} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all"><Download className="w-4 h-4" /></button>
                <div className="flex items-center justify-center p-2"><CheckCircle className="w-4 h-4 text-emerald-500" /></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}