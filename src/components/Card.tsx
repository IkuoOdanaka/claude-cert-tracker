import type { ComponentProps } from "react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-card border border-line bg-surface ${className}`.trim()}
      {...props}
    />
  );
}

export function CardBody({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`p-5 ${className}`.trim()} {...props} />;
}
