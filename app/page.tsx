"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Upload, Zap, Loader2, CheckCircle, FileSpreadsheet, FileArchive, Trash2 } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Configuración Supabase
const supabaseUrl = 'https://geixfrhlbaznjxaxpvrm.supabase.co';
const supabaseKey = 'sb_publishable_-vedbc51MiECfsLoEDXpPg_gaxVFs5x';
const supabase = createClient(supabaseUrl, supabaseKey);

// API Key Profesional de Google Cloud
const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export default function SEOWizard() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [userEmail, setUserEmail] = useState("cliente_nuevo@test.com");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- LÓGICA DE EXPORTACIÓN ---
  const downloadZIP = async () => {
    if (results.length === 0) return alert("Sube imágenes primero");
    const zip = new JSZip();
    results.forEach((res) => {
      const imageData = res.preview.split(',')[1];
      zip.file(`${res.fileName}.jpg`, imageData, { base64: true });
    });
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "imagenes_seo_pro.zip");
  };

  const downloadExcel = () => {
    if (results.length === 0) return alert("No hay datos para exportar");
    const header = "Nombre de Archivo,Texto Alt\n";
    const rows = results.map(res => `${res.fileName}.jpg,"${res.altText}"`).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, "reporte_seo.csv");
  };

  const clearAll = () => {
    if(confirm("¿Limpiar todos los resultados?")) setResults([]);
  };

  const fetchCredits = async () => {
    const { data: profile } = await supabase.from('profiles').select('usage_count').eq('email', userEmail).maybeSingle();
    if (profile) setCredits(profile.usage_count);
  };

  useEffect(() => { fetchCredits(); }, [userEmail]);

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

        // URL v1 para usar tus créditos de pago y evitar error de cuota
        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [
              { text: "Analiza y responde solo JSON: {\"fileName\": \"nombre-archivo-seo\", \"altText\": \"descripcion alt\"}" },
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
      {/* --- EL NAV VA AQUÍ (DENTRO DEL RETURN PRINCIPAL) --- */}
      <nav className="max-w-6xl mx-auto flex justify-between items-center mb-12 py-4 border-b border-white/5">
        <h1 className="text-2xl font-black italic text-violet-500 tracking-tighter uppercase">SEO WIZARD PRO</h1>
        
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <button onClick={downloadExcel} className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:scale-105 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <FileSpreadsheet className="w-4 h-4" /> EXCEL
            </button>
            <button onClick={downloadZIP} className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:scale-105 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <FileArchive className="w-4 h-4" /> ZIP
            </button>
            {results.length > 0 && (
              <button onClick={clearAll} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="bg-violet-500/10 px-4 py-2 rounded-full border border-violet-500/30 flex items-center gap-2">
            <Zap className="w-3 h-3 text-yellow-500 fill-current" />
            <span className="text-[10px] font-black">{credits} CRÉDITOS</span>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto">
        {/* ZONA DE CARGA */}
        <div className="relative group mb-12">
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative border-2 border-dashed border-violet-500/20 bg-black rounded-[2.5rem] p-20 text-center hover:border-violet-500 transition-all cursor-pointer">
            <label className="cursor-pointer block">
              {loading ? (
                <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto" />
              ) : (
                <>
                  <Upload className="w-12 h-12 text-violet-500 mx-auto mb-4 group-hover:-translate-y-1 transition-transform" />
                  <h2 className="text-xl font-black italic uppercase tracking-tight">Cargar Lote SEO</h2>
                </>
              )}
              <input type="file" className="hidden" onChange={handleUpload} accept="image/*" multiple disabled={loading} />
            </label>
          </div>
        </div>

        {/* RESULTADOS */}
        <div className="space-y-4">
          {results.map(res => (
            <div key={res.id} className="bg-white/[0.02] p-4 rounded-3xl flex items-center gap-5 border border-white/5 hover:bg-white/[0.04] transition-all group animate-in fade-in slide-in-from-bottom-2">
              <img src={res.preview} className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-violet-400 uppercase tracking-widest truncate">{res.fileName}.jpg</p>
                <p className="text-[12px] text-gray-400 italic mt-1 truncate font-medium">"{res.altText}"</p>
              </div>
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}