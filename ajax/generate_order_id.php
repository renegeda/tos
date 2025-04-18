<?php
require '../includes/db.php';
header('Content-Type: application/json');

try {
    // Получаем максимальный ID из базы
    $stmt = $conn->query("SELECT MAX(CAST(SUBSTRING_INDEX(id, '/', 1) AS UNSIGNED)) FROM orders");
    $maxId = (int)$stmt->fetchColumn();
    
    // Генерируем новый ID
    $newId = ($maxId + 1) . '/25-FD';
    
    echo json_encode(['id' => $newId]);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
