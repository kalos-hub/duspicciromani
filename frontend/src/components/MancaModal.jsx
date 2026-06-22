import { useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

const TIP_OPTIONS = [0, 1, 2, 5];

export const MancaModal = ({ job, onClose }) => {
  const [tip, setTip] = useState(0);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      const { data } = await api.post(`/jobs/${job.id}/apply`, { tip });
      toast.success(data.message);
      onClose();
    } catch {
      toast.error("Candidatura non riuscita");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
      data-testid="mancia-modal"
    >
      <div
        className="bg-white border-[2.5px] border-stone-900 rounded-3xl pop-shadow w-full max-w-md p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-amber-100 border-[2px] border-stone-900 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              <Sparkles size={12} strokeWidth={3} className="text-[#d97706]" />
              Spicci Pro
            </div>
            <h3 className="font-display text-2xl sm:text-3xl text-stone-900 mt-2 leading-tight">
              Vòi lascià una mancia?
            </h3>
            <p className="text-stone-600 text-sm mt-1">
              Tutta extra. Salti la fila e diventi <b>Spicci Pro</b> per l'annuncio.
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-full border-[2px] border-stone-900 bg-amber-50 flex items-center justify-center btn-press"
            aria-label="Chiudi"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-4">
          {TIP_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              data-testid={`tip-${t}`}
              onClick={() => setTip(t)}
              className={`py-3 rounded-2xl border-[2.5px] border-stone-900 font-display text-lg transition-all btn-press ${
                tip === t
                  ? "bg-[#22c55e] text-white pop-shadow-ink-xs"
                  : "bg-amber-50 text-stone-800"
              }`}
            >
              {t === 0 ? "—" : `+${t}€`}
            </button>
          ))}
        </div>

        <button
          data-testid="confirm-apply"
          onClick={submit}
          disabled={sending}
          className="w-full mt-5 bg-[#d97706] hover:bg-[#b45309] disabled:opacity-60 text-white font-display text-lg py-3.5 rounded-full border-[2.5px] border-stone-900 pop-shadow-ink btn-press flex items-center justify-center gap-2"
        >
          {sending && <Loader2 className="w-5 h-5 animate-spin" />}
          {tip > 0 ? `Candidati con +${tip}€ di mancia` : "Candidati senza mancia"}
        </button>

        <p className="text-center text-stone-500 text-[11px] mt-3">
          La mancia è simbolica: aiuta Du' Spicci a restare gratis per tutti.
        </p>
      </div>
    </div>
  );
};
