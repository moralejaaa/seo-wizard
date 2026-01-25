"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Upload, Zap, Loader2, FileSpreadsheet, 
  FileArchive, Copy, Download, Crown, LogIn, Globe, LogOut, Star, X, Check
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
  const [isPro, setIsPro] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showPricing, setShowPricing] = useState(false);

  const plans = [
    { 
      name: 'Starter', 
      price: '12', 
      credits: 100, 
      link: 'https://seowizardpro.lemonsqueezy.com/checkout/buy/44e5b340-22c4-4239-b030-5643ac426544',
      features: ['100 Créditos IA', 'Alt Text Preciso', 'Exportar Excel', 'Descarga ZIP']
    },
    { 
      name: 'Pro', 
      price: '39', 
      credits: 500, 
      link: 'https://seowizardpro.lemonsqueezy.com/checkout/buy/7c975822-06e8-403c-b5d9-f56056e84146', 
      popular: true,
      save: 'Ahorra 35%',
      features: ['500 Créditos IA', 'Soporte Prioritario', 'Análisis Ultra-Rápido', 'Uso Comercial']
    },
    { 
      name: 'Agency', 
      price: '99', 
      credits: 2000, 
      link: 'https://seowizardpro.lemonsqueezy.com/checkout/buy/19b7494c-0519-4a1c-9428-440711d48a24',
      save: 'Mejor Valor',
      features: ['2,000 Créditos IA', 'Licencia Multisitio', 'Acceso API Beta', 'Soporte 24/7']
    },
  ];

  const fetchCredits = useCallback(async (email?: string) => {
    const targetEmail = email || user?.email || "cliente_nuevo@test.com";
    try {
      const { data: profile } = await supabase.from('profiles').select('usage_count, is_pro').eq('email', targetEmail).maybeSingle();
      if (profile) {
        setCredits(profile.usage_count);
        setIsPro(profile.is_pro);
      }
    } catch (e) { console.error("Error fetching credits", e); }
  }, [user]);

  useEffect(() => {
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

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
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
              { text: "Responde UNICAMENTE un objeto JSON sin texto extra: {\"fileName\": \"nombre\", \"altText\": \"descripcion\"}" },
              { inlineData: { mimeType: file.type, data: base64Data } }
            ]}]
          })
        });
        const resJson = await resp.json();
        let rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (rawText) {
          const start = rawText.indexOf('{');
          const end = rawText.lastIndexOf('}');
          if (start !== -1 && end !== -1) {
            const cleanJson = rawText.substring(start, end + 1);
            const data = JSON.parse(cleanJson);
            const newCount = currentDbCredits - 1;
            await supabase.from('profiles').update({ usage_count: newCount }).eq('email', targetEmail);
            setResults(prev => [{ ...data, id: Math.random().toString(), preview: `data:${file.type};base64,${base64Data}` }, ...prev]);
            setCredits(newCount);
            currentDbCredits = newCount;
          }
        }
      } catch (err) { console.error("Error IA:", err); }
    }
    setLoading(false);
  };

  const downloadExcel = () => {
    const headers = "Nombre de Archivo,Texto Alt\n";
    const rows = results.map(r => `${r.fileName}.jpg,${r.altText}`).join("\n");
    const blob = new Blob(["\ufeff" + headers + rows], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, "seo_wizard_export.csv");
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    results.forEach(res => {
      const data = res.preview.split(',')[1];
      zip.file(`${res.fileName}.jpg`, data, { base64: true });
    });
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "seo_wizard_images.zip");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-6 font-sans">
      <nav className="max-w-5xl mx-auto flex justify-between items-center mb-8 py-6">
        <div className="flex items-center gap-2">
           <div className={`${isPro ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'bg-violet-600 shadow-[0_0_15px_rgba(139,92,246,0.4)]'} p-2 rounded-xl`}>
             <Globe className="w-6 h-6 text-white" />
           </div>
           <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">
             SEO<span className={isPro ? "text-yellow-500" : "text-violet-500"}>WIZARD {isPro && "PRO"}</span>
           </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={handleLogin} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl font-bold text-sm cursor-pointer hover:bg-gray-200 transition-all active:scale-95">
            <LogIn className="w-4 h-4" /> Entrar con Google
          </button>

          {user && (
            <div className={`flex items-center gap-2 pr-4 pl-1 py-1 rounded-full border ${isPro ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-violet-500/20 border-violet-500/30'}`}>
              <img src={user.user_metadata.avatar_url} className={`w-7 h-7 rounded-full border-2 ${isPro ? 'border-yellow-500' : 'border-violet-500'}`} alt="profile" />
              <span className="text-[10px] font-black">{user.user_metadata.full_name.split(' ')[0]}</span>
            </div>
          )}
          
          <div onClick={() => setShowPricing(true)} className="bg-black px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2 cursor-pointer hover:border-violet-500 transition-all">
            <Zap className={`w-4 h-4 fill-current ${isPro ? 'text-yellow-500' : 'text-violet-400'}`} />
            <span className="text-sm font-black">{credits}</span>
          </div>

          {user && (
            <button onClick={handleLogout} className="p-2 bg-red-500/10 text-red-500 rounded-xl cursor-pointer hover:bg-red-500/20">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto">
        {showPricing && (
          <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
            <div className="bg-[#0a0a0a] border border-white/10 p-6 md:p-10 rounded-[2.5rem] max-w-5xl w-full relative my-8 shadow-2xl">
              <button onClick={() => setShowPricing(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full cursor-pointer"><X /></button>
              
              <div className="text-center mb-10">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white mb-2">Mejora a <span className="text-violet-500 text-glow">Prime</span></h2>
                <p className="text-gray-500 text-sm font-medium italic">Los créditos se añaden automáticamente tras tu compra</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((p) => (
                  <div key={p.name} className={`relative flex flex-col p-8 rounded-[2rem] border transition-all ${p.popular ? 'border-violet-500 bg-violet-500/5 ring-1 ring-violet-500/50' : 'border-white/10 bg-white/[0.02]'}`}>
                    {p.save && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-violet-600/20">
                        {p.save}
                      </span>
                    )}
                    <h3 className="font-black uppercase mb-1 text-xs text-gray-500 tracking-widest">{p.name}</h3>
                    <div className="text-4xl font-black mb-6 flex items-baseline gap-1">
                      ${p.price} <span className="text-[10px] text-gray-600 uppercase">/ {p.credits} crd</span>
                    </div>
                    
                    <ul className="space-y-4 mb-8 flex-1">
                      {p.features.map(f => (
                        <li key={f} className="flex items-center gap-3 text-[11px] font-bold text-gray-300 italic">
                          <Check className="w-4 h-4 text-violet-500 shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>

                    <a href={`${p.link}?checkout[email]=${user?.email}`} target="_blank" className={`block text-center p-4 rounded-xl font-black uppercase italic text-xs tracking-tighter transition-all ${p.popular ? 'bg-violet-500 text-white hover:bg-violet-400 shadow-lg shadow-violet-500/20' : 'bg-white text-black hover:bg-gray-200'} cursor-pointer active:scale-95`}>
                      Seleccionar Plan
                    </a>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest italic flex items-center justify-center gap-2">
                <Crown className="w-3 h-3" /> Pago 100% seguro vía Lemon Squeezy
              </p>
            </div>
          </div>
        )}

        {credits <= 0 && !loading && (
          <div className="bg-white/[0.02] border border-white/10 p-10 rounded-[3rem] text-center mb-8">
            <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-6 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]" />
            <h2 className="text-3xl font-black uppercase italic mb-6 tracking-tighter">Límite Alcanzado</h2>
            <button onClick={() => setShowPricing(true)} className="bg-violet-600 p-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-violet-500 transition-all uppercase italic w-full cursor-pointer shadow-xl shadow-violet-600/20 group">
              <Star className="w-5 h-5 fill-current group-hover:rotate-45 transition-transform" /> Ver Planes Prime
            </button>
          </div>
        )}

        <div className={`transition-all ${credits <= 0 ? 'opacity-10 blur-sm pointer-events-none' : 'opacity-100'}`}>
          <div className="bg-gradient-to-b from-white/[0.05] border-2 border-dashed border-white/10 rounded-[3rem] p-16 text-center hover:border-violet-500/50 transition-all mb-8 group">
            <label className="cursor-pointer block">
              {loading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
                  <span className="text-[10px] font-black animate-pulse uppercase text-violet-400">Analizando Imágenes...</span>
                </div>
              ) : (
                <>
                  <div className="bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-violet-500/10 transition-all"><Upload className="w-6 h-6" /></div>
                  <h2 className="text-xl font-black uppercase italic group-hover:text-violet-400 transition-colors">Subir Imágenes</h2>
                  <p className="text-[9px] text-gray-500 mt-2 font-bold uppercase tracking-widest">Soporta JPG, PNG y WebP</p>
                </>
              )}
              <input type="file" className="hidden" onChange={handleUpload} accept="image/*" multiple disabled={loading || credits <= 0} />
            </label>
          </div>
        </div>

        {results.length > 0 && (
          <div className="flex gap-3 mb-8">
            <button onClick={downloadExcel} className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-emerald-500 font-black uppercase italic text-[10px] hover:bg-emerald-500/20 transition-all cursor-pointer">
              <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
            </button>
            <button onClick={downloadZip} className="flex-1 flex items-center justify-center gap-2 bg-violet-500/10 border border-violet-500/20 p-4 rounded-2xl text-violet-500 font-black uppercase italic text-[10px] hover:bg-violet-500/20 transition-all cursor-pointer">
              <FileArchive className="w-4 h-4" /> Descargar ZIP
            </button>
          </div>
        )}

        <div className="space-y-4 pb-20">
          {results.map(res => (
            <div key={res.id} className="bg-white/[0.03] p-5 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 border border-white/5 hover:border-white/10 transition-all">
              <img src={res.preview} className="w-20 h-20 rounded-2xl object-cover shadow-2xl border border-white/10" />
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase italic border ${isPro ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20' : 'bg-violet-500/20 text-violet-400 border-violet-500/20'}`}>SEO Optimized</span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{res.fileName}.jpg</span>
                </div>
                <p className="text-[13px] text-gray-300 italic font-medium leading-tight">"{res.altText}"</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { navigator.clipboard.writeText(res.altText); alert('Copiado!'); }} className="p-4 bg-white/5 rounded-2xl cursor-pointer hover:bg-white/10 text-gray-400 hover:text-white transition-all"><Copy className="w-4 h-4" /></button>
                <button onClick={() => { const l = document.createElement('a'); l.href = res.preview; l.download = `${res.fileName}.jpg`; l.click(); }} className="p-4 bg-white/5 rounded-2xl cursor-pointer hover:bg-white/10 text-gray-400 hover:text-white transition-all"><Download className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}