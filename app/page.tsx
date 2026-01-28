"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Upload, Zap, Loader2, FileSpreadsheet, 
  FileArchive, Copy, Download, Crown, LogIn, Globe, LogOut, Star, X, Check, ImageIcon, Trash2
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

  const plans = [
    { name: 'Starter', price: '12', credits: 100, link: 'https://seowizardpro.lemonsqueezy.com/checkout/buy/44e5b340-22c4-4239-b030-5643ac426544', features: ['100 Créditos IA', 'Alt Text Preciso', 'Exportar Excel', 'Descarga ZIP'] },
    { name: 'Pro', price: '39', credits: 500, link: 'https://seowizardpro.lemonsqueezy.com/checkout/buy/7c975822-06e8-403c-b5d9-f56056e84146', popular: true, save: 'Ahorra 35%', features: ['500 Créditos IA', 'Soporte Prioritario', 'Análisis Ultra-Rápido', 'Uso Comercial'] },
    { name: 'Agency', price: '99', credits: 2000, link: 'https://seowizardpro.lemonsqueezy.com/checkout/buy/19b7494c-0519-4a1c-9428-440711d48a24', save: 'Mejor Valor', features: ['2,000 Créditos IA', 'Licencia Multisitio', 'Acceso API Beta', 'Soporte 24/7'] },
  ];

  // Función para limpiar el nombre del archivo y evitar el .jpg.jpg
  const sanitizeFileName = (name: string) => {
    return name.replace(/\.[^/.]+$/, "").trim(); // Elimina cualquier extensión existente
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
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
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
        
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [
              { text: "Responde UNICAMENTE un objeto JSON: {\"fileName\": \"nombre_seo_amigable\", \"altText\": \"descripcion_seo\"}. El fileName NO debe incluir la extensión." },
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
            fileName: sanitizeFileName(data.fileName), // Limpieza extra por si la IA se equivoca
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
    <div className={`min-h-screen text-white p-4 md:p-6 transition-colors duration-700 ${isPro ? 'bg-[#080700]' : 'bg-[#050505]'}`}>
      <nav className="max-w-5xl mx-auto flex justify-between items-center mb-8 py-6">
        <div className="flex items-center gap-2">
           <div className={`${isPro ? 'bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-violet-600 shadow-[0_0_20px_rgba(139,92,246,0.4)]'} p-2.5 rounded-2xl`}>
             <Globe className="w-6 h-6 text-white" />
           </div>
           <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">
             SEO<span className={isPro ? "text-yellow-500" : "text-violet-500"}>WIZARD {isPro && "PRO"}</span>
           </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {!user ? (
            <button onClick={handleLogin} style={{ cursor: 'pointer' }} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all active:scale-95">
              <LogIn className="w-4 h-4" /> Entrar con Google
            </button>
          ) : (
            <>
              <div className={`flex items-center gap-2 pr-4 pl-1 py-1 rounded-full border ${isPro ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-violet-500/20 border-violet-500/30'}`}>
                <img src={user.user_metadata.avatar_url} className={`w-7 h-7 rounded-full border-2 ${isPro ? 'border-yellow-500' : 'border-violet-500'}`} alt="p" />
                <span className="text-[10px] font-black">{user.user_metadata.full_name?.split(' ')[0]}</span>
              </div>
              <div onClick={() => setShowPricing(true)} style={{ cursor: 'pointer' }} className="bg-black px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2 hover:border-violet-500 transition-all">
                <Zap className={`w-4 h-4 ${isPro ? 'text-yellow-500 fill-yellow-500' : 'text-violet-400'}`} />
                <span className="text-sm font-black">{credits}</span>
              </div>
              <button onClick={handleLogout} style={{ cursor: 'pointer' }} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto">
        {!user ? (
          <div className="bg-white/[0.02] border border-white/10 p-12 rounded-[3rem] text-center shadow-2xl mt-10">
            <Globe className="w-16 h-16 text-violet-500 mx-auto mb-6 animate-pulse" />
            <h2 className="text-3xl font-black uppercase italic mb-8 tracking-tighter">Optimización SEO masiva</h2>
            <button onClick={handleLogin} style={{ cursor: 'pointer' }} className="w-full bg-white text-black p-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-gray-200 uppercase italic active:scale-95 transition-all">
              <LogIn className="w-6 h-6" /> Empezar con Google
            </button>
          </div>
        ) : (
          <>
            {showPricing && (
              <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
                <div className="bg-[#0a0a0a] border border-white/10 p-6 md:p-10 rounded-[2.5rem] max-w-5xl w-full relative my-8">
                  <button onClick={() => setShowPricing(false)} style={{ cursor: 'pointer' }} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-all"><X /></button>
                  <div className="text-center mb-10">
                    <h2 className="text-4xl font-black italic uppercase text-white mb-2">Mejora a <span className="text-violet-500">Prime</span></h2>
                    <p className="text-gray-500 text-sm font-medium italic">{user.email}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((p) => (
                      <div key={p.name} className={`relative flex flex-col p-8 rounded-[2rem] border transition-all ${p.popular ? 'border-violet-500 bg-violet-500/5 ring-1 ring-violet-500/50 scale-105' : 'border-white/10 bg-white/[0.02]'}`}>
                        {p.save && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{p.save}</span>}
                        <h3 className="font-black uppercase mb-1 text-xs text-gray-500">{p.name}</h3>
                        <div className="text-4xl font-black mb-6">${p.price} <span className="text-[10px] text-gray-600">/ {p.credits} crd</span></div>
                        <ul className="space-y-4 mb-8 flex-1">
                          {p.features.map(f => (
                            <li key={f} className="flex items-center gap-3 text-[11px] font-bold text-gray-300 italic"><Check className="w-4 h-4 text-violet-500" /> {f}</li>
                          ))}
                        </ul>
                        <a href={`${p.link}?checkout[email]=${user?.email}`} target="_blank" rel="noopener noreferrer" style={{ cursor: 'pointer' }} className={`block text-center p-4 rounded-xl font-black uppercase italic text-xs tracking-tighter transition-all ${p.popular ? 'bg-violet-500 text-white hover:bg-violet-400' : 'bg-white text-black hover:bg-gray-200'}`}>Seleccionar Plan</a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {credits <= 0 && !loading && (
              <div className="bg-red-500/5 border border-red-500/20 p-8 rounded-[3rem] text-center mb-8">
                <Crown className="w-12 h-12 text-red-500/50 mx-auto mb-4" />
                <h2 className="text-xl font-black uppercase italic mb-4">Has agotado tus créditos</h2>
                <button onClick={() => setShowPricing(true)} style={{ cursor: 'pointer' }} className="bg-white text-black p-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-gray-200 uppercase italic w-full">
                  <Star className="w-4 h-4 fill-current" /> Recargar ahora
                </button>
              </div>
            )}

            <div className={`transition-all duration-500 ${credits <= 0 ? 'opacity-20 blur-sm pointer-events-none scale-95' : 'opacity-100'}`}>
              <div className={`bg-gradient-to-b from-white/[0.05] border-2 border-dashed border-white/10 rounded-[3rem] text-center hover:border-violet-500 transition-all group overflow-hidden ${results.length > 0 ? 'p-6' : 'p-16'}`}>
                <label style={{ cursor: loading ? 'wait' : 'pointer' }} className="block">
                  {loading ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black">{selectedCount}</span>
                      </div>
                      <span className="text-[10px] font-black animate-pulse uppercase text-violet-400">Analizando...</span>
                    </div>
                  ) : (
                    <div className={`flex ${results.length > 0 ? 'flex-row items-center justify-center gap-4' : 'flex-col items-center'} transition-all`}>
                      <div className={`bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-violet-500 transition-all ${results.length > 0 ? 'w-10 h-10' : 'w-16 h-16 mb-4'}`}>
                        <Upload className={results.length > 0 ? 'w-4 h-4' : 'w-6 h-6'} />
                      </div>
                      <h2 className={`${results.length > 0 ? 'text-sm' : 'text-xl'} font-black uppercase italic group-hover:text-violet-400 tracking-tighter`}>
                        {results.length > 0 ? 'Añadir más fotos' : 'Subir imágenes para SEO'}
                      </h2>
                    </div>
                  )}
                  <input type="file" className="hidden" onChange={handleUpload} accept="image/*" multiple disabled={loading || credits <= 0} />
                </label>
              </div>
            </div>

            {credits > 0 && (
              <div className="flex justify-center my-6">
                <button onClick={() => setShowPricing(true)} style={{ cursor: 'pointer' }} className="group flex items-center gap-2 text-[10px] font-black uppercase italic tracking-widest text-gray-500 hover:text-yellow-500 transition-all">
                  <Crown className="w-3 h-3 group-hover:animate-bounce" /> Obtener más créditos Prime
                </button>
              </div>
            )}

            {results.length > 0 && (
              <>
                <div className="flex gap-3 mb-8">
                  <button onClick={async () => { if(confirm("¿Borrar todo?")) { const db = await initDB(); await db.clear(STORE_NAME); setResults([]); } }} style={{ cursor: 'pointer' }} className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => {
                    const csv = "\ufeffNombre de Archivo,Texto Alt\n" + results.map(r => `${sanitizeFileName(r.fileName)}.jpg,${r.altText}`).join("\n");
                    saveAs(new Blob([csv], { type: 'text/csv' }), "seo_export.csv");
                  }} style={{ cursor: 'pointer' }} className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-emerald-500 font-black uppercase italic text-[10px] hover:bg-emerald-500/20 transition-all">
                    <FileSpreadsheet className="w-4 h-4" /> Exportar CSV
                  </button>
                  <button onClick={async () => {
                    const zip = new JSZip();
                    results.forEach(res => zip.file(`${sanitizeFileName(res.fileName)}.jpg`, res.preview.split(',')[1], { base64: true }));
                    saveAs(await zip.generateAsync({ type: "blob" }), "seo_images.zip");
                  }} style={{ cursor: 'pointer' }} className="flex-1 flex items-center justify-center gap-2 bg-violet-500/10 border border-violet-500/20 p-4 rounded-2xl text-violet-500 font-black uppercase italic text-[10px] hover:bg-violet-500/20 transition-all">
                    <FileArchive className="w-4 h-4" /> Descargar ZIP
                  </button>
                </div>

                <div className="space-y-4 pb-24">
                  {results.map(res => (
                    <div key={res.id} className="bg-white/[0.03] p-5 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 border border-white/5 hover:border-white/10 transition-all shadow-xl">
                      <img src={res.preview} className="w-20 h-20 rounded-2xl object-cover shadow-2xl border border-white/10" alt="Pr" />
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase italic border ${isPro ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20' : 'bg-violet-500/20 text-violet-400 border-violet-500/20'}`}>Optimizado</span>
                          <span className="text-[10px] font-bold text-gray-500 uppercase truncate">{sanitizeFileName(res.fileName)}.jpg</span>
                        </div>
                        <p className="text-[13px] text-gray-300 italic font-medium leading-tight">"{res.altText}"</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { navigator.clipboard.writeText(res.altText); alert('¡Copiado!'); }} style={{ cursor: 'pointer' }} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 text-gray-400 transition-all active:scale-90"><Copy className="w-4 h-4" /></button>
                        <button onClick={() => { 
                          const link = document.createElement('a'); 
                          link.href = res.preview; 
                          link.download = `${sanitizeFileName(res.fileName)}.jpg`; 
                          link.click(); 
                        }} style={{ cursor: 'pointer' }} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 text-gray-400 transition-all active:scale-90"><Download className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}