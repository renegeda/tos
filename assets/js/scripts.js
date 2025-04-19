document.addEventListener('DOMContentLoaded', () => {
    // Состояние приложения
    let currentSort = { column: 'id', direction: 'ASC' };
    let isEditMode = false;
    let currentEditId = null;
    let searchTimeout = null;

    // Инициализация
    generateOrderId();
    loadOrders();
    setupEventListeners();
    setupDateValidation();

    // Настройка обработчиков событий
    function setupEventListeners() {
        // Форма заказа
        document.getElementById('order-form')?.addEventListener('submit', handleFormSubmit);
        document.getElementById('cancel-btn')?.addEventListener('click', handleCancelEdit);
        
        // Поиск
        document.getElementById('table-search')?.addEventListener('input', handleSearch);
        
        // Расчет стоимости
        document.getElementById('persons')?.addEventListener('input', calculateTotalCost);
        document.getElementById('tour-price')?.addEventListener('input', calculateTotalCost);
        
        // Сортировка таблицы
        document.querySelectorAll('#orders-table th[data-sort]').forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-sort');
                toggleSort(column);
                updateSortIndicators();
                loadOrders();
            });
        });
    }

    // Переключение направления сортировки
    function toggleSort(column) {
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'ASC' ? 'DESC' : 'ASC';
        } else {
            currentSort.column = column;
            currentSort.direction = 'ASC';
        }
    }

    // Обновление индикаторов сортировки
    function updateSortIndicators() {
        document.querySelectorAll('#orders-table th[data-sort]').forEach(header => {
            header.classList.remove('sorted-asc', 'sorted-desc');
            const column = header.getAttribute('data-sort');
            if (column === currentSort.column) {
                header.classList.add(`sorted-${currentSort.direction.toLowerCase()}`);
            }
        });
    }

    // Генерация ID заказа
    async function generateOrderId() {
        try {
            const response = await fetch('ajax/generate_order_id.php');
            if (!response.ok) throw new Error('Ошибка генерации ID');
            
            const data = await response.json();
            const orderIdField = document.getElementById('order-id');
            if (orderIdField) orderIdField.value = data.id || '1/25-FD';
        } catch (error) {
            console.error('Ошибка генерации ID:', error);
            const orderIdField = document.getElementById('order-id');
            if (orderIdField) orderIdField.value = `${Math.floor(Math.random() * 1000) + 6}/25-FD`;
        }
    }

    // Загрузка заказов с сервера
    async function loadOrders() {
        try {
            showLoader('#orders-table');
            const search = document.getElementById('table-search')?.value || '';
            const url = new URL('tso/ajax/get_orders.php', window.location.origin);
            
            if (search) url.searchParams.append('search', search);
            url.searchParams.append('sort', currentSort.column);
            url.searchParams.append('dir', currentSort.direction);
    
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const result = await response.json();
            
            if (!result.success || !Array.isArray(result.data)) {
                throw new Error('Некорректный формат данных');
            }
            
            renderOrdersTable(result.data);
            toggleNoResults(result.data.length === 0);
            
        } catch (error) {
            console.error('Ошибка загрузки заказов:', error);
            showNotification(`Ошибка: ${error.message}`, 'error');
            toggleNoResults(true);
        } finally {
            hideLoader('#orders-table');
        }
    }

// Отображение заказов в таблице
    function renderOrdersTable(orders) {
        const tbody = document.querySelector('#orders-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        orders.forEach(order => {
            const tr = document.createElement('tr');
            tr.dataset.id = order.id;
            tr.innerHTML = `
                <td>${order.id || ''}</td>
                <td>${order.first_name || ''}</td>
                <td>${order.last_name || ''}</td>
                <td>${order.destination || ''}</td>
                <td>${formatDate(order.departure_date)}</td>
                <td>${formatDate(order.arrival_date)}</td>
                <td>${order.persons || ''}</td>
                <td class="price-cell">${formatCurrency(order.price)}</td>
                <td class="price-cell">${formatCurrency(order.total)}</td>
                <td><span class="badge ${order.status === 'Оплачено' ? 'paid' : 'pending'}">${order.status}</span></td>
                <td class="action-column">
                    <button class="action-btn edit-btn" data-id="${order.id}" title="Изменить">
                        <i class="bi bi-pencil"></i>
                    </button>
                </td>
                <td class="action-column">
                    <button class="action-btn delete-btn" data-id="${order.id}" title="Удалить">
                        <i class="bi bi-trash3"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Назначение обработчиков для кнопок
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', handleEditOrder);
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDeleteOrder);
        });
    }

    // Обработка отправки формы
    async function handleFormSubmit(event) {
        event.preventDefault();
        if (!validateForm()) return;

        const formData = {
            first_name: document.getElementById('first-name').value.trim(),
            last_name: document.getElementById('last-name').value.trim(),
            destination: document.getElementById('destination').value.trim(),
            departure_date: document.getElementById('departure-date').value,
            arrival_date: document.getElementById('arrival-date').value,
            persons: parseInt(document.getElementById('persons').value),
            price: parseCurrency(document.getElementById('tour-price').value),
            status: document.getElementById('status').value
        };

        try {
            showLoader('#submit-btn');
            const url = isEditMode 
                ? `ajax/update_order.php?id=${currentEditId}`
                : 'ajax/add_order.php';

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Неизвестная ошибка');
            }

            showNotification(
                isEditMode ? 'Заказ успешно обновлен!' : 'Заказ успешно добавлен!',
                'success'
            );
            
            loadOrders();
            resetForm();

        } catch (error) {
            console.error('Ошибка сохранения:', error);
            showNotification(`Ошибка: ${error.message}`, 'error');
        } finally {
            hideLoader('#submit-btn');
        }
    }

    // Редактирование заказа
    function handleEditOrder(event) {
        const orderId = event.currentTarget.dataset.id;
        const row = document.querySelector(`tr[data-id="${orderId}"]`);
        
        if (!row) return;

        const cells = row.cells;
        currentEditId = orderId;
        isEditMode = true;

        // Заполнение формы
        document.getElementById('order-id').value = cells[0].textContent;
        document.getElementById('first-name').value = cells[1].textContent;
        document.getElementById('last-name').value = cells[2].textContent;
        document.getElementById('destination').value = cells[3].textContent;
        document.getElementById('departure-date').value = formatDateForInput(cells[4].textContent);
        document.getElementById('arrival-date').value = formatDateForInput(cells[5].textContent);
        document.getElementById('persons').value = cells[6].textContent;
        document.getElementById('tour-price').value = parseCurrency(cells[7].textContent);
        document.getElementById('total-cost').value = parseCurrency(cells[8].textContent);
        document.getElementById('status').value = cells[9].querySelector('.badge').textContent.includes('Оплачено') ? 'Paid' : 'Pending';

        // Обновление UI
        document.getElementById('form-title').textContent = 'Редактировать заказ';
        document.getElementById('submit-btn').textContent = 'Обновить заказ';
        document.getElementById('cancel-btn').style.display = 'inline-block';
    }

    // Удаление заказа
    async function handleDeleteOrder(event) {
        const orderId = event.currentTarget.dataset.id;
        
        if (!confirm(`Вы уверены, что хотите удалить заказ ${orderId}?`)) {
            return;
        }

        try {
            showLoader('#orders-table');
            const response = await fetch(`ajax/delete_order.php?id=${orderId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Не удалось удалить заказ');
            }

            showNotification('Заказ успешно удален!', 'success');
            loadOrders();
            
            // Сброс формы, если удаляем редактируемый заказ
            if (isEditMode && currentEditId === orderId) {
                resetForm();
            }
        } catch (error) {
            console.error('Ошибка удаления:', error);
            showNotification(`Ошибка: ${error.message}`, 'error');
        } finally {
            hideLoader('#orders-table');
        }
    }

    // Поиск заказов
    function handleSearch(event) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadOrders();
        }, 300);
    }

    // Расчет общей стоимости
    function calculateTotalCost() {
        const persons = parseInt(document.getElementById('persons').value) || 0;
        const price = parseCurrency(document.getElementById('tour-price').value) || 0;
        const total = persons * price;
        document.getElementById('total-cost').value = formatCurrency(total, false);
    }

    // Сброс формы
    function resetForm() {
        document.getElementById('order-form').reset();
        isEditMode = false;
        currentEditId = null;
        document.getElementById('form-title').textContent = 'Добавить новый заказ';
        document.getElementById('submit-btn').textContent = 'Добавить заказ';
        document.getElementById('cancel-btn').style.display = 'none';
        generateOrderId();
        calculateTotalCost();
    }

    // Отмена редактирования
    function handleCancelEdit() {
        resetForm();
    }

    // Валидация формы
    function validateForm() {
        let isValid = true;
        
        // Проверка полей формы
        isValid &= validateField('first-name', 
            /^[А-ЯЁа-яёA-Za-z]{2,30}$/.test(document.getElementById('first-name').value.trim()),
            'Имя должно содержать 2-30 букв');

        isValid &= validateField('last-name', 
            /^[А-ЯЁа-яёA-Za-z]{2,30}$/.test(document.getElementById('last-name').value.trim()),
            'Фамилия должна содержать 2-30 букв');

        isValid &= validateField('destination', 
            document.getElementById('destination').value.trim().length >= 2,
            'Направление должно содержать минимум 2 символа');

        isValid &= validateField('departure-date', 
            document.getElementById('departure-date').value,
            'Укажите дату вылета');

        isValid &= validateField('arrival-date', 
            document.getElementById('arrival-date').value && 
            new Date(document.getElementById('arrival-date').value) > new Date(document.getElementById('departure-date').value),
            'Дата прилета должна быть позже даты вылета');

        isValid &= validateField('persons', 
            document.getElementById('persons').value >= 1,
            'Укажите количество человек');

        isValid &= validateField('tour-price', 
            parseCurrency(document.getElementById('tour-price').value) > 0,
            'Укажите цену тура');

        return isValid;
    }

    // Валидация отдельного поля
    function validateField(fieldId, isValid, errorMessage) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(`${fieldId}-error`);

        if (isValid) {
            field.classList.remove('is-invalid');
            if (errorElement) errorElement.style.display = 'none';
            return true;
        } else {
            field.classList.add('is-invalid');
            if (errorElement) {
                errorElement.textContent = errorMessage;
                errorElement.style.display = 'block';
            }
            return false;
        }
    }

    // Показать индикатор загрузки
    function showLoader(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add('loading');
            element.disabled = true;
            if (selector === '#submit-btn') {
                element.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Загрузка...`;
            }
        }
    }

    // Скрыть индикатор загрузки
    function hideLoader(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.remove('loading');
            element.disabled = false;
            if (selector === '#submit-btn') {
                element.innerHTML = isEditMode ? 'Обновить заказ' : 'Добавить заказ';
            }
        }
    }

    // Показ уведомления
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
        notification.style.zIndex = '9999';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Форматирование даты
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
    }

    // Форматирование даты для input[type="date"]
    function formatDateForInput(dateString) {
        if (!dateString) return '';
        const [day, month, year] = dateString.split('.');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Форматирование валюты
    function formatCurrency(value, withSymbol = true) {
        if (isNaN(value)) return withSymbol ? '0 ₽' : '0';
        return parseFloat(value).toLocaleString('ru-RU', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + (withSymbol ? ' ₽' : '');
    }

    // Парсинг валюты
    function parseCurrency(currencyString) {
        if (!currencyString) return 0;
        const cleaned = currencyString.replace(/[^\d,.-]/g, '');
        const normalized = cleaned.replace(',', '.');
        return parseFloat(normalized) || 0;
    }

    // Валидация дат
    function setupDateValidation() {
        const departureInput = document.getElementById('departure-date');
        const arrivalInput = document.getElementById('arrival-date');
        
        // Установка минимальной даты вылета (сегодня)
        const today = new Date().toISOString().split('T')[0];
        departureInput.min = today;
        
        departureInput.addEventListener('change', function() {
            if (this.value) {
                const minArrivalDate = new Date(this.value);
                minArrivalDate.setDate(minArrivalDate.getDate() + 1);
                arrivalInput.min = minArrivalDate.toISOString().split('T')[0];
                
                if (arrivalInput.value && new Date(arrivalInput.value) <= new Date(this.value)) {
                    arrivalInput.value = '';
                    validateField('arrival-date', false, 'Дата прилета должна быть позже даты вылета');
                }
            }
        });
    }

    // Переключение сообщения "Нет результатов"
    function toggleNoResults(show) {
        const noResults = document.getElementById('no-results');
        if (noResults) {
            noResults.style.display = show ? 'block' : 'none';
        }
    }

    // Вспомогательные функции
    function toggleNoResults(show) {
        const noResults = document.getElementById('no-results');
        if (noResults) noResults.style.display = show ? 'block' : 'none';
    }

    function formatDate(dateString) {
        return dateString ? new Date(dateString).toLocaleDateString('ru-RU') : '';
    }

    function formatCurrency(value) {
        return value ? parseFloat(value).toLocaleString('ru-RU', {minimumFractionDigits: 2}) + ' ₽' : '0 ₽';
    }

    function calculateTotalCost() {
        const persons = parseInt(document.getElementById('persons').value) || 0;
        const price = parseFloat(document.getElementById('tour-price').value) || 0;
        document.getElementById('total-cost').value = formatCurrency(persons * price);
    }
    
    // Функция для показа демо-уведомлений
    function showDemoNotification(name, lastName, destination) {
        const notification = document.getElementById('demo-notification');
        if (!notification) return;
        
        const content = notification.querySelector('.demo-notification-content');
        if (!content) return;
    
        // Останавливаем предыдущие анимации
        clearTimeout(notification.hideTimeout);
        notification.classList.remove('show');
    
        // Обновляем текст
        content.textContent = `${name} ${lastName} только что купил(а) тур в ${destination}`;
        
        // Показываем уведомление
        setTimeout(() => {
            notification.classList.add('show');
        }, 50);
        
        // Скрываем через 7 секунд
        notification.hideTimeout = setTimeout(() => {
            notification.classList.remove('show');
        }, 7000);
    }
    
    // Интервал для демо-уведомлений (можно удалить в продакшене)
    setInterval(() => {
        if (Math.random() > 0.7) { // 30% chance
            const destinations = ['Москва', 'Сочи', 'Калининград', 'Казань', 'Санкт-Петербург'];
            const names = ['Иван', 'Петр', 'Анна', 'Мария', 'Алексей'];
            const randomName = names[Math.floor(Math.random() * names.length)];
            const randomDestination = destinations[Math.floor(Math.random() * destinations.length)];
            showDemoNotification(randomName, 'Иванов', randomDestination);
        }
    }, 10000); // Каждые 10 секунд
});
