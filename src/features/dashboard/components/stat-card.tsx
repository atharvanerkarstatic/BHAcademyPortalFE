import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  href?: string;
  icon: LucideIcon;
  // background + text color classes
  color: string;
  // comes from your API, shows "—" until available
  value?: number | string | null;
}

export function StatCard({
  label,
  href,
  icon: Icon,
  color,
  value,
}: StatCardProps) {
  const content = (
    <>
      <div className="relative p-4">
        <p className="text-3xl font-bold tracking-tight uppercase sm:text-4xl">
          {value ?? "—"}
        </p>
        <p className="mt-1 text-sm font-medium tracking-wide uppercase opacity-90">
          {label}
        </p>
        <Icon
          className="absolute top-4 right-4 h-14 w-14 opacity-20"
          aria-hidden
        />
      </div>
      {href ? (
        <Link
          href={href}
          className="flex items-center justify-center gap-2 bg-black/10 py-1.5 text-xs font-semibold tracking-wider uppercase transition-colors hover:bg-black/20"
        >
          MORE INFO <ArrowRight className="h-4 w-4" />
        </Link>
      ) : (
        <div className="flex items-center justify-center gap-2 bg-black/10 py-1.5 text-xs font-semibold tracking-wider uppercase opacity-60">
          <span>MORE INFO</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      )}
    </>
  );

  return (
    <div className={cn("overflow-hidden rounded-xl shadow-sm", color)}>
      {content}
    </div>
  );
}
