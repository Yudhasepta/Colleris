<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Colleris — Group Project Report: {{ $title }}</title>
  @include('exports._styles')
</head>
<body>
  <div class="page">

    <table class="report-header">
      <tr>
        <td class="brand-cell">
          <div class="wordmark">COLLERIS</div>
          <div class="report-kind">Group Project Report</div>
        </td>
        <td class="meta-cell">
          <div class="header-meta">Generated {{ $generatedAt }}</div>
        </td>
      </tr>
    </table>

    <!-- Group context -->
    <div class="context-panel">
      <table class="context-head">
        <tr>
          <td class="grow">
            <div class="context-name">{{ $group['name'] }}</div>
            <div class="context-sub">
              {{ $group['typeLabel'] }}
              @if($group['supervisor']) · Supervised by {{ $group['supervisor'] }} @endif
            </div>
          </td>
          <td class="end">
            @if($group['joinCode'])
              <span class="code-box">{{ $group['joinCode'] }}</span>
            @endif
          </td>
        </tr>
      </table>

      <table class="context-head" style="margin-bottom: 0;">
        <tr>
          <td class="grow" style="font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: #8a8578; font-weight: bold;">
            Members — {{ count($group['members']) }}
          </td>
        </tr>
      </table>

      <table class="member-table">
        @foreach($group['members'] as $member)
          <tr>
            <td class="num">{{ $member['initials'] }}</td>
            <td>{{ $member['name'] }}</td>
            <td class="role {{ $member['role'] }}">{{ ucfirst($member['role']) }}</td>
          </tr>
        @endforeach
      </table>
    </div>

    <!-- The exported project -->
    <h1 class="report-title" style="margin-top: 22px;">{{ $title }}</h1>

    <table class="subtitle-row">
      <tr>
        <td class="grow">
          <span class="chip" style="background: {{ $statusTone['bg'] }}; color: {{ $statusTone['fg'] }};">{{ $statusLabel }}</span>
          @if($assignee)
            <span class="chip" style="background: #eceae2; color: #57544a; margin-left: 6px;">Assigned to {{ $assignee }}</span>
          @else
            <span class="chip" style="background: #eceae2; color: #8a8578; margin-left: 6px;">Unassigned</span>
          @endif
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
          <div class="label">Tags</div>
          <div class="value {{ $tags ? '' : 'muted' }}">{{ $tags ?: '—' }}</div>
        </td>
        <td style="width: 34%;">
          <div class="label">Completion</div>
          @if($voteStatus === 'pending')
            <div class="value muted" style="color: #1f6e80;">Vote in progress</div>
          @else
            <div class="value muted">—</div>
          @endif
        </td>
      </tr>
    </table>

    <div class="bar">
      <div style="width: {{ max(0, min(100, $progress)) }}%;"></div>
    </div>
    <div class="bar-caption">Task-derived progress</div>

    @if($voteStatus === 'pending')
      <div class="section">
        <div class="vote-box">
          <div class="label">Completion vote in progress</div>
          <div class="body">{{ $voteApproved }} of {{ $voteTotal }} members approved — unanimous approval is required before the project completes.</div>
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
      Exported by {{ $exportedBy }} · {{ $exportedHandle }} · {{ $group['name'] }} · Generated {{ $generatedAt }}
    </div>

  </div>
</body>
</html>
