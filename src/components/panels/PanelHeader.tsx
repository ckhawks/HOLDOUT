interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function PanelHeader({ title, subtitle, right }: Props) {
  return (
    <div className="flex items-end justify-between border-b border-border/60 px-6 py-4">
      <div>
        <h2 className="font-mono text-sm uppercase tracking-[0.25em] text-foreground">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  );
}
