<?php

namespace App\Http\Controllers;

use App\Models\Industry;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminIndustryController extends Controller
{
    // Display all industries
    public function index()
    {
        $industries = Industry::orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $industries,
        ]);
    }

    // Show create form (API response)
    public function create()
    {
        return response()->json([
            'success' => true,
            'message' => 'Create industry',
        ]);
    }

    // Store new industry
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:industries,name'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $slug = Str::slug($validated['name']);

        if (Industry::where('slug', $slug)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'This industry already exists.',
            ], 422);
        }

        $industry = Industry::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Industry created successfully.',
            'data' => $industry,
        ], 201);
    }

    // Show a single industry
    public function show(Industry $industry)
    {
        return response()->json([
            'success' => true,
            'data' => $industry,
        ]);
    }

    // Show edit form (API response)
    public function edit(Industry $industry)
    {
        return response()->json([
            'success' => true,
            'data' => $industry,
        ]);
    }

    // Update industry
    public function update(Request $request, Industry $industry)
    {
        $validated = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('industries', 'name')->ignore($industry->id),
            ],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (isset($validated['name'])) {
            $slug = Str::slug($validated['name']);

            $slugExists = Industry::where('slug', $slug)
                ->where('id', '!=', $industry->id)
                ->exists();

            if ($slugExists) {
                return response()->json([
                    'success' => false,
                    'message' => 'This industry slug already exists.',
                ], 422);
            }

            $industry->name = $validated['name'];
            $industry->slug = $slug;
        }

        if (array_key_exists('is_active', $validated)) {
            $industry->is_active = $validated['is_active'];
        }

        $industry->save();

        return response()->json([
            'success' => true,
            'message' => 'Industry updated successfully.',
            'data' => $industry,
        ]);
    }

    // Delete industry
    public function destroy(Industry $industry)
    {
        $industry->delete();

        return response()->json([
            'success' => true,
            'message' => 'Industry deleted successfully.',
        ]);
    }
}
