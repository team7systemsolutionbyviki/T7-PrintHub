<?php
/* ==========================================================================
   T7 PRINT HUB — UNIFIED JSON RESPONSE HELPER
   ========================================================================== */

function sendJson($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit(0);
    }

    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function sendSuccess($data = [], $statusCode = 200, $message = null) {
    $response = [
        'success' => true,
        'data' => $data
    ];
    if ($message !== null) {
        $response['message'] = $message;
    }
    sendJson($response, $statusCode);
}

function sendError($message = 'An error occurred', $statusCode = 400, $extra = []) {
    $response = array_merge([
        'success' => false,
        'message' => $message
    ], $extra);
    sendJson($response, $statusCode);
}
