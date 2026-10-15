<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminTemplateController extends Controller
{
     public function index(Request $request)
    {
        try {
            $table = $this->getTemplatesTable();

            if (!$table) {
                return response()->json([
                    'message' => 'Templates table does not exist yet.',
                    'data' => [],
                ], 200);
            }

            $query = DB::table($table);

            $columns = Schema::getColumnListing($table);

            // Search by name.
            $search = trim((string) $request->query('search', ''));

            if ($search !== '') {
                $searchColumn = collect([
                    'name',
                    'template_name',
                    'elementName',
                ])->first(fn ($column) => in_array($column, $columns));

                if ($searchColumn) {
                    $query->where(
                        $searchColumn,
                        'like',
                        '%' . $search . '%'
                    );
                }
            }

            // Filter by status.
            if (
                $request->filled('status') &&
                $request->query('status') !== 'all'
            ) {
                $statusColumn = collect([
                    'status',
                    'approval_status',
                ])->first(fn ($column) => in_array($column, $columns));

                if ($statusColumn) {
                    $query->where(
                        $statusColumn,
                        $request->query('status')
                    );
                }
            }

            // Filter by category.
            if (
                $request->filled('category') &&
                $request->query('category') !== 'all' &&
                in_array('category', $columns)
            ) {
                $query->where(
                    'category',
                    $request->query('category')
                );
            }

            if (in_array('id', $columns)) {
                $query->orderByDesc('id');
            }

            $perPage = min(
                max((int) $request->query('per_page', 20), 1),
                100
            );

            $templates = $query->paginate($perPage);

            return response()->json($templates);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Unable to load templates.',
            ], 500);
        }
    }



    public function show(string $id)
    {
        try {
            $table = $this->getTemplatesTable();

            if (!$table) {
                return response()->json([
                    'message' => 'Templates table does not exist.',
                ], 404);
            }

            $columns = Schema::getColumnListing($table);

            if (!in_array('id', $columns)) {
                return response()->json([
                    'message' => 'Templates table must have an id column.',
                ], 500);
            }

            $template = DB::table($table)
                ->where('id', $id)
                ->first();

            if (!$template) {
                return response()->json([
                    'message' => 'Template not found.',
                ], 404);
            }

            return response()->json([
                'data' => $template,
            ]);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Unable to load template details.',
            ], 500);
        }
    }


     private function getTemplatesTable(): ?string
    {
        foreach (['whatsapp_templates', 'templates'] as $table) {
            if (Schema::hasTable($table)) {
                return $table;
            }
        }

        return null;
    }
}
