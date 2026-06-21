import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (tab === "register" && !name)) {
      toast.error("Compila tutti i campi");
      return;
    }
    setLoading(true);
    const res =
      tab === "login"
        ? await login(email, password)
        : await register(name, email, password);
    setLoading(false);
    if (!res.ok) toast.error(res.error || "Errore");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" data-testid="auth-page">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-7">
          <div className="inline-block tape rounded-3xl p-3 mb-3">
            <div className="bg-white border-[2.5px] border-stone-900 rounded-2xl px-5 py-3 pop-shadow-ink-sm -rotate-2">
              <span className="font-display text-4xl text-stone-900">
                Du<span className="text-[#d97706]">'</span> Spicci
              </span>
            </div>
          </div>
          <p className="text-stone-700 font-bold text-sm uppercase tracking-widest mt-2">
            I lavoretti di Roma
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border-[2.5px] border-stone-900 rounded-3xl p-6 sm:p-7 pop-shadow">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              data-testid="tab-login"
              type="button"
              onClick={() => setTab("login")}
              className={`flex-1 py-2.5 rounded-full font-display text-base border-[2.5px] border-stone-900 transition-all ${
                tab === "login"
                  ? "bg-[#d97706] text-white pop-shadow-ink-xs"
                  : "bg-amber-50 text-stone-700"
              }`}
            >
              Entra
            </button>
            <button
              data-testid="tab-register"
              type="button"
              onClick={() => setTab("register")}
              className={`flex-1 py-2.5 rounded-full font-display text-base border-[2.5px] border-stone-900 transition-all ${
                tab === "register"
                  ? "bg-[#d97706] text-white pop-shadow-ink-xs"
                  : "bg-amber-50 text-stone-700"
              }`}
            >
              Registrati
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "register" && (
              <div>
                <label className="font-display text-xs uppercase tracking-wider text-stone-700">
                  Come ti chiami
                </label>
                <input
                  data-testid="name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mario Rossi"
                  className="mt-1.5 w-full bg-amber-50 border-[2.5px] border-stone-900 rounded-2xl px-4 py-3 font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/40"
                />
              </div>
            )}
            <div>
              <label className="font-display text-xs uppercase tracking-wider text-stone-700">
                Email
              </label>
              <input
                data-testid="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mario@roma.it"
                className="mt-1.5 w-full bg-amber-50 border-[2.5px] border-stone-900 rounded-2xl px-4 py-3 font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/40"
              />
            </div>
            <div>
              <label className="font-display text-xs uppercase tracking-wider text-stone-700">
                Password
              </label>
              <input
                data-testid="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="almeno 6 caratteri"
                className="mt-1.5 w-full bg-amber-50 border-[2.5px] border-stone-900 rounded-2xl px-4 py-3 font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/40"
              />
            </div>

            <button
              data-testid="auth-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-[#d97706] hover:bg-[#b45309] disabled:opacity-60 text-white font-display text-lg py-3.5 rounded-full border-[2.5px] border-stone-900 pop-shadow-ink btn-press flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {tab === "login" ? "Entra" : "Registrati"}
            </button>
          </form>
        </div>

        <p className="text-center text-stone-500 text-xs mt-6">
          Solo cash. Solo Roma. Solo gente perbene.
        </p>
      </div>
    </div>
  );
}
