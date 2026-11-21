import { cn } from "@/lib/utils";

export function StatusText({ active }: { active: boolean }) {
  return (
    <span
      className={cn("font-medium", active ? "text-green-600" : "text-red-600")}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}
