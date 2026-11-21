export default function PageHeader({ index, title, description, meta, actions, atmosphere = false }) {
  return (
    <header className={`mb-6 ${atmosphere ? 'page-atmosphere' : ''}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="font-mono text-[11px] tracking-[0.18em] text-accent-gradient font-medium">{index}</span>
            <span className="h-px w-7 bg-border" />
          </div>
          <h1 className="font-display text-accent-gradient text-[22px] md:text-[26px] font-bold tracking-tight leading-[1.1]">{title}</h1>
          {description && <p className="text-textMuted text-[13px] mt-2 max-w-[60ch] leading-relaxed">{description}</p>}
          {meta && <div className="flex items-center gap-2 mt-3 flex-wrap">{meta}</div>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0 pt-1">{actions}</div>}
      </div>
      <div className="mt-5 border-t border-border" />
    </header>
  )
}
