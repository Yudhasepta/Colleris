<?php

namespace Tests\Feature;

use App\Models\Group;
use App\Models\Reminder;
use App\Models\User;
use Tests\TestCase;

class ReminderValidationTest extends TestCase
{
    private function makeUsers(): array
    {
        $sender = User::factory()->create(['email' => 'rem-sender@test.com']);
        $recipient = User::factory()->create(['email' => 'rem-recipient@test.com']);
        $other = User::factory()->create(['email' => 'rem-other@test.com']);
        foreach ([$sender, $recipient, $other] as $u) {
            \App\Models\Profile::firstOrCreate(['user_id' => $u->id], [
                'handle' => strtoupper(substr($u->email, 0, 2)) . '-RM-' . $u->id,
                'initials' => 'RM',
                'visibility' => 'everyone',
            ]);
        }
        \App\Models\UserPermission::firstOrCreate(['user_id' => $sender->id], ['project_assignment' => 'allow']);
        \App\Models\UserPermission::firstOrCreate(['user_id' => $recipient->id], ['project_assignment' => 'request']);
        \App\Models\UserPermission::firstOrCreate(['user_id' => $other->id], ['project_assignment' => 'request']);
        return [$sender, $recipient, $other];
    }

    public function test_send_reminder_to_connection_succeeds(): void
    {
        [$sender, $recipient, ] = $this->makeUsers();
        // Create symmetric connection
        \App\Models\Connection::updateOrCreate(['from_user_id' => $sender->id, 'to_user_id' => $recipient->id], []);
        \App\Models\Connection::updateOrCreate(['from_user_id' => $recipient->id, 'to_user_id' => $sender->id], []);

        $this->actingAs($sender);
        $response = $this->postJson("/api/reminders/{$recipient->id}", [
            'message' => 'Please check the report.',
        ]);
        $response->assertStatus(201);
        $this->assertDatabaseHas('reminders', [
            'sender_id' => $sender->id,
            'recipient_id' => $recipient->id,
            'message' => 'Please check the report.',
        ]);
    }

    public function test_send_reminder_to_non_connection_fails(): void
    {
        [$sender, , $other] = $this->makeUsers();
        $this->actingAs($sender);

        $response = $this->postJson("/api/reminders/{$other->id}", [
            'message' => 'Hello stranger.',
        ]);
        $response->assertStatus(403);
    }

    public function test_send_reminder_validates_group_belongs_to_recipient(): void
    {
        [$sender, $recipient, ] = $this->makeUsers();
        \App\Models\Connection::updateOrCreate(['from_user_id' => $sender->id, 'to_user_id' => $recipient->id], []);
        \App\Models\Connection::updateOrCreate(['from_user_id' => $recipient->id, 'to_user_id' => $sender->id], []);

        // Create a group that recipient does NOT belong to
        $otherUser = User::factory()->create();
        \App\Models\Profile::firstOrCreate(['user_id' => $otherUser->id], ['handle' => 'XX-9999', 'initials' => 'XX', 'visibility' => 'everyone']);
        $group = Group::create([
            'owner_id' => $otherUser->id,
            'name' => 'Unauthorized group',
            'has_supervisor' => false,
            'join_code' => 'AUTH-01',
            'join_code_expires_at' => now()->addDays(7),
        ]);

        $this->actingAs($sender);
        $response = $this->postJson("/api/reminders/{$recipient->id}", [
            'message' => 'Check this group.',
            'group_id' => $group->id,
        ]);
        $response->assertStatus(422)
            ->assertJsonPath('message', 'The recipient is not a member of the specified group.');
    }

    public function test_send_reminder_with_valid_group_succeeds(): void
    {
        [$sender, $recipient, ] = $this->makeUsers();
        \App\Models\Connection::updateOrCreate(['from_user_id' => $sender->id, 'to_user_id' => $recipient->id], []);
        \App\Models\Connection::updateOrCreate(['from_user_id' => $recipient->id, 'to_user_id' => $sender->id], []);

        $group = Group::create([
            'owner_id' => $sender->id,
            'name' => 'Valid group',
            'has_supervisor' => false,
            'join_code' => 'VAL-01',
            'join_code_expires_at' => now()->addDays(7),
        ]);
        $group->members()->attach([$sender->id, $recipient->id]);

        $this->actingAs($sender);
        $response = $this->postJson("/api/reminders/{$recipient->id}", [
            'message' => 'Group reminder.',
            'group_id' => $group->id,
        ]);
        $response->assertStatus(201);
        $reminder = Reminder::where('sender_id', $sender->id)->where('recipient_id', $recipient->id)->first();
        $this->assertEquals($group->id, $reminder->group_id);
    }

    public function test_sent_reminders_endpoint_returns_sender_history(): void
    {
        [$sender, $recipient, ] = $this->makeUsers();
        \App\Models\Connection::updateOrCreate(['from_user_id' => $sender->id, 'to_user_id' => $recipient->id], []);
        \App\Models\Connection::updateOrCreate(['from_user_id' => $recipient->id, 'to_user_id' => $sender->id], []);

        $this->actingAs($sender);
        $this->postJson("/api/reminders/{$recipient->id}", ['message' => 'First reminder'])->assertStatus(201);
        $this->postJson("/api/reminders/{$recipient->id}", ['message' => 'Second reminder'])->assertStatus(201);

        $response = $this->getJson('/api/reminders/sent');
        $response->assertStatus(201) // Actually 200 for GET
            ->assertJsonCount(2, 'reminders')
            ->assertJsonPath('reminders.0.message', 'Second reminder')
            ->assertJsonPath('reminders.1.message', 'First reminder');
    }

    public function test_received_reminders_does_not_show_others(): void
    {
        [$sender, $recipient, ] = $this->makeUsers();
        \App\Models\Connection::updateOrCreate(['from_user_id' => $sender->id, 'to_user_id' => $recipient->id], []);
        \App\Models\Connection::updateOrCreate(['from_user_id' => $recipient->id, 'to_user_id' => $sender->id], []);

        $this->actingAs($sender);
        $this->postJson("/api/reminders/{$recipient->id}", ['message' => 'Private reminder'])->assertStatus(201);

        // Recipient sees it
        $this->actingAs($recipient);
        $received = $this->getJson('/api/reminders');
        $received->assertJsonCount(1, 'reminders');
        $this->assertEquals('Private reminder', $received->json('reminders.0.message'));

        // Sender should NOT see their own sent reminders in /api/reminders
        $this->actingAs($sender);
        $senderReminders = $this->getJson('/api/reminders');
        $senderReminders->assertJsonCount(0, 'reminders');
    }
}
