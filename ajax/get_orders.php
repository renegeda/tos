<?php
require '../includes/db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$search = $_GET['search'] ?? '';
$sortColumn = $_GET['sort'] ?? 'id';
$sortDirection = $_GET['dir'] ?? 'ASC';

// Безопасная проверка параметров сортировки
$allowedColumns = ['id', 'first_name', 'last_name', 'destination', 'departure_date', 'arrival_date', 'persons', 'price', 'total', 'status'];
$sortColumn = in_array($sortColumn, $allowedColumns) ? $sortColumn : 'id';
$sortDirection = strtoupper($sortDirection) === 'DESC' ? 'DESC' : 'ASC';

try {
    $query = "SELECT * FROM orders";
    $params = [];

    if (!empty($search)) {
        $query .= " WHERE 
            id LIKE :search OR 
            first_name LIKE :search OR 
            last_name LIKE :search OR 
            destination LIKE :search OR 
            status LIKE :search";
        $params[':search'] = "%$search%";
    }

    $query .= " ORDER BY $sortColumn $sortDirection";

    $stmt = $conn->prepare($query);
    $stmt->execute($params);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($orders);
} catch(PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
