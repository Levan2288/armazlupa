<<<<<<< Updated upstream
const App = {
    // --- Конфігурація ---
    config: {
        // !!! ВАЖЛИВО: Замініть цей ID на ID вашої опублікованої Google Таблиці
        publishedId: '2PACX-1vSyv3bAifxY2clEjSnLpiSFm3RwRULCbbuk19HGQYBiRmE-Llq81jmk5kalFY8v07Vt4DODTxltvVZa',
        gid: '0', // ID аркуша (0 для першого)
        autoRefreshInterval: 30000, // Інтервал авто-оновлення: 30 секунд
        defaultImageUrl: 'https://i.pinimg.com/736x/87/a4/08/87a408ed3ffa34ff6d8c32f9bf7f72a7.jpg'
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
            this.showMessage('error', `<strong>Помилка завантаження:</strong> ${error.message}<br><em>Показано демонстраційні дані.</em>`, 5000);
            this.loadDemoData(); // Завантаження демо-даних у випадку помилки
            this.renderParticipants();
        } finally {
            document.getElementById('participant-quantity').textContent = Object.keys(this.state.profiles).length || 0;
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
                    avatarUrl: row[5]?.trim() || null, // Нове поле для URL аватара
                    note: row[6]?.trim() || 'Немає приміток',
                }
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
            'фішер': { id: 'фішер', name: 'Фішер', position: 'Командир відділення', unit: 'Альфа', certificate: 'Пісочний', balance: 0, avatarUrl: null, note: 'Написав цей текст' },
            'віхрь': { id: 'віхрь', name: 'Віхрь', position: 'Ст.стрілець', unit: 'Дельта', certificate: 'Пісочний', balance: 10, avatarUrl: null, note: '123' },
            'бумер': { id: 'бумер', name: 'Бумер', position: 'Розвідник', unit: 'Браво', certificate: 'Червоний', balance: 10, avatarUrl: null, note: 'Відзначився в операції "Буревій", відзначився в операції "Кулак", Відзначився в операції "Периметр"' },
            'чех': { id: 'чех', name: 'Чех', position: 'Розвідник', unit: 'Чарлі', certificate: 'Синий', balance: 0, avatarUrl: null, note: 'Відзначився в операції "Буревій"' },
            'мусон': { id: 'мусон', name: 'Мусон', position: 'Кулеметник', unit: 'Альфа', certificate: 'красный', balance: 10, avatarUrl: null, note: 'Відзначився в операції "Кулак"' },
            'ванвей': { id: 'ванвей', name: 'Ванвей', position: 'Розвідник', unit: 'Браво', certificate: 'sand', balance: 10, avatarUrl: null, note: 'Відзначився в операції "Кулак"' },
            'смола': { id: 'смола', name: 'Смола', position: 'Командир відділення', unit: 'Дельта', certificate: 'Песчаный', balance: 10, avatarUrl: null, note: 'Відзначився в операції "Кулак"' },
            'смола2': { id: 'смола', name: 'Смола', position: 'Командир відділення', unit: 'Барракуда', certificate: 'Песчаный', balance: 5, avatarUrl: null, note: 'Відзначився в операції "Кулак"' },
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
        const searchInput = document.getElementById('search-input');
        let query = '';
        if (searchInput) {
            query = searchInput.value.trim().toLowerCase();
        }

        let profilesArray = Object.values(this.state.profiles);

        // Фільтрація за пошуковим запитом
        if (query) {
            profilesArray = profilesArray.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.id.toLowerCase().includes(query)
            );
        }

        // Сортування масиву
        profilesArray.sort((a, b) => {
            switch (this.state.currentSort) {
                case 'balance': return b.balance - a.balance;
                case 'unit': return a.unit.localeCompare(b.unit, 'uk');
                case 'name': return a.name.localeCompare(b.name, 'uk');
                default: return 0;
            }
        });

        if (profilesArray.length === 0) {
            this.elements.participantsContainer.innerHTML = '<p class="message">Нічого не знайдено.</p>';
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
                        <span class="info-value balance-value">${p.balance}<img src="images/Acoin.png" width="20" height="20" class="coin-img"></img></span>
                    </div>
                </div>
            </div>
            `;
    },
            

    /**
     * Створює HTML для сторінки профілю.
     */
    createProfileHTML(p) {
        const avatarUrl = this.getImageUrl(p.avatarUrl); // Аватар більшого розміру
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
                            <div class="info-card-value balance">${p.balance} <img src="images/Acoin.png" width="32" height="32" class="coin-img"></img></div>
                        </div>
                        
                    </div>
                    <div class="note-card">
                            <div class="note-card-title">Заметки</div>
                            <div class="note-card-value">${p.note}</div>
                    </div>
                </div>
            </div>`;
    },

    /**
     * Повертає URL аватара.Add commentMore actions
     * Якщо URL вказано в профілі - повертає його.
     * Інакше - повертає URL за замовчуванням з конфігурації.
     */
    getImageUrl(profileUrl) {
        // Якщо є реальний URL, повертаємо його
        if (profileUrl && (profileUrl.startsWith('http'))) {
            return profileUrl;
        }
        
    // В іншому випадку, повертаємо URL за замовчуванням з конфігураціїAdd commentMore actions
        return this.config.defaultImageUrl;
    }
};


// Запуск додатку після завантаження DOM
document.addEventListener('DOMContentLoaded', () => {
    App.init();
    // Додаємо Listener для інпута пошуку 
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            App.renderParticipants(query); // Передаємо запит для фільтрації
        });
    }
});
=======
document.addEventListener('DOMContentLoaded', () => {
    // Этот скрипт выполняется только на странице участников

    const config = {
        publishedId: '2PACX-1vSyv3bAifxY2clEjSnLpiSFm3RwRULCbbuk19HGQYBiRmE-Llq81jmk5kalFY8v07Vt4DODTxltvVZa',
        gid: '0',
        defaultImageUrl: 'https://i.pinimg.com/736x/87/a4/08/87a408ed3ffa34ff6d8c32f9bf7f72a7.jpg'
    };

    const state = {
        profiles: {},
        currentSort: 'default',
        isLoading: false,
    };

    const contentArea = document.getElementById('content-area');

    function getCurrentLang() {
        return localStorage.getItem('lang') || 'ru';
    }

    function getImageUrl(profileUrl) {
        return (profileUrl && profileUrl.startsWith('http')) ? profileUrl : config.defaultImageUrl;
    }

    // --- ШАБЛОНЫ ---
    const templates = {
        participantsList: (T) => `
            <section id="participantsSection">
                <div id="additional-info">
                    <h2 class="main-title">${T.participants_title}</h2>
                    <span id="participant-quantity-section">
                        <h2 class="main-title">${T.participants_quantity}</h2>
                        <h2 class="main-title" id="participant-quantity">0</h2>
                    </span>
                </div>
                <div class="controls-container">
                    <div id="sortControls" class="sort-controls">
                        <button class="sort-btn active" data-sort="default">${T.sort_default}</button>
                        <button class="sort-btn" data-sort="balance">${T.sort_balance}</button>
                        <button class="sort-btn" data-sort="name">${T.sort_name}</button>
                        <button class="sort-btn" data-sort="unit">${T.sort_unit}</button>
                    </div>
                    <input id="search-input" type="search" placeholder="${T.search_placeholder}" aria-label="${T.search_placeholder}">
                    <button id="refreshBtn" class="btn refresh-btn">${T.refresh_button}</button>
                </div>
                <div id="messageContainer" class="hidden"></div>
                <div id="participantsContainer" class="participants-grid" aria-live="polite"></div>
            </section>
        `,
        participantCard: (p, T) => {
            const avatarUrl = getImageUrl(p.avatarUrl);
            return `
                <a href="?id=${p.id}" class="participant-card" data-id="${p.id}">
                    <div class="card-header">
                        <img src="${avatarUrl}" alt="Avatar ${p.name}" class="participant-avatar" loading="lazy">
                        <div class="name-role-group">
                            <div class="participant-name">${p.name}</div>
                            <div class="participant-position">${p.position}</div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="info-item"><span class="info-label">${T.unit}:</span><span class="info-value">${p.unit}</span></div>
                        <div class="info-item"><span class="info-label">${T.certificate}:</span><span class="info-value">${p.certificate}</span></div>
                        <div class="info-item balance"><span class="info-label">${T.balance}:</span><span class="info-value balance-value">${p.balance}<img src="images/Acoin.png" class="coin-img"></span></div>
                    </div>
                </a>`;
        },
        profileDetails: (p, T) => {
             const avatarUrl = getImageUrl(p.avatarUrl);
             return `
                <section id="profileSection">
                     <a href="participants.html" class="btn back-btn">${T.back_button}</a>
                     <div class="profile">
                        <div class="profile-header">
                            <img src="${avatarUrl}" alt="Avatar ${p.name}" class="profile-avatar">
                            <h2 class="profile-name">${p.name}</h2>
                            <p class="profile-position">${p.position}</p>
                        </div>
                        <div class="profile-content">
                            <div class="profile-section">
                                <h3 class="section-title">${T.main_info}</h3>
                                <div class="info-grid">
                                    <div class="info-card"><div class="info-card-title">${T.unit}</div><div class="info-card-value">${p.unit}</div></div>
                                    <div class="info-card"><div class="info-card-title">${T.certificate}</div><div class="info-card-value">${p.certificate}</div></div>
                                    <div class="info-card"><div class="info-card-title">${T.balance}</div><div class="info-card-value balance">${p.balance} <img src="images/Acoin.png" class="coin-img"></div></div>
                                </div>
                            </div>
                            <div class="profile-section">
                                 <h3 class="section-title">${T.notes}</h3>
                                 <div class="note-card-value">${p.note.replace(/\n/g, '<br>')}</div>
                            </div>
                        </div>
                     </div>
                </section>
            `;
        }
    };

    // --- ЛОГИКА ОТОБРАЖЕНИЯ ---
    function renderParticipants() {
        const T = translations[getCurrentLang()];
        const container = document.getElementById('participantsContainer');
        if (!container) return;

        const searchInput = document.getElementById('search-input');
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        
        let profilesArray = Object.values(state.profiles);

        if (query) {
            profilesArray = profilesArray.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.id.toLowerCase().includes(query)
            );
        }

        profilesArray.sort((a, b) => {
            switch (state.currentSort) {
                case 'balance': return b.balance - a.balance;
                case 'unit': return a.unit.localeCompare(b.unit, getCurrentLang());
                case 'name': return a.name.localeCompare(b.name, getCurrentLang());
                default: return 0;
            }
        });

        if (profilesArray.length === 0) {
            container.innerHTML = `<p class="message">${T.not_found}</p>`;
            return;
        }
        
        container.innerHTML = profilesArray.map(p => templates.participantCard(p, T)).join('');
    }

    function renderProfile(profileId) {
        const T = translations[getCurrentLang()];
        const profile = state.profiles[profileId];
        
        if (!profile) {
            contentArea.innerHTML = `<p class="message error">${T.profile_not_found}</p><a href="participants.html" class="btn back-btn">${T.back_button}</a>`;
            return;
        }
        contentArea.innerHTML = templates.profileDetails(profile, T);
    }
    
    function showMessage(type, message, timeout = null) {
        const messageContainer = document.getElementById('messageContainer');
        if (!messageContainer) return;
        if(messageContainer.timeoutId) clearTimeout(messageContainer.timeoutId);
        
        messageContainer.innerHTML = `<div class="message ${type}">${message}</div>`;
        messageContainer.classList.remove('hidden');

        if (timeout) {
            messageContainer.timeoutId = setTimeout(() => {
                messageContainer.classList.add('hidden');
            }, timeout);
        }
    }

    // --- ЗАГРУЗКА ДАННЫХ ---
    function parseCSV(text) {
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
        }).filter(row => row.length > 1 || row[0]);
    }

    function parseAndStoreData(csvText) {
        const T = translations[getCurrentLang()];
        const rows = parseCSV(csvText);
        if (rows.length < 2) throw new Error(T.table_empty);

        const newProfiles = {};
        rows.slice(1).forEach((row) => {
            if (row.length > 0 && row[0]?.trim()) {
                const id = row[0].trim().toLowerCase(); 
                newProfiles[id] = {
                    id,
                    name: row[0]?.trim() || T.callsign_empty,
                    position: row[1]?.trim() || T.not_specified,
                    unit: row[2]?.trim() || T.not_specified,
                    certificate: row[3]?.trim() || T.cert_none,
                    balance: parseInt(row[4]?.trim(), 10) || 0,
                    avatarUrl: row[5]?.trim() || null, 
                    note: row[6]?.trim() || T.notes_empty,
                }
            }
        });

        if (Object.keys(newProfiles).length === 0) throw new Error(T.no_valid_data);
        state.profiles = newProfiles;
    }

    async function loadData() {
        if (state.isLoading) return;
        state.isLoading = true;
        const T = translations[getCurrentLang()];
        
        showMessage('loading', T.loading_message);

        try {
            const url = `https://docs.google.com/spreadsheets/d/e/${config.publishedId}/pub?gid=${config.gid}&single=true&output=csv&t=${new Date().getTime()}`;
            const response = await fetch(url, { cache: 'no-cache' });

            if (!response.ok) throw new Error(`${T.network_error}: ${response.statusText}.`);

            const csvText = await response.text();
            parseAndStoreData(csvText);
            showMessage('success', T.success_message, 3000);
            return true; // Успех
        } catch (error) {
            console.error('Data loading error:', error);
            showMessage('error', `<strong>${T.error_loading}</strong> ${error.message}`, 5000);
            return false; // Ошибка
        } finally {
            state.isLoading = false;
        }
    }

    // --- ИНИЦИАЛИЗАЦИЯ СТРАНИЦЫ ---
    async function initParticipantsPage() {
        const success = await loadData();
        
        // После загрузки данных, решаем что рендерить
        const urlParams = new URLSearchParams(window.location.search);
        const profileId = urlParams.get('id');
        
        if (profileId) {
            renderProfile(profileId);
        } else {
            const T = translations[getCurrentLang()];
            contentArea.innerHTML = templates.participantsList(T);
            
            // Обновляем количество участников
            const quantityEl = document.getElementById('participant-quantity');
            if(quantityEl) quantityEl.textContent = Object.keys(state.profiles).length || 0;
            
            renderParticipants();
            bindListEvents();
        }
    }
    
    function handleSort(type) {
        state.currentSort = type;
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.sort === type);
        });
        renderParticipants();
    }

    function bindListEvents() {
        document.getElementById('refreshBtn')?.addEventListener('click', initParticipantsPage);
        document.getElementById('sortControls')?.addEventListener('click', e => {
            if (e.target.matches('.sort-btn')) handleSort(e.target.dataset.sort);
        });
        document.getElementById('search-input')?.addEventListener('input', renderParticipants);
    }
    
    initParticipantsPage();
});
>>>>>>> Stashed changes
