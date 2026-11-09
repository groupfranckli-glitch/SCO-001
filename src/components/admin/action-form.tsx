"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "checkbox" | "select" | "date" | "email";
  value?: string | number | boolean | null;
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  wide?: boolean;
};

type Result = { ok: true } | { ok: false; error: string };

const cls = "h-10 rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-ink";

/** Formulaire en ligne générique : envoie les valeurs typées à une action serveur qui revalide tout. */
export function ActionForm({
  action,
  fields,
  hidden = {},
  submit,
  resetOnSuccess = false,
}: {
  action: (input: unknown) => Promise<Result>;
  fields: Field[];
  hidden?: Record<string, unknown>;
  submit: string;
  resetOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        const payload: Record<string, unknown> = { ...hidden };
        for (const fl of fields) {
          if (fl.type === "checkbox") payload[fl.name] = f.get(fl.name) === "on";
          else if (fl.type === "number") payload[fl.name] = f.get(fl.name) === "" ? "" : Number(f.get(fl.name));
          else payload[fl.name] = String(f.get(fl.name) ?? "");
        }
        setMsg(null);
        start(async () => {
          const r = await action(payload);
          if (r.ok) {
            setMsg({ ok: true, text: "Enregistré" });
            if (resetOnSuccess) form.reset();
            router.refresh();
          } else setMsg({ ok: false, text: r.error });
        });
      }}
    >
      {fields.map((fl) => (
        <label key={fl.name} className={`flex flex-col gap-1 text-[11px] uppercase tracking-wider text-ink-soft ${fl.wide ? "min-w-[14rem] flex-1" : ""}`}>
          {fl.type === "checkbox" ? <span className="sr-only">{fl.label}</span> : fl.label}
          {fl.type === "select" ? (
            <select name={fl.name} defaultValue={String(fl.value ?? "")} required={fl.required} className={cls}>
              {fl.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : fl.type === "checkbox" ? (
            <span className="flex h-10 items-center gap-2 text-sm normal-case tracking-normal text-ink">
              <input name={fl.name} type="checkbox" defaultChecked={Boolean(fl.value)} className="h-4 w-4 accent-[var(--accent-ink)]" />
              {fl.label}
            </span>
          ) : (
            <input
              name={fl.name}
              type={fl.type ?? "text"}
              defaultValue={fl.value == null ? "" : String(fl.value)}
              placeholder={fl.placeholder}
              required={fl.required}
              min={fl.min}
              max={fl.max}
              step={fl.type === "number" ? 1 : undefined}
              className={`${cls} ${fl.type === "number" ? "w-28" : fl.wide ? "w-full" : "w-40"}`}
            />
          )}
        </label>
      ))}
      <button type="submit" className="pill h-10 min-h-0 px-5 text-xs" disabled={pending}>
        {pending ? "…" : submit}
      </button>
      {msg && (
        <span role={msg.ok ? "status" : "alert"} className={`text-xs ${msg.ok ? "text-accent-ink" : "text-danger"}`}>
          {msg.text}
        </span>
      )}
    </form>
  );
}
