import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { SelfieCapture } from "../components/SelfieCapture";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (tab === "register") {
      if (!firstName || !lastName || !age || !email || !password) return toast.error("Compila tutti i campi");
      if (!photo) return toast.error("Scatta il selfie per registrarti");
    } else {
      if (!email || !password) return toast.error("Email e password");
    }
    setLoading(true);
    const res = tab === "login"
      ? await login(email, password)
      : await register({ first_name: firstName, last_name: lastName,
                         age: parseInt(age,10), email, password, photo });
    setLoading(false);
    if (!res.ok) toast.error(res.error || "Errore");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" data-testid="auth-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-block tape rounded-3xl p-3 mb-3">
            <div className="bg-white border-[2.5px] border-stone-900 rounded-2xl px-5 py-3 pop-shadow-ink-sm -rotate-2">
              <span className="font-display text-4xl text-stone-900">
                Du<span className="text-[#d97706]">'</span> Spicci
              </span>
            </div>
          </div>
          <p className="text-stone-700 font-bold text-sm uppercase tracking-widest mt-2">I lavoretti di Roma</p>
        </div>

        <div className="bg-white border-[2.5px] border-stone-900 rounded-3xl p-6 pop-shadow">
          <div className="flex gap-2 mb-5">
            <button data-testid="tab-login" type="button" onClick={() => setTab("login")}
              className={`flex-1 py-2.5 rounded-full font-display border-[2.5px] border-stone-900 ${tab==="login"?"bg-[#d97706] text-white pop-shadow-ink-xs":"bg-amber-50 text-stone-700"}`}>Entra</button>
            <button data-testid="tab-register" type="button" onClick={() => setTab("register")}
              className={`flex-1 py-2.5 rounded-full font-display border-[2.5px] border-stone-900 ${tab==="register"?"bg-[#d97706] text-white pop-shadow-ink-xs":"bg-amber-50 text-stone-700"}`}>Registrati</button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {tab === "register" && (
              <>
                <div className="flex justify-center pt-2 pb-1">
                  <SelfieCapture onCapture={setPhoto} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input data-testid="first-name-input" placeholder="Nome" value={firstName} onChange={e=>setFirstName(e.target.value)}
                    className="bg-amber-50 border-[2.5px] border-stone-900 rounded-2xl px-3 py-2.5 font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/40"/>
                  <input data-testid="last-name-input" placeholder="Cognome" value={lastName} onChange={e=>setLastName(e.target.value)}
                    className="bg-amber-50 border-[2.5px] border-stone-900 rounded-2xl px-3 py-2.5 font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/40"/>
                </div>
                <input data-testid="age-input" type="number" placeholder="Età" min="14" max="110" value={age} onChange={e=>setAge(e.target.value)}
                  className="w-full bg-amber-50 border-[2.5px] border-stone-900 rounded-2xl px-3 py-2.5 font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/40"/>
              </>
            )}
            <input data-testid="email-input" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}
              className="w-full bg-amber-50 border-[2.5px] border-stone-900 rounded-2xl px-3 py-2.5 font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/40"/>
            <input data-testid="password-input" type="password" placeholder="Password (min 6)" value={password} onChange={e=>setPassword(e.target.value)}
              className="w-full bg-amber-50 border-[2.5px] border-stone-900 rounded-2xl px-3 py-2.5 font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/40"/>

            <button data-testid="auth-submit" type="submit" disabled={loading}
              className="w-full bg-[#d97706] hover:bg-[#b45309] disabled:opacity-60 text-white font-display text-lg py-3 rounded-full border-[2.5px] border-stone-900 pop-shadow-ink btn-press flex items-center justify-center gap-2 mt-2">
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {tab === "login" ? "Entra" : "Registrati"}
            </button>
          </form>
        </div>
        <p className="text-center text-stone-500 text-xs mt-5">Solo cash. Solo Roma. Solo gente perbene.</p>
      </div>
    </div>
  );
}
