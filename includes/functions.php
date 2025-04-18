<?php
declare(strict_types=1);

/**
 * Получение списка заказов из БД
 */
function getOrders(PDO $conn): array {
    try {
        $stmt = $conn->query("SELECT * FROM orders");
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Для отладки: выведите результат запроса
        error_log(print_r($result, true));
        
        return $result;
    } catch (PDOException $e) {
        error_log("Ошибка при получении заказов: " . $e->getMessage());
        return [];
    }
}

/**
 * Форматирование даты
 */
function formatDate(?string $dateString): string {
    if (!$dateString || !strtotime($dateString)) {
        return 'Некорректная дата';
    }
    return date('d.m.Y', strtotime($dateString));
}

/**
 * Форматирование денежных значений
 */
function formatCurrency(float $value): string {
    return number_format($value, 2, ',', ' ') . ' ₽';
}
