"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Upload, Zap, Loader2, CheckCircle, FileSpreadsheet, FileArchive, Copy, Download, Crown, LogIn, MessageCircle } from 'lucide-react';
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

  // 1. Función para obtener créditos según quién esté usando la app
  const fetchCredits = useCallback(async (email?: string) => {
    // Si no hay email, usamos la cuenta de "invitado" por defecto
    const targetEmail = email || "cliente_nuevo@test.com";
    const { data: profile } = await supabase.from('profiles').select('usage_count').eq('email', targetEmail).maybeSingle();
    if (profile) setCredits(profile.usage_count);
  }, []);

  // 2. Detectar sesión al cargar la página
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        fetchCredits(session.user.email);
      } else {
        fetchCredits(); // Carga créditos de invitado
      }
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchCredits(session.user.email);
    });

    return () => subscription.unsubscribe();
  }, [fetchCredits]);

  // 3. Función de Login para volverse Prime
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
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
              { text: "Analiza la imagen y responde solo JSON: {\"fileName\": \"nombre-archivo-seo\", \"altText\": \"descripcion alt en español\"}" },
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

  // Funciones de descarga (sin cambios significativos)
  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); alert("Copiado"); };
  const downloadSingle = (res: any) => { const link = document.createElement('a'); link.href = res.preview; link.download = `${res.fileName}.jpg`; link.click(); };
  const downloadZIP = async () => {
    const zip = new JSZip();
    results.forEach((res) => { zip.file(`${res.fileName}.jpg`, res.preview.split(',')[1], { base64: true }); });
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "imagenes_seo.zip");
  };
  const downloadExcel = () => {
    const header = "\uFEFFNombre de Archivo,Texto Alt\n";
    const rows = results.map(res => `${res.fileName}.jpg,"${res.altText}"`).join("\n");
    saveAs(new Blob([header + rows], { type: 'text/csv;charset=utf-8;' }), "reporte_seo.csv");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 font-sans">
      <nav className="max-w-5xl mx-auto flex justify-between items-center mb-12 py-4 border-b border-white/5">
        <h1 className="text-2xl font-black italic text-violet-500 uppercase tracking-tighter">SEO WIZARD PRO</h1>
        <div className="flex items-center gap-4">
          {results.length > 0 && (
            <div className="flex gap-2">
              <button onClick={downloadExcel} className="cursor-pointer bg-emerald-600 p-2 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1"><FileSpreadsheet className="w-3 h-3" /> EXCEL</button>
              <button onClick={downloadZIP} className="cursor-pointer bg-violet-600 p-2 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1"><FileArchive className="w-3 h-3" /> ZIP</button>
            </div>
          )}
          <div className="bg-violet-500/10 px-3 py-2 rounded-full border border-violet-500/30 flex items-center gap-2">
            <Zap className="w-3 h-3 text-yellow-500 fill-current" />
            <span className="text-[10px] font-black">{credits}</span>
          </div>
          {user && <span className="text-[10px] text-gray-500 hidden md:block">{user.email}</span>}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto">
        {/* BLOQUEO PRIME SI NO HAY CRÉDITOS */}
        {credits <= 0 && !loading && (
          <div className="bg-gradient-to-br from-violet-900/40 to-black border border-violet-500/50 p-8 rounded-[2.5rem] text-center mb-8 animate-in zoom-in">
            <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black uppercase mb-2">Potencia tu SEO</h2>
            <p className="text-gray-400 mb-8 text-sm">Has agotado los créditos gratuitos. Inicia sesión para comprar un paquete Prime y continuar.</p>
            
            <div className="flex flex-col gap-4 max-w-xs mx-auto">
              {!user ? (
                <button onClick={handleLogin} className="cursor-pointer bg-white text-black p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all">
                  <LogIn className="w-5 h-5" /> Iniciar con Google
                </button>
              ) : (
                <button className="cursor-pointer bg-violet-600 p-4 rounded-2xl font-bold shadow-lg shadow-violet-500/20">
                  Comprar 100 créditos (Binance)
                </button>
              )}
              <a href="https://wa.me/tu_numero" target="_blank" className="flex items-center justify-center gap-2 text-[10px] font-bold text-gray-500 hover:text-white transition-colors uppercase">
                <MessageCircle className="w-4 h-4" /> Soporte Vía WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* ZONA DE CARGA */}
        <div className={`transition-all duration-500 ${credits <= 0 ? 'opacity-20 grayscale pointer-events-none' : 'opacity-100'}`}>
          <div className="border-2 border-dashed border-violet-500/20 bg-black rounded-[2rem] p-16 text-center hover:border-violet-500 transition-all mb-8 group">
            <label className="cursor-pointer block">
              {loading ? <Loader2 className="w-10 h-10 text-violet-500 animate-spin mx-auto" /> : <Upload className="w-10 h-10 text-violet-500 mx-auto mb-4 group-hover:scale-110" />}
              <h2 className="text-lg font-bold uppercase tracking-tight">Cargar Imágenes</h2>
              <input type="file" className="hidden" onChange={handleUpload} accept="image/*" multiple disabled={loading || credits <= 0} />
            </label>
          </div>
        </div>

        {/* RESULTADOS */}
        <div className="space-y-4">
          {results.map(res => (
            <div key={res.id} className="bg-white/[0.03] p-5 rounded-3xl flex flex-col md:flex-row items-center gap-5 border border-white/5">
              <img src={res.preview} className="w-20 h-20 rounded-xl object-cover border border-white/10" />
              <div className="flex-1 text-left min-w-0 w-full">
                <p className="text-[10px] font-bold text-violet-400 uppercase mb-1">{res.fileName}.jpg</p>
                <p className="text-[13px] text-gray-300 italic">"{res.altText}"</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => copyToClipboard(res.altText)} className="cursor-pointer p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"><Copy className="w-4 h-4" /></button>
                <button onClick={() => downloadSingle(res)} className="cursor-pointer p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"><Download className="w-4 h-4" /></button>
                <CheckCircle className="w-5 h-5 text-emerald-500 ml-1" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}