"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Upload, Zap, Lock, DownloadCloud, Loader2 } from 'lucide-react';
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

  const fetchCredits = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('usage_count')
      .eq('email', userEmail)
      .maybeSingle();
    if (profile) {
      setCredits(profile.usage_count);
      return profile.usage_count;
    }
    return 0;
  };

  useEffect(() => {
    fetchCredits();
  }, [userEmail]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setLoading(true);
    let currentDbCredits = await fetchCredits();

    for (const file of files) {
      if (currentDbCredits <= 0) break;

      try {
        const base64Data = await new Promise<string>((res) => {
          const r = new FileReader(); r.readAsDataURL(file);
          r.onload = () => res((r.result as string).split(',')[1]);
        });

        // --- MODELO ACTUALIZADO SEGÚN TU CÓDIGO (GEMINI 2.0 FLASH) ---
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_KEY}`;
        
        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Respond ONLY JSON: {\"fileName\": \"seo-name\", \"altText\": \"seo description\"}" },
                { inlineData: { mimeType: file.type, data: base64Data } }
              ]
            }],
            generationConfig: {
              temperature: 1,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 8192,
              responseMimeType: "application/json" // Esto obliga a la IA a darte JSON puro
            }
          })
        });

        if (!resp.ok) {
          console.error("Error en API:", await resp.text());
          continue;
        }

        const resJson = await resp.json();
        const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawText) {
          const data = JSON.parse(rawText);
          
          const newCount = currentDbCredits - 1;
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ usage_count: newCount })
            .eq('email', userEmail);

          if (!updateError) {
            setResults(prev => [{ ...data, id: Math.random().toString(), preview: `data:${file.type};base64,${base64Data}` }, ...prev]);
            setCredits(newCount);
            currentDbCredits = newCount;
          }
        }
      } catch (err) {
        console.error("Fallo:", err);
      }
    }
    setLoading(false);
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    let csv = "\uFEFFarchivo;texto_seo\n"; 
    results.forEach(res => {
      zip.file(`${res.fileName}.jpg`, res.preview.split(',')[1], { base64: true });
      csv += `${res.fileName}.jpg;${res.altText}\n`;
    });
    const zipB = await zip.generateAsync({ type: "blob" });
    const lz = document.createElement('a'); lz.href = URL.createObjectURL(zipB); lz.download = "seo_wizard_final.zip"; lz.click();
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white p-6 md:p-10 font-sans">
      <nav className="max-w-4xl mx-auto flex justify-between items-center mb-16">
        <h1 className="font-black italic text-2xl tracking-tighter text-blue-500">SEO WIZARD PRO</h1>
        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500 fill-current" />
          <span className="text-[10px] font-black tracking-widest">{credits} CRÉDITOS DB</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto text-center">
        <div className={`border-2 border-dashed rounded-[3rem] p-12 md:p-20 transition-all ${credits <= 0 ? 'border-red-500/20 bg-red-500/5' : 'border-blue-500/20 bg-blue-500/[0.02]'}`}>
          {credits <= 0 ? (
            <div className="flex flex-col items-center">
              <Lock className="w-12 h-12 text-red-500 mb-6" />
              <h2 className="text-2xl font-black mb-4 uppercase">Sin Créditos</h2>
              <button onClick={() => window.location.reload()} className="bg-white text-black px-10 py-4 rounded-full font-black text-[10px] uppercase cursor-pointer">Actualizar saldo</button>
            </div>
          ) : (
            <label className="cursor-pointer group block">
              {loading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
                  <h2 className="text-2xl font-black italic uppercase">IA Generando Lote...</h2>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Subir Imágenes</h2>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest tracking-widest">Saldo Real: {credits}</p>
                </>
              )}
              <input type="file" className="hidden" onChange={handleUpload} accept="image/*" multiple disabled={loading} />
            </label>
          )}
        </div>

        {results.length > 0 && (
          <div className="mt-16 animate-in slide-in-from-bottom-4 duration-700 pb-32">
            <button onClick={downloadAll} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest cursor-pointer mb-10 flex items-center justify-center gap-3">
              <DownloadCloud className="w-5 h-5" /> Descargar Todo
            </button>
            <div className="grid grid-cols-1 gap-4">
              {results.map(res => (
                <div key={res.id} className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex items-center gap-6 text-left">
                  <img src={res.preview} className="w-16 h-16 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{res.fileName}.jpg</p>
                    <p className="text-[10px] text-gray-500 italic truncate">"{res.altText}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}