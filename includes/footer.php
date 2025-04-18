</main>

<footer class="bg-light py-4 mt-auto">
    <div class="container-xxl">
        <div class="row align-items-center">
            <div class="col-md-6">
                <p class="mb-0 text-muted">
                    &copy; <?= date('Y') ?> Система управления заказами. Все права защищены.
                </p>
            </div>
            <div class="col-md-6 text-md-end">
                <p class="mb-0 text-muted">
                    Версия: 1.0.0 | 
                    <a href="/privacy-policy" class="text-decoration-none">Политика конфиденциальности</a>
                </p>
            </div>
        </div>
    </div>
</footer>

    <!-- уведомление о покупки -->
    <div id="purchase-notification" class="purchase-notification">
        <div class="notification-content"></div>
    </div>

<!-- Скрипты -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script src="<?= BASE_URL ?>assets/js/script.js"></script>

</body>
</html>
