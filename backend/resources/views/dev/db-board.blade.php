<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{ $title }}</title>
<style>
  :root { --ink:#1f1c17; --mut:#8a8175; --line:#e7e0d5; --accent:#edc025; --bg:#faf7f2; --card:#fff; }
  * { box-sizing: border-box; }
  body { font: 14px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Inter, Arial, sans-serif; margin:0; background:var(--bg); color:var(--ink); }
  header { background:#1f1c17; color:#fff; padding:14px 24px; position:sticky; top:0; z-index:10; display:flex; align-items:baseline; gap:18px; }
  header h1 { font-size:16px; margin:0; letter-spacing:.2px; }
  header a { color:var(--accent); text-decoration:none; font-size:13px; }
  header a:hover { text-decoration:underline; }
  header .env { color:#9c9488; font-size:12px; margin-left:auto; font-family: ui-monospace, SFMono-Regular, "JetBrains Mono", Consolas, monospace; }
  main { padding:24px; max-width:1200px; margin:0 auto; }
  .notice { background:#fff8e1; border:1px solid #f0dc9b; color:#6b5700; border-radius:10px; padding:10px 14px; font-size:13px; margin:0 0 18px; }
  .section { margin:28px 0 10px; font-size:15px; font-weight:600; display:flex; align-items:baseline; gap:10px; }
  .section small { color:var(--mut); font-weight:400; }
  .cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:12px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:12px 14px; }
  .card b { display:block; font-size:22px; letter-spacing:.3px; }
  .card span { color:var(--mut); font-size:12px; }
  table { width:100%; border-collapse:collapse; background:var(--card); border:1px solid var(--line); border-radius:10px; overflow:hidden; font-size:13px; }
  th, td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { background:#f0eae0; font-weight:600; white-space:nowrap; }
  tr:last-child td { border-bottom:none; }
  .mono, code, .env { font-family: ui-monospace, SFMono-Regular, "JetBrains Mono", Consolas, monospace; font-size:12px; }
  .null { color:var(--mut); font-style:italic; }
  a.table { font-weight:500; color:var(--ink); text-decoration:none; }
  a.table:hover { text-decoration:underline; }
  .rowcount { color:var(--mut); font-size:12px; margin-left:8px; }
  .badge { display:inline-block; padding:1px 8px; border-radius:999px; font-size:11px; font-weight:600; }
  .badge.ok { background:#e6f4ee; color:#1d7a58; }
  .badge.down { background:#fdece8; color:#c0392b; }
  .pill { display:inline-block; padding:1px 8px; border-radius:999px; font-size:11px; background:#f0eae0; color:#5f574a; }
  .admin-json a { color:var(--accent); background:#1f1c17; text-decoration:none; border-radius:8px; padding:6px 12px; font-size:12px; font-weight:600; }
  .admin-json a:hover { background:#000; }
  .pager { margin-top:10px; color:var(--mut); font-size:13px; display:flex; gap:14px; align-items:center; }
  .pager input { width:70px; padding:4px 8px; border:1px solid var(--line); border-radius:6px; font:inherit; font-size:13px; }
  .empty { color:var(--mut); padding:16px; text-align:center; background:var(--card); border:1px solid var(--line); border-radius:10px; }
</style>
</head>
<body>
<header>
  <h1>Dev DB Board</h1>
  <a href="/db">Tables</a>
  <span class="env">{{ config('database.connections.'.config('database.default').'.database') }} &middot; {{ app()->environment() }} &middot; <a href="/api/health" style="color:#9c9488">health</a></span>
</header>
<main>
  <div class="notice">Local dev only &middot; read-only &middot; hidden in non-local environments.</div>

  @if (isset($overview))
    <div class="section">Overview</div>
    <div class="cards">
      @foreach ($overview as $label => $value)
        <div class="card"><b>{{ $value }}</b><span>{{ $label }}</span></div>
      @endforeach
    </div>

    <div class="section">Status <small>from AdminController::status</small></div>
    <table>
      <tr><th>Check</th><th>State</th><th>Detail</th></tr>
      @foreach ($status as $row)
        <tr>
          <td>{{ $row['label'] }}</td>
          <td><span class="badge {{ $row['ok'] ? 'ok' : 'down' }}">{{ $row['ok'] ? 'OK' : 'DOWN' }}</span></td>
          <td class="mono">{{ $row['meta'] }} @if(!empty($row['detail']))<br>{{ $row['detail'] }}@endif</td>
        </tr>
      @endforeach
    </table>

    <div class="section">Admin routes <small>same JSON as the API, no auth on this dev board</small></div>
    <div class="admin-json" style="display:flex; gap:10px; flex-wrap:wrap;">
      @foreach (['overview', 'users', 'logs', 'status'] as $endpoint)
        <a href="/db/admin/{{ $endpoint }}">/db/admin/{{ $endpoint }} (JSON)</a>
      @endforeach
    </div>

    <div class="section">Users <small>from AdminController::users</small></div>
    <table>
      <tr><th>ID</th><th>Name</th><th>Initials</th><th>User ID</th><th>Email</th><th>Role</th><th>Visibility</th><th>Conn.</th><th>Projects</th><th>Created</th></tr>
      @forelse ($users as $u)
        <tr>
          <td class="mono">{{ $u['id'] }}</td>
          <td>{{ $u['name'] }}</td>
          <td class="mono">{{ $u['initials'] }}</td>
          <td class="mono">{{ $u['userId'] }}</td>
          <td class="mono">{{ $u['email'] }}</td>
          <td><span class="pill">{{ $u['role'] }}</span></td>
          <td>{{ $u['visibility'] }}</td>
          <td class="mono">{{ $u['connections'] }}</td>
          <td class="mono">{{ $u['projects'] }}</td>
          <td class="mono">{{ $u['createdAt'] }}</td>
        </tr>
      @empty
        <tr><td colspan="10" class="empty">No users.</td></tr>
      @endforelse
    </table>

    <div class="section">Admin logs <small>from AdminController::logs</small></div>
    <table>
      <tr><th>ID</th><th>Type</th><th>Message</th><th>Detail</th><th>User</th><th>Time</th></tr>
      @forelse ($logs as $log)
        <tr>
          <td class="mono">{{ $log['id'] }}</td>
          <td><span class="pill">{{ $log['type'] }}</span></td>
          <td>{{ $log['message'] }}</td>
          <td>{{ $log['detail'] }}</td>
          <td>{{ $log['user'] }}</td>
          <td class="mono">{{ $log['time'] ? date('Y-m-d H:i:s', $log['time'] / 1000) : '—' }}</td>
        </tr>
      @empty
        <tr><td colspan="6" class="empty">No logs.</td></tr>
      @endforelse
    </table>

    <div class="section">Tables <small>all of {{ config('database.connections.'.config('database.default').'.database') }}</small></div>
    <table>
      <tr><th>Table</th><th>Rows</th></tr>
      @forelse ($tables as $t)
        <tr>
          <td><a class="table" href="/db/{{ $t['name'] }}">{{ $t['name'] }}</a></td>
          <td class="mono">{{ $t['count'] }}</td>
        </tr>
      @empty
        <tr><td colspan="2" class="empty">No tables.</td></tr>
      @endforelse
    </table>
  @endif

  @isset ($tableName)
    <div class="section">
      <a href="/db" style="color:var(--accent); text-decoration:none; font-weight:600;">&larr; all tables</a>
      &nbsp;::&nbsp; {{ $tableName }} <small>showing {{ $rows->count() }} of {{ $rowCount }} rows</small>
    </div>
    <table>
      <tr>
        @foreach ($columns as $col)
          <th class="mono">{{ $col }}</th>
        @endforeach
      </tr>
      @forelse ($rows as $row)
        <tr>
          @foreach ($columns as $col)
            <td class="mono">{!! \App\Http\Controllers\DevDbController::cell($row[$col] ?? null) !!}</td>
          @endforeach
        </tr>
      @empty
        <tr><td colspan="{{ count($columns) }}" class="empty">No rows.</td></tr>
      @endforelse
    </table>
    <form class="pager" method="get">
      <label>Limit <input type="number" name="limit" min="1" max="200" value="{{ $limit }}"></label>
      <button type="submit" style="padding:5px 12px; border:1px solid var(--line); border-radius:6px; background:var(--card); cursor:pointer; font:inherit; font-size:13px;">Reload</button>
      <span><a href="/db/{{ $tableName }}?limit=200" style="color:var(--accent)">max 200</a></span>
    </form>
  @endisset
</main>
</body>
</html>