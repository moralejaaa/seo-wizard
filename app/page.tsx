"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Upload, Zap, Lock, DownloadCloud, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';

// 1. Conexión a tu Supabase (Datos verificados)
const supabaseUrl = 'https://geixfrhlbaznjxaxpvrm.supabase.co';
const supabaseKey = 'sb_publishable_-vedbc51MiECfsLoEDXpPg_gaxVFs5x';
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Tu API Key (La que usamos en AI Studio)
const GEMINI_KEY = "AIzaSyApD4h3Pp6cOUcnwkuHywHIF5W7V9KgM6c";

export default function SEOWizard() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [userEmail, setUserEmail] = useState("cliente_nuevo@test.com");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cargar tus créditos actuales de la tabla profiles
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
        setErrorMessage("Te has quedado sin créditos. Por favor, recarga.");
        break;
      }

      try {
        const base64Data = await new Promise<string>((res) => {
          const r = new FileReader(); r.readAsDataURL(file);
          r.onload = () => res((r.result as string).split(',')[1]);
        });

        // 3. URL y Modelo corregidos para usar tus $300 de crédito
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Analiza la imagen y genera un nombre de archivo SEO y un texto Alt. Responde estrictamente en JSON: {\"fileName\": \"...\", \"altText\": \"...\"}" },
                { inlineData: { mimeType: file.type, data: base64Data } }
              ]
            }],
            generationConfig: { 
              responseMimeType: "application/json",
              temperature: 1 
            }
          })
        });

        if (!resp.ok) {
          const errorData = await resp.json();
          setErrorMessage(`Google Error: ${errorData.error.message}`);
          continue;
        }

        const resJson = await resp.json();
        const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawText) {
          const data = JSON.parse(rawText);
          const newCount = currentDbCredits - 1;
          
          // Descontar crédito en tu Supabase
          await supabase.from('profiles').update({ usage_count: newCount }).eq('email', userEmail);

          setResults(prev => [{
            ...data,
            id: Math.random().toString(),
            preview: `data:${file.type};base64,${base64Data}`
          }, ...prev]);
          setCredits(newCount);
          currentDbCredits = newCount;
        }
      } catch (err) {
        setErrorMessage("Error de conexión. Intenta con una imagen a la vez.");
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
    lz.download = "imagenes_seo.zip";
    lz.click();
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <nav className="max-w-4xl mx-auto flex justify-between items-center mb-12">
        <h1 className="font-black italic text-2xl text-blue-500 uppercase tracking-tighter">SEO WIZARD PRO</h1>
        <div className="bg-white/10 px-6 py-2 rounded-full flex items-center gap-2 border border-white/20">
          <Zap className="w-4 h-4 text-yellow-500 fill-current" />
          <span className="text-sm font-bold uppercase">{credits} Créditos</span>
        </div>
      </nav>

      <main className="max-w-xl mx-auto">
        {errorMessage && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 p-4 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold uppercase">
            <AlertCircle className="w-5 h-5" />
            {errorMessage}
          </div>
        )}

        <div className={`border-2 border-dashed rounded-[3rem] p-20 text-center transition-all ${credits <= 0 ? 'border-red-500/30 bg-red-500/5' : 'border-blue-500/30 bg-blue-500/[0.02]'}`}>
          {credits <= 0 ? (
            <div className="flex flex-col items-center">
              <Lock className="w-12 h-12 text-red-500 mb-4" />
              <h2 className="text-xl font-black uppercase italic">Sin Créditos</h2>
              <p className="text-gray-500 text-xs mt-2 uppercase">Recarga para continuar</p>
            </div>
          ) : (
            <label className="cursor-pointer group block">
              {loading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                  <p className="text-xs font-black italic uppercase animate-pulse">Analizando imagen...</p>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/20 group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-black italic uppercase mb-1 tracking-tight">Subir Imágenes</h2>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Aprovechando créditos de Google Cloud</p>
                </>
              )}
              <input type="file" className="hidden" onChange={handleUpload} accept="image/*" multiple disabled={loading} />
            </label>
          )}
        </div>

        {results.length > 0 && (
          <div className="mt-12 space-y-4">
            <button onClick={downloadAll} className="w-full bg-white text-black py-5 rounded-3xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-gray-200 transition-colors">
              <DownloadCloud className="w-5 h-5" /> Descargar Pack ZIP
            </button>
            <div className="grid grid-cols-1 gap-4">
              {results.map(res => (
                <div key={res.id} className="bg-white/[0.03] border border-white/5 p-5 rounded-3xl flex items-center gap-5 hover:bg-white/[0.05] transition-colors">
                  <img src={res.preview} className="w-14 h-14 rounded-2xl object-cover border border-white/10" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <p className="text-[11px] font-black text-blue-400 uppercase truncate tracking-tight">{res.fileName}.jpg</p>
                    </div>
                    <p className="text-[10px] text-gray-400 italic truncate mt-1">"{res.altText}"</p>
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