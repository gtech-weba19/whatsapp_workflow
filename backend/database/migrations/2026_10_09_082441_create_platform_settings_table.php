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
        Schema::create('platform_settings', function (Blueprint $table) {
              $table->id();
                $table->string('platform_name')->default('WhatsApp Workflow Builder');
                $table->string('platform_url')->nullable();
                $table->string('timezone')->default('Asia/Kolkata');
                $table->string('language')->default('English');
                $table->string('whatsapp_sender_name')->nullable();
                $table->string('webhook_dn_id')->nullable();
                $table->string('api_base_url')->nullable();
                $table->unsignedInteger('request_timeout')->default(30);
                $table->boolean('email_notifications')->default(true);
                $table->boolean('webhook_notifications')->default(true);
                $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('platform_settings');
    }
};
