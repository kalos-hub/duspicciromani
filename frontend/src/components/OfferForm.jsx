import { useState } from "react";
import { toast } from "sonner";
import { Euro, Loader2, MapPinned } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { JobMap } from "./JobMap";
import { ROMA_COORDS } from "../lib/roma";

export const OfferForm = ({ neighborhoods, onPublished }) => {
  const [neighborhood, setNeighborhood] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [pos, setPos] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleNeighborhood = (n) => {
    setNeighborhood(n);
    if (n && ROMA_COORDS[n]) setPos({ lat: ROMA_COORDS[n][0], lng: ROMA_COORDS[n][1] });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!neighborhood || !title.trim() || !price) return toast.error("Compila i campi");
    setSubmitting(true);
    try {
      const { data } = await api.post("/jobs", {
        neighborhood, title: title.trim(), description: notes.trim(),
        price: parseInt(price, 10),
        lat: pos?.lat, lng: pos?.lng,
      });
      toast.success("Annuncio pubblicato!");
      setNeighborhood(""); setTitle(""); setPrice(""); setNotes(""); setPos(null);
      onPublished(data);
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    finally { setSubmitting(false); }
  };

  return (
    <form data-testid="offer-job-form" onSubmit={submit}
      className="bg-white border-[2.5px] border-stone-900 rounded-3xl p-5 sm:p-7 pop-shadow space-y-5">
      <div>
        <h2 className="font-display text-3xl text-stone-900 leading-none">Offri 'na cosa.</h2>
        <p className="text-stone-600 mt-2 text-sm">Tre campi e il tuo spicco è online. Solo Roma. Solo cash.</p>
      </div>

      <div>
        <label className="font-display text-sm uppercase tracking-wider text-stone-700">Quartiere</label>
        <select data-testid="neighborhood-select" value={neighborhood} onChange={(e)=>handleNeighborhood(e.target.value)}
          className="mt-2 w-full bg-amber-50 border-[2.5px] border-stone-900 rounded-2xl px-4 py-3 text-base font-bold focus:outline-none focus:ring-4 focus:ring-amber-500/40 cursor-pointer">
          <option value="">Scegli il quartiere…</option>
          {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {neighborhood && (
        <div>
          <label className="font-display text-sm uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <MapPinned size={14}/> Pinna il punto esatto
          </label>
          <p className="text-xs text-stone-500 mt-1 mb-2">Clicca sulla mappa per spostare il pin</p>
          <JobMap picker pickerPos={pos} onPick={(ll) => setPos({lat: ll.lat, lng: ll.lng})}/>
        </div>
      )}

      <div>
        <label className="font-display text-sm uppercase tracking-wider text-stone-700">Il lavoro</label>
        <input data-testid="job-title-input" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Es. Fila alle poste" maxLength={120}
          className="mt-2 w-full bg-amber-50 border-[2.5px] border-stone-900 rounded-2xl px-4 py-3 font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/40"/>
      </div>

      <div>
        <label className="font-display text-sm uppercase tracking-wider text-stone-700">Cash che offri</label>
        <div className="mt-2 relative">
          <Euro className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={20} strokeWidth={2.5}/>
          <input data-testid="job-price-input" type="number" min="0" value={price} onChange={(e)=>setPrice(e.target.value)} placeholder="35"
            className="w-full bg-amber-50 border-[2.5px] border-stone-900 rounded-2xl pl-11 pr-4 py-3 text-lg font-display focus:outline-none focus:ring-4 focus:ring-amber-500/40"/>
        </div>
      </div>

      <div>
        <label className="font-display text-sm uppercase tracking-wider text-stone-700">Note</label>
        <textarea data-testid="job-notes-input" value={notes} onChange={(e)=>setNotes(e.target.value)} rows={3} maxLength={600} placeholder="Dettagli, orari, dove ci si vede..."
          className="mt-2 w-full bg-amber-50 border-[2.5px] border-stone-900 rounded-2xl px-4 py-3 font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/40 resize-none"/>
      </div>

      <button type="submit" data-testid="submit-job-button" disabled={submitting}
        className="w-full bg-[#d97706] hover:bg-[#b45309] disabled:opacity-60 text-white font-display text-xl py-4 rounded-full border-[2.5px] border-stone-900 pop-shadow-ink btn-press flex items-center justify-center gap-2">
        {submitting && <Loader2 className="w-5 h-5 animate-spin" />}Pubblica Annuncio
      </button>
    </form>
  );
};
