import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, Sparkles, Clock } from "lucide-react";
import api from "../lib/api";
import { ProfileModal } from "./ProfileModal";

const JOB_TTL_MS = 72 * 3600 * 1000;
const fmtLeft = (ms) => {
  if (ms <= 0) return "scaduto";
  const h = Math.floor(ms / 3.6e6);
  if (h >= 24) return `${Math.floor(h/24)}g ${h%24}h`;
  if (h >= 1) return `${h}h`;
  return `${Math.max(1, Math.floor(ms / 6e4))}m`;
};

export const JobCard = ({ job, isNew, onApplied }) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);
  const leftMs = new Date(job.created_at).getTime() + JOB_TTL_MS - now;
  const urgent = leftMs < 12 * 3600 * 1000;

  const apply = async () => {
    setSending(true);
    try {
      const { data } = await api.post(`/jobs/${job.id}/apply`);
      if (data.status === "accepted") toast.success("Già accettato! Apri la chat dalla Inbox.");
      else toast.success("Candidatura inviata!");
      onApplied && onApplied(data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Errore");
    } finally { setSending(false); }
  };

  return (
    <>
      <div data-testid="job-card"
        className={`relative bg-white border-[2.5px] border-stone-900 rounded-3xl p-5 sm:p-6 pop-shadow ${isNew ? "ring-4 ring-amber-400/60" : ""}`}>
        <div data-testid="job-card-price"
          className="absolute -top-4 -right-3 sm:-top-5 sm:-right-4 bg-[#22c55e] text-white border-[2.5px] border-stone-900 rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 pop-shadow-ink-sm font-display rotate-3">
          <div className="text-2xl sm:text-3xl font-black leading-none">{job.price} €</div>
          <div className="text-[10px] sm:text-xs tracking-widest uppercase opacity-90 mt-0.5">cash</div>
        </div>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 border-[2px] border-stone-900 rounded-full px-3 py-1 text-xs font-bold pop-shadow-ink-xs">
            <MapPin className="w-3.5 h-3.5" strokeWidth={2.5}/>{job.neighborhood}
          </span>
          {isNew && <span className="bg-[#d97706] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border-2 border-stone-900">Appena pubblicato</span>}
          <span data-testid="job-countdown" className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border-2 border-stone-900 ${urgent?"bg-red-500 text-white":"bg-amber-50 text-stone-800"}`}>
            <Clock size={11} strokeWidth={3}/>{leftMs<=0?"scaduto":`scade tra ${fmtLeft(leftMs)}`}
          </span>
        </div>

        <h3 className="font-display text-xl sm:text-2xl text-stone-900 leading-tight pr-20 sm:pr-24 mb-2">{job.title}</h3>
        <p className="text-stone-700 text-sm sm:text-base leading-relaxed mb-4">{job.description}</p>

        <button onClick={() => setProfileOpen(true)} data-testid="view-owner-profile"
          className="text-xs text-stone-500 mb-4 underline-offset-2 hover:underline">
          Pubblicato da <span className="font-bold text-stone-700">{job.owner_name}</span>
        </button>

        <button data-testid="apply-button" onClick={apply} disabled={sending || job.owner_id==="seed"}
          className="w-full bg-[#d97706] hover:bg-[#b45309] disabled:opacity-60 text-white font-display text-lg py-3 rounded-full border-[2.5px] border-stone-900 pop-shadow-ink btn-press inline-flex items-center justify-center gap-2">
          <Sparkles size={18} strokeWidth={2.5}/>Mi Candido
        </button>
      </div>
      {profileOpen && job.owner_id !== "seed" && (
        <ProfileModal userId={job.owner_id} onClose={() => setProfileOpen(false)} />
      )}
    </>
  );
};
