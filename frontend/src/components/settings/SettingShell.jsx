// Editorial settings row: numbered section marker + label + description on the
// left, the actual control(s) on the right. Shared by every settings section so
// the whole page reads as a numbered editorial list rather than a plain stack.
export default function SettingShell({ num, title, description, children, right }) {
  return (
    <section className="px-5 py-4 flex flex-col md:flex-row gap-2.5 md:gap-6">
      <div className="md:w-48 lg:w-56 shrink-0 flex items-start gap-2.5">
        <span className="font-mono text-[10px] text-textMuted w-3.5 flex-shrink-0 mt-[3px] leading-none">{num}</span>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-textMuted font-semibold">{title}</div>
          {description && <p className="text-[12px] text-textMuted mt-1">{description}</p>}
        </div>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </section>
  )
}
