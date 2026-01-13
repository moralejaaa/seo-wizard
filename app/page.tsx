"use client";
import { useState, useEffect } from 'react';
import { Upload, Crown, Loader2, Copy, Check, Download, Sparkles, Trash2, Zap, Lock, Globe } from 'lucide-react';

// La llave se lee de las variables de entorno para mayor seguridad en producción
const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_KEY;

export default function SEOWizard() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [language, setLanguage] = useState<'ES' | 'EN'>('ES');
  
  // SISTEMA DE MONETIZACIÓN: Créditos y Muro de Pago
  const [credits, setCredits] = useState(5);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Carga inicial de persistencia
  useEffect(() => {
    const savedResults = localStorage.getItem('seo_results');
    const savedCredits = localStorage.getItem('seo_credits');
    
    if (savedResults) setResults(JSON.parse(savedResults));
    if (savedCredits !== null) {
      setCredits(Number(savedCredits));
    } else {
      localStorage.setItem('seo_credits', '5');
    }
  }, []);

  // Guardado automático en LocalStorage
  useEffect(() => {
    localStorage.setItem('seo_results', JSON.stringify(results));
    localStorage.setItem('seo_credits', credits.toString());
  }, [results, credits]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Bloqueo si no hay créditos (Valor para el negocio)
    if (credits <= 0) {
      setShowUpgrade(true);
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_KEY}`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inlineData: { mimeType: file.type, data: base64Data } },
                { text: `Analyze this image for e-commerce SEO in ${language === 'ES' ? 'Spanish' : 'English'}. Respond ONLY with a JSON object: {"fileName": "seo-friendly-name", "altText": "descriptive-alt-text"}` }
              ]
            }]
          })
        });

        const result = await response.json();

        // Validación robusta para evitar errores de 'undefined'
        if (!result.candidates || !result.candidates[0]) {
          console.error("Error API Google:", result);
          throw new Error(result.error?.message || "La IA no pudo procesar la imagen en este momento.");
        }

        const textResponse = result.candidates[0].content.parts[0].text;
        
        // Extracción segura del JSON
        const jsonStart = textResponse.indexOf('{');
        const jsonEnd = textResponse.lastIndexOf('}') + 1;
        
        if (jsonStart === -1) throw new Error("Formato de respuesta inválido.");
        
        const data = JSON.parse(textResponse.substring(jsonStart, jsonEnd));

        // Actualización de estado y créditos
        const newResult = { 
          ...data, 
          id: Date.now().toString(), 
          preview: reader.result // Guardamos base64 para persistencia
        };

        setResults(prev => [newResult, ...prev]);
        setCredits(prev => prev - 1);
        setLoading(false);
      };
    } catch (err: any) {
      setLoading(false);
      alert(err.message);
    }
  };

  const copyToClipboard = (text: string, id: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(`${id}-${type}`);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const deleteResult = (id: string) => {
    setResults(prev => prev.filter(r => r.id !== id));
  };

  const downloadImage = (res: any) => {
    const link = document.createElement('a');
    link.href = res.preview;
    link.download = `${res.fileName}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white p-6 md:p-12 font-sans selection:bg-blue-500/30">
      <div className="max-w-3xl mx-auto">
        
        {/* Barra de estado de créditos */}
        <div className="flex justify-end mb-4">
          <div className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-sm">
            <Zap className={`w-3 h-3 ${credits > 0 ? 'text-yellow-500 fill-current' : 'text-red-500'}`} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">
              {credits} Créditos Restantes
            </span>
          </div>
        </div>

        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-6">
            <Sparkles className="w-3 h-3" /> IA Optimization v3
          </div>
          <h1 className="text-7xl font-black tracking-tighter italic bg-gradient-to-b from-white to-gray-600 bg-clip-text text-transparent mb-10">
            SEO WIZARD
          </h1>
          
          <div className="flex justify-center gap-3">
            {['ES', 'EN'].map((lang) => (
              <button 
                key={lang}
                onClick={() => setLanguage(lang as 'ES' | 'EN')}
                className={`px-10 py-3 rounded-full text-[10px] font-black transition-all border ${language === lang ? 'bg-blue-600 border-blue-500 shadow-[0_0_25px_rgba(37,99,235,0.4)] text-white' : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-600'}`}
              >
                {lang === 'ES' ? 'ESPAÑOL' : 'ENGLISH'}
              </button>
            ))}
          </div>
        </header>

        {/* Zona de Carga / Dropzone */}
        <div className={`relative group border-2 border-dashed rounded-[3.5rem] p-16 transition-all duration-700 ${credits <= 0 ? 'border-red-900/40 bg-red-950/5' : 'border-gray-800 bg-gray-900/5 hover:border-blue-500/40'}`}>
          {credits <= 0 && (
            <div className="absolute inset-0 z-20 backdrop-blur-xl bg-black/70 flex flex-col items-center justify-center p-10 text-center animate-in fade-in zoom-in duration-500">
              <Crown className="w-16 h-16 text-yellow-500 mb-6 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
              <h3 className="text-4xl font-black italic mb-3 tracking-tighter uppercase">Límite Alcanzado</h3>
              <p className="text-gray-400 text-sm mb-8 max-w-xs leading-relaxed">Has agotado tus créditos gratuitos. Mejora tu plan para optimizar imágenes ilimitadas.</p>
              <button className="bg-white text-black px-12 py-4 rounded-full font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all shadow-2xl">
                Hacerse Pro Now
              </button>
            </div>
          )}

          <label className={`flex flex-col items-center ${credits <= 0 ? 'opacity-10' : 'cursor-pointer'}`}>
            {loading ? (
              <Loader2 className="w-20 h-20 text-blue-500 animate-spin" />
            ) : (
              <div className="w-24 h-24 bg-white text-black rounded-full flex items-center justify-center mb-6 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                <Upload className="w-10 h-10" />
              </div>
            )}
            <h2 className="text-3xl font-black italic tracking-tighter uppercase">{loading ? "Analizando..." : "Subir Imagen"}</h2>
            <p className="text-gray-500 text-xs mt-2 uppercase tracking-widest font-bold">IA Visión {language}</p>
            <input type="file" className="hidden" onChange={handleUpload} accept="image/*" disabled={loading || credits <= 0} />
          </label>
        </div>

        {/* Historial de Resultados con Persistencia */}
        <div className="mt-20 space-y-8 pb-20">
          {results.map((res) => (
            <div key={res.id} className="group bg-[#080808] border border-gray-800/40 p-8 rounded-[3rem] flex flex-col md:flex-row gap-8 items-center hover:border-blue-500/20 transition-all duration-500">
              <div className="relative w-32 h-32 flex-shrink-0">
                <img src={res.preview} className="w-full h-full rounded-[2rem] object-cover border border-gray-800 shadow-2xl" />
                <div className="absolute -top-3 -left-3 flex gap-2">
                  <button 
                    onClick={() => deleteResult(res.id)}
                    className="p-2.5 bg-red-950/80 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={() => downloadImage(res)}
                  className="absolute -bottom-3 -right-3 p-3.5 bg-blue-600 text-white rounded-2xl shadow-2xl hover:bg-blue-500 transition-colors"
                  title="Descargar con nombre SEO"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 min-w-0 space-y-5 text-left w-full">
                <div className="relative">
                  <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Nombre Optimizado</p>
                  <div className="flex items-center gap-3 bg-white/[0.03] p-2 rounded-2xl border border-white/5">
                    <code className="flex-1 px-3 text-gray-200 text-xs font-mono truncate uppercase tracking-wider">{res.fileName}.jpg</code>
                    <button 
                      onClick={() => copyToClipboard(res.fileName, res.id, 'name')}
                      className={`p-2.5 rounded-xl transition-all ${copiedIndex === `${res.id}-name` ? 'text-green-500 bg-green-500/10' : 'text-gray-600 hover:text-white hover:bg-white/5'}`}
                    >
                      {copiedIndex === `${res.id}-name` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-purple-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Descripción Alt (IA)</p>
                  <div className="flex items-start gap-3 bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                    <p className="flex-1 text-gray-400 text-xs italic leading-relaxed">"{res.altText}"</p>
                    <button 
                      onClick={() => copyToClipboard(res.altText, res.id, 'alt')}
                      className={`p-2.5 rounded-xl transition-all ${copiedIndex === `${res.id}-alt` ? 'text-green-500 bg-green-500/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {copiedIndex === `${res.id}-alt` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}