import { useEffect, useMemo, useState } from "react";
import { LogOut, Loader2, Filter, Map as MapIcon, List, Locate, Inbox as InboxIcon } from "lucide-react";
import { ModeToggle } from "../components/ModeToggle";
import { JobCard } from "../components/JobCard";
import { OfferForm } from "../components/OfferForm";
import { JobMap } from "../components/JobMap";
import InboxPage from "./InboxPage";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import { nearestQuartiere } from "../lib/roma";
import { toast } from "sonner";

export default function BoardPage() {
  const { user, logout } = useAuth();
  const [route, setRoute] = useState("board"); // board | inbox
  const [mode, setMode] = useState("cerco");
  const [view, setView] = useState("list"); // list | map
  const [allJobs, setAllJobs] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [filter, setFilter] = useState("Tutti");
  const [loading, setLoading] = useState(true);
  const [newJobId, setNewJobId] = useState(null);

  const loadJobs = async () => {
    setLoading(true);
    try { const { data } = await api.get("/jobs"); setAllJobs(data); }
    catch { setAllJobs([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    api.get("/neighborhoods").then(({data}) => setNeighborhoods(data)).catch(() => setNeighborhoods([]));
    loadJobs();
  }, []);

  const counts = useMemo(() => {
    const c = {};
    allJobs.forEach(j => { c[j.neighborhood] = (c[j.neighborhood] || 0) + 1; });
    return c;
  }, [allJobs]);

  const jobs = useMemo(() =>
    filter === "Tutti" ? allJobs : allJobs.filter(j => j.neighborhood === filter),
  [allJobs, filter]);

  const geolocate = () => {
    if (!navigator.geolocation) return toast.error("Geolocalizzazione non disponibile");
    navigator.geolocation.getCurrentPosition(
      (p) => { const q = nearestQuartiere(p.coords.latitude, p.coords.longitude);
        setFilter(q); toast.success(`Quartiere rilevato: ${q}`); },
      () => toast.error("Permesso GPS negato"));
  };

  const handlePublished = (newJob) => {
    setAllJobs(prev => [newJob, ...prev.filter(j => j.id !== newJob.id)]);
    setNewJobId(newJob.id);
    setMode("cerco");
    if (filter !== "Tutti" && newJob.neighborhood !== filter) setFilter("Tutti");
    setTimeout(() => setNewJobId(null), 3500);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen" data-testid="board-page">
      <header className="border-b-[2.5px] border-stone-900 bg-[#fefbeb] sticky top-0 z-30 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-stone-900 leading-none">Du<span className="text-[#d97706]">'</span> Spicci</h1>
            <p className="text-xs text-stone-600 mt-0.5">ciao <span className="font-bold text-stone-800">{user?.first_name}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <button data-testid="nav-board" onClick={()=>setRoute("board")}
              className={`px-3 py-2 rounded-full border-[2px] border-stone-900 text-sm font-bold pop-shadow-ink-xs btn-press ${route==="board"?"bg-[#d97706] text-white":"bg-white text-stone-800"}`}>Bacheca</button>
            <button data-testid="nav-inbox" onClick={()=>setRoute("inbox")}
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-full border-[2px] border-stone-900 text-sm font-bold pop-shadow-ink-xs btn-press ${route==="inbox"?"bg-[#d97706] text-white":"bg-white text-stone-800"}`}><InboxIcon size={14} strokeWidth={2.5}/>Inbox</button>
            <button onClick={logout} data-testid="logout-button"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-full border-[2px] border-stone-900 bg-white text-stone-800 text-sm font-bold pop-shadow-ink-xs btn-press"><LogOut size={14} strokeWidth={2.5}/></button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {route === "inbox" ? <InboxPage /> : (
        <>
          <ModeToggle mode={mode} onChange={setMode} />
          <div className="mt-7">
            {mode === "cerco" ? (
              <>
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="font-display text-2xl text-stone-900">La bacheca der quartiere</h2>
                  <span className="text-xs text-stone-500 font-bold">{jobs.length} annunci</span>
                </div>

                <div className="mb-4 flex gap-2">
                  <div className="relative flex-1">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600 pointer-events-none" size={18} strokeWidth={2.5}/>
                    <select data-testid="filter-neighborhood" value={filter} onChange={(e)=>setFilter(e.target.value)}
                      className="w-full bg-white border-[2.5px] border-stone-900 rounded-full pl-11 pr-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-amber-500/40 pop-shadow-ink-xs cursor-pointer">
                      <option value="Tutti">Tutti i quartieri ({allJobs.length})</option>
                      {neighborhoods.map(n => <option key={n} value={n}>{n} ({counts[n] || 0})</option>)}
                    </select>
                  </div>
                  <button data-testid="geolocate-btn" onClick={geolocate}
                    className="px-3 py-2.5 rounded-full border-[2.5px] border-stone-900 bg-white text-stone-900 pop-shadow-ink-xs btn-press" title="Quartiere vicino a me">
                    <Locate size={18} strokeWidth={2.5}/>
                  </button>
                </div>

                <div className="mb-5 inline-flex bg-stone-100 border-[2.5px] border-stone-900 rounded-full p-1 pop-shadow-ink-xs">
                  <button data-testid="view-list" onClick={()=>setView("list")}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-display ${view==="list"?"bg-[#d97706] text-white":"text-stone-700"}`}>
                    <List size={14} strokeWidth={2.5}/>Lista
                  </button>
                  <button data-testid="view-map" onClick={()=>setView("map")}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-display ${view==="map"?"bg-[#d97706] text-white":"text-stone-700"}`}>
                    <MapIcon size={14} strokeWidth={2.5}/>Mappa
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-stone-500"/></div>
                ) : jobs.length === 0 ? (
                  <div className="bg-white border-[2.5px] border-stone-900 rounded-3xl p-8 text-center pop-shadow">
                    <p className="font-display text-2xl text-stone-900">Ancora nessun annuncio.</p>
                    <p className="text-stone-600 mt-2">{filter!=="Tutti" ? `Niente lavori in zona ${filter}.` : "Pubblica tu il primo!"}</p>
                  </div>
                ) : view === "map" ? (
                  <JobMap jobs={jobs}/>
                ) : (
                  <div className="space-y-7" data-testid="job-list">
                    {jobs.map(j => <JobCard key={j.id} job={j} isNew={j.id===newJobId}/>)}
                  </div>
                )}
              </>
            ) : (
              <OfferForm neighborhoods={neighborhoods} onPublished={handlePublished} />
            )}
          </div>
        </>
        )}
      </main>

      <footer className="max-w-3xl mx-auto px-4 py-10 text-center text-xs text-stone-500">
        Du' Spicci · solo cash, solo Roma · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
