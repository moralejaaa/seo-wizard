"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Upload, Zap, Lock, DownloadCloud, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';

// Configuración de Supabase
const supabaseUrl = 'https://geixfrhlbaznjxaxpvrm.supabase.co';
const supabaseKey = 'sb_publishable_-vedbc51MiECfsLoEDXpPg_gaxVFs5x';
const supabase = createClient(supabaseUrl, supabaseKey);

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_KEY;

export default function SEOWizard() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [userEmail, setUserEmail] = useState("cliente_nuevo@test.com");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cargar créditos desde la base de datos
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
    setErrorMessage(null);
    let currentDbCredits = await fetchCredits();

    for (const file of files) {
      if (currentDbCredits <= 0) {
        setErrorMessage("Te has quedado sin créditos en la base de datos.");
        break;
      }

      try {
        const base64Data = await new Promise<string>((res) => {
          const r = new FileReader(); r.readAsDataURL(file);
          r.onload = () => res((r.result as string).split(',')[1]);
        });

        // --- CAMBIO CLAVE: Usamos gemini-1.5-flash para activar tu crédito de $300 ---
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Respond ONLY JSON: {\"fileName\": \"nombre-seo-archivo\", \"altText\": \"descripcion seo detallada\"}" },
                { inlineData: { mimeType: file.type, data: base64Data } }
              ]
            }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.7
            }
          })
        });

        if (resp.status === 429) {
          setErrorMessage("Límite de velocidad detectado. Esperando 5 segundos...");
          await new Promise(r => setTimeout(r, 5000));
          // Opcional: podrías reintentar aquí
          continue;
        }

        if (!resp.ok) {
          console.error("Error API:", await resp.text());
          continue;
        }

        const resJson = await resp.json();
        const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawText) {
          const data = JSON.parse(rawText);
          
          // Actualizamos Supabase restando 1 crédito
          const newCount = currentDbCredits - 1;
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ usage_count: newCount })
            .eq('email', userEmail);

          if (!updateError) {
            setResults(prev => [{
              ...data,
              id: Math.random().toString(),
              preview: `data:${file.type};base64,${base64Data}`
            }, ...prev]);
            setCredits(newCount);
            currentDbCredits = newCount;
          }
        }
      } catch (err) {
        console.error("Fallo en el procesamiento:", err);
      }
    }
    setLoading(false);
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    results.forEach(res => {
      zip.file(`${res.fileName}.jpg`, res.preview.split(',')[1], { base64: true });
    });
    const zipB = await zip.generateAsync({ type: "blob" });
    const lz = document.createElement('a');
    lz.href = URL.createObjectURL(zipB);
    lz.download = "seo_wizard_pack.zip";
    lz.click();
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white p-6 font-sans">
      <nav className="max-w-4xl mx-auto flex justify-between items-center mb-12">
        <h1 className="font-black italic text-xl text-blue-500 tracking-tighter uppercase">SEO WIZARD PRO</h1>
        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500 fill-current" />
          <span className="text-[10px] font-black tracking-widest">{credits} CRÉDITOS DB</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto">
        {errorMessage && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 p-4 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold uppercase">
            <AlertCircle className="w-5 h-5" />
            {errorMessage}
          </div>
        )}

        <div className={`border-2 border-dashed rounded-[2.5rem] p-12 text-center transition-all ${credits <= 0 ? 'border-red-500/20 bg-red-500/5' : 'border-blue-500/20 bg-blue-500/[0.02]'}`}>
          {credits <= 0 ? (
            <div className="flex flex-col items-center">
              <Lock className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-sm font-black uppercase tracking-widest">Saldo Insuficiente</p>
            </div>
          ) : (
            <label className="cursor-pointer group block">
              {loading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                  <p className="text-sm font-black italic uppercase animate-pulse">Analizando lote...</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-black italic uppercase mb-1">Cargar Imágenes</h2>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Se descontará 1 crédito por foto</p>
                </>
              )}
              <input type="file" className="hidden" onChange={handleUpload} accept="image/*" multiple disabled={loading} />
            </label>
          )}
        </div>

        {results.length > 0 && (
          <div className="mt-12 space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <button onClick={downloadAll} className="w-full bg-white text-black py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
              <DownloadCloud className="w-4 h-4" /> Descargar Todo (.ZIP)
            </button>
            <div className="grid grid-cols-1 gap-3">
              {results.map(res => (
                <div key={res.id} className="bg-white/[0.03] border border-white/5 p-3 rounded-xl flex items-center gap-4">
                  <img src={res.preview} className="w-12 h-12 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <p className="text-[10px] font-black text-blue-400 uppercase truncate">{res.fileName}.jpg</p>
                    </div>
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