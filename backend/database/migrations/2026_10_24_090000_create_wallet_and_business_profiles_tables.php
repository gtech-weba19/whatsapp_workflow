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
        // 1. Business Profiles
        if (!Schema::hasTable('business_profiles')) {
            Schema::create('business_profiles', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->unique();
                $table->string('business_name')->nullable();
                $table->string('business_type')->nullable();
                $table->string('industry')->nullable();
                $table->string('country')->nullable();
                $table->string('website')->nullable();
                $table->string('gstin')->nullable();
                $table->string('city')->nullable();
                $table->text('address')->nullable();
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            });
        }

        // 2. Package Plans
        if (!Schema::hasTable('package_plans')) {
            Schema::create('package_plans', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('slug')->unique();
                $table->integer('message_credits')->default(0);
                $table->decimal('selling_price', 10, 2)->default(0.00);
                $table->string('currency', 10)->default('INR');
                $table->integer('validity_days')->nullable();
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });
        }

        // 3. User Subscriptions
        if (!Schema::hasTable('user_subscriptions')) {
            Schema::create('user_subscriptions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('package_plan_id')->nullable();
                $table->decimal('amount_paid', 10, 2)->default(0.00);
                $table->string('currency', 10)->default('INR');
                $table->integer('credits_granted')->default(0);
                $table->integer('credits_remaining')->default(0);
                $table->timestamp('starts_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->string('status')->default('active');
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->foreign('package_plan_id')->references('id')->on('package_plans')->nullOnDelete();
            });
        }

        // 4. Credit Wallets
        if (!Schema::hasTable('credit_wallets')) {
            Schema::create('credit_wallets', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->unique();
                $table->decimal('available_credits', 12, 4)->default(0.0000);
                $table->string('currency', 10)->default('INR');
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            });
        }

        // 5. Credit Transactions
        if (!Schema::hasTable('credit_transactions')) {
            Schema::create('credit_transactions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('subscription_id')->nullable();
                $table->string('transaction_type', 20)->default('credit');
                $table->decimal('credits', 12, 4)->default(0.0000);
                $table->decimal('balance_after', 12, 4)->nullable();
                $table->string('reference_type')->nullable();
                $table->string('reference_id')->nullable();
                $table->string('idempotency_key')->nullable()->index();
                $table->text('notes')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamp('created_at')->nullable();

                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->foreign('subscription_id')->references('id')->on('user_subscriptions')->nullOnDelete();
            });
        }

        // 6. User Message Rates
        if (!Schema::hasTable('user_message_rates')) {
            Schema::create('user_message_rates', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->string('channel')->default('whatsapp');
                $table->string('message_category')->default('marketing');
                $table->decimal('rate', 10, 6)->default(0.500000);
                $table->string('currency', 10)->default('INR');
                $table->timestamp('effective_from')->nullable();
                $table->timestamp('effective_to')->nullable();
                $table->string('status')->default('active');
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_message_rates');
        Schema::dropIfExists('credit_transactions');
        Schema::dropIfExists('credit_wallets');
        Schema::dropIfExists('user_subscriptions');
        Schema::dropIfExists('package_plans');
        Schema::dropIfExists('business_profiles');
    }
};

