<?php
// Подключение функций и проверка авторизации (если требуется)
require_once 'functions.php';
?>

<div class="container-xxl">
    <div class="row g-3 py-44">
        <!-- Боковая панель (если есть) -->
        <div class="col-md-2">
            <div class="h-100px card shadow-sm"></div>
        </div>

        <!-- Основной контент -->
        <div class="col-md-10">
            <div class="card shadow-sm">
                <div class="container my-2">
                    <!-- Секция формы -->
                    <section class="form-section">
                        <h2 class="form-title text-center border-bottom mb-4 pb-2" id="form-title">
                            <?= isset($editMode) ? 'Редактировать заказ' : 'Добавить новый заказ' ?>
                        </h2>
                        
                        <form id="order-form">
                            <div class="row g-3">
                                <!-- Поля формы (аналогично исходному HTML) -->
                                <div class="col-md-4">
                                            <div class="form-floating">
                                                <input type="text" class="form-control" id="order-id" readonly>
                                                <label for="order-id">ID</label>
                                                <div class="error-message" id="order-id-error"></div>
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-4">
                                            <div class="form-floating">
                                                <input type="text" class="form-control" id="first-name" required>
                                                <label for="first-name">Имя</label>
                                                <div class="error-message" id="first-name-error"></div>
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-4">
                                            <div class="form-floating">
                                                <input type="text" class="form-control" id="last-name" required>
                                                <label for="last-name">Фамилия</label>
                                                <div class="error-message" id="last-name-error"></div>
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-4">
                                            <div class="form-floating">
                                                <input type="text" class="form-control" id="destination" required>
                                                <label for="destination">Направление</label>
                                                <div class="error-message" id="destination-error"></div>
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-4">
                                            <div class="form-floating">
                                                <input type="date" class="form-control" id="departure-date" required>
                                                <label for="departure-date">Убытие</label>
                                                <div class="error-message" id="departure-date-error"></div>
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-4">
                                            <div class="form-floating">
                                                <input type="date" class="form-control" id="arrival-date" required>
                                                <label for="arrival-date">Прибытие</label>
                                                <div class="error-message" id="arrival-date-error"></div>
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-4">
                                            <div class="form-floating">
                                                <input type="number" class="form-control" id="persons" min="1" max="10" required>
                                                <label for="persons">Кол-во человек</label>
                                                <div class="error-message" id="persons-error"></div>
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-4">
                                            <div class="form-floating">
                                                <input type="number" class="form-control" id="tour-price" min="0" step="0.01" required>
                                                <label for="tour-price">Цена тура</label>
                                                <div class="error-message" id="tour-price-error"></div>
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-4">
                                            <div class="form-floating">
                                                <input type="number" class="form-control" id="total-cost" readonly>
                                                <label for="total-cost">Итого</label>
                                                <div class="error-message" id="total-cost-error"></div>
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-4">
                                            <div class="form-floating">
                                                <select class="form-select" id="status" required>
                                                    <option value="">Выберите статус</option>
                                                    <option value="Paid">Оплачено</option>
                                                    <option value="Pending">Не оплачено</option>
                                                </select>
                                                <label for="status">Статус</label>
                                                <div class="error-message" id="status-error"></div>
                                            </div>
                                        </div>
                                
                                <div class="col-md-8">
                                    <div class="d-flex justify-content-center gap-3">
                                        <button type="button" id="cancel-btn" class="btn cancel-btn" style="display: none;">
                                            Отмена
                                        </button>
                                        <button type="submit" id="submit-btn" class="btn btn-add-order py-3 px-5">
                                            <?= isset($editMode) ? 'Обновить заказ' : 'Добавить заказ' ?>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </section>

                    <!-- Секция таблицы -->
                    <section class="mt-4">
                        <h2 class="section-title text-center border-bottom mb-4">Список заказов</h2>
                        <div class="table-responsive">
                            <table class="table table-striped table-hover" id="orders-table">
                                <thead class="table-light">
                                    <tr>
                                        <th scope="col" data-type="string">ID</th>
                                        <th scope="col" data-type="string">Имя</th>
                                        <th scope="col" data-type="string">Фамилия</th>
                                        <th scope="col" data-type="string">Направление</th>
                                        <th scope="col" data-type="date">Убытие</th>
                                        <th scope="col" data-type="date">Прибытие</th>
                                        <th scope="col" data-type="number">Кол-во человек</th>
                                        <th scope="col" data-type="number">Цена тура</th>
                                        <th scope="col" data-type="number">Итого</th>
                                        <th scope="col" data-type="string">Статус</th>
                                        <th class="action-column"></th>
                                        <th class="action-column"></th>
                                    </tr>
                                </thead>
                                <tbody id="orders-body">
                                <?php
                                $orders = getOrders($conn); // Передаем подключение
                                foreach ($orders as $order):
                                ?>
                                    <tr data-id="<?= htmlspecialchars($order['id']) ?>">
                                        <td><?= htmlspecialchars($order['id']) ?></td>
                                        <td><?= htmlspecialchars($order['first_name']) ?></td>
                                        <td><?= htmlspecialchars($order['last_name']) ?></td>
                                        <td><?= htmlspecialchars($order['destination']) ?></td>
                                        <td><?= formatDate($order['departure_date']) ?></td>
                                        <td><?= formatDate($order['arrival_date']) ?></td>
                                        <td><?= htmlspecialchars($order['persons']) ?></td>
                                        <td><?= formatCurrency((float)$order['price']) ?></td>
                                        <td><?= formatCurrency((float)$order['total']) ?></td>
                                        <td>
                                            <span class="badge <?= $order['status'] === 'Оплачено' ? 'paid' : 'pending' ?>">
                                                <?= htmlspecialchars($order['status']) ?>
                                            </span>
                                        </td>
                                        <td>
                                            <button class="action-btn edit-btn" data-id="<?= $order['id'] ?>">
                                                <i class="bi bi-pencil"></i>
                                            </button>
                                        </td>
                                        <td>
                                            <button class="action-btn delete-btn" data-id="<?= $order['id'] ?>">
                                                <i class="bi bi-trash3"></i>
                                            </button>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Уведомления -->
<div id="purchase-notification" class="purchase-notification">
    <div class
