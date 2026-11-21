<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminLog;
use App\Models\Profile;
use App\Models\User;
use App\Models\UserPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => 'user',
        ]);

        $this->ensureProfile($user);
        $this->ensurePermissions($user);

        $token = $user->createToken('colleris')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->userPayload($user),
            'schemaVersion' => $this->schemaVersion(),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            $this->recordEvent('warn', 'Failed login attempt', $data['email'], null);

            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        $this->ensureProfile($user);
        $this->ensurePermissions($user);

        $token = $user->createToken('colleris')->plainTextToken;

        $this->recordEvent('info', 'Successful login', $user->name, $user->id);

        return response()->json([
            'token' => $token,
            'user' => $this->userPayload($user),
            'schemaVersion' => $this->schemaVersion(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->recordEvent('info', 'Logout', $user->name, $user->id);

        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->userPayload($request->user()),
            'schemaVersion' => $this->schemaVersion(),
        ]);
    }

    public function addAccount(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'name' => ['required', 'string', 'max:255'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => 'user',
        ]);

        $this->ensureProfile($user);
        $this->ensurePermissions($user);

        $token = $user->createToken('colleris')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->userPayload($user),
            'schemaVersion' => $this->schemaVersion(),
        ], 201);
    }

    public function updateUser(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'visibility' => ['sometimes', 'string', 'in:private,connections,supervisor,everyone'],
            'permissions.project_assignment' => ['sometimes', 'string', 'in:allow,request,decline'],
            'permissions.guide_upload' => ['sometimes', 'string', 'in:allow,request,decline'],
            'permissions.feedback' => ['sometimes', 'string', 'in:allow,request,decline'],
        ]);

        if (isset($data['name'])) {
            $user->update(['name' => $data['name']]);
        }

        if (isset($data['visibility'])) {
            $user->profile()->firstOrCreate(['user_id' => $user->id])->update(['visibility' => $data['visibility']]);
        }

        if (isset($data['permissions'])) {
            $perms = $user->permissions()->firstOrCreate(['user_id' => $user->id]);
            $perms->update([
                'project_assignment' => $data['permissions']['project_assignment'] ?? $perms->project_assignment,
                'guide_upload' => $data['permissions']['guide_upload'] ?? $perms->guide_upload,
                'feedback' => $data['permissions']['feedback'] ?? $perms->feedback,
            ]);
        }

        return response()->json(['user' => $this->userPayload($user->fresh())]);
    }

    public function profileCode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'hours' => ['required', 'integer', 'in:1,24,168'],
        ]);

        $user = $request->user();
        $profile = $this->ensureProfile($user);

        $code = strtoupper(substr(bin2hex(random_bytes(3)), 0, 4)).'-'.strtoupper(substr(bin2hex(random_bytes(2)), 0, 2));
        $expiresAt = now()->addHours($data['hours']);

        $profile->update([
            'profile_code' => $code,
            'profile_code_expires_at' => $expiresAt,
        ]);

        return response()->json([
            'user' => $this->userPayload($user->fresh()),
        ]);
    }

    public function theme(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mode' => ['required', 'string', 'in:dark,light'],
            'preset' => ['required', 'string', 'in:default,blue,cyan,pink,lavender,mint,cotton-candy,nebula'],
        ]);

        $user = $request->user();
        $user->update([
            'theme_mode' => $data['mode'],
            'theme_preset' => $data['preset'],
        ]);

        return response()->json(['user' => $this->userPayload($user->fresh())]);
    }

    public function schemaVersion(): array
    {
        $migrations = \Illuminate\Support\Facades\DB::table('migrations')->select('batch', \Illuminate\Support\Facades\DB::raw('count(*) as total'))->groupBy('batch')->orderByDesc('batch')->first();

        return [
            'total' => (int) \Illuminate\Support\Facades\DB::table('migrations')->count(),
            'latestBatch' => (int) ($migrations?->batch ?? 0),
        ];
    }

    /** Build the denormalised payload the frontend consumes as its user object. */
    private function userPayload(User $user): array
    {
        $profile = $this->ensureProfile($user);
        $permissions = $this->ensurePermissions($user);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'initials' => $profile->initials ?? $this->initials($user->name),
            'userId' => $profile->handle ?? strtoupper(substr($user->name, 0, 2)).'-'.str_pad((string) $user->id, 4, '0', STR_PAD_LEFT),
            'handle' => $profile->handle,
            'email' => $user->email,
            'role' => $user->role,
            'connections' => $profile->connections_count,
            'visibility' => $profile->visibility,
            'theme_mode' => $user->theme_mode,
            'theme_preset' => $user->theme_preset,
            'profileCode' => $profile->hasActiveCode() ? $profile->profile_code : null,
            'profileCodeExpiresAt' => $profile->profile_code_expires_at?->getTimestamp() * 1000,
            'permissions' => [
                'projectAssignment' => $permissions->project_assignment,
                'guideUpload' => $permissions->guide_upload,
                'feedback' => $permissions->feedback,
            ],
        ];
    }

    private function ensureProfile(User $user): Profile
    {
        return $user->profile()->firstOrCreate(
            ['user_id' => $user->id],
            [
                'handle' => strtoupper(substr($user->name, 0, 2)).'-'.str_pad((string) $user->id, 4, '0', STR_PAD_LEFT),
                'initials' => $this->initials($user->name),
            ],
        );
    }

    private function ensurePermissions(User $user): UserPermission
    {
        return $user->permissions()->firstOrCreate(
            ['user_id' => $user->id],
            ['project_assignment' => 'request', 'guide_upload' => 'request', 'feedback' => 'request'],
        );
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        $out = '';
        foreach (array_slice($parts, 0, 2) as $p) {
            $out .= mb_substr($p, 0, 1);
        }

        return strtoupper($out);
    }

    /**
     * Record a non-secret event into the admin debug console. Never passes
     * passwords, tokens or session data — only a short label + detail. The
     * optional $userId attributes the entry to a known user (admin console is
     * admin-only and bounded to the latest 200 entries).
     */
    private function recordEvent(string $type, string $message, ?string $detail = null, ?int $userId = null): void
    {
        try {
            AdminLog::create(array_filter([
                'type' => $type,
                'message' => $message,
                'detail' => $detail,
                'user_id' => $userId,
            ]));
        } catch (\Throwable) {
            // Event logging is best-effort only; never break auth for it.
        }
    }
}