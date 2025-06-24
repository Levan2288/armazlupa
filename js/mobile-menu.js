document.addEventListener('DOMContentLoaded', () => {
    // Находим все необходимые элементы в DOM
    const menuToggle = document.querySelector('.mobile-menu-toggle'); // Кнопка "гамбургер"
    const closeBtn = document.querySelector('.close-btn'); // Кнопка закрытия внутри меню
    const sidebar = document.querySelector('.sidebar'); // Само боковое меню
    const overlay = document.querySelector('.overlay'); // Полупрозрачный фон

    /**
     * Функция для открытия мобильного меню.
     * Добавляет класс 'active' к меню и фону, чтобы сделать их видимыми.
     */
    const openMenu = () => {
        if (sidebar && overlay) {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        }
    };

    /**
     * Функция для закрытия мобильного меню.
     * Удаляет класс 'active' у меню и фона, чтобы скрыть их.
     */
    const closeMenu = () => {
        if (sidebar && overlay) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    };

    // Проверяем, что все элементы найдены на странице, прежде чем добавлять обработчики
    if (menuToggle && sidebar && overlay && closeBtn) {
        // Назначаем обработчики событий
        menuToggle.addEventListener('click', openMenu); // Клик по гамбургеру открывает меню
        closeBtn.addEventListener('click', closeMenu);   // Клик по кнопке "X" закрывает меню
        overlay.addEventListener('click', closeMenu);    // Клик по фону также закрывает меню
    }
});
