import Link from "next/link";

type Crumb = { label: string; href?: string };

export function PageHeader({ title, breadcrumbs }: { title: string; breadcrumbs?: Crumb[] }) {
  return (
    <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>

      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
            {breadcrumbs.map((crumb, i) => (
              <li key={crumb.label} className="flex items-center gap-1.5">
                {i > 0 && <span>/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="text-blue-600 hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
    </div>
  );
}
