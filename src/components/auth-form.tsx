"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resendOtp, signIn, signUp, verifyOtp, type AuthState } from "@/app/auth-actions";

const field =
  "mt-2 h-12 w-full rounded-xl border border-line bg-surface px-4 text-sm outline-none transition focus:border-ink";

export function AuthForm({ mode, next }: { mode: "connexion" | "inscription"; next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "connexion" ? signIn : signUp, {});
  const [otp, otpAction, otpPending] = useActionState<AuthState, FormData>(verifyOtp, {});
  const [again, againAction, againPending] = useActionState<AuthState, FormData>(resendOtp, {});
  const pendingEmail = otp.pending ?? again.pending ?? state.pending;
  const other = mode === "connexion" ? "inscription" : "connexion";
  const q = (m: string) => `/connexion?mode=${m}&next=${encodeURIComponent(next)}`;

  if (mode === "inscription" && pendingEmail) {
    const msg = otp.error ?? again.error;
    const ok = again.info ?? state.info;
    return (
      <div className="card mx-auto mt-10 w-full max-w-md space-y-5 p-7 sm:p-9">
        <form action={otpAction} className="space-y-5">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="email" value={pendingEmail} />
          <h2 className="text-lg font-medium">Vérifiez votre e-mail</h2>
          <p className="text-sm text-ink-soft">
            Saisissez le code reçu à <strong>{pendingEmail}</strong>. Pensez à regarder dans les courriers indésirables.
          </p>
          <label className="block text-sm">
            Code de vérification
            <input name="token" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" required maxLength={8} className={`${field} text-center text-xl tracking-[0.4em]`} />
          </label>
          {msg && (
            <p role="alert" className="text-sm text-danger">
              {msg}
            </p>
          )}
          {!msg && ok && (
            <p role="status" className="text-sm text-accent-ink">
              {ok}
            </p>
          )}
          <button type="submit" className="pill w-full" disabled={otpPending}>
            {otpPending ? "Vérification…" : "Valider le code"}
          </button>
        </form>
        <form action={againAction} className="text-center">
          <input type="hidden" name="email" value={pendingEmail} />
          <button type="submit" className="text-sm underline underline-offset-4" disabled={againPending}>
            {againPending ? "Envoi…" : "Renvoyer un code"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={action} className="card mx-auto mt-10 w-full max-w-md space-y-5 p-7 sm:p-9" noValidate={false}>
      <input type="hidden" name="next" value={next} />
      {mode === "inscription" && (
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      )}
      {mode === "inscription" && (
        <label className="block text-sm">
          Nom complet
          <input name="name" required minLength={2} maxLength={80} autoComplete="name" className={field} />
        </label>
      )}
      <label className="block text-sm">
        Adresse e-mail
        <input name="email" type="email" required maxLength={120} autoComplete="email" className={field} />
      </label>
      <label className="block text-sm">
        Mot de passe
        <input
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete={mode === "connexion" ? "current-password" : "new-password"}
          className={field}
        />
      </label>
      {mode === "inscription" && (
        <label className="flex items-start gap-3 text-sm">
          <input name="adult" type="checkbox" required className="mt-1 h-4 w-4 accent-[var(--accent-ink)]" />
          <span>Je confirme avoir 18 ans ou plus.</span>
        </label>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.info && (
        <p role="status" className="text-sm text-accent-ink">
          {state.info}
        </p>
      )}
      <button type="submit" className="pill w-full" disabled={pending}>
        {pending ? "Un instant…" : mode === "connexion" ? "Se connecter" : "Créer mon compte"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        {mode === "connexion" ? "Pas encore de compte ? " : "Déjà client ? "}
        <Link href={q(other)} className="underline underline-offset-4">
          {mode === "connexion" ? "Créer un compte" : "Se connecter"}
        </Link>
      </p>
    </form>
  );
}
