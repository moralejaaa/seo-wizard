"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Upload, Zap, FileSpreadsheet, FileArchive, Copy, Download, 
  Crown, LogIn, Globe, LogOut, Star, X, Check, Trash2, Languages
} from 'lucide-react';
import JSZip from 'jszip';
// @ts-ignore
import { saveAs } from 'file-saver';
import { openDB, IDBPDatabase } from 'idb';

const supabaseUrl = 'https://geixfrhlbaznjxaxpvrm.supabase.co';
const supabaseKey = 'sb_publishable_-vedbc51MiECfsLoEDXpPg_gaxVFs5x';
const supabase = createClient(supabaseUrl, supabaseKey);
const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

const DB_NAME = 'SEO_WIZARD_STORAGE';
const STORE_NAME = 'results_cache';

const initDB = async (): Promise<IDBPDatabase> => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
};

export default function SEOWizard() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [lang, setLang] = useState<'es' | 'en'>('en');

  const t = {
    en: {
      heroTitle: "Bulk SEO Optimization",
      heroSub: "Generate AI-powered Alt Text for thousands of images in seconds.",
      signIn: "Sign in with Google",
      signOut: "Sign Out",
      uploadTitle: "Upload images for SEO",
      uploadMore: "Add more photos",
      analyzing: "Analyzing...",
      credits: "Credits",
      recharge: "Recharge now",
      outOfCredits: "You're out of credits",
      getPrime: "Get more Prime credits",
      exportCsv: "Export CSV",
      downloadZip: "Download ZIP",
      optimized: "Optimized",
      copyAlert: "Copied!",
      confirmDelete: "Delete everything?",
      pricingTitle: "Upgrade to",
      starter: "Starter",
      pro: "Pro",
      agency: "Agency",
      popular: "Popular",
      save: "Save",
      bestValue: "Best Value",
      selectPlan: "Select Plan",
      feature1: "IA Credits",
      feature2: "Precise Alt Text",
      feature3: "Excel Export",
      feature4: "ZIP Download"
    },
    es: {
      heroTitle: "Optimización SEO Masiva",
      heroSub: "Genera textos Alt con IA para miles de imágenes en segundos.",
      signIn: "Entrar con Google",
      signOut: "Cerrar Sesión",
      uploadTitle: "Subir imágenes para SEO",
      uploadMore: "Añadir más fotos",
      analyzing: "Analizando...",
      credits: "Créditos",
      recharge: "Recargar ahora",
      outOfCredits: "Has agotado tus créditos",
      getPrime: "Obtener más créditos Prime",
      exportCsv: "Exportar CSV",
      downloadZip: "Descargar ZIP",
      optimized: "Optimizado",
      copyAlert: "¡Copiado!",
      confirmDelete: "¿Borrar todo?",
      pricingTitle: "Mejora a",
      starter: "Starter",
      pro: "Pro",
      agency: "Agency",
      popular: "Popular",
      save: "Ahorra",
      bestValue: "Mejor Valor",
      selectPlan: "Seleccionar Plan",
      feature1: "Créditos IA",
      feature2: "Alt Text Preciso",
      feature3: "Exportar Excel",
      feature4: "Descarga ZIP"
    }
  };

  const plans = [
    { name: t[lang].starter, price: '12', credits: 100, link: 'https://seowizardpro.lemonsqueezy.com/checkout/buy/44e5b340-22c4-4239-b030-5643ac426544', features: [t[lang].feature1, t[lang].feature2, t[lang].feature3, t[lang].feature4] },
    { name: t[lang].pro, price: '39', credits: 500, link: 'https://seowizardpro.lemonsqueezy.com/checkout/buy/7c975822-06e8-403c-b5d9-f56056e84146', popular: true, save: `${t[lang].save} 35%`, features: [t[lang].feature1, 'Priority Support', 'Ultra-Fast Analysis', 'Commercial Use'] },
    { name: t[lang].agency, price: '99', credits: 2000, link: 'https://seowizardpro.lemonsqueezy.com/checkout/buy/19b7494c-0519-4a1c-9428-440711d48a24', save: t[lang].bestValue, features: [t[lang].feature1, 'Multi-site License', 'API Access Beta', '24/7 Support'] },
  ];

  const sanitizeFileName = (name: string) => {
    return name.replace(/\.[^/.]+$/, "").replace(/\.(jpg|jpeg|png|webp)$/i, "").trim();
  };

  const fetchCredits = useCallback(async (email: string) => {
    try {
      const { data: profile } = await supabase.from('profiles').select('usage_count, is_pro').eq('email', email).maybeSingle();
      if (profile) {
        setCredits(profile.usage_count);
        setIsPro(profile.is_pro);
      }
    } catch (e) { console.error("Error créditos:", e); }
  }, []);

  useEffect(() => {
    fetch('https://ipapi.co/json/').then(res => res.json()).then(data => {
      if (['ES', 'MX', 'AR', 'CO', 'VE', 'CL', 'PE'].includes(data.country_code)) setLang('es');
    }).catch(() => setLang('en'));

    const loadPersistedData = async () => {
      try {
        const db = await initDB();
        const savedResults = await db.getAll(STORE_NAME);
        if (savedResults) setResults(savedResults.sort((a, b) => b.id - a.id));
      } catch (e) { console.error("Error IndexedDB:", e); }
    };
    loadPersistedData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        fetchCredits(session.user.email!);
      } else {
        setUser(null);
        setCredits(0);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchCredits]);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  };

  const handleLogout = async () => {
    const db = await initDB();
    await db.clear(STORE_NAME);
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!user || files.length === 0 || !GEMINI_KEY || credits <= 0) return;
    
    setSelectedCount(files.length);
    setLoading(true);
    let currentDbCredits = credits;
    const db = await initDB();

    for (const file of files) {
      if (currentDbCredits <= 0) break;
      try {
        const base64Data = await new Promise<string>((res) => {
          const reader = new FileReader(); reader.readAsDataURL(file);
          reader.onload = () => res((reader.result as string).split(',')[1]);
        });
        
        const systemPrompt = lang === 'es' 
          ? "Responde UNICAMENTE un objeto JSON: {\"fileName\": \"nombre_seo\", \"altText\": \"descripcion_seo\"}. No incluyas la extensión del archivo."
          : "Respond ONLY with a JSON object: {\"fileName\": \"seo_friendly_name\", \"altText\": \"seo_description\"}. Do not include file extension.";

        const resp = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [
              { text: systemPrompt },
              { inlineData: { mimeType: file.type, data: base64Data } }
            ]}]
          })
        });

        const resJson = await resp.json();
        const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (rawText) {
          const data = JSON.parse(rawText.substring(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1));
          const newCount = currentDbCredits - 1;
          await supabase.from('profiles').update({ usage_count: newCount }).eq('email', user.email);
          
          const newItem = { 
            ...data, 
            fileName: sanitizeFileName(data.fileName),
            id: Date.now() + Math.random(), 
            preview: `data:${file.type};base64,${base64Data}` 
          };

          await db.put(STORE_NAME, newItem);
          setResults(prev => [newItem, ...prev]);
          setCredits(newCount);
          currentDbCredits = newCount;
        }
      } catch (err) { console.error("IA Error:", err); }
      setSelectedCount(prev => prev - 1);
    }
    setLoading(false);
  };

  return (
    <div className={`min-h-screen text-white p-4 md:p-6 transition-all duration-1000 ${isPro ? 'bg-[#0a0900]' : 'bg-[#050505]'} selection:bg-violet-500/30 overflow-x-hidden`}>
      <nav className="max-w-6xl mx-auto flex justify-between items-center mb-4 py-4 relative z-50">
        <div className="flex items-center gap-2 group">
           <div className={`p-2 rounded-xl transition-all duration-500 group-hover:rotate-12 ${isPro ? 'bg-yellow-500' : 'bg-violet-600'}`}>
             <Globe className="w-5 h-5 text-white" />
           </div>
           <h1 className="text-xl font-black italic uppercase tracking-tighter">
             SEO<span className={isPro ? "text-yellow-500" : "text-violet-500"}>WIZARD {isPro && "PRO"}</span>
           </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => setLang(lang === 'es' ? 'en' : 'es')} className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase italic hover:bg-white/10 transition-all">
            <Languages className="w-3 h-3" /> {lang === 'es' ? 'EN' : 'ES'}
          </button>

          {!user ? (
            <button onClick={handleLogin} style={{ cursor: 'pointer' }} className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-black text-xs hover:scale-105 transition-all uppercase italic shadow-lg">
              <LogIn className="w-3.5 h-3.5" /> {t[lang].signIn}
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-white/5 p-1 pr-3 rounded-xl border border-white/10 backdrop-blur-md">
              <img src={user.user_metadata.avatar_url} className={`w-8 h-8 rounded-lg border-2 ${isPro ? 'border-yellow-500' : 'border-violet-500'}`} alt="avatar" />
              <div onClick={() => setShowPricing(true)} className="cursor-pointer flex items-center gap-1.5 px-1">
                <Zap className={`w-3 h-3 ${isPro ? 'text-yellow-500 fill-yellow-500' : 'text-violet-400'}`} />
                <span className="text-xs font-black">{credits}</span>
              </div>
              <button onClick={handleLogout} style={{ cursor: 'pointer' }} className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500/40 hover:text-red-500 transition-all">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto relative z-10">
        {!user ? (
          <div className="bg-gradient-to-b from-white/[0.03] to-transparent border border-white/10 p-10 md:p-14 rounded-[3rem] text-center shadow-2xl mt-4 relative overflow-hidden">
            <Globe className="w-16 h-16 text-violet-500 mx-auto mb-6 animate-pulse" />
            <h2 className="text-4xl md:text-6xl font-black uppercase italic mb-4 tracking-tighter leading-tight">{t[lang].heroTitle}</h2>
            <p className="text-gray-400 text-base md:text-lg font-medium italic mb-10 max-w-md mx-auto">{t[lang].heroSub}</p>
            <button onClick={handleLogin} style={{ cursor: 'pointer' }} className="w-full max-w-sm mx-auto bg-white text-black p-5 rounded-[1.5rem] font-black flex items-center justify-center gap-3 hover:scale-105 uppercase italic transition-all text-lg shadow-xl shadow-white/5">
              <LogIn className="w-5 h-5" /> {t[lang].signIn}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {showPricing && (
              <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-2xl overflow-y-auto">
                <div className="bg-[#0a0a0a] border border-white/10 p-6 md:p-12 rounded-[3rem] max-w-5xl w-full relative my-8">
                  <button onClick={() => setShowPricing(false)} style={{ cursor: 'pointer' }} className="absolute top-6 right-6 p-3 hover:bg-white/5 rounded-full transition-all border border-white/5"><X className="w-5 h-5" /></button>
                  <div className="text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-black italic uppercase mb-2 tracking-tighter">{t[lang].pricingTitle} <span className="text-violet-500">Prime</span></h2>
                    <span className="text-[10px] text-gray-500 font-bold uppercase">{user.email}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((p) => (
                      <div key={p.name} className={`relative flex flex-col p-8 rounded-[2.5rem] border transition-all duration-700 ${p.popular ? 'border-violet-500 bg-violet-500/5 scale-105' : 'border-white/5 bg-white/[0.01]'}`}>
                        {p.save && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">{p.save}</span>}
                        <h3 className="font-black uppercase mb-1 text-[10px] text-gray-500 tracking-widest">{p.name}</h3>
                        <div className="text-4xl font-black mb-8 tracking-tighter">${p.price} <span className="text-[10px] text-gray-600">/ {p.credits} crd</span></div>
                        <ul className="space-y-4 mb-8 flex-1">
                          {p.features.map(f => (
                            <li key={f} className="flex items-center gap-3 text-xs font-bold text-gray-400 italic"><Check className="w-4 h-4 text-violet-500" /> {f}</li>
                          ))}
                        </ul>
                        <a href={`${p.link}?checkout[email]=${user?.email}`} target="_blank" rel="noopener noreferrer" style={{ cursor: 'pointer' }} className={`block text-center p-5 rounded-2xl font-black uppercase italic text-xs transition-all ${p.popular ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20' : 'bg-white text-black hover:bg-gray-200'}`}>{t[lang].selectPlan}</a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className={`transition-all duration-700 ${credits <= 0 && !loading ? 'opacity-40 blur-[1px]' : 'opacity-100'}`}>
              <label className={`block relative overflow-hidden group border-2 border-dashed rounded-[2.5rem] transition-all duration-500 bg-white/[0.02] ${loading ? 'border-violet-500/50 p-10 cursor-wait' : 'border-white/10 hover:border-violet-500/40 p-12 cursor-pointer'}`}>
                {loading ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-black italic">{selectedCount}</span>
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-violet-400 animate-pulse">{t[lang].analyzing}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center group-hover:scale-110 group-hover:bg-violet-600 transition-all shadow-xl border border-white/5">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div className="text-center">
                      <h2 className="text-2xl font-black uppercase italic group-hover:text-violet-400 tracking-tighter">
                        {results.length > 0 ? t[lang].uploadMore : t[lang].uploadTitle}
                      </h2>
                    </div>
                  </div>
                )}
                <input type="file" className="hidden" onChange={handleUpload} accept="image/*" multiple disabled={loading || credits <= 0} />
              </label>
            </div>

            {/* BOTÓN SIEMPRE VISIBLE PARA RECARGAR CRÉDITOS */}
            <div className="flex justify-center mt-4">
              <button 
                onClick={() => setShowPricing(true)} 
                style={{ cursor: 'pointer' }} 
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-black uppercase italic text-[10px] tracking-widest transition-all ${credits <= 0 ? 'bg-red-500 text-white animate-bounce' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}`}
              >
                <Crown className={`w-4 h-4 ${credits <= 0 ? 'fill-white' : 'text-violet-500'}`} />
                {credits <= 0 ? t[lang].recharge : t[lang].getPrime}
              </button>
            </div>

            {results.length > 0 && (
              <div className="space-y-4 pt-6">
                <div className="flex gap-3">
                  <button onClick={async () => { if(confirm(t[lang].confirmDelete)) { const db = await initDB(); await db.clear(STORE_NAME); setResults([]); } }} style={{ cursor: 'pointer' }} className="p-4 bg-red-500/5 border border-red-500/10 text-red-500/60 rounded-2xl hover:bg-red-500/10 transition-all active:scale-90">
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => {
                    const csv = "\ufeffFile,Alt Text\n" + results.map(r => `${sanitizeFileName(r.fileName)}.jpg,${r.altText}`).join("\n");
                    saveAs(new Blob([csv], { type: 'text/csv' }), "seo_export.csv");
                  }} style={{ cursor: 'pointer' }} className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl text-emerald-500 font-black uppercase italic text-[10px] hover:bg-emerald-500/10 transition-all">
                    <FileSpreadsheet className="w-4 h-4" /> {t[lang].exportCsv}
                  </button>
                  <button onClick={async () => {
                    const zip = new JSZip();
                    results.forEach(res => zip.file(`${sanitizeFileName(res.fileName)}.jpg`, res.preview.split(',')[1], { base64: true }));
                    saveAs(await zip.generateAsync({ type: "blob" }), "seo_package.zip");
                  }} style={{ cursor: 'pointer' }} className="flex-1 flex items-center justify-center gap-2 bg-violet-500/5 border border-violet-500/10 p-4 rounded-2xl text-violet-500 font-black uppercase italic text-[10px] hover:bg-violet-500/10 transition-all">
                    <FileArchive className="w-4 h-4" /> {t[lang].downloadZip}
                  </button>
                </div>

                <div className="grid gap-4 pb-20">
                  {results.map((res) => (
                    <div key={res.id} className="group bg-white/[0.03] p-4 rounded-[2rem] border border-white/5 flex flex-col sm:flex-row items-center gap-6 hover:bg-white/[0.05] transition-all">
                      <div className="relative shrink-0">
                        <img src={res.preview} className="w-24 h-24 rounded-2xl object-cover shadow-xl border border-white/10" alt="Preview" />
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-1.5 rounded-lg border-2 border-[#050505]">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 text-center sm:text-left min-w-0">
                        <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase italic border ${isPro ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20' : 'bg-violet-500/20 text-violet-400 border-violet-500/20'}`}>{t[lang].optimized}</span>
                          <span className="text-[10px] font-bold text-gray-500 uppercase truncate tracking-widest">{sanitizeFileName(res.fileName)}.jpg</span>
                        </div>
                        <p className="text-base text-white font-medium italic">"{res.altText}"</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { navigator.clipboard.writeText(res.altText); alert(t[lang].copyAlert); }} style={{ cursor: 'pointer' }} className="p-4 bg-white/5 rounded-xl hover:bg-white/10 text-gray-400 transition-all border border-white/5"><Copy className="w-4 h-4" /></button>
                        <button onClick={() => {
                          const l = document.createElement('a'); l.href = res.preview; l.download = `${sanitizeFileName(res.fileName)}.jpg`; l.click();
                        }} style={{ cursor: 'pointer' }} className="p-4 bg-white/5 rounded-xl hover:bg-white/10 text-gray-400 transition-all border border-white/5"><Download className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}