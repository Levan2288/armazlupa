document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            // При кліку на кнопку додаємо/видаляємо клас 'active' у меню,
            // що робить його видимим або прихованим згідно зі стилями в CSS.
            navMenu.classList.toggle('active');
        });
    }
});