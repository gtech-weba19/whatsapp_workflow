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

    /**
     * Get public / client accessible pricing and support configuration.
     */
    public function pricingConfig(): JsonResponse
    {
        $settings = PlatformSetting::first();

        if (!$settings) {
            $settings = PlatformSetting::create($this->defaultSettings());
        }

        $config = [
            'platform_name' => (string) ($settings->platform_name ?? 'G Tech Web Marketing'),
            'platform_url' => (string) ($settings->platform_url ?? 'https://www.gtechwebmarketing.com'),
            'platform_fee_percent' => (float) ($settings->platform_fee_percent ?? 2.00),
            'platform_fee_fixed' => (float) ($settings->platform_fee_fixed ?? 30.00),
            'gst_percent' => (float) ($settings->gst_percent ?? 18.00),
            'support_phone' => (string) ($settings->support_phone ?? '+91 98765 43210'),
            'support_email' => (string) ($settings->support_email ?? 'support@wababot.com'),
            'rate_utility' => (float) ($settings->rate_utility ?? 0.1500),
            'rate_marketing' => (float) ($settings->rate_marketing ?? 0.9500),
            'rate_service' => (float) ($settings->rate_service ?? 0.3500),
            'rate_authentication' => (float) ($settings->rate_authentication ?? 0.1500),
        ];

        return response()->json([
            'success' => true,
            'data' => $config,
            'config' => $config,
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
            'platform_fee_percent' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
            'platform_fee_fixed' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'gst_percent' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
            'support_phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'support_email' => ['sometimes', 'nullable', 'email', 'max:120'],
            'rate_utility' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'rate_marketing' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'rate_service' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'rate_authentication' => ['sometimes', 'nullable', 'numeric', 'min:0'],
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
            'platform_fee_percent' => 2.00,
            'platform_fee_fixed' => 30.00,
            'gst_percent' => 18.00,
            'support_phone' => '+91 98765 43210',
            'support_email' => 'support@wababot.com',
            'rate_utility' => 0.1500,
            'rate_marketing' => 0.9500,
            'rate_service' => 0.3500,
            'rate_authentication' => 0.1500,
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
            'platform_fee_percent' => (float) ($settings->platform_fee_percent ?? 2.00),
            'platform_fee_fixed' => (float) ($settings->platform_fee_fixed ?? 30.00),
            'gst_percent' => (float) ($settings->gst_percent ?? 18.00),
            'support_phone' => (string) ($settings->support_phone ?? '+91 98765 43210'),
            'support_email' => (string) ($settings->support_email ?? 'support@wababot.com'),
            'rate_utility' => (float) ($settings->rate_utility ?? 0.1500),
            'rate_marketing' => (float) ($settings->rate_marketing ?? 0.9500),
            'rate_service' => (float) ($settings->rate_service ?? 0.3500),
            'rate_authentication' => (float) ($settings->rate_authentication ?? 0.1500),
            'created_at' => $settings->created_at?->toISOString(),
            'updated_at' => $settings->updated_at?->toISOString(),
        ];
    }
}
