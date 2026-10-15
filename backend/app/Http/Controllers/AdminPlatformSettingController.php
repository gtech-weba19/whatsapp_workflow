<?php

namespace App\Http\Controllers;

use App\Models\PlatformSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminPlatformSettingController extends Controller
{
    /**
     * Get global platform settings.
     */
    public function index(): JsonResponse
    {
        $settings = PlatformSetting::first();

        if (!$settings) {
            $settings = PlatformSetting::create(
                $this->defaultSettings()
            );
        }

        return response()->json([
            'success' => true,
            'data' => $this->formatSettings($settings),
        ]);
    }

public function update(Request $request): JsonResponse
{
    $validated = $request->validate([
        'platform_name' => ['sometimes', 'required', 'string', 'max:255'],
        'platform_url' => ['sometimes', 'nullable', 'url', 'max:255'],
        'timezone' => ['sometimes', 'required', 'timezone'],
        'language' => ['sometimes', 'required', 'string', 'max:50'],
        'request_timeout' => ['sometimes', 'required', 'integer', 'min:1', 'max:120'],
        'email_notifications' => ['sometimes', 'required', 'boolean'],
        'webhook_notifications' => ['sometimes', 'required', 'boolean'],
    ]);

    $settings = DB::transaction(function () use ($validated) {
        $settings = PlatformSetting::query()->first();

        if (!$settings) {
            $settings = new PlatformSetting();
            $settings->fill(array_merge(
                $this->defaultSettings(),
                $validated
            ));
        } else {
            $settings->fill($validated);
        }

        $settings->save();
        $settings->refresh();

        return $settings;
    });

    return response()->json([
        'success' => true,
        'message' => 'Platform settings saved successfully.',
        'data' => $this->formatSettings($settings),
    ]);
}
    /**
     * Default global platform settings.
     */
    private function defaultSettings(): array
    {
        return [
            'platform_name' => config(
                'app.name',
                'WhatsApp Workflow Builder'
            ),
            'platform_url' => config(
                'app.frontend_url',
                'http://localhost:5173'
            ),
            'timezone' => config(
                'app.timezone',
                'Asia/Kolkata'
            ),
            'language' => 'English',
            'request_timeout' => 30,
            'email_notifications' => true,
            'webhook_notifications' => true,
        ];
    }

  private function formatSettings(
        PlatformSetting $settings
    ): array {
        return [
            'id' => $settings->id,
            'platform_name' => $settings->platform_name,
            'platform_url' => $settings->platform_url,
            'timezone' => $settings->timezone,
            'language' => $settings->language,
            'request_timeout' => $settings->request_timeout,
            'email_notifications' => (bool) $settings->email_notifications,
            'webhook_notifications' => (bool) $settings->webhook_notifications,
            'created_at' => $settings->created_at?->toISOString(),
            'updated_at' => $settings->updated_at?->toISOString(),
        ];
    }
}
