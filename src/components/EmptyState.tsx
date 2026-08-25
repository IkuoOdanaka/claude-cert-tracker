import type { ReactNode } from "react";

/** 何も無い状態は「壊れている」ように見えやすいので、次にやることを必ず添える */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-line-strong px-6 py-10 text-center">
      <p className="text-base font-medium text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-prose text-sm text-ink-muted">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
