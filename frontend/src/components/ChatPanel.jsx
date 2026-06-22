import { useEffect, useRef, useState } from "react";
import { Send, X, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

const fmtCountdown = (ms) => {
  if (ms <= 0) return "scaduta";
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  return `${h}h ${m}m`;
};

export const ChatPanel = ({ thread, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const bottomRef = useRef(null);

  const load = async () => {
    try { const { data } = await api.get(`/threads/${thread.id}/messages`); setMessages(data); }
    catch {}
  };

  useEffect(() => {
    load();
    const t1 = setInterval(load, 3000);
    const t2 = setInterval(() => setNow(Date.now()), 30000);
    return () => { clearInterval(t1); clearInterval(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages.length]);

  const expiresMs = new Date(thread.expires_at).getTime() - now;
  const expired = expiresMs <= 0;

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || expired) return;
    setSending(true);
    try {
      await api.post(`/threads/${thread.id}/messages`, { text: text.trim() });
      setText(""); load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invio fallito");
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose} data-testid="chat-panel">
      <div className="bg-white border-[2.5px] border-stone-900 sm:rounded-3xl rounded-t-3xl pop-shadow w-full max-w-xl flex flex-col" style={{maxHeight:"90vh", height:"90vh"}}
        onClick={e=>e.stopPropagation()}>
        <div className="p-4 border-b-[2.5px] border-stone-900 flex items-center justify-between gap-3 bg-amber-50 sm:rounded-t-3xl rounded-t-3xl">
          <div className="min-w-0">
            <div className="font-display text-lg text-stone-900 truncate">{thread.other_user_name}</div>
            <div className="text-xs text-stone-600 truncate">{thread.job_title} · {thread.job_neighborhood} · {thread.job_price}€</div>
          </div>
          <div className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border-2 border-stone-900 ${expired?"bg-red-500 text-white":"bg-emerald-500 text-white"}`}>
            <Clock size={12} strokeWidth={3}/>{fmtCountdown(expiresMs)}
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full border-[2px] border-stone-900 bg-white flex items-center justify-center btn-press"><X size={18} strokeWidth={2.5}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#fefbeb]" data-testid="messages-list">
          {messages.length === 0 && <p className="text-center text-stone-500 text-sm pt-10">Rompi il ghiaccio. Hai 48 ore.</p>}
          {messages.map(m => {
            const mine = m.from_id === user.id;
            return (
              <div key={m.id} className={`flex ${mine?"justify-end":"justify-start"}`}>
                <div className={`max-w-[78%] px-3 py-2 rounded-2xl border-[2px] border-stone-900 text-sm ${mine?"bg-[#d97706] text-white":"bg-white text-stone-900"}`}>
                  <div className="whitespace-pre-wrap break-words">{m.text}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef}/>
        </div>

        <form onSubmit={send} className="p-3 border-t-[2.5px] border-stone-900 flex gap-2 bg-white">
          <input data-testid="chat-input" value={text} onChange={e=>setText(e.target.value)}
            placeholder={expired ? "Chat scaduta" : "Scrivi un messaggio…"} disabled={expired}
            className="flex-1 bg-amber-50 border-[2.5px] border-stone-900 rounded-full px-4 py-2.5 font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/40 disabled:opacity-50"/>
          <button data-testid="chat-send" type="submit" disabled={expired || sending || !text.trim()}
            className="bg-[#d97706] disabled:opacity-50 text-white px-4 rounded-full border-[2.5px] border-stone-900 pop-shadow-ink-xs btn-press inline-flex items-center justify-center">
            {sending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send size={18} strokeWidth={2.5}/>}
          </button>
        </form>
      </div>
    </div>
  );
};
