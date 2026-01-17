"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Upload, Loader2, Zap, Archive, Lock, DownloadCloud } from 'lucide-react';
import JSZip from 'jszip';

const supabaseUrl = 'https://geixfrhlbaznjxaxpvrm.supabase.co';
const supabaseKey = 'sb_publishable_-vedbc51MiECfsLoEDXpPg_gaxVFs5x';
const supabase = createClient(supabaseUrl, supabaseKey);

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_KEY;

export default function SEOWizard() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [userEmail, setUserEmail] = useState("cliente_nuevo@test.com");

  useEffect(() => {
    const initUser = async () => {
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (!profile) {
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert([{ email: userEmail, usage_count: 5, is_pro: false }])
          .select()
          .single();
        if (newProfile) setCredits(newProfile.usage_count);
      } else {
        setCredits(profile.usage_count);
      }
    };
    initUser();
  }, [userEmail]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
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
          
          const newCount = credits - 1;
          await supabase.from('profiles').update({ usage_count: newCount }).eq('email', userEmail);
          setCredits(newCount);
        }
      } catch (err) { console.error(err); }
    }
    setLoading(false);
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    let csv = "\uFEFFnombre_archivo;texto_alternativo_seo\n"; 
    results.forEach(res => {
      zip.file(`${res.fileName}.jpg`, res.preview.split(',')[1], { base64: true });
      csv += `${res.fileName}.jpg;${res.altText}\n`;
    });
    const zipB = await zip.generateAsync({ type: "blob" });
    const lz = document.createElement('a'); lz.href = URL.createObjectURL(zipB); lz.download = "seo_wizard.zip"; lz.click();
    const lc = document.createElement('a'); lc.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); lc.download = "data.csv"; lc.click();
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white p-6 md:p-10 font-sans">
      <nav className="max-w-4xl mx-auto flex justify-between items-center mb-16">
        <h1 className="font-black italic text-2xl tracking-tighter text-blue-500">SEO WIZARD PRO</h1>
        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-sm">
          <Zap className="w-4 h-4 text-yellow-500 fill-current" />
          <span className="text-[10px] font-black uppercase tracking-widest">{credits} CRÉDITOS REALES</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto text-center">
        <div className={`border-2 border-dashed rounded-[3rem] p-12 md:p-20 transition-all duration-300 ${credits <= 0 ? 'border-red-500/20 bg-red-500/5' : 'border-blue-500/20 bg-blue-500/[0.02] hover:border-blue-500/40'}`}>
          {credits <= 0 ? (
            <div className="flex flex-col items-center animate-in fade-in duration-500">
              <Lock className="w-12 h-12 text-yellow-500 mb-6" />
              <h2 className="text-3xl font-black mb-4 uppercase italic tracking-tighter">Créditos Agotados</h2>
              <p className="text-gray-500 text-xs mb-8 max-w-xs">Has alcanzado el límite de tu plan actual.</p>
              <button 
                onClick={() => alert("Pronto: Pasarela Cripto Automática")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-[0_10px_20px_rgba(37,99,235,0.3)]"
              >
                Comprar Paquete Pro
              </button>
            </div>
          ) : (
            <label className="cursor-pointer group block">
              <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                <Upload className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">
                {loading ? "Procesando..." : "Subir Imágenes"}
              </h2>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Formatos aceptados: JPG, PNG, WEBP</p>
              <input type="file" className="hidden" onChange={handleUpload} accept="image/*" multiple disabled={loading} />
            </label>
          )}
        </div>

        {results.length > 0 && (
          <div className="mt-16 animate-in slide-in-from-bottom-4 duration-700">
            <button 
              onClick={downloadAll} 
              className="w-full bg-white hover:bg-blue-600 text-black hover:text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer mb-10 flex items-center justify-center gap-3 shadow-2xl"
            >
              <DownloadCloud className="w-5 h-5" /> Descargar Pack Final (ZIP + EXCEL)
            </button>
            
            <div className="grid grid-cols-1 gap-4 pb-20">
              {results.map(res => (
                <div key={res.id} className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex items-center gap-6 hover:bg-white/[0.05] transition-colors">
                  <img src={res.preview} className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Nombre Optimizado</p>
                    <p className="text-xs font-mono text-gray-300 truncate">{res.fileName}.jpg</p>
                    <p className="text-[10px] text-gray-500 italic mt-1 truncate">"{res.altText}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="py-12 border-t border-white/5 text-center">
        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.4em]">© 2026 SEO WIZARD PRO • POWERED BY SUPABASE</p>
      </footer>
    </div>
  );
}