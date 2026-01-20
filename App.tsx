
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, AreaChart, Area, LineChart, Line, ScatterChart, Scatter, ZAxis,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ComposedChart,
  RadialBarChart, RadialBar
} from 'recharts';
import { 
  Search, Upload, FileText, Download, TrendingUp, AlertCircle, 
  CheckCircle2, Info, ChevronRight, BarChart3, Database, History,
  LayoutDashboard, FileDown, Layers, Trash2, Github, Zap, Scale, Cpu, AlertTriangle, 
  Activity, BarChart4, PieChart as PieIcon, Globe, Settings, User, Sparkles, Hash,
  Menu, X, Lightbulb, Copy, ArrowRight, Wand2, Terminal, MousePointer2, HelpCircle,
  Target, ShieldCheck, PlayCircle, BookOpen, Send
} from 'lucide-react';
import { analyzeSentiment, getImprovementSuggestions } from './geminiService';
import { SentimentResult, SentimentType, ProviderType } from './types';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'insights'>('dashboard');
  const [inputText, setInputText] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('compare');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SentimentResult[]>([]);
  const [history, setHistory] = useState<SentimentResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  const [improvingText, setImprovingText] = useState<{ id: string; text: string } | null>(null);
  const [isImproving, setIsImproving] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    improvedText: string;
    wordChanges: { original: string; suggested: string }[];
    reasoning: string;
  } | null>(null);

  const debouncedInput = useDebounce(inputText, 1500);
  const lastAnalyzedText = useRef('');

  // Auto-analysis logic remains but can be overridden by the explicit button
  useEffect(() => {
    if (debouncedInput.trim().length > 20 && debouncedInput !== lastAnalyzedText.current) {
      lastAnalyzedText.current = debouncedInput;
      handleAnalysis([debouncedInput]);
    }
  }, [debouncedInput]);

  const handleAnalysis = async (texts: string[]) => {
    if (texts.length === 0 || texts.every(t => !t.trim())) return;
    setIsLoading(true);
    setError(null);
    try {
      const newResults = await analyzeSentiment(texts, selectedProvider);
      setResults(newResults);
      setHistory(prev => [...newResults, ...prev]);
      setShowGuide(false);
    } catch (err) {
      setError("Analysis failed. Verify your connection or API key.");
    } finally {
      setIsLoading(false);
    }
  };

  const manualAnalyze = () => {
    if (!inputText.trim()) {
      setError("Please enter some text to analyze.");
      return;
    }
    lastAnalyzedText.current = inputText;
    handleAnalysis([inputText]);
  };

  const handleImproveRequest = async (id: string, text: string) => {
    setImprovingText({ id, text });
    setIsImproving(true);
    setSuggestion(null);
    try {
      const data = await getImprovementSuggestions(text);
      setSuggestion(data);
    } catch (err) {
      setError("Failed to generate suggestions.");
    } finally {
      setIsImproving(false);
    }
  };

  const onFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      let lines: string[] = [];
      if (file.name.endsWith('.csv')) {
        lines = content.split('\n')
          .map(l => l.split(',')[0].replace(/^"|"$/g, '').trim())
          .filter(l => l.length > 5);
      } else {
        lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 5);
      }
      if (lines.length > 0) handleAnalysis(lines.slice(0, 10));
    };
    reader.readAsText(file);
  };

  const insertExample = () => {
    const examples = [
      "The product quality is absolutely disappointing, and the delivery was late twice.",
      "I am incredibly happy with the new update! Everything works smoothly and fast.",
      "The service was okay, nothing special but it got the job done eventually.",
      "I really hate the new interface, it's confusing and cluttered."
    ];
    const random = examples[Math.floor(Math.random() * examples.length)];
    setInputText(random);
  };

  const moodColors = useMemo(() => {
    const data = results.length > 0 ? results : history.slice(0, 1);
    if (data.length === 0) return 'linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%)';
    const primarySentiment = data[0]?.analyses[0]?.sentiment || 'Neutral';
    switch(primarySentiment) {
      case 'Positive': return 'radial-gradient(circle at top right, #f0fdf4 0%, #dcfce7 35%, #fdfcfb 100%)';
      case 'Negative': return 'radial-gradient(circle at top right, #fff1f2 0%, #ffe4e6 35%, #fdfcfb 100%)';
      case 'Neutral': return 'radial-gradient(circle at top right, #f5f3ff 0%, #ede9fe 35%, #fdfcfb 100%)';
      default: return '#fdfcfb';
    }
  }, [results, history]);

  const stats = useMemo(() => {
    const data = results.length > 0 ? results : history;
    const totals: Record<SentimentType, number> = { Positive: 0, Negative: 0, Neutral: 0 };
    data.forEach(r => r.analyses.forEach(a => totals[a.sentiment]++));
    return [
      { name: 'Positive', value: totals.Positive, color: '#a7f3d0' },
      { name: 'Neutral', value: totals.Neutral, color: '#c7d2fe' },
      { name: 'Negative', value: totals.Negative, color: '#fecaca' }
    ];
  }, [results, history]);

  const radarData = useMemo(() => {
    const sentiments: SentimentType[] = ['Positive', 'Neutral', 'Negative'];
    return sentiments.map(s => {
      const standardCount = history.filter(h => h.analyses.some(a => a.provider === 'Standard' && a.sentiment === s)).length;
      const expertCount = history.filter(h => h.analyses.some(a => a.provider === 'Expert' && a.sentiment === s)).length;
      return {
        subject: s,
        Standard: standardCount,
        Expert: expertCount,
        fullMark: Math.max(standardCount, expertCount, 10)
      };
    });
  }, [history]);

  const timeSeriesData = useMemo(() => {
    return [...history].reverse().slice(-15).map((h, i) => {
      const avgConf = h.analyses.reduce((acc, curr) => acc + curr.confidence, 0) / h.analyses.length;
      return {
        name: `T-${15-i}`,
        confidence: Math.round(avgConf * 100),
        pos: h.analyses.filter(a => a.sentiment === 'Positive').length,
        neg: h.analyses.filter(a => a.sentiment === 'Negative').length,
        neu: h.analyses.filter(a => a.sentiment === 'Neutral').length,
      };
    });
  }, [history]);

  const keywordBubbleData = useMemo(() => {
    const counts: Record<string, { count: number; conf: number }> = {};
    history.forEach(r => r.analyses.forEach(a => {
      a.keywords.forEach(kw => {
        if (!counts[kw]) counts[kw] = { count: 0, conf: 0 };
        counts[kw].count++;
        counts[kw].conf += a.confidence;
      });
    }));
    return Object.entries(counts).map(([name, val]) => ({
      name,
      x: val.count,
      y: Math.round((val.conf / val.count) * 100),
      z: val.count * 10
    })).sort((a,b) => b.x - a.x).slice(0, 10);
  }, [history]);

  const radialData = useMemo(() => {
    const data = results.length > 0 ? results : history;
    const posCount = data.filter(r => r.analyses[0]?.sentiment === 'Positive').length;
    const total = data.length || 1;
    return [
      { name: 'Success Rate', value: Math.round((posCount / total) * 100), fill: '#a7f3d0' }
    ];
  }, [results, history]);

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row transition-all duration-1000 overflow-hidden relative font-sans" style={{ background: moodColors }}>
      <div className="absolute inset-0 opacity-40 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-15%] w-[80%] h-[80%] bg-pink-50 blur-[140px] rounded-full"></div>
        <div className="absolute bottom-[-15%] right-[-15%] w-[70%] h-[70%] bg-blue-50 blur-[130px] rounded-full"></div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 glass-panel z-50 border-b border-white/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-pink-200 via-purple-200 to-indigo-200 rounded-xl flex items-center justify-center text-indigo-800 shadow-md">
            <Sparkles size={20} />
          </div>
          <h1 className="text-xl font-black text-slate-700">Sentilux</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 bg-white/60 rounded-xl text-slate-500 shadow-sm border border-white">
          {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed inset-0 z-50 md:relative md:flex md:w-72 md:z-30 m-0 md:m-4 transition-all duration-500 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-full w-full glass-panel md:rounded-[2.5rem] border-r md:border border-white/60 shadow-xl flex flex-col p-6 md:p-8">
          <div className="hidden md:flex items-center gap-4 mb-14">
            <div className="w-12 h-12 bg-gradient-to-tr from-pink-200 via-purple-200 to-indigo-200 rounded-2xl flex items-center justify-center text-indigo-700 shadow-sm">
              <Sparkles size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-slate-700 leading-none">Sentilux</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pastel Insights</p>
            </div>
          </div>
          
          <nav className="space-y-3 flex-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'insights', label: 'Analytics Pro', icon: BarChart4 },
              { id: 'history', label: 'Archives', icon: History }
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-sm font-bold transition-all ${activeTab === item.id ? 'bg-white shadow-sm border border-indigo-100 text-indigo-900' : 'text-slate-400 hover:bg-white/70 hover:text-slate-600'}`}
              >
                <item.icon size={20} className={activeTab === item.id ? 'text-indigo-400' : 'text-slate-300'} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-8 border-t border-white/40 hidden md:block">
            <button 
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white/40 rounded-2xl text-xs font-bold text-slate-500 hover:bg-white/60 border border-white transition-all"
            >
              <BookOpen size={16} /> Help Center
            </button>
          </div>
        </div>
        <div onClick={() => setIsSidebarOpen(false)} className="md:hidden absolute inset-0 bg-slate-900/5 backdrop-blur-sm -z-10 h-screen w-screen" />
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 overflow-y-auto h-full p-4 md:p-8 custom-scrollbar relative z-10 w-full">
        <header className="glass-panel border-white/60 rounded-[1.8rem] md:rounded-[2.5rem] px-5 md:px-10 py-4 mb-8 sticky top-0 z-40 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md shadow-slate-200/20">
          <div className="flex items-center gap-2 bg-white/40 p-1.5 rounded-2xl w-full sm:w-auto border border-white">
            {['flash', 'pro', 'compare'].map(p => (
              <button 
                key={p}
                onClick={() => setSelectedProvider(p as any)}
                className={`flex-1 sm:flex-none px-6 py-2 text-[11px] md:text-xs font-black rounded-xl transition-all capitalize ${selectedProvider === p ? 'bg-indigo-100 text-indigo-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {p}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-5 w-full sm:w-auto justify-between sm:justify-end">
             <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/30 px-4 py-2 rounded-full border border-white">
               <Cpu size={14} className={isLoading ? 'animate-spin' : ''} />
               {isLoading ? 'Processing...' : `Mode: ${selectedProvider}`}
             </div>
             <div className="h-10 w-[1px] bg-slate-200/50 hidden sm:block"></div>
             <button onClick={() => setShowGuide(true)} className="p-3 glass-panel rounded-2xl text-slate-300 hover:text-indigo-400 transition-all border border-white"><HelpCircle size={20} /></button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-7xl mx-auto">
             {showGuide && (
               <div className="glass-panel p-8 rounded-[2.5rem] border-white bg-indigo-50/30 border shadow-sm animate-in slide-in-from-top-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-indigo-900 flex items-center gap-2">
                      <Sparkles size={20} /> Welcome to Sentilux
                    </h3>
                    <button onClick={() => setShowGuide(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                  </div>
                  <p className="text-sm text-indigo-800/70 leading-relaxed mb-6">
                    Analyze the emotion behind any text instantly. You can type directly, paste feedback, or upload a dataset. 
                    Switch between <strong>Flash</strong> (fast), <strong>Pro</strong> (deep), or <strong>Compare</strong> (dual insights) using the top selector.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-white/50 rounded-2xl border border-white text-center">
                      <Zap size={18} className="mx-auto mb-2 text-indigo-400" />
                      <p className="text-[10px] font-black uppercase text-indigo-900 mb-1">Analyze</p>
                      <p className="text-[9px] text-slate-400">Type or paste text to see results</p>
                    </div>
                    <div className="p-4 bg-white/50 rounded-2xl border border-white text-center">
                      <Wand2 size={18} className="mx-auto mb-2 text-pink-400" />
                      <p className="text-[10px] font-black uppercase text-pink-900 mb-1">Reframe</p>
                      <p className="text-[9px] text-slate-400">Turn negative text into constructive prose</p>
                    </div>
                    <div className="p-4 bg-white/50 rounded-2xl border border-white text-center">
                      <BarChart4 size={18} className="mx-auto mb-2 text-emerald-400" />
                      <p className="text-[10px] font-black uppercase text-emerald-900 mb-1">Visualize</p>
                      <p className="text-[9px] text-slate-400">Explore trends in Analytics Pro</p>
                    </div>
                  </div>
               </div>
             )}

             <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
              <div className="xl:col-span-3 glass-panel p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] shadow-lg relative overflow-hidden group border border-white flex flex-col">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-xl md:text-2xl font-black text-slate-700 flex items-center gap-3">
                     <FileText size={28} className="text-indigo-300 fill-indigo-100" /> Text Analysis
                   </h3>
                   <button 
                     onClick={insertExample}
                     className="px-4 py-2 bg-white/50 text-[10px] font-black uppercase text-slate-400 border border-white rounded-xl hover:text-indigo-400 transition-all flex items-center gap-2"
                   >
                     <PlayCircle size={14} /> Try Example
                   </button>
                </div>
                <div className="relative flex-1">
                  <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Share a thought for instant rephrasing..."
                    className="w-full min-h-[220px] p-8 bg-white/40 border-2 border-transparent focus:border-indigo-100 rounded-[2rem] text-lg font-semibold text-slate-600 resize-none outline-none transition-all placeholder:text-slate-200 shadow-inner"
                  />
                  <div className="absolute bottom-6 right-6">
                    <button 
                      onClick={manualAnalyze}
                      disabled={isLoading || !inputText.trim()}
                      className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl transition-all active:scale-95 ${
                        isLoading || !inputText.trim() 
                        ? 'bg-slate-100 text-slate-300 border border-transparent cursor-not-allowed' 
                        : 'bg-indigo-400 text-white hover:bg-indigo-500 hover:shadow-indigo-200'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <Cpu size={18} className="animate-spin" /> Analyzing...
                        </>
                      ) : (
                        <>
                          <Send size={18} /> Start Analyzing
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-center px-2">
                   <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                     <Info size={12} /> Auto-analysis will trigger as you type
                   </p>
                   <span className="text-[10px] font-bold text-slate-300 uppercase">{inputText.length} characters</span>
                </div>
              </div>
              <div className="xl:col-span-2 glass-panel p-8 md:p-10 rounded-[2.5rem] flex flex-col justify-center items-center text-center group border border-white h-full relative">
                <div className="w-20 h-20 bg-pink-50 rounded-[2rem] flex items-center justify-center mb-6 border border-white group-hover:scale-105 transition-transform shadow-sm">
                  <Upload size={36} className="text-pink-300" />
                </div>
                <h3 className="text-xl font-black text-slate-700">Dataset Upload</h3>
                <p className="text-sm text-slate-400 mt-3 mb-8 px-4 leading-relaxed">Analyze multiple feedback entries at once using CSV or TXT files.</p>
                <div className="relative w-full px-4">
                   <input type="file" accept=".txt,.csv" onChange={onFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                   <button className="w-full py-5 bg-indigo-100 text-indigo-900 font-black text-xs uppercase rounded-2xl border border-white shadow-sm flex items-center justify-center gap-3">
                     <FileDown size={18} /> Choose File
                   </button>
                </div>
              </div>
            </div>

            {results.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-8">
                 <div className="lg:col-span-2 glass-panel p-8 rounded-[3rem] border border-white shadow-sm">
                    <div className="flex items-center justify-between mb-10">
                      <h3 className="text-xl font-black text-slate-700">Recent Insights</h3>
                      <p className="text-[10px] font-black text-slate-300 uppercase">Showing {results.length} results</p>
                    </div>
                    <div className="space-y-6 max-h-[600px] overflow-y-auto pr-3 custom-scrollbar">
                      {results.map(r => (
                        <div key={r.id} className="p-6 bg-white/50 rounded-[2.5rem] border border-white shadow-sm hover:shadow-md transition-all">
                          <p className="text-slate-600 font-bold mb-4">"{r.text}"</p>
                          <div className={`grid gap-5 ${r.analyses.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                            {r.analyses.map((a, i) => (
                              <div key={i} className={`p-5 rounded-[2rem] border-2 ${
                                a.sentiment === 'Positive' ? 'bg-emerald-50/50 border-emerald-100' : 
                                a.sentiment === 'Negative' ? 'bg-rose-50/50 border-rose-100' : 
                                'bg-indigo-50/50 border-indigo-100'}`}>
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{a.provider}</span>
                                    <span className="px-3 py-1 rounded-full text-[9px] font-black bg-white/50 border border-white shadow-sm">
                                      {Math.round(a.confidence * 100)}% Match
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {a.sentiment === 'Negative' && (
                                      <button 
                                        onClick={() => handleImproveRequest(r.id, r.text)} 
                                        className="flex items-center gap-2 px-3 py-1 bg-indigo-300 text-white rounded-xl text-[9px] font-black uppercase shadow-sm hover:bg-indigo-400 transition-all"
                                      >
                                        <Wand2 size={12} /> Reframe
                                      </button>
                                    )}
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                                      a.sentiment === 'Positive' ? 'text-emerald-700' : a.sentiment === 'Negative' ? 'text-rose-700' : 'text-indigo-700'
                                    }`}>{a.sentiment}</span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {a.keywords.map(kw => <span key={kw} className="px-3 py-1 bg-white/80 text-[9px] font-black text-slate-400 rounded-lg border border-white shadow-sm">#{kw}</span>)}
                                </div>
                                <p className="text-[11px] text-slate-400 leading-normal italic">"{a.explanation}"</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>
                 <div className="glass-panel p-8 rounded-[3rem] flex flex-col border border-white shadow-sm sticky top-28 h-fit">
                    <h3 className="text-xl font-black text-slate-700 mb-10">Current Mix</h3>
                    <div className="flex-1 min-h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stats} cx="50%" cy="50%" innerRadius={75} outerRadius={105} paddingAngle={10} dataKey="value" stroke="none">
                            {stats.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', background: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-8 space-y-3">
                       {stats.map(s => (
                         <div key={s.name} className="flex items-center justify-between p-3 rounded-2xl bg-white/40 border border-white">
                            <div className="flex items-center gap-4">
                               <div className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ background: s.color }}></div>
                               <span className="text-sm font-bold text-slate-500">{s.name}</span>
                            </div>
                            <span className="text-base font-black text-slate-700">{s.value}</span>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            ) : (
              <div className="glass-panel p-20 rounded-[3rem] border border-white border-dashed text-center">
                 <Globe size={48} className="mx-auto text-slate-200 mb-4 animate-pulse" />
                 <p className="text-sm font-black text-slate-300 uppercase tracking-widest">Waiting for input or click "Start Analyzing" to begin...</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'insights' && (
           <div className="space-y-10 animate-in fade-in slide-in-from-right-12 duration-1000 pb-16 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Brand Positivity', value: radialData[0].value + '%', icon: Heart, color: 'bg-pink-100', sub: 'Positive Lean' },
                  { label: 'Model Certainty', value: '92%', icon: Target, color: 'bg-indigo-100', sub: 'High Reliability' },
                  { label: 'Data Quality', value: '88%', icon: ShieldCheck, color: 'bg-emerald-100', sub: 'Verified Signals' },
                  { label: 'Vault Volume', value: history.length, icon: Activity, color: 'bg-purple-100', sub: 'Total History' }
                ].map((kpi, i) => (
                   <div key={i} className="glass-panel p-8 rounded-[2.5rem] border border-white shadow-sm hover:translate-y-[-4px] transition-transform">
                      <div className={`w-12 h-12 ${kpi.color} rounded-2xl flex items-center justify-center mb-6`}>
                         <kpi.icon size={24} className="text-slate-600" />
                      </div>
                      <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-2">{kpi.label}</p>
                      <h4 className="text-4xl font-black text-slate-700 leading-none">{kpi.value}</h4>
                      <p className="text-xs font-bold text-slate-400 mt-3">{kpi.sub}</p>
                   </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 glass-panel p-10 rounded-[3.5rem] border border-white shadow-sm">
                    <div className="flex items-center justify-between mb-10">
                      <h3 className="text-xl font-black text-slate-700 flex items-center gap-3">
                        <TrendingUp size={24} className="text-indigo-300" /> Sentiment Over Time
                      </h3>
                      <button className="text-slate-300 hover:text-indigo-400"><Info size={18} /></button>
                    </div>
                    <div className="h-[350px]">
                       <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={timeSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                            <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }} />
                            <Area type="monotone" dataKey="confidence" fill="#c7d2fe" stroke="#818cf8" fillOpacity={0.3} strokeWidth={3} />
                            <Bar dataKey="pos" fill="#a7f3d0" barSize={10} radius={[5, 5, 0, 0]} />
                            <Bar dataKey="neg" fill="#fecaca" barSize={10} radius={[5, 5, 0, 0]} />
                         </ComposedChart>
                       </ResponsiveContainer>
                    </div>
                 </div>

                 <div className="glass-panel p-10 rounded-[3.5rem] border border-white shadow-sm">
                    <h3 className="text-xl font-black text-slate-700 mb-10 flex items-center gap-3">
                       <Scale size={24} className="text-pink-300" /> Multi-Model Radar
                    </h3>
                    <div className="h-[350px]">
                       <ResponsiveContainer width="100%" height="100%">
                         <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                            <PolarGrid stroke="#f1f5f9" />
                            <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fontStyle: 'bold', fill: '#64748b'}} />
                            <Radar name="Standard" dataKey="Standard" stroke="#c7d2fe" fill="#c7d2fe" fillOpacity={0.6} />
                            <Radar name="Expert" dataKey="Expert" stroke="#fbcfe8" fill="#fbcfe8" fillOpacity={0.6} />
                            <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                         </RadarChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="glass-panel p-10 rounded-[3.5rem] border border-white shadow-sm">
                    <h3 className="text-xl font-black text-slate-700 mb-10 flex items-center gap-3">
                       <Hash size={24} className="text-indigo-300" /> High-Impact Keywords
                    </h3>
                    <div className="h-[350px]">
                       <ResponsiveContainer width="100%" height="100%">
                         <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="number" dataKey="x" name="Frequency" hide />
                            <YAxis type="number" dataKey="y" name="Certainty" hide />
                            <ZAxis type="number" dataKey="z" range={[100, 1000]} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter name="Keywords" data={keywordBubbleData} fill="#c7d2fe">
                               {keywordBubbleData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#c7d2fe' : '#fbcfe8'} fillOpacity={0.8} />
                               ))}
                            </Scatter>
                         </ScatterChart>
                       </ResponsiveContainer>
                    </div>
                    <p className="text-[10px] font-black text-center text-slate-400 uppercase tracking-widest mt-4">Node Size = Signal Strength | Position = Frequency vs Confidence</p>
                 </div>

                 <div className="glass-panel p-10 rounded-[3.5rem] border border-white shadow-sm flex flex-col items-center">
                    <h3 className="text-xl font-black text-slate-700 mb-10 self-start">Engagement Vitality</h3>
                    <div className="h-[300px] w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <RadialBarChart cx="50%" cy="50%" innerRadius="40%" outerRadius="100%" barSize={25} data={radialData} startAngle={180} endAngle={0}>
                            <RadialBar background dataKey="value" cornerRadius={15} />
                            <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                         </RadialBarChart>
                       </ResponsiveContainer>
                    </div>
                    <div className="mt-[-100px] text-center">
                       <span className="text-5xl font-black text-slate-700">{radialData[0].value}%</span>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Overall Satisfaction Score</p>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'history' && (
           <div className="space-y-8 animate-in fade-in slide-in-from-left-12 duration-1000 max-w-7xl mx-auto pb-16">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
                 <div>
                   <h2 className="text-3xl font-black text-slate-700 tracking-tight">Archive Vault</h2>
                   <p className="text-sm font-medium text-slate-400 mt-1">Review previously analyzed text segments</p>
                 </div>
                 <button 
                  onClick={() => setHistory([])} 
                  disabled={history.length === 0}
                  className={`w-full sm:w-auto px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border border-white shadow-sm flex items-center justify-center gap-3 ${
                    history.length === 0 ? 'bg-slate-100 text-slate-300 border-transparent cursor-not-allowed' : 'bg-white/40 text-rose-300 hover:bg-rose-50'
                  }`}
                 >
                   <Trash2 size={16} /> Clear Archives
                 </button>
              </div>

              {history.length === 0 ? (
                <div className="glass-panel py-32 rounded-[3.5rem] text-center border-white/60 border-dashed border-4 bg-transparent">
                  <Database className="mx-auto text-slate-200 mb-6" size={80} />
                  <p className="text-slate-300 font-black uppercase tracking-widest text-sm mb-4">Your vault is currently empty</p>
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className="px-6 py-3 bg-indigo-100 text-indigo-900 font-black text-[10px] uppercase rounded-full shadow-sm"
                  >
                    Analyze Something
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {history.map((h) => (
                    <div key={h.id} className="glass-panel p-8 rounded-[2.5rem] border border-white hover:shadow-md transition-all border-l-8 border-l-indigo-100">
                       <p className="text-xs text-slate-500 font-bold mb-6 line-clamp-3">"{h.text}"</p>
                       <div className="flex items-center justify-between mt-auto">
                          <div className="flex -space-x-2">
                             {h.analyses.map((a, i) => (
                               <div key={i} title={`${a.provider}: ${a.sentiment}`} className={`w-8 h-8 rounded-full border-4 border-white flex items-center justify-center text-[9px] font-black text-white shadow-sm ${
                                 a.sentiment === 'Positive' ? 'bg-emerald-200' : a.sentiment === 'Negative' ? 'bg-rose-200' : 'bg-indigo-200'
                               }`}>{a.sentiment[0]}</div>
                             ))}
                          </div>
                          <span className="text-[9px] font-black text-slate-300 uppercase">{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       </div>
                    </div>
                  ))}
                </div>
              )}
           </div>
        )}

        {/* Suggestion Modal */}
        {improvingText && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-indigo-900/10 backdrop-blur-sm" onClick={() => setImprovingText(null)}></div>
            <div className="glass-panel w-full max-w-xl rounded-[3rem] p-8 md:p-12 shadow-2xl border border-white relative z-10 animate-in zoom-in-95 duration-300">
              <div className="absolute top-0 right-0 p-8">
                <button onClick={() => setImprovingText(null)} className="p-3 hover:bg-slate-50 rounded-2xl transition-colors">
                  <X size={22} className="text-slate-300" />
                </button>
              </div>
              <div className="flex items-center gap-5 mb-10">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 rounded-3xl flex items-center justify-center">
                  <Wand2 size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-700">Reframe Tone</h3>
                  <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest mt-1">AI Guided Polish</p>
                </div>
              </div>
              <div className="space-y-8">
                <div className="bg-white/40 p-6 rounded-[2rem] border border-white">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-4">ORIGINAL TEXT</label>
                  <p className="text-sm font-semibold text-slate-500 italic leading-relaxed">"{improvingText.text}"</p>
                </div>
                {isImproving ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 border-[6px] border-indigo-50 border-t-indigo-200 rounded-full animate-spin mb-6"></div>
                    <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest animate-pulse">Softening the language...</p>
                  </div>
                ) : suggestion ? (
                  <div className="space-y-8">
                    <div>
                      <label className="text-[10px] font-black text-emerald-300 uppercase tracking-widest block mb-4">REFINED VERSION</label>
                      <div className="bg-emerald-50/30 p-6 rounded-[2.5rem] border border-emerald-100 relative group">
                        <p className="text-lg font-black text-emerald-800 leading-relaxed pr-10">"{suggestion.improvedText}"</p>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(suggestion.improvedText);
                          }} 
                          className="absolute top-6 right-6 text-emerald-300 hover:text-emerald-500 transition-colors"
                        >
                          <Copy size={20} />
                        </button>
                      </div>
                    </div>
                    <div className="bg-indigo-50/30 p-6 rounded-[2rem] border border-white">
                      <p className="text-[11px] font-bold text-indigo-900 leading-relaxed italic">
                        <span className="not-italic font-black text-indigo-300 uppercase mr-2 tracking-widest">Logic:</span>
                        {suggestion.reasoning}
                      </p>
                    </div>
                    <button onClick={() => setImprovingText(null)} className="w-full py-5 bg-indigo-100 text-indigo-900 font-black text-xs uppercase rounded-3xl hover:bg-indigo-200 transition-all border border-white shadow-sm">Done & Dismiss</button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="fixed bottom-6 right-6 left-6 sm:left-auto flex items-center gap-4 bg-rose-50/90 backdrop-blur-xl text-rose-800 px-8 py-5 rounded-[2rem] shadow-lg border border-rose-100 z-[110] animate-in slide-in-from-bottom-12">
            <AlertTriangle size={24} className="text-rose-400" />
            <p className="font-bold text-sm tracking-tight">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto hover:bg-rose-100 p-2 rounded-full transition-colors"><X size={20} /></button>
          </div>
        )}
      </main>

      {/* Brand Watermark */}
      <div className="fixed bottom-8 left-12 hidden xl:flex items-center gap-5 glass-panel px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-300 border-white/60 shadow-sm z-50">
        <div className="flex items-center gap-2">
          <MousePointer2 size={16} className="text-indigo-200" />
          <span>Intelli-Sync Active</span>
        </div>
        <div className="w-[1px] h-4 bg-slate-100"></div>
        <div className="flex items-center gap-2 group cursor-pointer hover:text-pink-300 transition-colors">
          <Github size={16} />
          <span>Sentilux v2.7.5 Stable</span>
        </div>
      </div>
    </div>
  );
};

// Icons for KPI
const Heart = (props: any) => <Activity {...props} />;

export default App;
