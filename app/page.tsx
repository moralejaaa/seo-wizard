"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Upload, Zap, Loader2, CheckCircle, Download, FileSpreadsheet, FileArchive } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const supabaseUrl = 'https://geixfrhlbaznjxaxpvrm.supabase.co';
const supabaseKey = 'sb_publishable_-vedbc51MiECfsLoEDXpPg_gaxVFs5x';
const supabase = createClient(supabaseUrl, supabaseKey);
const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export default function SEOWizard() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [userEmail, setUserEmail] = useState("cliente_nuevo@test.com");

  // --- LÓGICA DE EXPORTACIÓN ---
  
  const downloadZIP = async () => {
    const zip = new JSZip();
    results.forEach((res) => {
      // Convertimos el base64 de vuelta a imagen para el ZIP
      const imageData = res.preview.split(',')[1];
      zip.file(`${res.fileName}.jpg`, imageData, { base64: true });
    });
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "imagenes_seo_optimizadas.zip");
  };

  const downloadExcel = () => {
    const header = "Nombre de Archivo,Texto Alt\n";
    const rows = results.map(res => `${res.fileName}.jpg,"${res.altText}"`).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, "reporte_seo.csv");
  };

  // --- FIN LÓGICA EXPORTACIÓN ---

  const fetchCredits = async () => {
    const { data: profile } = await supabase.from('profiles').select('usage_count').eq('email', userEmail).maybeSingle();
    if (profile) setCredits(profile.usage_count);
  };

  useEffect(() => { fetchCredits(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !GEMINI_KEY) return;
    setLoading(true);
    let currentDbCredits = credits;

    for (const file of files) {
      if (currentDbCredits <= 0) break;
      try {
        const base64Data = await new Promise<string>((res) => {
          const r = new FileReader(); r.readAsDataURL(file);
          r.onload = () => res((r.result as string).split(',')[1]);
        });

        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [
              { text: "Genera JSON: {\"fileName\": \"nombre-seo\", \"altText\": \"descripcion\"}" },
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
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <nav className="max-w-5xl mx-auto flex justify-between items-center mb-10">
        <h1 className="text-2xl font-black italic text-blue-500 tracking-tighter">SEO WIZARD PRO</h1>
        <div className="flex items-center gap-4">
          {results.length > 0 && (
            <div className="flex gap-2 animate-in fade-in zoom-in">
              <button onClick={downloadExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all">
                <FileSpreadsheet className="w-4 h-4" /> EXCEL
              </button>
              <button onClick={downloadZIP} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all">
                <FileArchive className="w-4 h-4" /> DESCARGAR ZIP
              </button>
            </div>
          )}
          <div className="bg-white/10 px-4 py-2 rounded-full border border-white/20 flex items-center gap-2">
            <Zap className="w-3 h-3 text-yellow-500 fill-current" />
            <span className="text-[10px] font-bold">{credits} CRÉDITOS</span>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto">
        <div className="border-2 border-dashed border-blue-500/20 bg-blue-500/[0.02] rounded-[2rem] p-16 text-center hover:border-blue-500/50 transition-all group mb-10">
          <label className="cursor-pointer block">
            {loading ? <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" /> : <Upload className="w-10 h-10 text-blue-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />}
            <h2 className="text-lg font-bold italic uppercase">Subir Imágenes por Lote</h2>
            <input type="file" className="hidden" onChange={handleUpload} accept="image/*" multiple disabled={loading} />
          </label>
        </div>

        <div className="grid gap-3">
          {results.map(res => (
            <div key={res.id} className="bg-white/[0.03] p-4 rounded-2xl flex items-center gap-4 border border-white/5 hover:bg-white/[0.06] transition-colors group">
              <img src={res.preview} className="w-14 h-14 rounded-xl object-cover border border-white/10" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-tight truncate">{res.fileName}.jpg</p>
                <p className="text-[11px] text-gray-400 italic mt-1 truncate">"{res.altText}"</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}