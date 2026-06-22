import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

export const RatingForm = ({ thread, onSubmitted }) => {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (stars < 1) return toast.error("Scegli da 1 a 5 Spicci");
    setSending(true);
    try {
      await api.post(`/threads/${thread.id}/rate`, { stars, comment: comment.trim() });
      toast.success("Grazie per la valutazione!");
      onSubmitted && onSubmitted();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Errore");
    } finally { setSending(false); }
  };

  return (
    <div data-testid="rating-form" className="bg-amber-50 border-[2.5px] border-stone-900 rounded-3xl p-4 pop-shadow-ink-sm">
      <p className="font-display text-lg text-stone-900">Come è andata con {thread.other_user_name}?</p>
      <div className="flex gap-1 mt-2">
        {[1,2,3,4,5].map(n => (
          <button key={n} data-testid={`rate-${n}`} type="button"
            onMouseEnter={()=>setHover(n)} onMouseLeave={()=>setHover(0)} onClick={()=>setStars(n)}
            className="btn-press">
            <Star size={32} strokeWidth={2.5}
              className={(hover||stars) >= n ? "fill-[#d97706] text-stone-900" : "text-stone-400"}/>
          </button>
        ))}
      </div>
      <textarea data-testid="rating-comment" value={comment} onChange={e=>setComment(e.target.value)}
        maxLength={2500} rows={2} placeholder="Due righe sull'esperienza (opzionale, max ~500 parole)"
        className="mt-2 w-full bg-white border-[2.5px] border-stone-900 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/40 resize-none"/>
      <button data-testid="rating-submit" onClick={submit} disabled={sending}
        className="mt-2 w-full bg-[#d97706] disabled:opacity-60 text-white font-display py-2.5 rounded-full border-[2.5px] border-stone-900 pop-shadow-ink-xs btn-press">
        Invia valutazione
      </button>
    </div>
  );
};
