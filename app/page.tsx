"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Upload, Crown, Loader2, Copy, Check, Download, Sparkles, Trash2, Zap, Archive, ShieldCheck, CreditCard, Lock } from 'lucide-react';
import JSZip from 'jszip';

// CONFIGURACIÓN DE TU BASE DE DATOS SUPABASE
const supabaseUrl = 'https://geixfrhlbaznjxaxpvrm.supabase.co';
const supabaseKey = 'sb_publishable_-vedbc51MiECfsLoEDXpPg_gaxVFs5x';
const supabase = createClient(supabaseUrl, supabaseKey);

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_KEY;

export default function SEOWizard() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [language, setLanguage] = useState<'ES' | 'EN'>('ES');
  const [credits, setCredits] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // 1. CARGAR DATOS DESDE SUPABASE AL INICIAR
  useEffect(() => {
    const fetchUserData = async () => {
      // Por ahora, simulamos que el usuario ingresó un email o usamos uno local
      // En una versión final, aquí iría el sistema de Login
      const testEmail = "usuario_prueba@gmail.com"; 
      setUserEmail(testEmail);

      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', testEmail)
        .single();

      if (profile) {
        setCredits(profile.usage_count);
      } else {
        // Si no existe, lo creamos con 5 créditos de regalo
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert([{ email: testEmail, usage_count: 5, is_pro: false }])
          .select()
          .single();
        if (newProfile) setCredits(newProfile.usage_count);
      }
    };

    fetchUserData();
  }, []);

  // 2. ACTUALIZAR CRÉDITOS EN SUPABASE DESPUÉS DE CADA USO
  const updateCreditsInDB = async (newCount: number) => {
    if (!userEmail) return;
    await supabase
      .from('profiles')
      .update({ usage_count: newCount })
      .eq('email', userEmail);
    setCredits(newCount);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || credits < files.length) return;

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
                { text: `Analyze for e-commerce SEO in ${language === 'ES' ? 'Spanish' : 'English'}. Respond ONLY JSON: {"fileName": "seo-name", "altText": "description"}` }
              ]
            }]
          })
        });

        const result = await response.json();
        if (result.candidates?.[0]) {
          const text = result.candidates[0].content.parts[0].text;
          const data = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
          
          setResults(prev => [{ ...data, id: Math.random().toString(), preview: `data:${file.type};base64,${base64Data}` }, ...prev]);
          
          // Bajamos un crédito en la base de datos real
          await updateCreditsInDB(credits - 1);
        }
      } catch (err) { console.error(err); }
    }
    setLoading(false);
  };

  const downloadAllAssets = async () => {
    const zip = new JSZip();
    let csvContent = "\uFEFFnombre_archivo;texto_alternativo_seo\n"; 
    results.forEach((res) => {
      zip.file(`${res.fileName}.jpg`, res.preview.split(',')[1], { base64: true });
      csvContent += `${res.fileName}.jpg;${res.altText}\n`;
    });
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const linkZip = document.createElement('a');
    linkZip.href = URL.createObjectURL(zipBlob);
    linkZip.download = "pack_seo_final.zip";
    linkZip.click();

    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const linkCsv = document.createElement('a');
    linkCsv.href = URL.createObjectURL(csvBlob);
    linkCsv.download = "data_seo.csv";
    linkCsv.click();
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans">
      <nav className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 font-black italic tracking-tighter text-xl text-blue-500">
            SEO WIZARD PRO
          </div>
          <div className="bg-blue-600/10 px-4 py-2 rounded-full border border-blue-500/20 flex items-center gap-2">
            <Zap className="w-3 h-3 text-yellow-500 fill-current" />
            <span className="text-[10px] font-black uppercase tracking-widest">{credits} CRÉDITOS REALES</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-16">
        <div className={`relative border-2 border-dashed rounded-[3rem] p-12 md:p-20 transition-all ${credits <= 0 ? 'border-red-900/40 bg-red-950/5' : 'border-blue-600/20 bg-white/[0.02]'}`}>
          {credits <= 0 && (
            <div className="absolute inset-0 z-20 backdrop-blur-2xl bg-black/90 flex flex-col items-center justify-center p-10 rounded-[3rem]">
              <Lock className="w-12 h-12 text-yellow-500 mb-6" />
              <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4 text-center">Créditos Agotados</h3>
              <button 
                onClick={() => alert("Pronto: Pasarela Cryptomus Automatizada")}
                className="bg-blue-600 text-white px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl"
              >
                Comprar Paquete Pro
              </button>
            </div>
          )}

          <label className={`flex flex-col items-center ${credits <= 0 ? 'opacity-10' : 'cursor-pointer group'}`}>
            {loading ? <Loader2 className="w-16 h-16 text-blue-600 animate-spin" /> : <Upload className="w-12 h-12 text-blue-600 mb-6 group-hover:scale-110 transition-transform" />}
            <span className="text-2xl font-black italic uppercase tracking-tighter">{loading ? "Hechizando..." : "Subir Imágenes"}</span>
            <input type="file" className="hidden" onChange={handleUpload} accept="image/*" multiple disabled={loading || credits <= 0} />
          </label>
        </div>

        {results.length > 0 && (
          <div className="mt-20 pb-40">
            <button onClick={downloadAllAssets} className="w-full bg-white text-black py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest mb-10">
              Descargar Pack ZIP + Excel
            </button>
            <div className="grid grid-cols-1 gap-4">
              {results.map((res) => (
                <div key={res.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center gap-6">
                  <img src={res.preview} className="w-16 h-16 rounded-xl object-cover" />
                  <div className="text-left">
                    <p className="text-[10px] font-mono text-blue-400">{res.fileName}.jpg</p>
                    <p className="text-[10px] text-gray-500 italic">"{res.altText}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="py-10 text-center text-gray-600 border-t border-white/5">
        <p className="text-[9px] font-bold uppercase tracking-[0.3em]">© 2026 SEO Wizard - Cloud Powered by Supabase</p>
      </footer>
    </div>
  );
}