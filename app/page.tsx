"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Upload, Loader2, Zap, Archive, Lock, DownloadCloud } from 'lucide-react';
import JSZip from 'jszip';

// Conexión a tu Supabase
const supabaseUrl = 'https://geixfrhlbaznjxaxpvrm.supabase.co';
const supabaseKey = 'sb_publishable_-vedbc51MiECfsLoEDXpPg_gaxVFs5x';
const supabase = createClient(supabaseUrl, supabaseKey);

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_KEY;

export default function SEOWizard() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [userEmail, setUserEmail] = useState("cliente_nuevo@test.com");

  // EFECTO DE CARGA: Corregido para evitar duplicados y saltos de créditos
  useEffect(() => {
    const initUser = async () => {
      // Usamos .maybeSingle() para que si hay basura en la DB no explote
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle(); 

      if (!profile) {
        // Si el usuario no existe, lo creamos una sola vez con 5 créditos
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert([{ email: userEmail, usage_count: 5, is_pro: false }])
          .select()
          .maybeSingle();
        if (newProfile) setCredits(newProfile.usage_count);
      } else {
        // Si existe, ponemos los créditos que dice la base de datos
        setCredits(profile.usage_count);
      }
    };
    initUser();
  }, [userEmail]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // Verificación estricta de créditos
    if (files.length === 0 || credits < files.length) return;

    setLoading(true);
    for (const file of files) {
      try {
        const base64Data = await new Promise<string>((res) => {
          const r = new FileReader(); r.readAsDataURL(file);
          r.onload = () => res((r.result as string).split(',')[1]);
        });

        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ inlineData: { mimeType: file.type, data: base64Data } }, { text: "Respond ONLY JSON: {\"fileName\": \"name\", \"altText\": \"text\"}" }] }]
          })
        });

        const resJson = await resp.json();
        if (resJson.candidates?.[0]) {
          const text = resJson.candidates[0].content.parts[0].text;
          const data = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
          
          setResults(prev => [{ ...data, id: Math.random().toString(), preview: `data:${file.type};base64,${base64Data}` }, ...prev]);
          
          // ACTUALIZACIÓN REAL EN SUPABASE
          const newCount = credits - 1;
          const { error } = await supabase
            .from('profiles')
            .update({ usage_count: newCount })
            .eq('email', userEmail);
          
          if (!error) setCredits(newCount);
        }
      } catch (err) { console.error("Error en procesamiento:", err); }
    }
    setLoading(false);
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    // BOM para acentos en Excel
    let csv = "\uFEFFnombre_archivo;texto_alternativo_seo\n"; 
    results.forEach(res => {
      zip.file(`${res.fileName}.jpg`, res.preview.split(',')[1], { base64: true });
      csv += `${res.fileName}.jpg;${res.altText}\n`;
    });
    const zipB = await zip.generateAsync({ type: "blob" });
    const lz = document.createElement('a'); lz.href = URL.createObjectURL(zipB); lz.download = "seo_wizard.zip"; lz.click();
    const lc = document.createElement('a'); lc.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); lc.download = "data_seo.csv"; lc.click();
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white p-6 md:p-10 font-sans">
      <nav className="max-w-4xl mx-auto flex justify-between items-center mb-16">
        <h1 className="font-black italic text-2xl tracking-tighter text-blue-500 underline decoration-blue-500/30">SEO WIZARD PRO</h1>
        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-sm shadow-xl">
          <Zap className="w-4 h-4 text-yellow-500 fill-current" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-200">{credits} CRÉDITOS DB</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto text-center">
        <div className={`border-2 border-dashed rounded-[3rem] p-12 md:p-20 transition-all duration-500 ${credits <= 0 ? 'border-red-500/20 bg-red-500/5' : 'border-blue-500/20 bg-blue-500/[0.02] hover:border-blue-500/40 shadow-[0_0_50px_rgba(37,99,235,0.05)]'}`}>
          {credits <= 0 ? (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
              <Lock className="w-14 h-14 text-yellow-600 mb-6 drop-shadow-2xl" />
              <h2 className="text-3xl font-black mb-4 uppercase italic tracking-tighter">Acceso Restringido</h2>
              <p className="text-gray-500 text-xs mb-8 max-w-xs leading-relaxed">Has agotado tus créditos gratuitos de optimización.</p>
              <button 
                onClick={() => alert("Próximamente: Pago con Binance Pay")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-2xl"
              >
                Obtener Más Créditos
              </button>
            </div>
          ) : (
            <label className="cursor-pointer group block">
              <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-[0_20px_40px_rgba(37,99,235,0.3)] group-hover:scale-110 transition-all duration-500 group-hover:rotate-3">
                <Upload className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-3">
                {loading ? "Hechizando..." : "Subir Imágenes"}
              </h2>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">Lotes de hasta {credits} archivos</p>
              <input type="file" className="hidden" onChange={handleUpload} accept="image/*" multiple disabled={loading} />
            </label>
          )}
        </div>

        {results.length > 0 && (
          <div className="mt-16 animate-in slide-in-from-bottom-8 duration-1000">
            <button 
              onClick={downloadAll} 
              className="w-full bg-white hover:bg-blue-600 text-black hover:text-white py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.25em] transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer mb-12 flex items-center justify-center gap-4 shadow-[0_30px_60px_rgba(255,255,255,0.05)]"
            >
              <DownloadCloud className="w-6 h-6" /> Descargar Todo (ZIP + CSV)
            </button>
            
            <div className="grid grid-cols-1 gap-4 pb-32">
              {results.map(res => (
                <div key={res.id} className="group bg-white/[0.02] border border-white/5 p-5 rounded-[2rem] flex flex-col md:flex-row items-center gap-8 hover:bg-white/[0.04] transition-all duration-300">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <img src={res.preview} className="w-full h-full rounded-2xl object-cover border border-white/10 shadow-2xl group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="text-left flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Nombre Generado</p>
                    </div>
                    <p className="text-sm font-mono text-gray-200 truncate mb-1 selection:bg-blue-500/30">{res.fileName}.jpg</p>
                    <p className="text-[11px] text-gray-500 italic truncate italic opacity-80">"{res.altText}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 w-full py-8 bg-[#020202]/80 backdrop-blur-md border-t border-white/5 text-center">
        <p className="text-[8px] font-bold text-gray-700 uppercase tracking-[0.5em]">2026 • SEO WIZARD AI • DATABASE SYNC ACTIVE</p>
      </footer>
    </div>
  );
}