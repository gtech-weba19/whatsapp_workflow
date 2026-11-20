<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('platform_settings', 'platform_fee_fixed')) {
                $table->decimal('platform_fee_fixed', 8, 2)->default(30.00)->after('platform_fee_percent');
            }
        });

        // Set default value 30.00 on existing settings row
        DB::table('platform_settings')->update([
            'platform_fee_fixed' => 30.00,
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('platform_settings', function (Blueprint $table) {
            if (Schema::hasColumn('platform_settings', 'platform_fee_fixed')) {
                $table->dropColumn('platform_fee_fixed');
            }
        });
    }
};
