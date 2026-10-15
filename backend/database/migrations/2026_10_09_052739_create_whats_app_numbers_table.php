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
        Schema::create('whats_app_numbers', function (Blueprint $table) {
            $table->id();

            $table->foreignId('tenant_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('whatsapp_account_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->string('phone_number', 30);
            $table->string('display_name', 150)->nullable();

            $table->string('phone_number_id', 190)->nullable();
            $table->string('sender_id', 190)->nullable();

            $table->string('country_code', 8)->nullable();

            $table->enum('status', [
                'pending',
                'active',
                'inactive',
                'error',
            ])->default('pending');

            $table->string('webhook_url', 500)->nullable();

            $table->json('metadata')->nullable();

            $table->timestamps();

            $table->unique(['tenant_id', 'phone_number']);
            $table->index('phone_number');
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whats_app_numbers');
    }
};
