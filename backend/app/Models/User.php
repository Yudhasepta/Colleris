<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'role', 'theme_mode', 'theme_preset'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function initials(): string
    {
        return $this->profile?->initials
            ?? strtoupper(substr(trim($this->name), 0, 1));
    }

    public function profile(): HasOne
    {
        return $this->hasOne(Profile::class);
    }

    public function permissions(): HasOne
    {
        return $this->hasOne(UserPermission::class);
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    public function connections(): HasMany
    {
        return $this->hasMany(Connection::class, 'from_user_id');
    }

    public function connectedUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'connections', 'from_user_id', 'to_user_id');
    }

    public function ownedGroups(): HasMany
    {
        return $this->hasMany(Group::class, 'owner_id');
    }

    public function supervisedGroups(): HasMany
    {
        return $this->hasMany(Group::class, 'supervisor_id');
    }

    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(Group::class, 'group_members');
    }

    public function sentInvitations(): HasMany
    {
        return $this->hasMany(GroupInvitation::class, 'inviter_id');
    }

    public function receivedInvitations(): HasMany
    {
        return $this->hasMany(GroupInvitation::class, 'invitee_id');
    }

    public function assignmentsRequested(): HasMany
    {
        return $this->hasMany(Assignment::class, 'requester_id');
    }

    public function assignmentsReceived(): HasMany
    {
        return $this->hasMany(Assignment::class, 'recipient_id');
    }

    public function userNotifications(): HasMany
    {
        return $this->hasMany(UserNotification::class, 'user_id');
    }

    public function remindersSent(): HasMany
    {
        return $this->hasMany(Reminder::class, 'sender_id');
    }

    public function remindersReceived(): HasMany
    {
        return $this->hasMany(Reminder::class, 'recipient_id');
    }

    public function adminLogs(): HasMany
    {
        return $this->hasMany(AdminLog::class);
    }

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}