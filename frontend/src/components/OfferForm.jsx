import { useState } from "react";
import { toast } from "sonner";
import { Euro, Loader2 } from "lucide-react";
import api, { formatApiError } from "../lib/api";

const NEIGHBORHOODS = ["Prati", "Parioli", "Centro Storico"];

export const OfferForm = ({ onPublished }) => {
  const [neighborhood, setNeighborhood] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!neighborhood || !title.trim() || !price) {
      toast.error("Compila quartiere, lavoro e cifra cash");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/jobs", {
        neighborhood,
        title: title.trim(),
        description: notes.trim(),
        price: parseInt(price, 10),
      });
      toast.success("Annuncio pubblicato!");
      // Reset
      setNeighborhood("");
      setTitle("");
      setPrice("");
      setNotes("");
      onPublished(data); // magic switch
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      data-testid="offer-job-form"
      onSubmit={handleSubmit}
      className="bg-white border-[2.5px] border-stone-900 rounded-3xl p-5 sm:p-7 pop-shadow space-y-5"
    >
      <div>
        <h2 className="font-display text-3xl sm:text-4xl text-stone-900 leading-none">
          Offri 'na cosa.
        </h2>
        <p className="text-stone-600 mt-2 text-sm sm:text-base">
          Tre campi e il tuo spicco è online. Solo Roma. Solo cash.
        </p>
      </div>

      {/* Neighborhood */}
      <div>
        <label className="font-display text-sm uppercase tracking-wider text-stone-700">
          Quartiere
        </label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {NEIGHBORHOODS.map((n) => (
            <button
              key={n}
              type="button"
              data-testid={`neighborhood-${n.replace(/\s+/g, "-").toLowerCase()}`}
              onClick={() => setNeighborhood(n)}
              className={`py-3 px-2 rounded-2xl border-[2.5px] border-stone-900 font-bold text-sm sm:text-base transition-all btn-press ${
                neighborhood === n
                  ? "bg-[#d97706] text-white pop-shadow-ink-sm"
                  : "bg-amber-50 text-stone-800 hover:bg-amber-100"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="font-display text-sm uppercase tracking-wider text-stone-700">
          Il lavoro
        </label>
        <input
          data-testid="job-title-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Es. Fila alle poste"
          className="mt-2 w-full bg-amber-50 border-[2.5px] border-stone-900 rounded-2xl px-4 py-3 text-base font-medium placeholder:text-stone-400 focus:outline-none focus:ring-4 focus:ring-amber-500/40"
          maxLength={120}
        />
      </div>

      {/* Price */}
      <div>
        <label className="font-display text-sm uppercase tracking-wider text-stone-700">
          Cash che offri
        </label>
        <div className="mt-2 relative">
          <Euro
            className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500"
            size={20}
            strokeWidth={2.5}
          />
          <input
            data-testid="job-price-input"
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="35"
            className="w-full bg-amber-50 border-[2.5px] border-stone-900 rounded-2xl pl-11 pr-4 py-3 text-lg font-display focus:outline-none focus:ring-4 focus:ring-amber-500/40"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="font-display text-sm uppercase tracking-wider text-stone-700">
          Note <span className="text-stone-400 font-normal normal-case">(opzionale)</span>
        </label>
        <textarea
          data-testid="job-notes-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Aggiungi dettagli, orari, dove ci si vede..."
          rows={3}
          maxLength={600}
          className="mt-2 w-full bg-amber-50 border-[2.5px] border-stone-900 rounded-2xl px-4 py-3 text-base font-medium placeholder:text-stone-400 focus:outline-none focus:ring-4 focus:ring-amber-500/40 resize-none"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        data-testid="submit-job-button"
        disabled={submitting}
        className="w-full bg-[#d97706] hover:bg-[#b45309] disabled:opacity-60 text-white font-display text-xl py-4 rounded-full border-[2.5px] border-stone-900 pop-shadow-ink btn-press flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
        Pubblica Annuncio
      </button>
    </form>
  );
};
