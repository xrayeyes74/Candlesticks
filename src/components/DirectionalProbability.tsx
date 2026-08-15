import { useTranslation } from "react-i18next";

interface Props {
  probability: { up: number; down: number; sideways: number };
}

export function DirectionalProbability({ probability }: Props) {
  const { t } = useTranslation();
  const items = [
    { label: t("directional.up"), value: probability.up, color: "bg-bull" },
    { label: t("directional.down"), value: probability.down, color: "bg-bear" },
    { label: t("directional.sideways"), value: probability.sideways, color: "bg-neutral" },
  ];
  return (
    <div className="space-y-1.5">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2 text-xs">
          <span className="w-14 shrink-0 text-muted-foreground">{it.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className={`h-full ${it.color}`} style={{ width: `${Math.round(it.value * 100)}%` }} />
          </div>
          <span className="w-10 shrink-0 text-right tabular">{Math.round(it.value * 100)}%</span>
        </div>
      ))}
    </div>
  );
}
