"use client";

import { useCampaigns } from "@/hooks/use-campaigns";
import { Select } from "@/components/ui/select";

export function CampaignFilter({
  value,
  onChange,
}: {
  value: string | "all";
  onChange: (next: string | "all") => void;
}) {
  const { data: campaigns } = useCampaigns({ status: "all" });

  const options = [
    { value: "all", label: "All campaigns" },
    ...(campaigns ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <Select
      value={value}
      onChange={(v) => onChange(v === "all" ? "all" : v)}
      options={options}
      ariaLabel="Filter by campaign"
    />
  );
}
