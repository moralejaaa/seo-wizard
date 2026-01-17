"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Upload, Zap, Lock, DownloadCloud, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';

// Tus datos de Supabase que ya funcionan
const supabaseUrl = 'https://geixfrhlbaznjxaxpvrm.supabase.co';
const supabaseKey = 'sb_publishable_-vedbc51MiECfsLoEDXpPg_gaxVFs5x';
const supabase = createClient(supabaseUrl, supabaseKey);

// Tu API Key de Gemini
const GEMINI_KEY = "AIzaSyApD4h3Pp6cOUcnwkuHywHIF5W7V9KgM6c";

export default function SEOWizard() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [userEmail, setUserEmail] = useState("cliente_nuevo@test.com");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      if (currentDbCredits <= 0) break;

      try {
        const base64Data = await new Promise<string>((res) => {
          const r = new FileReader(); r.readAsDataURL(file);
          r.onload = () => res((r.result as string).split(',')[1]);
        });

        // URL CORREGIDA: Usando el modelo 2.0 que probaste en AI Studio
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Return ONLY JSON: {\"fileName\": \"name-seo\", \"altText\": \"seo description\"}" },
                { inlineData: { mimeType: file.type, data: base64Data } }
              ]
            }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (!resp.ok) {
          const errorData = await resp.json();
          setErrorMessage(`Error de Google: ${errorData.error.message}`);
          continue;
        }

        const resJson = await resp.json();
        const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawText) {
          const data = JSON.parse(rawText);
          const newCount = currentDbCredits - 1;
          
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
        setErrorMessage("Error de conexión. Intenta de nuevo.");
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
    lz.download = "seo_pack.zip";
    lz.click();
  };

  return (
    <div className="min-h-screen bg-black text-white p-10">
      <nav className="max-w-4xl mx-auto flex justify-between items-center mb-10">
        <h1 className="font-black italic text-2xl text-blue-500 uppercase tracking-tighter">SEO WIZARD PRO</h1>
        <div className="bg-white/10 px-4 py-2 rounded-full flex items-center gap-2 border border-white/20">
          <Zap className="w-4 h-4 text-yellow-500 fill-current" />
          <span className="text-xs font-bold">{credits} CRÉDITOS</span>
        </div>
      </nav>

      <main className="max-w-xl mx-auto">
        {errorMessage && (
          <div className="mb-5 bg-red-500/20 border border-red-500 p-4 rounded-2xl text-red-200 text-xs font-bold uppercase">
            {errorMessage}
          </div>
        )}

        <div className={`border-2 border-dashed rounded-[3rem] p-20 text-center ${credits <= 0 ? 'border-red-500/20' : 'border-blue-500/20 bg-blue-500/[0.02]'}`}>
          {credits <= 0 ? (
            <div className="flex flex-col items-center">
              <Lock className="w-12 h-12 text-red-500 mb-4" />
              <h2 className="font-black">SIN CRÉDITOS</h2>
            </div>
          ) : (
            <label className="cursor-pointer">
              {loading ? (
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
              ) : (
                <>
                  <Upload className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                  <h2 className="font-black italic text-xl uppercase">Subir Imágenes</h2>
                </>
              )}
              <input type="file" className="hidden" onChange={handleUpload} accept="image/*" multiple disabled={loading} />
            </label>
          )}
        </div>

        {results.length > 0 && (
          <div className="mt-10 space-y-4">
            <button onClick={downloadAll} className="w-full bg-blue-600 py-4 rounded-2xl font-black uppercase text-xs">Descargar Pack ZIP</button>
            {results.map(res => (
              <div key={res.id} className="bg-white/5 p-4 rounded-2xl flex items-center gap-4 border border-white/10">
                <img src={res.preview} className="w-12 h-12 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black text-blue-400 truncate uppercase">{res.fileName}.jpg</p>
                  <p className="text-[10px] text-gray-500 italic truncate">"{res.altText}"</p>
                </div>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}