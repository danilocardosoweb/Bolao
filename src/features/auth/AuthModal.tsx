import { useEffect, useMemo, useState, type FormEvent } from "react";
import { X, Loader2, Mail, Lock, UserRound } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useSupabase } from "@/src/lib/supabase-provider";

type AuthMode = "signin" | "signup";

type AuthModalProps = {
  open: boolean;
  mode: AuthMode;
  onClose: () => void;
  onSuccess?: () => void;
};

export function AuthModal({ open, mode, onClose, onSuccess }: AuthModalProps) {
  const { session, authLoading, signIn, signUp } = useSupabase();
  const [currentMode, setCurrentMode] = useState<AuthMode>(mode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCurrentMode(mode);
      setMessage(null);
      setError(null);
      if (mode === "signin") setConfirmPassword("");
    }
  }, [mode, open]);

  useEffect(() => {
    if (session && open) {
      onClose();
      onSuccess?.();
    }
  }, [session, open, onClose, onSuccess]);

  const title = useMemo(() => (currentMode === "signin" ? "Entrar na conta" : "Criar conta"), [currentMode]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim() || !password.trim()) {
      setError("Preencha email e senha para continuar.");
      return;
    }

    if (currentMode === "signup" && password !== confirmPassword) {
      setError("As senhas precisam ser iguais.");
      return;
    }

    setBusy(true);
    try {
      if (currentMode === "signin") {
        const result = await signIn(email.trim(), password);
        if (result.error) {
          setError(result.error);
        } else {
          setMessage("Entrada realizada com sucesso.");
        }
      } else {
        const result = await signUp(email.trim(), password, fullName.trim() || undefined);
        if (result.error) {
          setError(result.error);
        } else if (result.sessionCreated) {
          setMessage("Conta criada e sessão iniciada.");
        } else {
          setMessage("Conta criada. Verifique seu email para concluir o acesso.");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-[#08190f] text-white shadow-[0_40px_120px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-[0.7rem] font-black uppercase tracking-[0.28em] text-[#ffc21f]">Bolao Copa 2026</p>
            <h2 className="mt-1 text-2xl font-black">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pt-5">
          <div className="grid grid-cols-2 rounded-2xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setCurrentMode("signin")}
              className={`rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                currentMode === "signin" ? "bg-[#ffc21f] text-[#071b0e]" : "text-white/70 hover:text-white"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setCurrentMode("signup")}
              className={`rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                currentMode === "signup" ? "bg-[#ffc21f] text-[#071b0e]" : "text-white/70 hover:text-white"
              }`}
            >
              Criar conta
            </button>
          </div>
        </div>

        <form className="space-y-4 px-6 py-6" onSubmit={handleSubmit}>
          {currentMode === "signup" && (
            <label className="block space-y-2">
              <span className="text-sm font-bold text-white/80">Nome</span>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <Input
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome"
                  className="h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30 focus-visible:ring-[#ffc21f]"
                />
              </div>
            </label>
          )}

          <label className="block space-y-2">
            <span className="text-sm font-bold text-white/80">Email</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                className="h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30 focus-visible:ring-[#ffc21f]"
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-white/80">Senha</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <Input
                type="password"
                autoComplete={currentMode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                className="h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30 focus-visible:ring-[#ffc21f]"
              />
            </div>
          </label>

          {currentMode === "signup" && (
            <label className="block space-y-2">
              <span className="text-sm font-bold text-white/80">Confirmar senha</span>
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                className="h-12 border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#ffc21f]"
              />
            </label>
          )}

          {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

          {message && <div className="rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-100">{message}</div>}

          <Button
            type="submit"
            disabled={busy || authLoading}
            className="h-12 w-full rounded-2xl bg-[#ffc21f] font-black uppercase tracking-[0.14em] text-[#071b0e] hover:bg-[#ffd54f]"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : currentMode === "signin" ? "Entrar" : "Criar conta"}
          </Button>

          <p className="text-center text-xs leading-5 text-white/55">
            Ao continuar, sua sessão fica salva no Supabase e você pode entrar no painel sem refazer o login.
          </p>
        </form>
      </div>
    </div>
  );
}
