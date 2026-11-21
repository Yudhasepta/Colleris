<?php

namespace Database\Seeders;

use App\Models\AdminLog;
use App\Models\Assignment;
use App\Models\Connection;
use App\Models\Feedback;
use App\Models\Group;
use App\Models\GroupInvitation;
use App\Models\GroupProject;
use App\Models\Profile;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\Reminder;
use App\Models\User;
use App\Models\UserNotification;
use App\Models\UserPermission;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed development accounts and reference data.
     *
     * Credentials are for local development only and are documented in the
     * backend README — they are never shown anywhere in the UI.
     */
    public function run(): void
    {
        $reyhan = $this->user('Reyhan N.', 'reyhan@studio.com', 'password', 'user', [
            'handle' => 'RN-1042',
            'initials' => 'RN',
            'visibility' => 'connections',
        ], [
            'project_assignment' => 'request',
            'guide_upload' => 'allow',
            'feedback' => 'allow',
        ]);

        $anita = $this->user('Anita T.', 'anita@studiodesign.com', 'password', 'user', [
            'handle' => 'AT-2201',
            'initials' => 'AT',
            'visibility' => 'everyone',
            'profile_code' => 'X7K9-QP',
            'profile_code_expires_at' => now()->addDays(7),
        ], [
            'project_assignment' => 'allow',
            'guide_upload' => 'allow',
            'feedback' => 'allow',
        ]);

        $budi = $this->user('Budi S.', 'budi@studiodesign.com', 'password', 'user', [
            'handle' => 'BS-0087',
            'initials' => 'BS',
            'visibility' => 'supervisor',
        ], [
            'project_assignment' => 'decline',
            'guide_upload' => 'request',
            'feedback' => 'allow',
        ]);

        $maya = $this->user('Maya K.', 'maya@freelance.io', 'password', 'user', [
            'handle' => 'MK-5510',
            'initials' => 'MK',
            'visibility' => 'everyone',
            'profile_code' => 'H2N4-RT',
            'profile_code_expires_at' => now()->addDays(2),
        ], [
            'project_assignment' => 'request',
            'guide_upload' => 'allow',
            'feedback' => 'request',
        ]);

        $dinda = $this->user('Dinda P.', 'dinda@studiodesign.com', 'password', 'user', [
            'handle' => 'DP-3390',
            'initials' => 'DP',
            'visibility' => 'private',
        ], [
            'project_assignment' => 'decline',
            'guide_upload' => 'decline',
            'feedback' => 'request',
        ]);

        $admin = $this->user('Admin', 'admin@colleris.com', 'password', 'admin', [
            'handle' => 'AD-0001',
            'initials' => 'AD',
            'visibility' => 'private',
            'connections_count' => 0,
        ], [
            'project_assignment' => 'allow',
            'guide_upload' => 'allow',
            'feedback' => 'allow',
        ]);

        // Development seed projects for the primary user.
        $seedProjects = [
            ['user_id' => $reyhan->id, 'title' => 'Client portal redesign', 'status' => 'urgent', 'progress' => 40, 'due' => 'Due today', 'tag' => 'Design'],
            ['user_id' => $reyhan->id, 'title' => 'Q3 marketing report', 'status' => 'progress', 'progress' => 65, 'due' => 'Due in 3 days', 'tag' => 'Docs'],
            ['user_id' => $reyhan->id, 'title' => 'Mobile app onboarding flow', 'status' => 'wait', 'progress' => 0, 'due' => 'Not started', 'tag' => 'Product'],
            ['user_id' => $reyhan->id, 'title' => 'Website performance audit', 'status' => 'completed', 'progress' => 100, 'due' => 'Finished Tuesday', 'tag' => 'Engineering'],
            ['user_id' => $reyhan->id, 'title' => 'Team offsite planning', 'status' => 'progress', 'progress' => 25, 'due' => 'Due next week', 'tag' => 'Ops'],
        ];

        foreach ($seedProjects as $p) {
            $this->project($p['user_id'], $p['title'], $p['status'], $p['progress'], $p['due'], $p['tag']);
        }

        // A couple of projects for the second test user.
        $this->project($anita->id, 'Season launch deck', 'progress', 55, 'Due Friday', 'Design');
        $this->project($anita->id, 'Invoice automation', 'wait', 0, 'Not started', 'Ops');

        $this->connection($reyhan->id, $anita->id);
        $this->connection($anita->id, $reyhan->id);
        $this->connection($reyhan->id, $maya->id);
        $this->connection($maya->id, $reyhan->id);

        // Groups — identify by owner + name so reseeding updates in place.
        $studio = Group::updateOrCreate(
            ['owner_id' => $reyhan->id, 'name' => 'Design Studio'],
            ['has_supervisor' => true, 'supervisor_id' => $anita->id],
        );
        $this->joinCode($studio, 'DS-7F4Q');
        $studio->members()->sync([$reyhan->id, $anita->id, $budi->id, $maya->id, $dinda->id]);

        $brandDeck = $this->groupProject($studio->id, $budi->id, 'Brand deck for pitch', 'urgent', 55);
        $iconSet = $this->groupProject($studio->id, $maya->id, 'Icon set revisions', 'progress', 70);

        $pool = Group::updateOrCreate(
            ['owner_id' => $reyhan->id, 'name' => 'Freelance Pool'],
            ['has_supervisor' => false, 'supervisor_id' => null],
        );
        $this->joinCode($pool, 'FP-2B9M');
        $pool->members()->sync([$reyhan->id, $maya->id]);

        $landingCopy = $this->groupProject($pool->id, $reyhan->id, 'Landing page copy', 'wait', 0);

        // Collaboration reference rows (idempotent).
        GroupInvitation::updateOrCreate(
            ['group_id' => $studio->id, 'invitee_id' => $dinda->id],
            ['inviter_id' => $reyhan->id, 'status' => 'pending'],
        );

        Assignment::updateOrCreate(
            ['group_id' => $studio->id, 'requester_id' => $reyhan->id, 'recipient_id' => $budi->id, 'title' => 'Photography moodboard'],
            ['status' => 'pending'],
        );

        $seedReminder = Reminder::updateOrCreate(
            ['sender_id' => $anita->id, 'recipient_id' => $reyhan->id, 'message' => 'Please update the client portal deck today.'],
            [],
        );
        $this->notification($reyhan->id, 'reminder', $anita->id, [
            'reminder_id' => $seedReminder->id,
            'message' => $seedReminder->message,
            'detail' => 'Anita T. sent you a reminder.',
        ]);

        // Sample feedback — Maya gives Reyhan constructive notes on project progress
        Feedback::updateOrCreate(
            ['sender_id' => $maya->id, 'recipient_id' => $reyhan->id, 'message' => 'The branding deck is shaping up well, but the typography choices feel inconsistent across slides 3–7.'],
            [],
        );
        Feedback::updateOrCreate(
            ['sender_id' => $anita->id, 'recipient_id' => $reyhan->id, 'message' => 'Great work on the Onboarding v2 copy — one note: the CTA button text could be more action-oriented.'],
            [],
        );

        // Seed tasks for demo projects — derived progress demonstration (idempotent)
        $this->seedProjectTasks($reyhan->id);
        $this->seedGroupProjectTasks($brandDeck, $iconSet, $landingCopy);

        // Recompute denormalised connection counts from actual rows.
        // Each user stores outgoing edges; the symmetric row uses to_user_id.
        foreach (User::with('profile')->get() as $u) {
            $count = Connection::where('from_user_id', $u->id)->count();
            $u->profile?->update(['connections_count' => $count]);
        }

        $this->adminLog($admin, 'info', 'Database seeded', 'development seed');
        $this->adminLog($admin, 'success', 'Auth scaffold ready', 'sanctum tokens');
        $this->adminLog($admin, 'success', 'Collaboration scaffold ready', 'groups / assignments / reminders');
    }

    /**
     * Create (or update) a development user by email. Idempotent: re-running
     * the seeder must not throw on unique-email constraints, and must always
     * store a valid bcrypt hash so Hash::check() works on every account.
     */
    private function user(string $name, string $email, string $plainPassword, string $role, array $profile, array $permissions): User
    {
        $onlyHashIfMissing = User::where('email', $email)->value('password');
        // Only rewrite the password when it is absent or not a valid bcrypt
        // hash (e.g. a stray plaintext value) — never blindly rotate a good one.
        $needsHash = empty($onlyHashIfMissing) || ! password_verify($plainPassword, $onlyHashIfMissing);

        $user = User::updateOrCreate(
            ['email' => $email],
            array_merge([
                'name' => $name,
                'password' => $needsHash ? Hash::make($plainPassword) : $onlyHashIfMissing,
                'role' => $role,
                'theme_mode' => 'dark',
                'theme_preset' => 'default',
            ]),
        );

        Profile::updateOrCreate(['user_id' => $user->id], $profile);
        UserPermission::updateOrCreate(['user_id' => $user->id], $permissions);

        return $user;
    }

    private function project(int $userId, string $title, string $status, int $progress, string $due, string $tag): void
    {
        Project::updateOrCreate(
            ['user_id' => $userId, 'title' => $title],
            ['status' => $status, 'progress' => $progress, 'due' => $due, 'tag' => $tag],
        );
    }

    private function connection(int $from, int $to): void
    {
        Connection::updateOrCreate(['from_user_id' => $from, 'to_user_id' => $to], []);
    }

    private function groupProject(int $groupId, int $assigner, string $title, string $status, int $progress): GroupProject
    {
        return GroupProject::updateOrCreate(
            ['group_id' => $groupId, 'assigned_user_id' => $assigner, 'title' => $title],
            ['status' => $status, 'progress' => $progress],
        );
    }

    private function seedProjectTasks(int $reyhanId): void
    {
        $projects = Project::where('user_id', $reyhanId)->get()->keyBy('title');
        $plans = [
            'Client portal redesign' => [
                ['Draft wireframes', true, 0],
                ['Build component library', false, 1],
                ['Client review', false, 2],
                ['Final delivery', false, 3],
            ],
            'Q3 marketing report' => [
                ['Gather metrics', true, 0],
                ['Write draft', true, 1],
                ['Design charts', false, 2],
            ],
            'Mobile app onboarding flow' => [
                ['Research flows', false, 0],
                ['Sketch concepts', false, 1],
            ],
            // 'Website performance audit' is completed — leave zero tasks to show completed state without tasks (or could add completed tasks)
            'Team offsite planning' => [
                ['Book venue', true, 0],
                ['Send invites', false, 1],
                ['Plan agenda', false, 2],
            ],
        ];
        foreach ($plans as $title => $tasks) {
            $project = $projects->get($title);
            if (!$project) continue;
            foreach ($tasks as [$tTitle, $completed, $pos]) {
                ProjectTask::updateOrCreate(
                    ['project_id' => $project->id, 'title' => $tTitle],
                    ['completed' => $completed, 'position' => $pos, 'group_project_id' => null]
                );
            }
            $project->recalculateProgress();
        }
    }

    private function seedGroupProjectTasks(?GroupProject $brandDeck, ?GroupProject $iconSet, ?GroupProject $landingCopy): void
    {
        if ($brandDeck) {
            foreach ([['Moodboard', true, 0], ['Logo draft', false, 1], ['Deck final', false, 2]] as [$t, $c, $p]) {
                ProjectTask::updateOrCreate(['group_project_id' => $brandDeck->id, 'title' => $t], ['completed' => $c, 'position' => $p, 'project_id' => null]);
            }
            $brandDeck->recalculateProgress();
        }
        if ($iconSet) {
            foreach ([['Icon audit', true, 0], ['Redesign set', false, 1]] as [$t, $c, $p]) {
                ProjectTask::updateOrCreate(['group_project_id' => $iconSet->id, 'title' => $t], ['completed' => $c, 'position' => $p, 'project_id' => null]);
            }
            $iconSet->recalculateProgress();
        }
        if ($landingCopy) {
            ProjectTask::updateOrCreate(['group_project_id' => $landingCopy->id, 'title' => 'Copy draft'], ['completed' => false, 'position' => 0, 'project_id' => null]);
            $landingCopy->recalculateProgress();
        }
    }

    private function adminLog(User $user, string $type, string $message, string $detail): void
    {
        AdminLog::updateOrCreate(
            ['message' => $message, 'user_id' => $user->id],
            ['type' => $type, 'detail' => $detail],
        );
    }

    /** Backfill a stable join code for a seeded group without overwriting it. */
    private function joinCode(Group $group, string $code): void
    {
        if ($group->join_code === null) {
            $group->update(['join_code' => $code]);
        }
    }

    private function notification(int $userId, string $type, int $actorId, array $payload): void
    {
        $exists = UserNotification::where('user_id', $userId)
            ->where('type', $type)
            ->where('actor_id', $actorId)
            ->whereJsonContains('payload', $payload)
            ->exists();

        if (! $exists) {
            UserNotification::create([
                'user_id' => $userId,
                'type' => $type,
                'actor_id' => $actorId,
                'payload' => $payload,
            ]);
        }
    }
}