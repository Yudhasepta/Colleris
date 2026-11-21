<?php

namespace App\Models\Concerns;

/**
 * Shared task-derived progress for personal projects and group projects.
 *
 * A project's progress and completed state are always derived from its tasks.
 * The model must expose a `tasks()` relation.
 */
trait DerivesTaskProgress
{
    public function recalculateProgress(): void
    {
        [$total, $completed] = $this->taskStats();

        if ($total === 0) {
            if ($this->status === 'completed') {
                $this->progress = 0;
                $this->status = 'wait';
                if ($this->isDirty(['progress', 'status'])) {
                    $this->save();
                }
            }
            return;
        }

        $progress = (int) floor(($completed / $total) * 100);

        if ($this->status === 'completed') {
            if ($progress >= 100) {
                $this->progress = 100;
            } else {
                $this->progress = $progress;
                $this->status = $progress > 0 ? 'progress' : 'wait';
            }
        } else {
            $this->progress = $progress;
            if ($this->status === 'wait' && $progress > 0) {
                $this->status = 'progress';
            }
        }

        if ($this->isDirty(['progress', 'status'])) {
            $this->save();
        }
    }

    /** Server-validated completion: only when every task is done. */
    public function complete(): bool
    {
        [$total, $completed] = $this->taskStats();
        if ($total === 0) return false;
        if ($completed !== $total) return false;

        $this->progress = 100;
        $this->status = 'completed';
        $this->save();

        return true;
    }

    public function reopen(): void
    {
        if ($this->status !== 'completed') return;

        [$total, $completed] = $this->taskStats();
        $progress = $total > 0 ? (int) floor(($completed / $total) * 100) : 0;

        $this->progress = $progress;
        $this->status = $progress > 0 ? 'progress' : 'wait';
        $this->save();
    }

    /** @return array{0: int, 1: int} */
    protected function taskStats(): array
    {
        if ($this->relationLoaded('tasks')) {
            $tasks = $this->getRelation('tasks');

            return [$tasks->count(), $tasks->where('completed', true)->count()];
        }

        $row = $this->tasks()
            ->reorder()
            ->selectRaw('COUNT(*) as total_count, COALESCE(SUM(completed), 0) as completed_count')
            ->first();

        return [(int) ($row->total_count ?? 0), (int) ($row->completed_count ?? 0)];
    }

    protected function hasTasks(): bool
    {
        return $this->relationLoaded('tasks')
            ? $this->getRelation('tasks')->isNotEmpty()
            : $this->tasks()->exists();
    }
}
