import { useEffect, useState } from "react";
import { Check, X, MessageCircle, Inbox as InboxIcon, Send } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { ChatPanel } from "../components/ChatPanel";
import { ProfileModal } from "../components/ProfileModal";

export default function InboxPage() {
  const [tab, setTab] = useState("received");
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [threads, setThreads] = useState([]);
  const [openThread, setOpenThread] = useState(null);
  const [profileUser, setProfileUser] = useState(null);

  const reload = async () => {
    try {
      const [r, s, t] = await Promise.all([
        api.get("/applications/inbox"),
        api.get("/applications/mine"),
        api.get("/threads"),
      ]);
      setReceived(r.data); setSent(s.data); setThreads(t.data);
    } catch {}
  };

  useEffect(() => { reload(); }, []);

  const accept = async (id) => {
    try { await api.post(`/applications/${id}/accept`); toast.success("Accettato! Chat aperta 48h."); reload(); }
    catch (e) { toast.error(e.response?.data?.detail || "Errore"); }
  };
  const reject = async (id) => {
    try { await api.post(`/applications/${id}/reject`); toast.success("Rifiutato"); reload(); }
    catch { toast.error("Errore"); }
  };

  return (
    <div data-testid="inbox-page" className="space-y-5">
      <div className="flex gap-2 bg-stone-100 border-[2.5px] border-stone-900 rounded-full p-1 pop-shadow-ink">
        {[["received","Ricevute",received.length],["sent","Inviate",sent.length],["chats","Chat",threads.length]].map(([k,label,n]) => (
          <button key={k} data-testid={`inbox-tab-${k}`} onClick={()=>setTab(k)}
            className={`flex-1 py-2.5 rounded-full font-display text-sm transition-colors ${tab===k?"bg-[#d97706] text-white":"text-stone-700"}`}>
            {label} {n>0 && <span className="opacity-80">({n})</span>}
          </button>
        ))}
      </div>

      {tab === "received" && (
        <div className="space-y-3">
          {received.length === 0 && <Empty icon={<InboxIcon/>} msg="Nessuna candidatura ricevuta ai tuoi annunci."/>}
          {received.map(a => (
            <div key={a.id} className="bg-white border-[2.5px] border-stone-900 rounded-3xl p-4 pop-shadow flex items-center gap-3" data-testid="received-app">
              <button onClick={()=>setProfileUser(a.applicant_id)} className="font-display text-base text-stone-900 underline-offset-2 hover:underline shrink-0">{a.applicant_name}</button>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-stone-600 truncate">{a.job_title}</div>
                <div className="text-xs text-stone-500">{a.job_neighborhood} · {a.job_price}€</div>
              </div>
              {a.status === "pending" ? (
                <>
                  <button data-testid={`accept-${a.id}`} onClick={()=>accept(a.id)} className="bg-emerald-500 text-white rounded-full border-[2px] border-stone-900 px-3 py-2 btn-press"><Check size={16} strokeWidth={3}/></button>
                  <button data-testid={`reject-${a.id}`} onClick={()=>reject(a.id)} className="bg-white text-stone-900 rounded-full border-[2px] border-stone-900 px-3 py-2 btn-press"><X size={16} strokeWidth={3}/></button>
                </>
              ) : (
                <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full border-2 border-stone-900 ${a.status==="accepted"?"bg-emerald-500 text-white":"bg-stone-200 text-stone-700"}`}>{a.status==="accepted"?"Accettato":"Rifiutato"}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "sent" && (
        <div className="space-y-3">
          {sent.length === 0 && <Empty icon={<Send/>} msg="Non hai ancora inviato candidature."/>}
          {sent.map(a => (
            <div key={a.id} className="bg-white border-[2.5px] border-stone-900 rounded-3xl p-4 pop-shadow flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-display text-base text-stone-900 truncate">{a.job_title}</div>
                <div className="text-xs text-stone-500">{a.job_neighborhood} · {a.job_price}€ · {a.owner_name}</div>
              </div>
              <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full border-2 border-stone-900 ${a.status==="accepted"?"bg-emerald-500 text-white":a.status==="rejected"?"bg-stone-200 text-stone-700":"bg-amber-200 text-amber-900"}`}>{a.status}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "chats" && (
        <div className="space-y-3">
          {threads.length === 0 && <Empty icon={<MessageCircle/>} msg="Nessuna chat. Aspetta che qualcuno ti accetti o accetta una candidatura."/>}
          {threads.map(t => (
            <button key={t.id} data-testid="thread-card" onClick={()=>setOpenThread(t)}
              className="w-full text-left bg-white border-[2.5px] border-stone-900 rounded-3xl p-4 pop-shadow flex items-center gap-3 btn-press">
              <MessageCircle className="text-[#d97706]" strokeWidth={2.5}/>
              <div className="flex-1 min-w-0">
                <div className="font-display text-base text-stone-900 truncate">{t.other_user_name}</div>
                <div className="text-xs text-stone-500 truncate">{t.job_title} · {t.job_neighborhood}</div>
              </div>
              <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full border-2 border-stone-900 ${t.expired?"bg-red-500 text-white":"bg-emerald-500 text-white"}`}>{t.expired?"scaduta":"attiva"}</span>
            </button>
          ))}
        </div>
      )}

      {openThread && <ChatPanel thread={openThread} onClose={()=>{setOpenThread(null); reload();}}/>}
      {profileUser && <ProfileModal userId={profileUser} onClose={()=>setProfileUser(null)}/>}
    </div>
  );
}

const Empty = ({ icon, msg }) => (
  <div className="bg-white border-[2.5px] border-stone-900 rounded-3xl p-8 text-center pop-shadow text-stone-600">
    <div className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-amber-100 border-[2px] border-stone-900 mb-3 text-[#d97706]">{icon}</div>
    <p className="font-display text-lg text-stone-900">{msg}</p>
  </div>
);
