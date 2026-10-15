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
        Schema::create('email_otps', function (Blueprint $table) {
             $table->string('email')->index();

            // Hashed OTP store hoga
            $table->string('otp_hash');

            // OTP ki expiry
            $table->timestamp('expires_at');

            // OTP verify hone ka time
            $table->timestamp('verified_at')->nullable();

            // Failed verification attempts
            $table->unsignedTinyInteger('attempts')->default(0);

            // Last OTP send time
            $table->timestamp('last_sent_at')->nullable();

            $table->timestamps();

            $table->index(['email', 'expires_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_otps');
    }
};
