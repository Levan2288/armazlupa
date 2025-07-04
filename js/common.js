document.addEventListener('DOMContentLoaded', () => {
    // --- Глобальные элементы, общие для всех страниц ---
    const elements = {
        navMenu: document.querySelector('.nav-menu'),
        sidebarNav: document.querySelector('.sidebar-nav'),
        langSwitcher: document.querySelector('.lang-switcher'),
        menuToggle: document.querySelector('.mobile-menu-toggle'),
        sidebar: document.querySelector('.sidebar'),
        overlay: document.querySelector('.overlay'),
        closeBtn: document.querySelector('.close-btn'),
    };

    let currentLang = 'ru';

    // --- Навигация ---
    const navLinks = {
        home: { href: 'index.html', key: 'nav_home' },
        participants: { href: 'participants.html', key: 'nav_participants' },
        organizers: { href: 'organizers.html', key: 'nav_organizers' },
        price: { href: 'price.html', key: 'nav_price' },
    };

    function renderNav(lang) {
        const T = translations[lang];
        const pageClass = document.body.className;

        const navHTML = `
            <ul>
                ${Object.keys(navLinks).map(page => `
                    <li>
                        <a href="${navLinks[page].href}" class="${pageClass === 'page-' + page ? 'active' : ''}">
                            ${T[navLinks[page].key]}
                        </a>
                    </li>
                `).join('')}
            </ul>
        `;
        elements.navMenu.innerHTML = navHTML;
        elements.sidebarNav.innerHTML = navHTML;
    }

    // --- Переключение языка ---
    function applyTranslations(lang) {
        const T = translations[lang];
        document.querySelectorAll('[data-lang-key]').forEach(el => {
            const key = el.dataset.langKey;
            if (T[key]) {
                el.innerHTML = T[key];
            }
        });
        document.documentElement.lang = lang;
    }

    function changeLanguage(lang) {
        if (!translations[lang] || lang === currentLang) return;
        
        currentLang = lang;
        localStorage.setItem('lang', lang);

        // Обновляем UI
        elements.langSwitcher.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });

        renderNav(lang);
        applyTranslations(lang);
    }

    // --- Мобильное меню ---
    function openMobileMenu() {
        elements.sidebar.classList.add('active');
        elements.overlay.classList.add('active');
    }

    function closeMobileMenu() {
        elements.sidebar.classList.remove('active');
        elements.overlay.classList.remove('active');
    }

    // --- Привязка событий ---
    function bindEvents() {
        elements.langSwitcher.addEventListener('click', e => {
            if (e.target.matches('.lang-btn')) {
                changeLanguage(e.target.dataset.lang);
            }
        });

        elements.menuToggle.addEventListener('click', openMobileMenu);
        elements.closeBtn.addEventListener('click', closeMobileMenu);
        elements.overlay.addEventListener('click', closeMobileMenu);
    }

    // --- Инициализация ---
    function init() {
        // Определяем язык
        const savedLang = localStorage.getItem('lang');
        const browserLang = navigator.language.slice(0, 2);
        let initialLang = savedLang || browserLang;
        if (!translations[initialLang]) {
            initialLang = 'ru';
        }
        
        currentLang = initialLang;

        // Применяем язык и рендерим элементы
        elements.langSwitcher.querySelector(`[data-lang="${currentLang}"]`).classList.add('active');
        renderNav(currentLang);
        applyTranslations(currentLang);
        
        bindEvents();
    }

    init();
});
