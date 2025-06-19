const App = {
    // --- Configuration ---
    config: {
        // !!! ВАЖНО: Замените этот ID на ID вашей опубликованной Google Таблицы.
        // ---
        // КАК ПОЛУЧИТЬ ID:
        // 1. В Google Sheets откройте вашу таблицу.
        // 2. Нажмите "Файл" -> "Поделиться" -> "Опубликовать в интернете".
        // 3. Во вкладке "Ссылка", выберите нужный лист (например, "Лист1").
        // 4. В выпадающем списке выберите "Как значения, разделенные запятыми (.csv)".
        // 5. Нажмите "Опубликовать".
        // 6. Скопируйте сгенерированную ссылку. ID - это длинная строка символов
        //    между "/d/e/" и "/pub?gid...".
        // ---
        publishedId: '2PACX-1vSyv3bAifxY2clEjSnLpiSFm3RwRULCbbuk19HGQYBiRmE-Llq81jmk5kalFY8v07Vt4DODTxltvVZa',
        gid: '0', // ID листа (0 для первого)
        autoRefreshInterval: 30000, // Интервал авто-обновления: 30 секунд
        defaultImageUrl: 'https://i.pinimg.com/736x/87/a4/08/87a408ed3ffa34ff6d8c32f9bf7f72a7.jpg'
    },

    // --- Application State ---
    state: {
        profiles: {},
        currentSort: 'default', // 'default', 'balance', 'name', 'unit'
        isLoading: false
    },

    // --- Cached DOM Elements ---
    elements: {},

    /**
     * Initializes the application: caches elements, binds events, loads data.
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadData();
    },

    /**
     * Caches DOM elements for quick access.
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
        this.elements.searchInput = document.getElementById('search-input');
        this.elements.participantQuantity = document.getElementById('participant-quantity');
    },

    /**
     * Binds event handlers to elements.
     */
    bindEvents() {
        this.elements.refreshBtn.addEventListener('click', () => this.loadData());
        this.elements.backBtn.addEventListener('click', () => this.showView('participants'));
        this.elements.sortControls.addEventListener('click', (e) => {
            if (e.target.matches('.sort-btn')) this.handleSort(e.target.dataset.sort);
        });
        this.elements.searchInput.addEventListener('input', () => this.renderParticipants());
        this.elements.participantsContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.participant-card');
            if (card) this.showView('profile', card.dataset.id);
        });
        setInterval(() => this.loadData(true), this.config.autoRefreshInterval);
    },

    /**
     * Loads and processes data from Google Sheets.
     * @param {boolean} isAutoRefresh - Flag indicating if the call is from auto-refresh.
     */
    async loadData(isAutoRefresh = false) {
        if (this.state.isLoading) return;
        this.state.isLoading = true;

        if (!isAutoRefresh) {
            this.showMessage('loading', 'Загрузка данных...');
        }

        try {
            const url = `https://docs.google.com/spreadsheets/d/e/${this.config.publishedId}/pub?gid=${this.config.gid}&single=true&output=csv`;
            const response = await fetch(url, { cache: 'no-cache' });

            if (!response.ok) {
                throw new Error(`Ошибка сети: ${response.statusText}. Проверьте ID таблицы и настройки доступа.`);
            }

            const csvText = await response.text();
            if (!csvText) {
                throw new Error('Получен пустой ответ от сервера. Возможно, таблица пуста или не опубликована.');
            }

            this.parseAndStoreData(csvText);
            this.renderParticipants();
            
            if (!isAutoRefresh) {
               this.showMessage('success', `✅ Данные успешно обновлены.`, 3000);
            }

        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            this.showMessage('error', `<strong>Ошибка загрузки:</strong> ${error.message}<br><em>Показаны демонстрационные данные. Убедитесь, что таблица Google опубликована в интернете как CSV.</em>`, 8000);
            this.loadDemoData(); // Load demo data on error
            this.renderParticipants();
        } finally {
            this.elements.participantQuantity.textContent = Object.keys(this.state.profiles).length || 0;
            this.state.isLoading = false;
        }
    },

    /**
     * Parses CSV text and stores the data.
     * @param {string} csvText - Text in CSV format.
     */
    parseAndStoreData(csvText) {
        const rows = this.parseCSV(csvText);
        if (rows.length < 2) {
             throw new Error('Таблица пуста или содержит только заголовок.');
        }

        const newProfiles = {};
        // Skip header row
        rows.slice(1).forEach((row) => {
            if (row.length > 0 && row[0]?.trim()) {
                const id = row[0].trim().toLowerCase(); 
                newProfiles[id] = {
                    id: id,
                    name: row[0]?.trim() || 'Без позывного',
                    position: row[1]?.trim() || 'Не указано',
                    unit: row[2]?.trim() || 'Не указано',
                    certificate: row[3]?.trim() || 'Нет',
                    balance: parseInt(row[4]?.trim(), 10) || 0,
                    avatarUrl: row[5]?.trim() || null, 
                    note: row[6]?.trim() || 'Нет примечаний',
                };
            }
        });

        if (Object.keys(newProfiles).length === 0) {
            throw new Error('Не найдено валидных данных. Проверьте формат таблицы.');
        }

        this.state.profiles = newProfiles;
    },
    
    /**
     * Robust CSV parser that handles quotes.
     * @param {string} text - Input CSV text.
     * @returns {Array<Array<string>>} - Array of rows.
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
        }).filter(row => row.length > 1 || row[0]); // Filter out empty rows
    },

    /**
     * Loads demonstration data for offline/error cases.
     */
    loadDemoData() {
        this.state.profiles = {
            'фишер': { id: 'фишер', name: 'Фишер', position: 'Командир отделения', unit: 'Альфа', certificate: 'Песочный', balance: 0, avatarUrl: null, note: 'Создатель этой таблицы' },
            'вихрь': { id: 'вихрь', name: 'Вихрь', position: 'Ст.стрелок', unit: 'Дельта', certificate: 'Песочный', balance: 10, avatarUrl: null, note: 'Отличный боец' },
            'бумер': { id: 'бумер', name: 'Бумер', position: 'Разведчик', unit: 'Браво', certificate: 'Красный', balance: 10, avatarUrl: null, note: 'Отличился в операции "Буревестник"' },
        };
    },
    
    /**
     * Handles sorting.
     * @param {string} type - Sort type ('default', 'balance', 'name', 'unit').
     */
    handleSort(type) {
        this.state.currentSort = type;
        this.elements.sortControls.querySelectorAll('.sort-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.sort === type);
        });
        this.renderParticipants();
    },

    /**
     * Renders the list of participants.
     */
    renderParticipants() {
        const query = this.elements.searchInput.value.trim().toLowerCase();
        let profilesArray = Object.values(this.state.profiles);

        if (query) {
            profilesArray = profilesArray.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.id.toLowerCase().includes(query) ||
                p.unit.toLowerCase().includes(query)
            );
        }

        profilesArray.sort((a, b) => {
            switch (this.state.currentSort) {
                case 'balance': return b.balance - a.balance;
                case 'unit': return a.unit.localeCompare(b.unit, 'uk');
                case 'name': return a.name.localeCompare(b.name, 'uk');
                default: return 0;
            }
        });

        if (profilesArray.length === 0) {
            this.elements.participantsContainer.innerHTML = '<p class="message">Ничего не найдено.</p>';
            return;
        }

        this.elements.participantsContainer.innerHTML = profilesArray.map(p => this.createParticipantCardHTML(p)).join('');
    },

    /**
     * Renders a specific profile.
     * @param {string} profileId - ID of the profile to display.
     */
    renderProfile(profileId) {
        const profile = this.state.profiles[profileId];
        if (!profile) {
            this.elements.profileContainer.innerHTML = '<p class="message error">Профиль не найден.</p>';
            return;
        }
        this.elements.profileContainer.innerHTML = this.createProfileHTML(profile);
    },
    
    /**
     * Switches between views (list/profile).
     */
    showView(viewName, id = null) {
        if (viewName === 'profile') {
            this.elements.participantsSection.classList.add('hidden');
            this.elements.profileSection.classList.remove('hidden');
            this.renderProfile(id);
            window.scrollTo(0, 0);
        } else {
            this.elements.profileSection.classList.add('hidden');
            this.elements.participantsSection.classList.remove('hidden');
        }
    },
    
    /**
     * Displays user-facing messages.
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

    /**
     * Creates HTML for a participant card.
     */
    createParticipantCardHTML(p) {
        const avatarUrl = this.getImageUrl(p.avatarUrl);
        // NOTE: Correct path to coin image
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
                        <span class="info-label">Подразделение:</span>
                        <span class="info-value">${p.unit}</span>
                    </div>
                     <div class="info-item">
                        <span class="info-label">Сертификат:</span>
                        <span class="info-value">${p.certificate}</span>
                    </div>
                    <div class="info-item balance">
                        <span class="info-label">Баланс:</span>
                        <span class="info-value balance-value">${p.balance}<img src="./images/Acoin.png" class="coin-img" alt="ACoin"></span>
                    </div>
                </div>
            </div>`;
    },
            
    /**
     * Creates HTML for the profile page.
     */
    createProfileHTML(p) {
        const avatarUrl = this.getImageUrl(p.avatarUrl);
        // NOTE: Correct path to coin image
        return `
            <div class="profile-header">
                <img src="${avatarUrl}" alt="Аватар ${p.name}" class="profile-avatar">
                <h2 class="profile-name">${p.name}</h2>
                <p class="profile-position">${p.position}</p>
            </div>
            <div class="profile-content">
                <div class="profile-section">
                    <div class="info-grid">
                        <div class="info-card">
                            <div class="info-card-title">Подразделение</div>
                            <div class="info-card-value">${p.unit}</div>
                        </div>
                         <div class="info-card">
                            <div class="info-card-title">Сертификат</div>
                            <div class="info-card-value">${p.certificate}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-card-title">Баланс</div>
                            <div class="info-card-value balance">${p.balance} <img src="./images/Acoin.png" class="coin-img" alt="ACoin"></div>
                        </div>
                    </div>
                    <div class="note-card">
                        <div class="note-card-title">Примечания</div>
                        <div class="note-card-value">${p.note}</div>
                    </div>
                </div>
            </div>`;
    },

    getImageUrl(profileUrl) {
        if (profileUrl && profileUrl.startsWith('http')) {
            return profileUrl;
        }
        return this.config.defaultImageUrl;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
