<?php

namespace Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    public function actingAs($user, $guard = null)
    {
        Sanctum::actingAs(
            $user,
            $user?->roles ?? [],
            $guard
        );
        return $this;
    }
}
