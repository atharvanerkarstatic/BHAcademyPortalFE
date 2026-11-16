import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  href?: string;
  icon: LucideIcon;
  color: string; // background + text color classes
  value?: number | string | null; // comes from your API, shows "—" until available
};

export function StatCard({ label, href, icon: Icon, color, value }: StatCardProps) {
  const content = (
    <>
      <div className="relative p-4">
        <p className="text-3xl font-bold tracking-tight sm:text-4xl uppercase">{value ?? "—"}</p>
        <p className="mt-1 text-sm font-medium opacity-90 uppercase tracking-wide">{label}</p>
        <Icon className="absolute right-4 top-4 h-14 w-14 opacity-20" aria-hidden />
      </div>
      {href ? (
        <Link
          href={href}
          className="flex items-center justify-center gap-2 bg-black/10 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-black/20"
        >
          MORE INFO <ArrowRight className="h-4 w-4" />
        </Link>
      ) : (
        <div className="flex items-center justify-center gap-2 bg-black/10 py-1.5 text-xs font-semibold uppercase tracking-wider opacity-60">
          <span>MORE INFO</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      )}
    </>
  );

  return <div className={cn("overflow-hidden rounded-xl shadow-sm", color)}>{content}</div>;
}