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
        Schema::create('audit_logs', function (Blueprint $table) {
             $table->id();

        $table->foreignId('tenant_id')
            ->nullable()
            ->constrained('tenants')
            ->nullOnDelete();

        $table->foreignId('user_id')
            ->nullable()
            ->constrained('users')
            ->nullOnDelete();

        $table->string('action', 100);
        $table->string('entity_type', 100)->nullable();
        $table->unsignedBigInteger('entity_id')->nullable();

        $table->json('old_values')->nullable();
        $table->json('new_values')->nullable();

        $table->ipAddress('ip_address')->nullable();
        $table->text('user_agent')->nullable();

        $table->timestamps();

        $table->index(['tenant_id', 'created_at']);
        $table->index(['entity_type', 'entity_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
