export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      {eyebrow && (
        <div className="text-xs font-bold tracking-widest uppercase app-gradient-text mb-3">{eyebrow}</div>
      )}
      {title && <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">{title}</h2>}
      {subtitle && <p className="text-[color:var(--ink)]/60 mt-3 max-w-2xl">{subtitle}</p>}
      {children && <div className="mt-10">{children}</div>}
    </section>
  );
}
