"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Upload, Zap, Lock, DownloadCloud, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';

// Configuración Supabase
const supabaseUrl = 'https://geixfrhlbaznjxaxpvrm.supabase.co';
const supabaseKey = 'sb_publishable_-vedbc51MiECfsLoEDXpPg_gaxVFs5x';
const supabase = createClient(supabaseUrl, supabaseKey);

// Tu API Key
const GEMINI_KEY = "AIzaSyApD4h3Pp6cOUcnwkuHywHIF5W7V9KgM6c";

export default function SEOWizard() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [userEmail, setUserEmail] = useState("cliente_nuevo@test.com");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchCredits = async () => {
    const { data: profile } = await supabase.from('profiles').select('usage_count').eq('email', userEmail).maybeSingle();
    if (profile) { setCredits(profile.usage_count); return profile.usage_count; }
    return 0;
  };

  useEffect(() => { fetchCredits(); }, [userEmail]);

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

        // Usamos la URL que ya habilitamos en Google Cloud Console
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Analiza la imagen y genera un nombre de archivo SEO y un texto Alt. Responde únicamente con este formato JSON, sin markdown: {\"fileName\": \"nombre-archivo\", \"altText\": \"descripcion\"}" },
                { inlineData: { mimeType: file.type, data: base64Data } }
              ]
            }]
            // Hemos quitado generationConfig para evitar el error de 'Unknown name'
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
          // Limpiamos el texto por si la IA añade etiquetas ```json
          const cleanJson = rawText.replace(/```json|```/g, "").trim();
          const data = JSON.parse(cleanJson);
          
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
        setErrorMessage("Error al interpretar los datos. Intenta con otra imagen.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white p-10 font-sans">
      <nav className="max-w-4xl mx-auto flex justify-between items-center mb-10 font-black italic">
        <h1 className="text-2xl text-blue-500 uppercase">SEO WIZARD PRO</h1>
        <div className="bg-white/10 px-4 py-2 rounded-full border border-white/20 flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500 fill-current" />
          <span className="text-xs">{credits} CRÉDITOS</span>
        </div>
      </nav>

      <main className="max-w-xl mx-auto">
        {errorMessage && (
          <div className="mb-6 bg-red-500/10 border border-red-500 p-4 rounded-2xl text-red-500 text-[10px] font-bold uppercase">
            {errorMessage}
          </div>
        )}

        <div className="border-2 border-dashed border-blue-500/30 bg-blue-500/[0.02] rounded-[3rem] p-20 text-center">
          <label className="cursor-pointer block">
            {loading ? <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" /> : <Upload className="w-12 h-12 text-blue-500 mx-auto mb-4" />}
            <h2 className="text-xl font-black italic uppercase">Cargar Imágenes</h2>
            <input type="file" className="hidden" onChange={handleUpload} accept="image/*" multiple disabled={loading} />
          </label>
        </div>

        {results.length > 0 && (
          <div className="mt-10 space-y-3">
            {results.map(res => (
              <div key={res.id} className="bg-white/5 p-4 rounded-2xl flex items-center gap-4 border border-white/10">
                <img src={res.preview} className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1 text-left font-bold">
                  <p className="text-[10px] text-blue-400 uppercase truncate">{res.fileName}.jpg</p>
                  <p className="text-[10px] text-gray-500 italic truncate mt-1">"{res.altText}"</p>
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