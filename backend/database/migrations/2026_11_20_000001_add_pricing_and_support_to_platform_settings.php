<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('platform_settings', 'platform_fee_percent')) {
                $table->decimal('platform_fee_percent', 5, 2)->default(2.00)->after('request_timeout');
            }
            if (!Schema::hasColumn('platform_settings', 'gst_percent')) {
                $table->decimal('gst_percent', 5, 2)->default(18.00)->after('platform_fee_percent');
            }
            if (!Schema::hasColumn('platform_settings', 'support_phone')) {
                $table->string('support_phone', 40)->default('+91 98765 43210')->after('gst_percent');
            }
            if (!Schema::hasColumn('platform_settings', 'support_email')) {
                $table->string('support_email', 120)->default('support@wababot.com')->after('support_phone');
            }
            if (!Schema::hasColumn('platform_settings', 'rate_utility')) {
                $table->decimal('rate_utility', 6, 4)->default(0.1500)->after('support_email');
            }
            if (!Schema::hasColumn('platform_settings', 'rate_marketing')) {
                $table->decimal('rate_marketing', 6, 4)->default(0.9500)->after('rate_utility');
            }
            if (!Schema::hasColumn('platform_settings', 'rate_service')) {
                $table->decimal('rate_service', 6, 4)->default(0.3500)->after('rate_marketing');
            }
            if (!Schema::hasColumn('platform_settings', 'rate_authentication')) {
                $table->decimal('rate_authentication', 6, 4)->default(0.1500)->after('rate_service');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            $table->dropColumn([
                'platform_fee_percent',
                'gst_percent',
                'support_phone',
                'support_email',
                'rate_utility',
                'rate_marketing',
                'rate_service',
                'rate_authentication',
            ]);
        });
    }
};
