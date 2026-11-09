import type { Metadata } from "next";
import { AdminPage, Title, card } from "@/components/admin/page-shell";
import { ActionForm } from "@/components/admin/action-form";
import { setRole } from "@/app/admin/modules-actions";
import { emailMap } from "@/lib/admin-users";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Équipe" };
const ROLE: Record<string, string> = { admin: "Administrateur", courier: "Livreur" };

async function Content() {
  const supabase = await createClient();
  const [{ data: team }, emails] = await Promise.all([
    supabase.from("profiles").select("id,full_name,role").in("role", ["admin", "courier"]).order("role"),
    emailMap(),
  ]);
  return (
    <>
      <Title hint="La personne doit d'abord créer son compte sur le site. Toute modification de rôle est inscrite au journal.">Équipe</Title>
      <div className={`${card} mt-8 p-5`}>
        <ActionForm
          action={setRole}
          submit="Appliquer"
          resetOnSuccess
          fields={[
            { name: "email", label: "E-mail du compte", type: "email", required: true, wide: true },
            { name: "role", label: "Rôle", type: "select", options: [{ value: "courier", label: "Livreur" }, { value: "admin", label: "Administrateur" }, { value: "customer", label: "Client (retirer l'accès)" }] },
          ]}
        />
      </div>
      <ul className={`${card} mt-6 divide-y divide-line text-sm`} data-testid="team">
        {(team ?? []).map((m) => (
          <li key={m.id as string} className="flex justify-between gap-3 px-5 py-3">
            <span>{(m.full_name as string) || emails.get(m.id as string) || "Sans nom"} <span className="text-xs text-ink-soft">{emails.get(m.id as string) ?? ""}</span></span>
            <span className="text-accent-ink">{ROLE[m.role as string]}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function Page() {
  return (
    <AdminPage>
      <Content />
    </AdminPage>
  );
}
