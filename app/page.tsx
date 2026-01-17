"use client";
import { useState, useEffect } from 'react';
import { Upload, Crown, Loader2, Copy, Check, Download, Sparkles, Trash2, Zap, Archive, FileSpreadsheet } from 'lucide-react';
import JSZip from 'jszip';

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_KEY;

export default function SEOWizard() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [language, setLanguage] = useState<'ES' | 'EN'>('ES');
  
  // SISTEMA DE CRÉDITOS Y PERSISTENCIA
  const [credits, setCredits] = useState(5);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    const savedResults = localStorage.getItem('seo_results');
    const savedCredits = localStorage.getItem('seo_credits');
    if (savedResults) setResults(JSON.parse(savedResults));
    if (savedCredits !== null) setCredits(Number(savedCredits));
  }, []);

  useEffect(() => {
    localStorage.setItem('seo_results', JSON.stringify(results));
    localStorage.setItem('seo_credits', credits.toString());
  }, [results, credits]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validación de seguridad para créditos
    if (credits < files.length) {
      setShowUpgrade(true);
      return;
    }

    setLoading(true);

    for (const file of files) {
      try {
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
        });

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inlineData: { mimeType: file.type, data: base64Data } },
                { text: `Analyze for e-commerce SEO in ${language === 'ES' ? 'Spanish' : 'English'}. Respond ONLY JSON: {"fileName": "seo-optimized-name", "altText": "descriptive alt text"}` }
              ]
            }]
          })
        });

        const result = await response.json();

        if (result.candidates?.[0]) {
          const textResponse = result.candidates[0].content.parts[0].text;
          const jsonStart = textResponse.indexOf('{');
          const jsonEnd = textResponse.lastIndexOf('}') + 1;
          const data = JSON.parse(textResponse.substring(jsonStart, jsonEnd));

          const previewUrl = await new Promise<string>((res) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => res(reader.result as string);
          });

          setResults(prev => [{ ...data, id: Math.random().toString(), preview: previewUrl }, ...prev]);
          setCredits(prev => prev - 1);
        }
      } catch (err) {
        console.error("Error procesando imagen:", err);
      }
    }
    setLoading(false);
  };

  // FUNCIÓN MAESTRA: Descarga ZIP + CSV (Excel)
  const downloadAllAssets = async () => {
    const zip = new JSZip();
    let csvContent = "nombre_archivo;texto_alternativo_seo\n"; // Formato compatible con Excel

    results.forEach((res) => {
      // Añadir al ZIP
      const base64Data = res.preview.split(',')[1];
      zip.file(`${res.fileName}.jpg`, base64Data, { base64: true });

      // Añadir fila al CSV
      csvContent += `${res.fileName}.jpg;${res.altText}\n`;
    });

    // Generar y descargar ZIP
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const linkZip = document.createElement('a');
    linkZip.href = URL.createObjectURL(zipBlob);
    linkZip.download = "pack_imagenes_seo.zip";
    linkZip.click();

    // Generar y descargar CSV
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const linkCsv = document.createElement('a');
    linkCsv.href = URL.createObjectURL(csvBlob);
    linkCsv.download = "importar_seo_tienda.csv";
    linkCsv.click();
  };

  const copyToClipboard = (text: string, id: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(`${id}-${type}`);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans selection:bg-blue-500/30">
      <div className="max-w-4xl mx-auto">
        
        {/* Nav de Estado */}
        <nav className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2 font-black italic text-xl tracking-tighter">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center italic shadow-[0_0_15px_rgba(37,99,235,0.5)]">W</div>
            SEO WIZARD
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-md">
              <Zap className={`w-3 h-3 ${credits > 0 ? 'text-yellow-500 fill-current' : 'text-red-500'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">{credits} CRÉDITOS</span>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
            <Sparkles className="w-3 h-3" /> IA Optimization Engine
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 leading-[0.85] italic">
            SEO <span className="text-blue-600">MAGIC</span> BATCH
          </h1>
          <p className="text-gray-500 max-w-lg mx-auto text-sm font-medium leading-relaxed">
            Sube lotes de imágenes, deja que la IA las renombre y genera el archivo de importación para tu tienda en segundos.
          </p>
        </section>

        {/* Selector de Idioma */}
        <div className="flex justify-center gap-3 mb-10">
          {['ES', 'EN'].map((lang) => (
            <button 
              key={lang}
              onClick={() => setLanguage(lang as 'ES' | 'EN')}
              className={`px-8 py-2.5 rounded-xl text-[10px] font-black transition-all border ${language === lang ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-transparent border-white/10 text-gray-500 hover:border-white/20'}`}
            >
              {lang === 'ES' ? 'ESPAÑOL' : 'ENGLISH'}
            </button>
          ))}
        </div>

        {/* Área de Carga Masiva */}
        <div className={`relative border-2 border-dashed rounded-[3.5rem] p-12 md:p-20 transition-all duration-500 ${credits <= 0 ? 'border-red-900/40 bg-red-950/5' : 'border-white/10 bg-white/[0.02] hover:border-blue-500/30'}`}>
          {credits <= 0 && (
            <div className="absolute inset-0 z-20 backdrop-blur-xl bg-black/80 flex flex-col items-center justify-center p-10 rounded-[3.5rem] animate-in fade-in duration-700">
              <Crown className="w-14 h-14 text-yellow-500 mb-6 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]" />
              <h3 className="text-4xl font-black italic mb-3 uppercase tracking-tighter">Plan Gratuito Agotado</h3>
              <p className="text-gray-400 text-sm mb-8 text-center max-w-xs">Has optimizado tus primeras fotos. Pásate a Pro para procesar miles de imágenes sin límites.</p>
              <button className="bg-white text-black px-12 py-4 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-2xl">
                Obtener Acceso Pro
              </button>
            </div>
          )}

          <label className={`flex flex-col items-center ${credits <= 0 ? 'opacity-10' : 'cursor-pointer group'}`}>
            {loading ? (
              <Loader2 className="w-20 h-20 text-blue-500 animate-spin" />
            ) : (
              <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-[0_20px_50px_rgba(37,99,235,0.3)] group-hover:scale-110 transition-all duration-500">
                <Upload className="w-10 h-10 text-white" />
              </div>
            )}
            <h2 className="text-3xl font-black italic tracking-tighter uppercase">{loading ? "Procesando Lote..." : "Subir Imágenes"}</h2>
            <p className="text-gray-500 text-[10px] mt-3 uppercase tracking-[0.3em] font-bold">Selecciona hasta {credits} fotos a la vez</p>
            <input 
              type="file" 
              className="hidden" 
              onChange={handleUpload} 
              accept="image/*" 
              multiple 
              disabled={loading || credits <= 0} 
            />
          </label>
        </div>

        {/* Acciones Masivas y Resultados */}
        {results.length > 0 && (
          <div className="mt-20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-white/5 pb-10 mb-10">
              <div>
                <h4 className="text-2xl font-black italic uppercase tracking-tighter italic">Resultados del Lote</h4>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">{results.length} Archivos Optimizados</p>
              </div>
              <button 
                onClick={downloadAllAssets}
                className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl"
              >
                <Archive className="w-4 h-4" /> Descargar Pack (.ZIP + .CSV)
              </button>
            </div>

            <div className="space-y-4 pb-32">
              {results.map((res) => (
                <div key={res.id} className="group bg-white/[0.02] border border-white/5 p-4 rounded-3xl flex flex-col md:flex-row items-center gap-6 hover:bg-white/[0.04] transition-all">
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <img src={res.preview} className="w-full h-full rounded-2xl object-cover border border-white/10 shadow-2xl" />
                  </div>
                  
                  <div className="flex-1 min-w-0 w-full grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                      <p className="text-[8px] font-black text-blue-500 uppercase mb-1 tracking-widest">Nombre de Archivo</p>
                      <div className="flex justify-between items-center gap-2">
                        <code className="text-[10px] font-mono text-gray-300 truncate tracking-tight">{res.fileName}.jpg</code>
                        <button onClick={() => copyToClipboard(res.fileName, res.id, 'name')} className="text-gray-600 hover:text-white transition-colors">
                          {copiedIndex === `${res.id}-name` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                      <p className="text-[8px] font-black text-purple-500 uppercase mb-1 tracking-widest">Alt Text SEO</p>
                      <div className="flex justify-between items-center gap-2">
                        <p className="text-[10px] text-gray-500 italic truncate italic">"{res.altText}"</p>
                        <button onClick={() => copyToClipboard(res.altText, res.id, 'alt')} className="text-gray-600 hover:text-white transition-colors">
                          {copiedIndex === `${res.id}-alt` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setResults(prev => prev.filter(i => i.id !== res.id))}
                    className="p-3 text-gray-800 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}