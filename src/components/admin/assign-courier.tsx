"use client";

import { ActionForm } from "@/components/admin/action-form";
import { assignCourier } from "@/app/admin/modules-actions";

export function AssignCourier({ orderId, courierId, couriers }: { orderId: string; courierId: string | null; couriers: { id: string; name: string }[] }) {
  return (
    <ActionForm
      action={assignCourier}
      hidden={{ orderId }}
      submit="Attribuer"
      fields={[
        {
          name: "courierId",
          label: "Livreur",
          type: "select",
          value: courierId ?? "",
          options: [{ value: "", label: "— Aucun —" }, ...couriers.map((c) => ({ value: c.id, label: c.name }))],
        },
      ]}
    />
  );
}
