import { useEffect, useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { ModeToggle } from "../components/ModeToggle";
import { JobCard } from "../components/JobCard";
import { OfferForm } from "../components/OfferForm";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";

export default function BoardPage() {
  const { user, logout } = useAuth();
  const [mode, setMode] = useState("cerco");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newJobId, setNewJobId] = useState(null);

  const loadJobs = async () => {
    try {
      const { data } = await api.get("/jobs");
      setJobs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handlePublished = (newJob) => {
    setJobs((prev) => [newJob, ...prev.filter((j) => j.id !== newJob.id)]);
    setNewJobId(newJob.id);
    setMode("cerco"); // ✨ the magic switch
    setTimeout(() => setNewJobId(null), 3500);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen" data-testid="board-page">
      {/* Header */}
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
              <div className="mb-5 flex items-baseline justify-between">
                <h2 className="font-display text-2xl sm:text-3xl text-stone-900">
                  La bacheca der quartiere
                </h2>
                <span className="text-xs sm:text-sm text-stone-500 font-bold">
                  {jobs.length} annunci
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20 text-stone-500">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : jobs.length === 0 ? (
                <div className="bg-white border-[2.5px] border-stone-900 rounded-3xl p-8 text-center pop-shadow">
                  <p className="font-display text-2xl text-stone-900">Ancora nessun annuncio.</p>
                  <p className="text-stone-600 mt-2">Pubblica tu il primo!</p>
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
            <OfferForm onPublished={handlePublished} />
          )}
        </div>
      </main>

      <footer className="max-w-3xl mx-auto px-4 sm:px-6 py-10 text-center text-xs text-stone-500">
        Du' Spicci · solo cash, solo Roma · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
