<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PackagePlansSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'id' => 1,
                'name' => 'Free Trial Pack',
                'slug' => 'trial-100',
                'message_credits' => 100,
                'selling_price' => 100.00,
                'currency' => 'INR',
                'validity_days' => null,
                'description' => 'Free ₹100 Welcome credits for testing WhatsApp workflows & messages.',
                'is_active' => 1,
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 2,
                'name' => 'Starter Pack',
                'slug' => 'starter-1000',
                'message_credits' => 1000,
                'selling_price' => 1000.00,
                'currency' => 'INR',
                'validity_days' => null,
                'description' => 'Ideal for small businesses to start sending messages and automation.',
                'is_active' => 1,
                'sort_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 3,
                'name' => 'Business Growth Pack',
                'slug' => 'business-10000',
                'message_credits' => 10000,
                'selling_price' => 10000.00,
                'currency' => 'INR',
                'validity_days' => null,
                'description' => 'Power pack for growing teams with higher message volumes.',
                'is_active' => 1,
                'sort_order' => 3,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 4,
                'name' => 'Enterprise Volume Pack',
                'slug' => 'enterprise-100000',
                'message_credits' => 100000,
                'selling_price' => 100000.00,
                'currency' => 'INR',
                'validity_days' => null,
                'description' => 'Highest volume plan with dedicated support and lowest per-message rates.',
                'is_active' => 1,
                'sort_order' => 4,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($plans as $plan) {
            DB::table('package_plans')->updateOrInsert(
                ['id' => $plan['id']],
                $plan
            );
        }

        // Also ensure fallback `plans` table has records
        if (DB::getSchemaBuilder()->hasTable('plans')) {
            $legacyPlans = [
                [
                    'id' => 1,
                    'name' => 'Free Trial',
                    'code' => 'trial',
                    'description' => 'Free Trial 100 credits',
                    'monthly_price' => 0.00,
                    'annual_price' => 0.00,
                    'currency' => 'INR',
                    'trial_days' => 30,
                    'max_bots' => 1,
                    'max_whatsapp_numbers' => 1,
                    'max_contacts' => 500,
                    'max_monthly_messages' => 100,
                    'max_api_executions' => 100,
                    'max_ai_executions' => 0,
                    'features' => json_encode(['trial' => true]),
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'id' => 2,
                    'name' => 'Starter Pack',
                    'code' => 'starter',
                    'description' => 'Starter Pack ₹1,000',
                    'monthly_price' => 1000.00,
                    'annual_price' => 10000.00,
                    'currency' => 'INR',
                    'trial_days' => 0,
                    'max_bots' => 3,
                    'max_whatsapp_numbers' => 1,
                    'max_contacts' => 2000,
                    'max_monthly_messages' => 1000,
                    'max_api_executions' => 1000,
                    'max_ai_executions' => 100,
                    'features' => json_encode(['starter' => true]),
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'id' => 3,
                    'name' => 'Business Growth Pack',
                    'code' => 'business',
                    'description' => 'Business Growth Pack ₹10,000',
                    'monthly_price' => 10000.00,
                    'annual_price' => 100000.00,
                    'currency' => 'INR',
                    'trial_days' => 0,
                    'max_bots' => 10,
                    'max_whatsapp_numbers' => 3,
                    'max_contacts' => 20000,
                    'max_monthly_messages' => 10000,
                    'max_api_executions' => 10000,
                    'max_ai_executions' => 1000,
                    'features' => json_encode(['business' => true]),
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'id' => 4,
                    'name' => 'Enterprise Volume Pack',
                    'code' => 'enterprise',
                    'description' => 'Enterprise Volume Pack ₹100,000',
                    'monthly_price' => 100000.00,
                    'annual_price' => 1000000.00,
                    'currency' => 'INR',
                    'trial_days' => 0,
                    'max_bots' => 50,
                    'max_whatsapp_numbers' => 10,
                    'max_contacts' => 100000,
                    'max_monthly_messages' => 100000,
                    'max_api_executions' => 100000,
                    'max_ai_executions' => 10000,
                    'features' => json_encode(['enterprise' => true]),
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ];

            foreach ($legacyPlans as $lp) {
                DB::table('plans')->updateOrInsert(
                    ['id' => $lp['id']],
                    $lp
                );
            }
        }
    }
}
