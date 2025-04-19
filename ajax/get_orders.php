<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json; charset=utf-8');

// Подключение конфигурации
$configPath = realpath(__DIR__.'/../includes/db.php');
if (!file_exists($configPath)) {
    http_response_code(500);
    die(json_encode([
        'success' => false,
        'error' => 'Config file not found',
        'attempted_path' => $configPath
    ]));
}

require_once $configPath;

try {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        throw new Exception("DB connection failed: ".$conn->connect_error);
    }
    
    if (!$conn->set_charset("utf8mb4")) {
        throw new Exception("Charset error: ".$conn->error);
    }

    // Получаем параметры
    $search = isset($_GET['search']) ? $conn->real_escape_string(trim($_GET['search'])) : '';
    $sort = isset($_GET['sort']) ? $_GET['sort'] : 'id';
    $dir = isset($_GET['dir']) ? ($_GET['dir'] === 'DESC' ? 'DESC' : 'ASC') : 'ASC';

    // Формируем запрос
    $sql = "SELECT * FROM orders WHERE 1=1";
    
    if (!empty($search)) {
        $statusMap = [
            'оплачено' => 'Оплачено',
            'paid' => 'Оплачено',
            'не оплачено' => 'Не оплачено',
            'pending' => 'Не оплачено'
        ];
        
        $searchLower = mb_strtolower($search, 'UTF-8');
        
        if (isset($statusMap[$searchLower])) {
            $sql .= " AND status = '".$statusMap[$searchLower]."'";
        } else {
            $sql .= " AND (
                first_name LIKE '%$search%' OR
                last_name LIKE '%$search%' OR
                destination LIKE '%$search%' OR
                id LIKE '%$search%'
            )";
        }
    }

    // Валидация параметров сортировки
    $allowedColumns = ['id', 'first_name', 'last_name', 'destination', 
                     'departure_date', 'arrival_date', 'persons', 'price', 'total', 'status'];
    $sort = in_array($sort, $allowedColumns) ? $sort : 'id';
    $dir = in_array(strtoupper($dir), ['ASC', 'DESC']) ? strtoupper($dir) : 'ASC';

    // Особый случай для сортировки по ID
    if ($sort === 'id') {
        // Извлекаем числовую часть из ID (формат "123/25-FD")
        $sql .= " ORDER BY CAST(SUBSTRING_INDEX(id, '/', 1) AS UNSIGNED) $dir";
    } else {
        $sql .= " ORDER BY $sort $dir";
    }

    // Выполняем запрос
    $result = $conn->query($sql);
    if (!$result) {
        throw new Exception("Query failed: ".$conn->error);
    }

    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }

    echo json_encode([
        'success' => true,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}

if (isset($conn)) $conn->close();
?>
