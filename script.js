const App = {
    // --- Конфігурація ---
    config: {
        // !!! ВАЖЛИВО: Замініть цей ID на ID вашої опублікованої Google Таблиці
        publishedId: '2PACX-1vSyv3bAifxY2clEjSnLpiSFm3RwRULCbbuk19HGQYBiRmE-Llq81jmk5kalFY8v07Vt4DODTxltvVZa',
        gid: '0', // ID аркуша (0 для першого)
        autoRefreshInterval: 300000 // Інтервал авто-оновлення: 5 хвилин
    },

    // --- Стан додатку ---
    state: {
        profiles: {},
        currentSort: 'default', // 'default', 'balance', 'name'
        isLoading: false
    },

    // --- Кешовані DOM-елементи ---
    elements: {},

    /**
     * Ініціалізація: кешування елементів, прив'язка подій, завантаження даних.
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadData();
    },

    /**
     * Кешування DOM-елементів для швидкого доступу.
     */
    cacheElements() {
        this.elements.participantsSection = document.getElementById('participantsSection');
        this.elements.profileSection = document.getElementById('profileSection');
        this.elements.participantsContainer = document.getElementById('participantsContainer');
        this.elements.profileContainer = document.getElementById('profileContainer');
        this.elements.messageContainer = document.getElementById('messageContainer');
        this.elements.refreshBtn = document.getElementById('refreshBtn');
        this.elements.backBtn = document.getElementById('backBtn');
        this.elements.sortControls = document.getElementById('sortControls');
    },

    /**
     * Прив'язка обробників подій до елементів.
     */
    bindEvents() {
        // Кнопка оновлення
        this.elements.refreshBtn.addEventListener('click', () => this.loadData());
        
        // Кнопка "Назад"
        this.elements.backBtn.addEventListener('click', () => this.showView('participants'));
        
        // Делегування подій для кнопок сортування
        this.elements.sortControls.addEventListener('click', (e) => {
            if (e.target.matches('.sort-btn')) {
                this.handleSort(e.target.dataset.sort);
            }
        });

        // Делегування подій для карток (клік для перегляду профілю)
        this.elements.participantsContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.participant-card');
            if (card) {
                this.showView('profile', card.dataset.id);
            }
        });
        
        // Автоматичне оновлення даних
        setInterval(() => this.loadData(true), this.config.autoRefreshInterval);
    },

    /**
     * Завантаження та обробка даних з Google Sheets.
     * @param {boolean} isAutoRefresh - Прапорець, що вказує, чи є виклик автоматичним.
     */
    async loadData(isAutoRefresh = false) {
        if (this.state.isLoading) return; // Запобігання одночасним запитам
        this.state.isLoading = true;

        if (!isAutoRefresh) {
            this.showMessage('loading', 'Завантаження даних...');
        }

        try {
            const url = `https://docs.google.com/spreadsheets/d/e/${this.config.publishedId}/pub?gid=${this.config.gid}&single=true&output=csv`;
            const response = await fetch(url, { cache: 'no-cache' });

            if (!response.ok) {
                throw new Error(`Помилка мережі: ${response.statusText}. Перевірте ID таблиці та налаштування доступу.`);
            }

            const csvText = await response.text();
            this.parseAndStoreData(csvText);
            this.renderParticipants();
            
            if (!isAutoRefresh) {
               this.showMessage('success', `✅ Дані успішно оновлено.`, 3000);
            }

        } catch (error) {
            console.error('Помилка завантаження даних:', error);
            this.showMessage('error', `<strong>Помилка завантаження:</strong> ${error.message}<br><em>Показую демонстраційні дані.</em>`, 10000);
            this.loadDemoData(); // Завантаження демо-даних у випадку помилки
            this.renderParticipants();
        } finally {
            this.state.isLoading = false;
        }
    },

    /**
     * Парсинг CSV-тексту та збереження даних.
     * @param {string} csvText - Текст у форматі CSV.
     */
    parseAndStoreData(csvText) {
        const rows = this.parseCSV(csvText);
        // Очікуємо заголовок + хоча б один рядок даних
        if (rows.length < 2) {
             throw new Error('Таблиця порожня або містить лише заголовок.');
        }

        const newProfiles = {};
        // Пропускаємо заголовок (slice(1))
        rows.slice(1).forEach((row, index) => {
            // Перевіряємо, що є хоча б позивний
            if (row.length > 0 && row[0]?.trim()) {
                const id = row[0].trim().toLowerCase(); // Використовуємо позивний як ID для стабільності
                newProfiles[id] = {
                    id: id,
                    name: row[0]?.trim() || 'Без позивного',
                    position: row[1]?.trim() || 'Не вказано',
                    unit: row[2]?.trim() || 'Не вказано',
                    certificate: row[3]?.trim() || 'Немає',
                    balance: parseInt(row[4]?.trim(), 10) || 0,
                };
            }
        });

        if (Object.keys(newProfiles).length === 0) {
            throw new Error('Не знайдено валідних даних. Перевірте формат таблиці.');
        }

        this.state.profiles = newProfiles;
    },
    
    /**
     * Надійний парсер CSV, що обробляє лапки.
     * @param {string} text - Вхідний CSV текст.
     * @returns {Array<Array<string>>} - Масив рядків.
     */
    parseCSV(text) {
        const lines = text.replace(/\r/g, '').split('\n');
        return lines.map(line => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"' && inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        }).filter(row => row.length > 1 || row[0]); // Фільтруємо порожні рядки
    },

    /**
     * Завантаження демонстраційних даних.
     */
    loadDemoData() {
        this.state.profiles = {
            'фішер': { id: 'фішер', name: 'Фішер', position: 'Командир відділення', unit: 'Пісочний', certificate: '230', balance: 230 },
            'віхрь': { id: 'віхрь', name: 'Віхрь', position: 'Ст.стрілець', unit: 'Пісочний', certificate: '0', balance: 0 },
            'бумер': { id: 'бумер', name: 'Бумер', position: 'Розвідник', unit: 'Пісочний', certificate: '0', balance: 0 },
        };
    },
    
    /**
     * Обробка сортування.
     * @param {string} type - Тип сортування ('default', 'balance', 'name').
     */
    handleSort(type) {
        this.state.currentSort = type;
        // Оновлення активного стану кнопок
        this.elements.sortControls.querySelectorAll('.sort-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.sort === type);
        });
        this.renderParticipants();
    },

    /**
     * Відображення списку учасників.
     */
    renderParticipants() {
        const profilesArray = Object.values(this.state.profiles);
        
        // Сортування масиву
        profilesArray.sort((a, b) => {
            switch (this.state.currentSort) {
                case 'balance': return b.balance - a.balance;
                case 'name': return a.name.localeCompare(b.name, 'uk');
                default: return 0; // Залишаємо порядок з таблиці
            }
        });
        
        if (profilesArray.length === 0) {
            this.elements.participantsContainer.innerHTML = '<p class="message">Немає даних для відображення.</p>';
            return;
        }

        // Генерація HTML та вставка в DOM
        this.elements.participantsContainer.innerHTML = profilesArray.map(p => this.createParticipantCardHTML(p)).join('');
    },

    /**
     * Відображення конкретного профілю.
     * @param {string} profileId - ID профілю для відображення.
     */
    renderProfile(profileId) {
        const profile = this.state.profiles[profileId];
        if (!profile) {
            this.elements.profileContainer.innerHTML = '<p class="message error">Профіль не знайдено.</p>';
            return;
        }
        this.elements.profileContainer.innerHTML = this.createProfileHTML(profile);
    },
    
    /**
     * Перемикання між виглядами (список / профіль).
     * @param {'participants' | 'profile'} viewName - Назва вигляду.
     * @param {string | null} id - ID профілю (для вигляду 'profile').
     */
    showView(viewName, id = null) {
        if (viewName === 'profile') {
            this.elements.participantsSection.classList.add('hidden');
            this.elements.profileSection.classList.remove('hidden');
            this.renderProfile(id);
            window.scrollTo(0, 0); // Прокрутка сторінки вгору
        } else {
            this.elements.profileSection.classList.add('hidden');
            this.elements.participantsSection.classList.remove('hidden');
        }
    },
    
    /**
     * Відображення повідомлень для користувача.
     * @param {'loading' | 'success' | 'error'} type - Тип повідомлення.
     * @param {string} message - Текст повідомлення.
     * @param {number | null} timeout - Час в мс, після якого повідомлення зникне.
     */
    showMessage(type, message, timeout = null) {
        const msgEl = this.elements.messageContainer;
        if(msgEl.timeoutId) clearTimeout(msgEl.timeoutId);
        
        msgEl.innerHTML = `<div class="message ${type}">${message}</div>`;
        msgEl.classList.remove('hidden');

        if (timeout) {
            msgEl.timeoutId = setTimeout(() => {
                msgEl.classList.add('hidden');
            }, timeout);
        }
    },

    // --- Функції-шаблонізатори для HTML ---

    /**
     * Створює HTML для картки учасника.
     */
    createParticipantCardHTML(p) {
        const avatarUrl = this.getImageUrl(null, p.name);
        return `
            <div class="participant-card" data-id="${p.id}">
                <div class="card-header">
                    <img src="${avatarUrl}" alt="Аватар ${p.name}" class="participant-avatar" loading="lazy">
                    <div class="name-role-group">
                        <div class="participant-name">${p.name}</div>
                        <div class="participant-position">${p.position}</div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="info-item">
                        <span class="info-label">Підрозділ:</span>
                        <span class="info-value">${p.unit}</span>
                    </div>
                     <div class="info-item">
                        <span class="info-label">Сертифікат:</span>
                        <span class="info-value">${p.certificate}</span>
                    </div>
                    <div class="info-item balance">
                        <span class="info-label">Баланс:</span>
                        <span class="info-value balance-value">${p.balance} ₴</span>
                    </div>
                </div>
            </div>`;
    },


    /**
     * Створює HTML для сторінки профілю.
     */
    createProfileHTML(p) {
        const avatarUrl = this.getImageUrl(null, p.name, 120); // Аватар більшого розміру
        return `
            <div class="profile-header">
                <img src="${avatarUrl}" alt="Аватар ${p.name}" class="profile-avatar">
                <h2 class="profile-name">${p.name}</h2>
                <p class="profile-position">${p.position}</p>
            </div>
            <div class="profile-content">
                <div class="profile-section">
                    <h3 class="section-title">Основна інформація</h3>
                    <div class="info-grid">
                        <div class="info-card">
                            <div class="info-card-title">Підрозділ</div>
                            <div class="info-card-value">${p.unit}</div>
                        </div>
                         <div class="info-card">
                            <div class="info-card-title">Сертифікат</div>
                            <div class="info-card-value">${p.certificate}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-card-title">Баланс</div>
                            <div class="info-card-value balance">${p.balance} ₴</div>
                        </div>
                    </div>
                </div>
            </div>`;
    },

    /**
     * Генерує URL для аватара або створює SVG-заглушку.
     */
    getImageUrl(url, name, size = 60) {
        // Якщо є реальний URL, повертаємо його
        if (url && (url.startsWith('http') || url.startsWith('data:'))) {
            return url;
        }
        
        // Створення SVG-заглушки з ініціалами
        const initials = name ? name.trim().charAt(0).toUpperCase() : '?';
        const colors = ['#4a6fa5', '#1e88e5', '#3949ab', '#5e35b1', '#00897b', '#43a047', '#e53935', '#d81b60'];
        const color = colors[name.length % colors.length];
        const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="${size/2}" font-family="Inter, sans-serif" font-weight="bold">${initials}</text></svg>`;
        
        // Кодуємо SVG в base64
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    }
};

// Запуск додатку після завантаження DOM
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
