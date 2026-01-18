"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Upload, Zap, Loader2, CheckCircle, FileSpreadsheet, FileArchive, Trash2 } from 'lucide-react';
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
  const userEmail = "cliente_nuevo@test.com";

  const fetchCredits = useCallback(async () => {
    const { data: profile } = await supabase.from('profiles').select('usage_count').eq('email', userEmail).maybeSingle();
    if (profile) setCredits(profile.usage_count);
  }, [userEmail]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const downloadZIP = async () => {
    if (results.length === 0) return;
    const zip = new JSZip();
    results.forEach((res) => {
      const imageData = res.preview.split(',')[1];
      zip.file(`${res.fileName}.jpg`, imageData, { base64: true });
    });
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "imagenes_seo.zip");
  };

  const downloadExcel = () => {
    if (results.length === 0) return;
    const header = "Nombre de Archivo,Texto Alt\n";
    const rows = results.map(res => `${res.fileName}.jpg,"${res.altText}"`).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, "reporte_seo.csv");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !GEMINI_KEY) return;
    setLoading(true);
    let currentDbCredits = credits;

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
              { text: "Responde solo JSON: {\"fileName\": \"nombre-seo\", \"altText\": \"descripcion\"}" },
              { inlineData: { mimeType: file.type, data: base64Data } }
            ]}]
          })
        });
        const resJson = await resp.json();
        const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const data = JSON.parse(rawText.replace(/```json|```/g, "").trim());
          const newCount = currentDbCredits - 1;
          await supabase.from('profiles').update({ usage_count: newCount }).eq('email', userEmail);
          setResults(prev => [{ ...data, id: Math.random().toString(), preview: `data:${file.type};base64,${base64Data}` }, ...prev]);
          setCredits(newCount);
          currentDbCredits = newCount;
        }
      } catch (err) { console.error(err); }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 font-sans">
      <nav className="max-w-5xl mx-auto flex justify-between items-center mb-12 py-4 border-b border-white/5">
        <h1 className="text-2xl font-black italic text-violet-500 uppercase tracking-tighter">SEO WIZARD PRO</h1>
        <div className="flex items-center gap-2">
          <button onClick={downloadExcel} className="bg-emerald-600 px-3 py-2 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1 shadow-lg shadow-emerald-900/20">
            <FileSpreadsheet className="w-3 h-3" /> EXCEL
          </button>
          <button onClick={downloadZIP} className="bg-violet-600 px-3 py-2 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1 shadow-lg shadow-violet-900/20">
            <FileArchive className="w-3 h-3" /> ZIP
          </button>
          <div className="bg-violet-500/10 px-3 py-2 rounded-full border border-violet-500/30 flex items-center gap-2">
            <Zap className="w-3 h-3 text-yellow-500 fill-current" />
            <span className="text-[10px] font-black">{credits}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-xl mx-auto">
        <div className="border-2 border-dashed border-violet-500/20 bg-black rounded-[2rem] p-16 text-center hover:border-violet-500 transition-all mb-8">
          <label className="cursor-pointer block">
            {loading ? <Loader2 className="w-10 h-10 text-violet-500 animate-spin mx-auto" /> : <Upload className="w-10 h-10 text-violet-500 mx-auto mb-4" />}
            <h2 className="text-lg font-bold uppercase">Cargar Imágenes</h2>
            <input type="file" className="hidden" onChange={handleUpload} accept="image/*" multiple disabled={loading} />
          </label>
        </div>

        <div className="space-y-3">
          {results.map(res => (
            <div key={res.id} className="bg-white/[0.03] p-4 rounded-2xl flex items-center gap-4 border border-white/5 animate-in fade-in">
              <img src={res.preview} className="w-12 h-12 rounded-lg object-cover" />
              <div className="flex-1 text-left min-w-0">
                <p className="text-[10px] font-bold text-violet-400 uppercase truncate">{res.fileName}.jpg</p>
                <p className="text-[11px] text-gray-400 italic truncate">"{res.altText}"</p>
              </div>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}