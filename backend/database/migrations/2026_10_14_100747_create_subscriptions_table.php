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
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('subscription_id')
                ->constrained('subscriptions')
                ->cascadeOnDelete();

            $table->unsignedInteger('messages_used')->default(0);
            $table->unsignedInteger('api_executions_used')->default(0);
            $table->unsignedInteger('ai_executions_used')->default(0);
            $table->unsignedInteger('contacts_count')->default(0);
            $table->unsignedInteger('bots_count')->default(0);
            $table->unsignedInteger('whatsapp_numbers_count')->default(0);

            $table->date('period_start');
            $table->date('period_end');

            $table->timestamps();

            $table->unique(
                ['subscription_id', 'period_start', 'period_end'],
                'subscription_usage_period_unique'
            );
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
