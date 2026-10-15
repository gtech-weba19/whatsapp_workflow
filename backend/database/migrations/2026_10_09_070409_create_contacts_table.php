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
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();

        $table->foreignId('tenant_id')
            ->constrained('tenants')
            ->cascadeOnDelete();

        $table->foreignId('whatsapp_number_id')
            ->nullable()
            ->constrained('whatsapp_numbers')
            ->nullOnDelete();

        $table->string('external_contact_id', 190)->nullable();
        $table->string('phone', 30);
        $table->string('name', 150)->nullable();
        $table->string('email', 190)->nullable();

        $table->json('profile_data')->nullable();
        $table->json('tags')->nullable();

        $table->enum('status', ['active', 'blocked', 'archived'])
            ->default('active');

        $table->dateTime('last_seen_at')->nullable();

        $table->timestamps();

        $table->unique(['tenant_id', 'phone']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
