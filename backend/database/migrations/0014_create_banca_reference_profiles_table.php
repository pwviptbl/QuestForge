<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('banca_reference_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('concurso_id')->constrained()->cascadeOnDelete();
            $table->string('source_name', 255);
            $table->string('source_url', 2048)->nullable();
            $table->unsignedInteger('question_count')->default(0);
            $table->json('profile');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('banca_reference_profiles');
    }
};
