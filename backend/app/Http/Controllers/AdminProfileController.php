<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminProfileController extends Controller
{
    /**
     * Get the authenticated user's profile.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        return response()->json([
            'success' => true,
            'message' => 'Profile fetched successfully.',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'mobile' => $user->mobile ?? $user->phone ?? null,
                ],
            ],
        ]);
    }

    /**
     * Update the authenticated user's profile.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $schema = $user->getConnection()->getSchemaBuilder();
        $table = $user->getTable();

        $mobileColumn = $schema->hasColumn($table, 'mobile')
            ? 'mobile'
            : ($schema->hasColumn($table, 'phone') ? 'phone' : null);

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique($table, 'email')->ignore($user->getKey()),
            ],
        ];

        if ($mobileColumn) {
            $rules['mobile'] = [
                'nullable',
                'digits:10',
                Rule::unique($table, $mobileColumn)->ignore($user->getKey()),
            ];
        }

        $validator = Validator::make(
            $request->all(),
            $rules,
            [
                'name.required' => 'Name is required.',
                'email.email' => 'Please enter a valid email address.',
                'mobile.required' => 'Mobile number is required.',
                'mobile.digits' => 'Mobile number must contain exactly 10 digits.',
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please check the submitted profile details.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user->name = $request->input('name');
        $user->email = $request->input('email');

        if ($mobileColumn) {
            $user->{$mobileColumn} = $request->input('mobile');
        }

        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'mobile' => $mobileColumn
                        ? $user->{$mobileColumn}
                        : null,
                ],
            ],
        ]);
    }

    /**
     * Change the authenticated user's password.
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $validator = Validator::make(
            $request->all(),
            [
                'current_password' => [
                    'required',
                    'string',
                ],
                'password' => [
                    'required',
                    'string',
                    'min:8',
                    'confirmed',
                    'different:current_password',
                ],
            ],
            [
                'current_password.required' =>
                    'Current password is required.',
                'password.required' =>
                    'New password is required.',
                'password.min' =>
                    'New password must be at least 8 characters.',
                'password.confirmed' =>
                    'New password and confirm password do not match.',
                'password.different' =>
                    'New password must be different from current password.',
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please check the submitted password details.',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Verify the current password.
        if (!Hash::check(
            $request->input('current_password'),
            $user->password
        )) {
            return response()->json([
                'success' => false,
                'message' => 'Your current password is incorrect.',
                'errors' => [
                    'current_password' => [
                        'Your current password is incorrect.',
                    ],
                ],
            ], 422);
        }

        // Hash and save the new password.
        $user->password = Hash::make($request->input('password'));
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Password updated successfully.',
        ]);
    }
}
