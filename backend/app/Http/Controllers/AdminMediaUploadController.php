<?php

namespace App\Http\Controllers;

use App\Models\MediaUpload;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdminMediaUploadController extends Controller
{
    public function upload(Request $request)
    {
        /*
        |--------------------------------------------------------------------------
        | VALIDATION
        |--------------------------------------------------------------------------
        */

        $request->validate([
            'media' => [
                'required',
                'file',
                'max:51200', // 50 MB
            ],

            'media_type' => [
                'required',
                'in:image,video,document,pdf,audio',
            ],

            'workflow_id' => [
                'nullable',
                'integer',
            ],
        ]);

        $file = $request->file('media');

        $mediaType = $request->input('media_type');


        /*
        |--------------------------------------------------------------------------
        | ALLOWED MIME TYPES
        |--------------------------------------------------------------------------
        */

        $allowedMimeTypes = [

            'image' => [
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/webp',
                'image/gif',
            ],

            'video' => [
                'video/mp4',
                'video/3gpp',
                'video/quicktime',
                'video/webm',
            ],

            'document' => [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/plain',
                'text/csv',
            ],

            'pdf' => [
                'application/pdf',
            ],

            'audio' => [
                'audio/mpeg',
                'audio/mp3',
                'audio/wav',
                'audio/x-wav',
                'audio/ogg',
                'audio/aac',
                'audio/mp4',
                'audio/x-m4a',
            ],
        ];




        $mimeType = $file->getMimeType();

        if (
            !isset($allowedMimeTypes[$mediaType]) ||
            !in_array(
                $mimeType,
                $allowedMimeTypes[$mediaType],
                true
            )
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid file type for ' . $mediaType . '.',
                'mime_type' => $mimeType,
                'allowed_types' => $allowedMimeTypes[$mediaType] ?? [],
            ], 422);
        }




        $originalName = $file->getClientOriginalName();


        $extension = strtolower(
            $file->getClientOriginalExtension()
        );



        $filename = Str::uuid()->toString() . '.' . $extension;


        $path = Storage::disk('public')->putFileAs(
            'workflow/' . $mediaType,
            $file,
            $filename
        );



        if (!$path) {
            return response()->json([
                'success' => false,
                'message' => 'File upload failed.',
            ], 500);
        }


        $fileSize = Storage::disk('public')->size($path);


        $url = url(
            '/storage/' . $path
        );

        $mediaUpload = MediaUpload::create([

            'user_id' => auth()->id(),

            'media_type' => $mediaType,

            'original_name' => $originalName,

            'file_name' => $filename,

            'mime_type' => $mimeType,

            'file_size' => $fileSize,

            'path' => $path,

            'url' => $url,

            'workflow_id' => $request->input('workflow_id'),

            'status' => 'active',
        ]);


        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return response()->json([

            'success' => true,

            'message' =>
                ucfirst($mediaType) .
                ' uploaded successfully.',

            'media' => [

                'id' =>
                    $mediaUpload->id,

                'media_type' =>
                    $mediaUpload->media_type,

                'original_name' =>
                    $mediaUpload->original_name,

                'file_name' =>
                    $mediaUpload->file_name,

                'mime_type' =>
                    $mediaUpload->mime_type,

                'size' =>
                    $mediaUpload->file_size,

                'path' =>
                    $mediaUpload->path,

                'url' =>
                    $mediaUpload->url,

                'workflow_id' =>
                    $mediaUpload->workflow_id,
            ],

        ], 201);
    }
}
