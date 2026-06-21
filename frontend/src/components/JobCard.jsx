import { MapPin } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

export const JobCard = ({ job, isNew }) => {
  const handleApply = async () => {
    try {
      const { data } = await api.post(`/jobs/${job.id}/apply`);
      toast.success(data.message || "Candidatura inviata!");
    } catch {
      toast.error("Impossibile candidarti adesso. Riprova.");
    }
  };

  return (
    <div
      data-testid="job-card"
      className={`relative bg-white border-[2.5px] border-stone-900 rounded-3xl p-5 sm:p-6 pop-shadow ${
        isNew ? "ring-4 ring-amber-400/60" : ""
      }`}
    >
      {/* Price tag - tilted sticker top right */}
      <div
        data-testid="job-card-price"
        className="absolute -top-4 -right-3 sm:-top-5 sm:-right-4 bg-[#22c55e] text-white border-[2.5px] border-stone-900 rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 pop-shadow-ink-sm font-display rotate-3"
      >
        <div className="text-2xl sm:text-3xl font-black leading-none">
          {job.price} €
        </div>
        <div className="text-[10px] sm:text-xs tracking-widest uppercase opacity-90 mt-0.5">
          cash
        </div>
      </div>

      {/* Neighborhood */}
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 border-[2px] border-stone-900 rounded-full px-3 py-1 text-xs sm:text-sm font-bold pop-shadow-ink-xs">
          <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
          {job.neighborhood}
        </span>
        {isNew && (
          <span className="bg-[#d97706] text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border-2 border-stone-900">
            Appena pubblicato
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-display text-xl sm:text-2xl text-stone-900 leading-tight pr-20 sm:pr-24 mb-2">
        {job.title}
      </h3>

      {/* Description */}
      <p className="text-stone-700 text-sm sm:text-base leading-relaxed mb-4">
        {job.description}
      </p>

      {/* Owner */}
      <div className="text-xs text-stone-500 mb-4">
        Pubblicato da <span className="font-bold text-stone-700">{job.owner_name}</span>
      </div>

      {/* CTA */}
      <button
        data-testid="apply-button"
        onClick={handleApply}
        className="w-full bg-[#d97706] hover:bg-[#b45309] text-white font-display text-lg py-3 rounded-full border-[2.5px] border-stone-900 pop-shadow-ink btn-press"
      >
        Mi Candido
      </button>
    </div>
  );
};
