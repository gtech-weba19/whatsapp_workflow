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
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
              $table->string('name', 100);
            $table->string('code', 50)->unique();
            $table->text('description')->nullable();

            $table->decimal('monthly_price', 12, 2)->default(0);
            $table->decimal('annual_price', 12, 2)->default(0);
            $table->string('currency', 3)->default('INR');

            $table->unsignedInteger('trial_days')->default(0);

            $table->unsignedInteger('max_bots')->default(1);
            $table->unsignedInteger('max_whatsapp_numbers')->default(1);
            $table->unsignedInteger('max_contacts')->default(1000);
            $table->unsignedInteger('max_monthly_messages')->default(10000);
            $table->unsignedInteger('max_api_executions')->default(1000);
            $table->unsignedInteger('max_ai_executions')->default(0);

            $table->json('features')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
