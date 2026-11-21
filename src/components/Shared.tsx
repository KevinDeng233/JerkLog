import { type ReactNode } from 'react';

export function PageHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <p className="muted">{children}</p>}
    </header>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}
export function Metrics({
  items,
}: {
  items: { label: string; value: string | number; unit?: string }[];
}) {
  return (
    <div className="metrics">
      {items.map((item) => (
        <div className="metric" key={item.label}>
          <span className="muted">{item.label}</span>
          <strong>
            {item.value}
            <small>{item.unit}</small>
          </strong>
        </div>
      ))}
    </div>
  );
}
