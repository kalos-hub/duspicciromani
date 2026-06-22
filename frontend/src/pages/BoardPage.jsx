import { useEffect, useState } from "react";
import { LogOut, Loader2, Filter } from "lucide-react";
import { ModeToggle } from "../components/ModeToggle";
import { JobCard } from "../components/JobCard";
import { OfferForm } from "../components/OfferForm";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";

export default function BoardPage() {
  const { user, logout } = useAuth();
  const [mode, setMode] = useState("cerco");
  const [jobs, setJobs] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [filter, setFilter] = useState("Tutti");
  const [loading, setLoading] = useState(true);
  const [newJobId, setNewJobId] = useState(null);

  const loadJobs = async (q = filter) => {
    setLoading(true);
    try {
      const params = q && q !== "Tutti" ? { neighborhood: q } : {};
      const { data } = await api.get("/jobs", { params });
      setJobs(data);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api
      .get("/neighborhoods")
      .then(({ data }) => setNeighborhoods(data))
      .catch(() => setNeighborhoods([]));
    loadJobs("Tutti");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (val) => {
    setFilter(val);
    loadJobs(val);
  };

  const handlePublished = (newJob) => {
    // If filter active and ad doesn't match, reset filter to "Tutti" so user sees it
    if (filter !== "Tutti" && newJob.neighborhood !== filter) {
      setFilter("Tutti");
    }
    setJobs((prev) => [newJob, ...prev.filter((j) => j.id !== newJob.id)]);
    setNewJobId(newJob.id);
    setMode("cerco");
    setTimeout(() => setNewJobId(null), 3500);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen" data-testid="board-page">
      <header className="border-b-[2.5px] border-stone-900 bg-[#fefbeb] sticky top-0 z-30 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-stone-900 leading-none">
              Du<span className="text-[#d97706]">'</span> Spicci
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              I lavoretti di Roma · ciao{" "}
              <span className="font-bold text-stone-800">{user?.name}</span>
            </p>
          </div>
          <button
            onClick={logout}
            data-testid="logout-button"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border-[2px] border-stone-900 bg-white text-stone-800 text-sm font-bold pop-shadow-ink-xs btn-press"
          >
            <LogOut size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Esci</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <ModeToggle mode={mode} onChange={setMode} />

        <div className="mt-7 sm:mt-9">
          {mode === "cerco" ? (
            <>
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-display text-2xl sm:text-3xl text-stone-900">
                  La bacheca der quartiere
                </h2>
                <span className="text-xs sm:text-sm text-stone-500 font-bold">
                  {jobs.length} annunci
                </span>
              </div>

              {/* Filtro quartiere */}
              <div className="mb-6 relative">
                <Filter
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600 pointer-events-none"
                  size={18}
                  strokeWidth={2.5}
                />
                <select
                  data-testid="filter-neighborhood"
                  value={filter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="w-full bg-white border-[2.5px] border-stone-900 rounded-full pl-11 pr-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-amber-500/40 pop-shadow-ink-xs appearance-none cursor-pointer"
                >
                  <option value="Tutti">Tutti i quartieri</option>
                  {neighborhoods.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20 text-stone-500">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : jobs.length === 0 ? (
                <div className="bg-white border-[2.5px] border-stone-900 rounded-3xl p-8 text-center pop-shadow">
                  <p className="font-display text-2xl text-stone-900">
                    Ancora nessun annuncio.
                  </p>
                  <p className="text-stone-600 mt-2">
                    {filter !== "Tutti"
                      ? `Niente lavori in zona ${filter}.`
                      : "Pubblica tu il primo!"}
                  </p>
                </div>
              ) : (
                <div className="space-y-7 sm:space-y-8" data-testid="job-list">
                  {jobs.map((job) => (
                    <JobCard key={job.id} job={job} isNew={job.id === newJobId} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <OfferForm neighborhoods={neighborhoods} onPublished={handlePublished} />
          )}
        </div>
      </main>

      <footer className="max-w-3xl mx-auto px-4 sm:px-6 py-10 text-center text-xs text-stone-500">
        Du' Spicci · solo cash, solo Roma · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
