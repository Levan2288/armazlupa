import {loadTranslations} from './translation.js';


// --- Глобальные элементы, общие для всех страниц ---
let currentLang = 'ru'; // Язык по умолчанию
let elements = {};

function changeLanguage(lang) {
    if (lang === currentLang) return;
    currentLang = lang;
    localStorage.setItem('lang', lang);
    elements.langSwitcher.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    loadTranslations(lang);
}

function openMobileMenu() {
    elements.sidebar.classList.add('active');
    elements.overlay.classList.add('active');
}

function closeMobileMenu() {
    elements.sidebar.classList.remove('active');
    elements.overlay.classList.remove('active');
}

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

function init() {
    
    // Переопределяем элементы после вставки header
    elements = {
        navMenu: document.querySelector('.nav-menu'),
        sidebarNav: document.querySelector('.sidebar-nav'),
        langSwitcher: document.querySelector('.lang-switcher'),
        menuToggle: document.querySelector('.mobile-menu-toggle'),
        sidebar: document.querySelector('.sidebar'),
        overlay: document.querySelector('.overlay'),
        closeBtn: document.querySelector('.close-btn'),
    };
    // Определяем язык
    const savedLang = localStorage.getItem('lang');
    const supportedLangs = ['ru', 'en', 'uk'];
    let browserLang = navigator.language.split('-')[0];
    if (!supportedLangs.includes(browserLang)) {
        browserLang = supportedLangs[0]; // Применяем стандартный язык
    }
    currentLang = savedLang || browserLang;
    // Применяем язык и рендерим элементы
    elements.langSwitcher.querySelector(`[data-lang="${currentLang}"]`).classList.add('active');
    bindEvents();
    loadTranslations(currentLang);
}

document.addEventListener('DOMContentLoaded', () => {
    fetch('header.html')
    .then(response => response.text())
    .then(data => {
        const headerContainer = document.getElementById('header-container');
        if (headerContainer) {
            headerContainer.innerHTML = data;    
        }
        const currentlocation = location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-menu a').forEach(link => {
        if (link.getAttribute('href') === currentlocation) {
            link.classList.add('active');
        }
        else {
            link.classList.remove('active');
        }
        });
        init(); // Инициализация после загрузки header
        });
    
});