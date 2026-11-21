<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Api\AdminController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\View\View;

class DevDbController extends Controller
{
    public function index(): View
    {
        $admin = app(AdminController::class);

        return view('dev.db-board', [
            'title' => 'Dev DB Board',
            'tableName' => null,
            'tables' => array_map(fn (string $t) => [
                'name' => $t,
                'count' => DB::table($t)->count(),
            ], $this->tableList()),
            'overview' => $admin->overview(request())->getData(true)['overview'],
            'status' => $admin->status(request())->getData(true)['status'],
            'users' => $admin->users(request())->getData(true)['users'],
            'logs' => $admin->logs(request())->getData(true)['logs'],
        ]);
    }

    public function show(string $table): View
    {
        $tables = $this->tableList();

        if (! in_array($table, $tables, true)) {
            abort(404, "Table [{$table}] does not exist.");
        }

        $limit = min(max((int) request('limit', 50), 1), 200);

        return view('dev.db-board', [
            'title' => "Table: {$table}",
            'tableName' => $table,
            'columns' => Schema::getColumnListing($table),
            'rows' => DB::table($table)->limit($limit)->get()->map(fn ($row) => (array) $row),
            'rowCount' => DB::table($table)->count(),
            'limit' => $limit,
        ]);
    }

    public static function cell(mixed $value): string
    {
        if ($value === null) {
            return '<span class="null">NULL</span>';
        }

        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        if (is_array($value) || is_object($value)) {
            $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        $string = (string) $value;

        if (mb_strlen($string) > 160) {
            $string = mb_substr($string, 0, 157).'…';
        }

        return e($string);
    }

    private function tableList(): array
    {
        $database = DB::connection()->getDatabaseName();
        $rows = DB::select(
            'SELECT TABLE_NAME AS `name`
              FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ?',
            [$database, 'BASE TABLE']
        );

        return array_map(fn (object $row) => $row->name, $rows);
    }
}