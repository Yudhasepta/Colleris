<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Colleris — Project Report: {{ $title }}</title>
  @include('exports._styles')
</head>
<body>
  <div class="page">

    <table class="report-header">
      <tr>
        <td class="brand-cell">
          <div class="wordmark">COLLERIS</div>
          <div class="report-kind">Project Report</div>
        </td>
        <td class="meta-cell">
          <div class="header-meta">Generated {{ $generatedAt }}</div>
        </td>
      </tr>
    </table>

    <h1 class="report-title">{{ $title }}</h1>

    <table class="subtitle-row">
      <tr>
        <td class="grow">
          <span class="chip" style="background: {{ $statusTone['bg'] }}; color: {{ $statusTone['fg'] }};">{{ $statusLabel }}</span>
        </td>
        <td class="end">
          <span class="bar-caption" style="margin-top: 0;">{{ $taskCompleted }} of {{ $taskTotal }} tasks complete</span>
        </td>
      </tr>
    </table>

    <table class="meta-grid">
      <tr>
        <td style="width: 33%;">
          <div class="label">Progress</div>
          <div class="value">{{ $progress }}%</div>
        </td>
        <td style="width: 33%;">
          <div class="label">Due</div>
          <div class="value {{ $due ? '' : 'muted' }}">{{ $due ?: 'No due date' }}</div>
        </td>
        <td style="width: 34%;">
          <div class="label">Tags</div>
          <div class="value {{ $tags ? '' : 'muted' }}">{{ $tags ?: 'General' }}</div>
        </td>
      </tr>
      <tr>
        <td>
          <div class="label">Created</div>
          <div class="value {{ $createdAt ? '' : 'muted' }}">{{ $createdAt ?: '—' }}</div>
        </td>
        <td>
          <div class="label">Updated</div>
          <div class="value {{ $updatedAt ? '' : 'muted' }}">{{ $updatedAt ?: '—' }}</div>
        </td>
        <td>
          <div class="label">Owner</div>
          <div class="value">{{ $ownerName }}<span class="muted"> · {{ $ownerHandle }}</span></div>
        </td>
      </tr>
    </table>

    <div class="bar">
      <div style="width: {{ max(0, min(100, $progress)) }}%;"></div>
    </div>
    <div class="bar-caption">Task-derived progress</div>

    @if($guideText)
      <div class="section">
        <div class="note-box">
          <div class="label">Guide note</div>
          <div class="body">{{ $guideText }}</div>
        </div>
      </div>
    @endif

    <div class="section">
      <table class="section-head">
        <tr>
          <td class="title">Tasks</td>
          <td class="count">{{ $taskCompleted }}/{{ $taskTotal }}</td>
        </tr>
      </table>

      @if(count($tasks) > 0)
        <table class="task-table">
          @foreach($tasks as $i => $task)
            <tr>
              <td class="num">{{ $i + 1 }}</td>
              <td @if($task->completed) class="done" @endif>{{ $task->title }}</td>
              <td class="status @if($task->completed) ok @else idle @endif">
                @if($task->completed) Done @else Pending @endif
              </td>
            </tr>
          @endforeach
        </table>
      @else
        <div class="note-box">
          <div class="body" style="color: #8a8578;">No tasks yet — create tasks to make progress measurable.</div>
        </div>
      @endif
    </div>

    <div class="doc-footer">
      {{ $ownerName }} · {{ $ownerHandle }} · Exported from Colleris · {{ $generatedAt }}
    </div>

  </div>
</body>
</html>
