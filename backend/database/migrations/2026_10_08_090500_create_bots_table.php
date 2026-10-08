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
        Schema::create('bots', function (Blueprint $table) {

            // Primary Key
            $table->id();

            // Tenant / Client
            $table->foreignId('tenant_id')
                ->constrained('tenants')
                ->cascadeOnDelete();

            // Bot Information
            $table->string('name');
            $table->text('description')->nullable();

            // Bot Status
            $table->enum('status', [
                'draft',
                'active',
                'inactive',
            ])->default('draft');

            // WhatsApp Account
            $table->unsignedBigInteger('whatsapp_account_id')
                ->nullable();

            // Timestamps
            $table->timestamps();

            // Indexes
            $table->index([
                'tenant_id',
                'status',
            ]);

            $table->index('whatsapp_account_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bots');
    }
};
