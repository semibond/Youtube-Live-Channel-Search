import { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Download, FileJson, Loader2, Search, Copy, Check, Play, Youtube, CheckSquare, Square, ExternalLink, FileCode2 } from 'lucide-react';

interface Stream {
  id: string;
  name: string;
  url: string;
}

export default function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Stream[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) {
      setError('Lütfen aranacak bir kelime girin (Örn: canlı kemal sunal)');
      return;
    }

    setIsSearching(true);
    setError('');
    setResults([]);
    setSelectedIds([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Kullanıcı şu aramayı yaptı: "${query}".
      Lütfen Google Arama'yı kullanarak bu konuyla ilgili ŞU AN AKTİF OLAN YouTube canlı yayınlarını bul.
      
      ÇOK ÖNEMLİ KURALLAR (Kırık linkleri önlemek için):
      1. Lütfen bulabildiğin kadar çok, tercihen 50'ye yakın farklı ve çalışan YouTube canlı yayın kanalı/linki bul ve listele. Kapsamlı bir arama yap.
      2. Asla uydurma veya tahmin edilmiş video ID'leri (watch?v=...) üretme.
      3. Canlı yayınlar için EN GÜVENİLİR bağlantı formatı kanalın kalıcı canlı yayın linkidir. Linkleri KESİNLİKLE şu formatta oluşturmaya çalış: "https://www.youtube.com/@KanalKullaniciAdi/live" (Örn: https://www.youtube.com/@haberturktv/live veya https://www.youtube.com/@ntv/live). Bu format yayın kapansa bile yeni yayına otomatik yönlendirir.
      4. Eğer @KanalKullaniciAdi formatını bulamıyorsan, sadece arama sonuçlarında gerçekten var olan, güncel ve çalışan "watch?v=" veya "live/" linklerini ver. Eski veya bitmiş yayınları ekleme.
      5. Sadece YouTube linklerini listele.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Kanal veya yayın adı" },
                url: { type: Type.STRING, description: "YouTube URL'si" }
              },
              required: ["name", "url"]
            }
          },
          tools: [{ googleSearch: {} }]
        }
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const formattedResults = parsed
            .map((item: any, index: number) => ({
              id: `stream-${index}-${Date.now()}`,
              name: item.name || 'İsimsiz Yayın',
              url: item.url || ''
            }))
            .filter(item => item.url.includes('youtube.com') || item.url.includes('youtu.be'));

          if (formattedResults.length > 0) {
            setResults(formattedResults);
            // Varsayılan olarak hepsini seçili yap
            setSelectedIds(formattedResults.map(r => r.id));
          } else {
            setError('YouTube bağlantısı bulunamadı. Lütfen farklı bir arama yapın.');
          }
        } else {
          setError('Sonuç bulunamadı. Lütfen farklı bir arama yapın.');
        }
      } else {
        setError('Sonuç alınamadı. Lütfen farklı bir arama yapın.');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError('Bir hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === results.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(results.map(r => r.id));
    }
  };

  const selectedStreams = results
    .filter(r => selectedIds.includes(r.id))
    .map(r => ({ name: r.name, url: r.url }));

  const jsonOutput = selectedStreams.length > 0 ? JSON.stringify(selectedStreams, null, 2) : '';

  const handleDownloadJson = () => {
    if (!jsonOutput) return;
    const blob = new Blob([jsonOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'secili_yayinlar.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtml = () => {
    if (selectedStreams.length === 0) return;
    
    const htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Seçili Canlı Yayınlar</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; background: #f9fafb; color: #111827; }
        h1 { color: #dc2626; border-bottom: 2px solid #fee2e2; padding-bottom: 0.5rem; margin-bottom: 2rem; }
        .stream-list { list-style: none; padding: 0; }
        .stream-item { background: white; margin-bottom: 1rem; padding: 1rem 1.5rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: space-between; }
        .stream-name { font-weight: 600; font-size: 1.1rem; }
        .stream-link { display: inline-block; background: #dc2626; color: white; text-decoration: none; padding: 0.5rem 1rem; border-radius: 0.25rem; font-size: 0.875rem; font-weight: 500; transition: background 0.2s; }
        .stream-link:hover { background: #b91c1c; }
        .empty-state { text-align: center; color: #6b7280; font-style: italic; }
    </style>
</head>
<body>
    <h1>Seçili Canlı Yayınlar</h1>
    ${selectedStreams.length > 0 ? `
    <ul class="stream-list">
        ${selectedStreams.map(s => `
            <li class="stream-item">
                <span class="stream-name">${s.name}</span>
                <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="stream-link">Yayını İzle</a>
            </li>
        `).join('')}
    </ul>
    ` : '<p class="empty-state">Hiç yayın seçilmedi.</p>'}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'secili_yayinlar.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!jsonOutput) return;
    try {
      await navigator.clipboard.writeText(jsonOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-red-500/30 flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/20">
              <Youtube className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight">YT Canlı Yayın Bulucu</h1>
              <p className="text-xs text-neutral-400 font-medium">Arama & JSON Dışa Aktarma</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-8">
        
        {/* Search Section */}
        <section className="w-full max-w-3xl mx-auto">
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-neutral-500 group-focus-within:text-red-500 transition-colors" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Örn: canlı kemal sunal, haber kanalları canlı..."
              className="block w-full pl-12 pr-32 py-4 bg-neutral-900 border border-neutral-800 rounded-2xl text-white placeholder-neutral-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all shadow-sm text-lg"
            />
            <div className="absolute inset-y-0 right-2 flex items-center">
              <button
                type="submit"
                disabled={isSearching || !query.trim()}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-medium py-2 px-6 rounded-xl transition-colors h-10"
              >
                {isSearching ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Ara'
                )}
              </button>
            </div>
          </form>
          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
              {error}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-[500px]">
          {/* Results Section */}
          <div className="flex flex-col gap-4 bg-neutral-900/30 border border-neutral-800/50 rounded-2xl p-5">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-500" />
                Arama Sonuçları
              </h2>
              {results.length > 0 && (
                <button
                  onClick={toggleAll}
                  className="text-sm font-medium text-neutral-400 hover:text-white flex items-center gap-2 transition-colors"
                >
                  {selectedIds.length === results.length ? (
                    <>Tüm Seçimi Kaldır <Square className="w-4 h-4" /></>
                  ) : (
                    <>Tümünü Seç <CheckSquare className="w-4 h-4" /></>
                  )}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {isSearching ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-500 gap-4 py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                  <p>İnternette canlı yayınlar aranıyor...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {results.map((stream) => {
                    const isSelected = selectedIds.includes(stream.id);
                    return (
                      <div
                        key={stream.id}
                        onClick={() => toggleSelection(stream.id)}
                        className={`group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border ${
                          isSelected 
                            ? 'bg-red-500/10 border-red-500/30' 
                            : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/50'
                        }`}
                      >
                        <div className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-red-500 text-white' : 'border-2 border-neutral-600 text-transparent group-hover:border-neutral-500'
                        }`}>
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-medium truncate ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
                            {stream.name}
                          </h3>
                          <a 
                            href={stream.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-neutral-500 hover:text-red-400 truncate flex items-center gap-1 mt-1 w-fit"
                          >
                            {stream.url}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-3 py-12">
                  <Search className="w-10 h-10 opacity-20" />
                  <p className="text-sm text-center max-w-[250px]">
                    Arama yapmak için yukarıdaki kutuyu kullanın. Sonuçlar burada listelenecektir.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Output Section */}
          <div className="flex flex-col gap-4 bg-neutral-900/30 border border-neutral-800/50 rounded-2xl p-5">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileJson className="w-5 h-5 text-green-500" />
                Çıktı ({selectedIds.length})
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  disabled={!jsonOutput}
                  className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Kopyala"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleDownloadJson}
                  disabled={!jsonOutput}
                  className="flex items-center gap-2 bg-green-600/20 text-green-500 hover:bg-green-600/30 hover:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                  title="JSON Olarak İndir"
                >
                  <Download className="w-4 h-4" />
                  JSON
                </button>
                <button
                  onClick={handleDownloadHtml}
                  disabled={!jsonOutput}
                  className="flex items-center gap-2 bg-blue-600/20 text-blue-500 hover:bg-blue-600/30 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                  title="HTML Olarak İndir"
                >
                  <FileCode2 className="w-4 h-4" />
                  HTML
                </button>
              </div>
            </div>
            
            <div className="relative flex-1 bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden min-h-[300px]">
              {jsonOutput ? (
                <pre className="absolute inset-0 p-4 overflow-auto text-green-400 font-mono text-sm leading-relaxed custom-scrollbar">
                  {jsonOutput}
                </pre>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-600 gap-3">
                  <FileJson className="w-10 h-10 opacity-20" />
                  <p className="text-sm text-center max-w-[250px]">
                    Çıktıyı görmek için sol taraftan en az bir yayın seçin.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Custom Scrollbar Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}} />
    </div>
  );
}
