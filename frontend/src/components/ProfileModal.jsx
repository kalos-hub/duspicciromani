import { useEffect, useState } from "react";
import { X } from "lucide-react";
import api from "../lib/api";

export const ProfileModal = ({ userId, onClose }) => {
  const [u, setU] = useState(null);
  useEffect(() => {
    api.get(`/users/${userId}`).then(({data}) => setU(data)).catch(() => setU(false));
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose} data-testid="profile-modal">
      <div className="bg-white border-[2.5px] border-stone-900 rounded-3xl pop-shadow w-full max-w-sm p-6"
        onClick={e=>e.stopPropagation()}>
        <div className="flex justify-end -mt-2 -mr-2">
          <button onClick={onClose} className="w-9 h-9 rounded-full border-[2px] border-stone-900 bg-amber-50 flex items-center justify-center btn-press"><X size={18} strokeWidth={2.5}/></button>
        </div>
        {u === null ? (
          <p className="text-center text-stone-500 py-12">Carico…</p>
        ) : u === false ? (
          <p className="text-center text-stone-500 py-12">Profilo non trovato</p>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="w-32 h-32 rounded-full border-[3px] border-stone-900 overflow-hidden pop-shadow-ink-sm bg-amber-50 -rotate-3">
              {u.photo ? <img src={u.photo} alt={u.first_name} className="w-full h-full object-cover"/> :
                <div className="w-full h-full flex items-center justify-center font-display text-3xl text-stone-600">?</div>}
            </div>
            <h3 className="font-display text-2xl mt-4 text-stone-900">{u.first_name} {u.last_name}</h3>
            <p className="text-stone-600 text-sm mt-1">{u.age} anni · {u.email}</p>
            {u.online && (
              <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-bold uppercase px-2.5 py-1 rounded-full border-2 border-stone-900">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"/>Online ora
              </div>
            )}
            {u.ratings_count > 0 && (
              <div className="mt-2 text-sm text-stone-700">
                <span className="font-display text-lg text-[#d97706]">{u.avg_rating?.toFixed(1)}</span> ⭐ Spicci
                <span className="text-stone-500 ml-1">({u.ratings_count})</span>
              </div>
            )}
            <div className="mt-3 inline-flex items-center gap-1.5 bg-amber-100 border-[2px] border-stone-900 rounded-full px-3 py-1 text-xs font-bold uppercase">membro Du' Spicci</div>
          </div>
        )}
      </div>
    </div>
  );
};
