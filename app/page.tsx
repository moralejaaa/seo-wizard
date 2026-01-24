"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Upload, Zap, Loader2, CheckCircle, FileSpreadsheet, 
  FileArchive, Copy, Download, Crown, LogIn, Globe, LogOut, Star
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
  const [isPro, setIsPro] = useState(false); // Estado para detectar si es usuario de pago
  const [user, setUser] = useState<any>(null);
  const [lang, setLang] = useState('en');

  const fetchCredits = useCallback(async (email?: string) => {
    // Si no hay email y no hay usuario, cargamos los créditos del perfil de invitado
    if (!email && !user) {
      const { data: guestProfile } = await supabase.from('profiles').select('usage_count, is_pro').eq('email', "cliente_nuevo@test.com").maybeSingle();
      if (guestProfile) {
        setCredits(guestProfile.usage_count);
        setIsPro(guestProfile.is_pro);
      }
      return;
    }
    
    const targetEmail = email || user?.email;
    const { data: profile } = await supabase.from('profiles').select('usage_count, is_pro').eq('email', targetEmail).maybeSingle();
    if (profile) {
      setCredits(profile.usage_count);
      setIsPro(profile.is_pro); // Actualizamos si el usuario es PRO
    }
  }, [user]);

  useEffect(() => {
    const browserLang = navigator.language.startsWith('es') ? 'es' : 'en';
    setLang(browserLang);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        fetchCredits(session.user.email);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setCredits(0);
        setIsPro(false);
        setResults([]);
        fetchCredits(); 
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchCredits]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const t = {
    es: {
      title: "SEO WIZARD", upgrade: "Mejora a Prime",
      limit: "Límite alcanzado. Únete a los profesionales.",
      btn: "Entrar con Google", upload: "Subir Imágenes",
      unlock: "Comprar 100 Créditos ($12)", status: "Plan Profesional"
    },
    en: {
      title: "SEO WIZARD", upgrade: "Upgrade to Prime",
      limit: "Limit reached. Join the pros for more.",
      btn: "Sign in with Google", upload: "Upload Images",
      unlock: "Buy 100 Credits ($12)", status: "Professional Plan"
    }
  }[lang === 'es' ? 'es' : 'en'];

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
              { text: lang === 'es' ? "Analiza y responde JSON: {\"fileName\": \"nombre-seo\", \"altText\": \"descripcion alt\"}" : "Analyze and respond JSON: {\"fileName\": \"seo-name\", \"altText\": \"alt description\"}" },
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

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-6 font-sans selection:bg-violet-500/30">
      <nav className="max-w-5xl mx-auto flex justify-between items-center mb-12 py-6">
        <div className="flex items-center gap-2 group cursor-pointer">
           <div className={`${isPro ? 'bg-yellow-500' : 'bg-violet-600'} p-2 rounded-xl group-hover:rotate-12 transition-transform shadow-lg`}>
             <Globe className="w-6 h-6 text-white" />
           </div>
           <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">
             SEO<span className={isPro ? "text-yellow-500" : "text-violet-500"}>WIZARD {isPro && "PRO"}</span>
           </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {user && (
            <div className={`flex items-center gap-2 pr-4 pl-1 py-1 rounded-full border shadow-xl ${isPro ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-violet-500/20 border-violet-500/30'}`}>
              <img src={user.user_metadata.avatar_url} className={`w-7 h-7 rounded-full border-2 ${isPro ? 'border-yellow-500' : 'border-violet-500'}`} alt="profile" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black leading-none">{user.user_metadata.full_name.split(' ')[0]}</span>
                {isPro && <span className="text-[8px] text-yellow-500 font-bold uppercase flex items-center gap-1"><Star className="w-2 h-2 fill-current" /> Prime</span>}
              </div>
            </div>
          )}
          
          <div className="bg-black px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2 shadow-xl">
            <Zap className={`w-4 h-4 fill-current animate-pulse ${isPro ? 'text-yellow-500' : 'text-violet-400'}`} />
            <span className="text-sm font-black italic">{credits}</span>
          </div>

          {user && (
            <button onClick={handleLogout} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto">
        {credits <= 0 && !loading && (
          <div className="relative group overflow-hidden bg-white/[0.02] border border-white/10 p-10 rounded-[3rem] text-center mb-12 shadow-2xl">
            <div className="absolute inset-0 bg-violet-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]" />
            <h2 className="text-3xl font-black uppercase mb-3 tracking-tighter italic">{t.upgrade}</h2>
            <p className="text-gray-400 mb-10 text-sm max-w-sm mx-auto leading-relaxed">{t.limit}</p>
            
            <div className="flex flex-col gap-4 max-w-xs mx-auto relative z-10">
              {!user ? (
                <button onClick={handleLogin} className="bg-white text-black p-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] uppercase italic tracking-tighter">
                  <LogIn className="w-5 h-5" /> {t.btn}
                </button>
              ) : (
                <a 
                  href={`https://seowizardpro.lemonsqueezy.com/checkout/buy/44e5b340-22c4-4239-b030-5643ac426544?checkout[email]=${user?.email}`}
                  target="_blank"
                  className="bg-violet-600 p-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-violet-500 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] transition-all uppercase italic tracking-tighter w-full"
                >
                  <Star className="w-5 h-5 fill-current" /> {t.unlock}
                </a>
              )}
            </div>
          </div>
        )}

        <div className={`transition-all duration-700 ${credits <= 0 ? 'opacity-10 blur-sm grayscale pointer-events-none' : 'opacity-100'}`}>
          <div className={`bg-gradient-to-b from-white/[0.05] to-transparent border-2 border-dashed rounded-[3rem] p-16 text-center transition-all mb-12 cursor-pointer group ${isPro ? 'border-yellow-500/30 hover:border-yellow-500/60' : 'border-white/10 hover:border-violet-500/50'}`}>
            <label className="cursor-pointer block">
              {loading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
                  <span className="text-xs font-bold text-violet-400 animate-pulse uppercase tracking-widest">Processing Magic...</span>
                </div>
              ) : (
                <>
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-all duration-500 shadow-xl ${isPro ? 'bg-yellow-500 text-black' : 'bg-white/5 text-white group-hover:bg-violet-500'}`}>
                    <Upload className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-widest italic">{t.upload}</h2>
                  <p className="text-gray-500 text-[10px] mt-2 font-bold uppercase tracking-[0.2em]">JPG, PNG or WEBP up to 10MB</p>
                </>
              )}
              <input type="file" className="hidden" onChange={handleUpload} accept="image/*" multiple disabled={loading || credits <= 0} />
            </label>
          </div>
        </div>

        <div className="space-y-6">
          {results.map(res => (
            <div key={res.id} className="bg-white/[0.03] p-5 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 border border-white/5 hover:border-white/10 transition-all shadow-xl group">
              <div className="relative">
                <img src={res.preview} className="w-24 h-24 rounded-[1.5rem] object-cover border border-white/10 shadow-2xl group-hover:scale-105 transition-transform" />
                <div className="absolute -top-2 -right-2 bg-emerald-500 p-1.5 rounded-full shadow-lg">
                  <CheckCircle className="w-3 h-3 text-black" />
                </div>
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md tracking-tighter uppercase italic border ${isPro ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20' : 'bg-violet-500/20 text-violet-400 border-violet-500/20'}`}>SEO Optimized</span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">{res.fileName}.jpg</span>
                </div>
                <p className="text-[14px] text-gray-300 italic leading-relaxed font-medium">"{res.altText}"</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { navigator.clipboard.writeText(res.altText); alert('Copied!'); }} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-gray-400 hover:text-white border border-white/5"><Copy className="w-4 h-4" /></button>
                <button onClick={() => { const l = document.createElement('a'); l.href = res.preview; l.download = `${res.fileName}.jpg`; l.click(); }} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-gray-400 hover:text-white border border-white/5"><Download className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}