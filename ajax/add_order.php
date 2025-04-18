<?php
require '../includes/db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$rawData = file_get_contents('php://input');
$data = json_decode($rawData, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
    exit;
}

try {
    // Генерация ID
    $stmt = $conn->query("SELECT MAX(CAST(SUBSTRING_INDEX(id, '/', 1) AS UNSIGNED)) + 1 FROM orders");
    $nextId = $stmt->fetchColumn() ?: 1;
    $id = $nextId . '/25-FD';

    $stmt = $conn->prepare("
        INSERT INTO orders 
        (id, first_name, last_name, destination, departure_date, arrival_date, persons, price, total, status) 
        VALUES 
        (:id, :first_name, :last_name, :destination, :departure_date, :arrival_date, :persons, :price, :total, :status)
    ");

    $total = (float)$data['persons'] * (float)$data['price'];
    
    $stmt->execute([
        ':id' => $id,
        ':first_name' => $data['first_name'],
        ':last_name' => $data['last_name'],
        ':destination' => $data['destination'],
        ':departure_date' => $data['departure_date'],
        ':arrival_date' => $data['arrival_date'],
        ':persons' => (int)$data['persons'],
        ':price' => (float)$data['price'],
        ':total' => $total,
        ':status' => $data['status'] === 'Paid' ? 'Оплачено' : 'Не оплачено'
    ]);

    echo json_encode(['success' => true, 'id' => $id]);
} catch(PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
