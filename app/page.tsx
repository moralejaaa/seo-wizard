"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Upload, Zap, Loader2, CheckCircle, FileSpreadsheet, 
  FileArchive, Copy, Download, Crown, LogIn, Globe, LogOut, Star, X
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
  const [lang, setLang] = useState('es');
  const [showPricing, setShowPricing] = useState(false);

  const plans = [
    { name: 'Starter', price: '12', credits: 100, link: 'https://seowizardpro.lemonsqueezy.com/checkout/buy/44e5b340-22c4-4239-b030-5643ac426544' },
    { name: 'Pro', price: '39', credits: 500, link: '#', popular: true }, // Reemplaza con tus links
    { name: 'Agency', price: '99', credits: 2000, link: '#' },
  ];

  const fetchCredits = useCallback(async (email?: string) => {
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
      setIsPro(profile.is_pro);
    }
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
              { text: "Responde ÚNICAMENTE en formato JSON plano: {\"fileName\": \"nombre-archivo\", \"altText\": \"descripcion alt\"}" },
              { inlineData: { mimeType: file.type, data: base64Data } }
            ]}]
          })
        });
        const resJson = await resp.json();
        let rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (rawText) {
          // FIX: Limpieza de JSON para evitar SyntaxError
          const start = rawText.indexOf('{');
          const end = rawText.lastIndexOf('}');
          if (start !== -1 && end !== -1) {
            rawText = rawText.substring(start, end + 1);
            const data = JSON.parse(rawText);
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

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-6 font-sans">
      <nav className="max-w-5xl mx-auto flex justify-between items-center mb-12 py-6">
        <div className="flex items-center gap-2">
           <div className={`${isPro ? 'bg-yellow-500' : 'bg-violet-600'} p-2 rounded-xl`}>
             <Globe className="w-6 h-6 text-white" />
           </div>
           <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">
             SEO<span className={isPro ? "text-yellow-500" : "text-violet-500"}>WIZARD {isPro && "PRO"}</span>
           </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Botón de Login siempre visible si no hay usuario */}
          {!user && (
            <button onClick={handleLogin} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl font-bold text-sm cursor-pointer hover:bg-gray-200 transition-all">
              <LogIn className="w-4 h-4" /> Entrar con Google
            </button>
          )}

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
        {/* Modal de Planes */}
        {showPricing && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[2.5rem] max-w-4xl w-full relative">
              <button onClick={() => setShowPricing(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full cursor-pointer"><X /></button>
              <h2 className="text-3xl font-black text-center mb-8 italic uppercase">Selecciona tu Plan Prime</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <div key={plan.name} className={`p-6 rounded-3xl border ${plan.popular ? 'border-violet-500 bg-violet-500/5' : 'border-white/10 bg-white/5'} flex flex-col`}>
                    <h3 className="font-black uppercase mb-1">{plan.name}</h3>
                    <div className="text-2xl font-black mb-4">${plan.price} <span className="text-xs text-gray-500">/ {plan.credits} créditos</span></div>
                    <a href={`${plan.link}?checkout[email]=${user?.email}`} target="_blank" className={`text-center p-3 rounded-xl font-black uppercase italic text-xs ${plan.popular ? 'bg-violet-500 text-white' : 'bg-white text-black'} cursor-pointer hover:scale-105 transition-all`}>Comprar Ahora</a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {credits <= 0 && !loading && (
          <div className="bg-white/[0.02] border border-white/10 p-10 rounded-[3rem] text-center mb-12">
            <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
            <h2 className="text-3xl font-black uppercase mb-3 italic">Límite alcanzado</h2>
            <button onClick={() => setShowPricing(true)} className="bg-violet-600 p-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-violet-500 transition-all uppercase italic w-full cursor-pointer">
              <Star className="w-5 h-5 fill-current" /> Ver Planes Prime
            </button>
          </div>
        )}

        <div className={`transition-all ${credits <= 0 ? 'opacity-10 blur-sm pointer-events-none' : 'opacity-100'}`}>
          <div className="bg-gradient-to-b from-white/[0.05] border-2 border-dashed border-white/10 rounded-[3rem] p-16 text-center hover:border-violet-500/50 transition-all mb-12">
            <label className="cursor-pointer block">
              {loading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
                  <span className="text-xs font-bold animate-pulse uppercase">Procesando...</span>
                </div>
              ) : (
                <>
                  <div className="bg-white/5 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"><Upload /></div>
                  <h2 className="text-xl font-black uppercase italic">Subir Imágenes</h2>
                </>
              )}
              <input type="file" className="hidden" onChange={handleUpload} accept="image/*" multiple disabled={loading || credits <= 0} />
            </label>
          </div>
        </div>

        <div className="space-y-6">
          {results.map(res => (
            <div key={res.id} className="bg-white/[0.03] p-5 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 border border-white/5">
              <img src={res.preview} className="w-24 h-24 rounded-[1.5rem] object-cover" />
              <div className="flex-1 text-left">
                <span className="text-[10px] font-bold text-gray-500 uppercase">{res.fileName}.jpg</span>
                <p className="text-[14px] text-gray-300 italic font-medium">"{res.altText}"</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { navigator.clipboard.writeText(res.altText); alert('Copiado!'); }} className="p-4 bg-white/5 rounded-2xl cursor-pointer hover:text-white"><Copy className="w-4 h-4" /></button>
                <button onClick={() => { const l = document.createElement('a'); l.href = res.preview; l.download = `${res.fileName}.jpg`; l.click(); }} className="p-4 bg-white/5 rounded-2xl cursor-pointer hover:text-white"><Download className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}