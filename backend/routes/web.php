<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\DevDbController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Local-only development database board (never registered outside local env).
if (app()->isLocal()) {
    Route::get('/db', [DevDbController::class, 'index']);
    Route::get('/db/admin/overview', [AdminController::class, 'overview']);
    Route::get('/db/admin/users', [AdminController::class, 'users']);
    Route::get('/db/admin/logs', [AdminController::class, 'logs']);
    Route::get('/db/admin/status', [AdminController::class, 'status']);
    Route::get('/db/{table}', [DevDbController::class, 'show']);
}
