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
        Schema::create('media_uploads', function (Blueprint $table) {
            $table->id();

            // User who uploaded the file
            $table->unsignedBigInteger('user_id')->nullable();

            // image, video, document, pdf, audio
            $table->string('media_type', 30);

            // Original file name
            $table->string('original_name');

            // Generated unique file name
            $table->string('file_name');

            // MIME type
            $table->string('mime_type', 150)->nullable();

            // File size in bytes
            $table->unsignedBigInteger('file_size')->nullable();

            // Relative public path
            $table->string('path');

            // Full public URL
            $table->text('url');

            // Optional workflow ID
            $table->unsignedBigInteger('workflow_id')->nullable();

            // active / inactive
            $table->string('status', 20)->default('active');

            $table->timestamps();

            // Indexes
            $table->index('user_id');
            $table->index('media_type');
            $table->index('workflow_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('media_uploads');
    }
};
