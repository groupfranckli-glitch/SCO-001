"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

type Result = { ok: true } | { ok: false; error: string };
type Extra = {
  name: string;
  label: string;
  type?: "text" | "color" | "date" | "select";
  value?: string;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
};

const MAX_SIDE = 1800;
const cls = "h-10 rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-ink";

/** Réduit la photo dans le navigateur (1800 px max, WebP) : envoi rapide en 3G/4G et jamais au-dessus de la limite serveur. */
async function shrink(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/webp", 0.86));
    return blob && blob.size < file.size ? new File([blob], "image.webp", { type: "image/webp" }) : file;
  } catch {
    return file;
  }
}

/** Téléversement d'image : aperçu de l'image actuelle, choix du fichier, champs associés, retrait. Le serveur revérifie tout. */
export function ImageUpload({
  action,
  hidden = {},
  extra = [],
  current,
  currentBg,
  submit = "Téléverser",
  onRemove,
  resetOnSuccess = false,
}: {
  action: (fd: FormData) => Promise<Result>;
  hidden?: Record<string, string>;
  extra?: Extra[];
  current?: string | null;
  currentBg?: string;
  submit?: string;
  onRemove?: { action: (input: unknown) => Promise<Result>; payload: Record<string, unknown>; label?: string };
  resetOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [name, setName] = useState("");
  const input = useRef<HTMLInputElement>(null);

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        const file = f.get("file");
        setMsg(null);
        if (!(file instanceof File) || file.size === 0) return setMsg({ ok: false, text: "Choisissez une image." });
        start(async () => {
          f.set("file", await shrink(file));
          for (const [k, v] of Object.entries(hidden)) f.set(k, v);
          const r = await action(f);
          if (r.ok) {
            setMsg({ ok: true, text: "Image enregistrée" });
            setName("");
            if (resetOnSuccess) form.reset();
            else if (input.current) input.current.value = "";
            router.refresh();
          } else setMsg({ ok: false, text: r.error });
        });
      }}
    >
      {current && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current} alt="Image actuelle" className="h-16 w-16 rounded-xl border border-line object-contain" style={{ background: currentBg ?? "#fff" }} />
      )}
      <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-ink-soft">
        Image (JPEG, PNG, WebP)
        <span className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-dashed border-line bg-surface px-3 text-sm normal-case tracking-normal text-ink">
          {name || "Choisir un fichier…"}
          <input
            ref={input}
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            onChange={(e) => setName(e.target.files?.[0]?.name ?? "")}
          />
        </span>
      </label>
      {extra.map((x) => (
        <label key={x.name} className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-ink-soft">
          {x.label}
          {x.type === "select" ? (
            <select name={x.name} defaultValue={x.value} className={cls}>
              {x.options?.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <input
              name={x.name}
              type={x.type ?? "text"}
              defaultValue={x.value}
              placeholder={x.placeholder}
              required={x.required}
              className={x.type === "color" ? "h-10 w-14 cursor-pointer rounded-xl border border-line bg-surface p-1" : cls}
            />
          )}
        </label>
      ))}
      <button type="submit" disabled={pending} className="pill h-10 min-h-0 px-5 text-xs disabled:opacity-60">
        {pending ? "Envoi…" : submit}
      </button>
      {onRemove && current && (
        <button
          type="button"
          disabled={pending}
          className="h-10 rounded-full border border-line px-4 text-sm hover:bg-muted disabled:opacity-60"
          onClick={() =>
            start(async () => {
              const r = await onRemove.action(onRemove.payload);
              setMsg(r.ok ? { ok: true, text: "Image retirée" } : { ok: false, text: r.error });
              if (r.ok) router.refresh();
            })
          }
        >
          {onRemove.label ?? "Retirer"}
        </button>
      )}
      {msg && (
        <span role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>
          {msg.text}
        </span>
      )}
    </form>
  );
}
