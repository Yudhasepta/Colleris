<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; font-size: 11px; line-height: 1.45; color: #1a1a17; background: #ffffff; }
  .page { padding: 40px 48px 84px; }

  .report-header { width: 100%; border-collapse: collapse; border-bottom: 2px solid #edc025; }
  .report-header td { padding-bottom: 12px; vertical-align: bottom; }
  .report-header .brand-cell { text-align: left; }
  .report-header .meta-cell { text-align: right; }
  .wordmark { font-size: 17px; font-weight: bold; letter-spacing: 0.22em; color: #0b0b0a; }
  .report-kind { font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: #6f6b60; margin-top: 5px; }
  .header-meta { font-size: 9px; color: #6f6b60; }

  h1.report-title { font-size: 20px; font-weight: bold; color: #0b0b0a; margin: 18px 0 8px; }
  .subtitle-row { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .subtitle-row td { vertical-align: middle; }
  .subtitle-row .grow { text-align: left; }
  .subtitle-row .end { text-align: right; white-space: nowrap; }

  .chip { display: inline-block; border-radius: 999px; padding: 2px 10px; font-size: 9.5px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; }
  .code-box { display: inline-block; border: 1px dashed #edc025; border-radius: 6px; padding: 3px 10px; font-family: 'Courier New', Courier, monospace; font-size: 11px; letter-spacing: 0.12em; color: #0b0b0a; background: #fffdf4; }

  .meta-grid { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e5e2d9; border-radius: 8px; margin-bottom: 14px; }
  .meta-grid td { padding: 9px 12px; border-bottom: 1px solid #eceae2; }
  .meta-grid .label { font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; color: #8a8578; margin-bottom: 2px; }
  .meta-grid .value { font-size: 11.5px; font-weight: bold; color: #0b0b0a; }
  .meta-grid .muted { color: #8a8578; font-weight: normal; }

  .bar { background: #eceae2; border-radius: 4px; height: 9px; width: 100%; overflow: hidden; }
  .bar > div { background: #edc025; height: 9px; }
  .bar-caption { font-size: 9.5px; color: #6f6b60; margin-top: 5px; }

  .section { margin-top: 18px; }
  .section-head { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  .section-head td { vertical-align: baseline; }
  .section-head .title { font-size: 9px; font-weight: bold; letter-spacing: 0.14em; text-transform: uppercase; color: #6f6b60; }
  .section-head .count { text-align: right; font-family: 'Courier New', Courier, monospace; font-size: 9.5px; color: #8a8578; }

  .task-table { width: 100%; border-collapse: collapse; }
  .task-table td { padding: 7px 6px; border-bottom: 1px solid #eceae2; vertical-align: top; }
  .task-table .num { width: 26px; font-family: 'Courier New', Courier, monospace; font-size: 9.5px; color: #8a8578; }
  .task-table .done { color: #8a8578; text-decoration: line-through; }
  .task-table .status { width: 74px; text-align: right; font-size: 9px; font-weight: bold; letter-spacing: 0.08em; }
  .task-table .status.ok { color: #2e7d5d; }
  .task-table .status.idle { color: #8a8578; }

  .note-box { border: 1px solid #e5e2d9; border-radius: 8px; background: #f7f6f2; padding: 11px 13px; }
  .note-box .label { font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; color: #8a8578; margin-bottom: 5px; }
  .note-box .body { font-size: 11px; color: #3d3a33; white-space: pre-wrap; }

  .context-panel { border: 1px solid #e5e2d9; border-radius: 8px; background: #f7f6f2; padding: 13px 14px; margin-bottom: 4px; }
  .context-head { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  .context-head td { vertical-align: middle; }
  .context-head .grow { text-align: left; }
  .context-head .end { text-align: right; white-space: nowrap; }
  .context-name { font-size: 14px; font-weight: bold; color: #0b0b0a; }
  .context-sub { font-size: 9.5px; color: #6f6b60; margin-top: 3px; }

  .member-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  .member-table td { padding: 6px 8px; border-bottom: 1px solid #eceae2; }
  .member-table .num { width: 26px; font-family: 'Courier New', Courier, monospace; font-size: 9px; color: #8a8578; }
  .member-table .role { width: 84px; text-align: right; font-size: 8.5px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; }
  .member-table .role.owner { color: #9c5a1a; }
  .member-table .role.supervisor { color: #1f6e80; }
  .member-table .role.member { color: #8a8578; }

  .vote-box { border: 1px solid #d8ecf2; border-left: 3px solid #4fb8cc; border-radius: 6px; background: #f2fafc; padding: 10px 12px; }
  .vote-box .label { font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; color: #1f6e80; font-weight: bold; margin-bottom: 3px; }
  .vote-box .body { font-size: 10.5px; color: #3d3a33; }

  .doc-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 9px 48px; border-top: 1px solid #eceae2; font-size: 8.5px; color: #8a8578; background: #ffffff; }
</style>
