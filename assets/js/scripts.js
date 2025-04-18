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

    // Настройка всех обработчиков событий
    function setupEventListeners() {
        // Форма заказа
        document.getElementById('order-form').addEventListener('submit', handleFormSubmit);
        document.getElementById('cancel-btn').addEventListener('click', handleCancelEdit);
        
        // Поиск
        document.getElementById('table-search').addEventListener('input', handleSearch);
        
        // Расчет стоимости
        document.getElementById('persons').addEventListener('input', calculateTotalCost);
        document.getElementById('tour-price').addEventListener('input', calculateTotalCost);
        
        // Сортировка таблицы
        document.querySelectorAll('#orders-table th[data-type]').forEach((header, index) => {
            header.addEventListener('click', () => {
                const type = header.getAttribute('data-type');
                sortTable(index, type);
            });
        });
    }

    // Загрузка заказов с сервера
    async function loadOrders() {
        try {
            const search = document.getElementById('table-search').value;
            const url = new URL('tso/ajax/get_orders.php', window.location.origin);
            
            if (search) {
                url.searchParams.append('search', search);
            }
            if (currentSort.column) {
                url.searchParams.append('sort', currentSort.column);
                url.searchParams.append('dir', currentSort.direction);
            }
    
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const orders = await response.json();
            renderOrdersTable(orders);
            
            // Обновляем сообщение "Нет результатов"
            const noResults = document.getElementById('no-results');
            if (noResults) {
                noResults.style.display = orders.length ? 'none' : 'block';
            }
        } catch (error) {
            console.error('Ошибка загрузки заказов:', error);
            const noResults = document.getElementById('no-results');
            if (noResults) {
                noResults.style.display = 'block';
            }
        }
    }

    // Отображение заказов в таблице
    function renderOrdersTable(orders) {
        const tbody = document.getElementById('orders-body');
        tbody.innerHTML = '';

        orders.forEach(order => {
            const row = document.createElement('tr');
            row.dataset.id = order.id;
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${order.first_name}</td>
                <td>${order.last_name}</td>
                <td>${order.destination}</td>
                <td>${formatDate(order.departure_date)}</td>
                <td>${formatDate(order.arrival_date)}</td>
                <td>${order.persons}</td>
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
            tbody.appendChild(row);
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
            showLoader();
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

            // Показ уведомления о покупке для новых оплаченных заказов
            if (!isEditMode && formData.status === 'Paid') {
                showPurchaseNotification(
                    formData.first_name,
                    formData.last_name,
                    formData.destination
                );
            }
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            showNotification(`Ошибка: ${error.message}`, 'error');
        } finally {
            hideLoader();
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
        document.getElementById('status').value = cells[9].textContent.includes('Оплачено') ? 'Paid' : 'Pending';

        // Обновление UI
        document.getElementById('form-title').textContent = 'Редактировать заказ';
        document.getElementById('submit-btn').textContent = 'Обновить заказ';
        document.getElementById('cancel-btn').style.display = 'inline-block';
        
        // Прокрутка к форме
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    }

    // Удаление заказа
    async function handleDeleteOrder(event) {
        const orderId = event.currentTarget.dataset.id;
        
        if (!confirm(`Вы уверены, что хотите удалить заказ ${orderId}?`)) {
            return;
        }

        try {
            showLoader();
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
            hideLoader();
        }
    }

    // Поиск заказов
    function handleSearch(event) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadOrders();
        }, 300);
    }

    // Сортировка таблицы
    function sortTable(columnIndex, type) {
        const headers = document.querySelectorAll('#orders-table th');
        headers.forEach(h => h.classList.remove('sorted-asc', 'sorted-desc'));

        if (currentSort.column === columnIndex) {
            currentSort.direction = currentSort.direction === 'ASC' ? 'DESC' : 'ASC';
        } else {
            currentSort.column = columnIndex;
            currentSort.direction = 'ASC';
        }

        headers[columnIndex].classList.add(
            currentSort.direction === 'ASC' ? 'sorted-asc' : 'sorted-desc'
        );

        loadOrders();
    }

    // Генерация ID заказа
    async function generateOrderId() {
        try {
            const response = await fetch('ajax/generate_order_id.php');
            
            if (!response.ok) {
                throw new Error('Ошибка генерации ID');
            }
            
            const data = await response.json();
            document.getElementById('order-id').value = data.id || '1/25-FD';
        } catch (error) {
            console.error('Ошибка генерации ID:', error);
            // Резервный вариант
            const randomId = Math.floor(Math.random() * 1000) + 6;
            document.getElementById('order-id').value = `${randomId}/25-FD`;
        }
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
        
        // Сброс ошибок валидации
        document.querySelectorAll('.error-message').forEach(el => {
            el.style.display = 'none';
        });
        document.querySelectorAll('.error').forEach(el => {
            el.classList.remove('error');
        });
    }

    // Отмена редактирования
    function handleCancelEdit() {
        resetForm();
    }

    // Валидация формы
    function validateForm() {
        let isValid = true;
        
        // Валидация имени
        const firstName = document.getElementById('first-name').value.trim();
        isValid &= validateField('first-name', 
            /^[А-ЯЁа-яёA-Za-z]{2,30}$/.test(firstName),
            'Имя должно содержать 2-30 букв');

        // Валидация фамилии
        const lastName = document.getElementById('last-name').value.trim();
        isValid &= validateField('last-name', 
            /^[А-ЯЁа-яёA-Za-z]{2,30}$/.test(lastName),
            'Фамилия должна содержать 2-30 букв');

        // Валидация направления
        const destination = document.getElementById('destination').value.trim();
        isValid &= validateField('destination', 
            destination.length >= 2 && destination.length <= 50,
            'Направление должно содержать 2-50 символов');

        // Валидация даты вылета
        const departureDate = document.getElementById('departure-date').value;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        isValid &= validateField('departure-date', 
            departureDate && new Date(departureDate) >= today,
            'Дата вылета должна быть не раньше сегодняшнего дня');

        // Валидация даты прилета
        const arrivalDate = document.getElementById('arrival-date').value;
        isValid &= validateField('arrival-date', 
            arrivalDate && new Date(arrivalDate) > new Date(departureDate),
            'Дата прилета должна быть позже даты вылета');

        // Валидация количества человек
        const persons = document.getElementById('persons').value;
        isValid &= validateField('persons', 
            persons >= 1 && persons <= 10,
            'Количество человек должно быть от 1 до 10');

        // Валидация цены тура
        const price = document.getElementById('tour-price').value;
        const priceValue = parseCurrency(price);
        isValid &= validateField('tour-price', 
            priceValue > 0 && /^\d{1,6}([.,]\d{1,2})?$/.test(price),
            'Цена должна быть положительным числом (макс. 2 знака после запятой)');

        // Валидация статуса
        const status = document.getElementById('status').value;
        isValid &= validateField('status', 
            status === 'Paid' || status === 'Pending',
            'Пожалуйста, выберите статус');

        return isValid;
    }

    // Валидация отдельного поля
    function validateField(fieldId, isValid, errorMessage) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(`${fieldId}-error`);

        if (isValid) {
            field.classList.remove('is-invalid');
            errorElement.style.display = 'none';
            return true;
        } else {
            field.classList.add('is-invalid');
            errorElement.textContent = errorMessage;
            errorElement.style.display = 'block';
            return false;
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
        }, 100);
    }

    // Уведомление о покупке
    function showPurchaseNotification(firstName, lastName, destination) {
        const notification = document.getElementById('purchase-notification');
        if (!notification) return;
        
        const content = notification.querySelector('.notification-content');
        if (content) {
            content.textContent = `${firstName} ${lastName} приобрел тур в ${destination}`;
            notification.classList.add('show');
            
            setTimeout(() => {
                notification.classList.remove('show');
            }, 5000);
        }
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
        
        arrivalInput.addEventListener('change', function() {
            if (departureInput.value && this.value) {
                validateField('arrival-date', 
                    new Date(this.value) > new Date(departureInput.value),
                    'Дата прилета должна быть позже даты вылета');
            }
        });
    }

    // Показать индикатор загрузки
    function showLoader() {
        document.getElementById('submit-btn').disabled = true;
        document.getElementById('submit-btn').innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ${isEditMode ? 'Обновление...' : 'Добавление...'}
        `;
    }

    // Скрыть индикатор загрузки
    function hideLoader() {
        document.getElementById('submit-btn').disabled = false;
        document.getElementById('submit-btn').innerHTML = isEditMode ? 'Обновить заказ' : 'Добавить заказ';
    }

    // Демонстрационные уведомления (можно удалить в продакшене)
    setInterval(() => {
        if (Math.random() > 0.7) { // 30% chance
            const destinations = ['Москва', 'Сочи', 'Калининград', 'Казань', 'Санкт-Петербург'];
            const names = ['Иван', 'Петр', 'Анна', 'Мария', 'Алексей'];
            const randomName = names[Math.floor(Math.random() * names.length)];
            const randomDestination = destinations[Math.floor(Math.random() * destinations.length)];
            showPurchaseNotification(randomName, 'Иванов', randomDestination);
        }
    }, 10000);
});
