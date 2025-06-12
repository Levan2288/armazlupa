const App = {
    // --- Конфігурація ---
    config: {
        // ID опублікованої Google Таблиці
        publishedId: '2PACX-1vSyv3bAifxY2clEjSnLpiSFm3RwRULCbbuk19HGQYBiRmE-Llq81jmk5kalFY8v07Vt4DODTxltvVZa',
        // ID аркуша (0 для першого)
        gid: '0',
        // Інтервал автоматичного оновлення (5 хвилин)
        autoRefreshInterval: 300000 
    },

    // --- Стан додатку ---
    state: {
        profiles: {},
        currentSort: 'default',
        isLoading: false
    },

    // --- Кешовані DOM-елементи ---
    elements: {},

    /**
     * Ініціалізація додатку: кешування елементів, встановлення обробників подій,
     * та перше завантаження даних.
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
        this.elements.refreshBtn.addEventListener('click', () => this.loadData());
        this.elements.backBtn.addEventListener('click', () => this.showView('participants'));
        
        // Делегування подій для кнопок сортування
        this.elements.sortControls.addEventListener('click', (e) => {
            if (e.target.matches('.sort-btn')) {
                this.handleSort(e.target.dataset.sort);
            }
        });

        // Делегування подій для карток учасників
        this.elements.participantsContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.participant-card');
            if (card) {
                this.showView('profile', card.dataset.id);
            }
        });
        
        // Встановлення інтервалу для автоматичного оновлення даних
        setInterval(() => this.loadData(true), this.config.autoRefreshInterval);
    },

    /**
     * Основна функція для завантаження та обробки даних з Google Sheets.
     * @param {boolean} isAutoRefresh - Прапорець, що вказує, чи є виклик автоматичним.
     */
    async loadData(isAutoRefresh = false) {
        if (this.state.isLoading) return; // Запобігання одночасним запитам
        this.state.isLoading = true;

        if (!isAutoRefresh) {
            this.showMessage('loading', 'Завантаження даних з Google Таблиць...');
        }

        try {
            const url = `https://docs.google.com/spreadsheets/d/e/${this.config.publishedId}/pub?gid=${this.config.gid}&single=true&output=csv`;
            const response = await fetch(url, { cache: 'no-cache' });

            if (!response.ok) {
                throw new Error(`Помилка мережі: ${response.statusText}. Перевірте налаштування доступу до таблиці.`);
            }

            const csvText = await response.text();
            if (!csvText.trim()) {
                throw new Error('Отримано порожню відповідь. Перевірте, чи є дані в таблиці.');
            }

            this.parseAndStoreData(csvText);
            this.renderParticipants();
            
            if (!isAutoRefresh) {
               this.showMessage('success', `✅ Успішно завантажено ${Object.keys(this.state.profiles).length} профілів.`, 3000);
            }

        } catch (error) {
            console.error('Помилка завантаження даних:', error);
            this.showMessage('error', `<strong>Помилка завантаження:</strong> ${error.message}<br><br><em>Показуємо демо-дані...</em>`, 10000);
            this.loadDemoData();
            this.renderParticipants();
        } finally {
            this.state.isLoading = false;
        }
    },

    /**
     * Парсинг CSV-тексту та збереження даних у стані додатку.
     * @param {string} csvText - Текст у форматі CSV.
     */
    parseAndStoreData(csvText) {
        const rows = this.parseCSV(csvText);
        if (rows.length < 2) {
             throw new Error('У таблиці має бути хоча б один рядок з даними (окрім заголовків).');
        }

        const newProfiles = {};
        rows.slice(1).forEach((row, index) => {
            if (row.length >= 2 && row[0]?.trim()) { // Необхідні поля: ім'я та біографія
                const id = index + 1;
                newProfiles[id] = {
                    id: id,
                    name: row[0]?.trim() || 'Не вказано',
                    bio: row[1]?.trim() || 'Біографія не вказана',
                    avatar: row[2]?.trim() || '',
                    favoriteWeapon: row[3]?.trim() || 'Не вказано',
                    additionalWeapon: row[4]?.trim() || 'Не вказано',
                    equipment: row[5] ? row[5].split(',').map(item => item.trim()).filter(Boolean) : [],
                    role: row[6]?.trim() || 'Оператор',
                    experience: row[7]?.trim() || 'Не вказано',
                    score: parseInt(row[8]?.trim(), 10) || 0,
                };
            }
        });

        if (Object.keys(newProfiles).length === 0) {
            throw new Error('Не знайдено валідних профілів. Перевірте формат даних у таблиці.');
        }

        this.state.profiles = newProfiles;
    },
    
    /**
     * Простий, але надійний парсер CSV.
     * @param {string} text - Вхідний CSV текст.
     * @returns {Array<Array<string>>} - Масив рядків, де кожен рядок - масив полів.
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
        }).filter(row => row.length > 1 || row[0]);
    },

    /**
     * Завантаження демо-даних у випадку помилки.
     */
    loadDemoData() {
        this.state.profiles = {
            1: { id: 1, name: "Олексій 'Вовк'", bio: "Досвідчений оператор спецназу з 8-річним стажем.", avatar: "https://randomuser.me/api/portraits/men/1.jpg", favoriteWeapon: "АК-74М", additionalWeapon: "ПМ", equipment: ["Бронежилет", "Шолом", "Нічні окуляри"], role: "Штурмовик", experience: "8 років", score: 85 },
            2: { id: 2, name: "Сергій 'Сокіл'", bio: "Снайпер високого класу, майстер дальнього бою.", avatar: "https://randomuser.me/api/portraits/men/2.jpg", favoriteWeapon: "СВД", additionalWeapon: "АКС-74У", equipment: ["Оптичний приціл", "Маскхалат"], role: "Снайпер", experience: "6 років", score: 92 },
            3: { id: 3, name: "Марія 'Іскра'", bio: "Медик підрозділу, фахівець з польової хірургії.", avatar: "https://randomuser.me/api/portraits/women/1.jpg", favoriteWeapon: "АКС-74У", additionalWeapon: "ПЯ", equipment: ["Медичний рюкзак", "Дефібрилятор"], role: "Медик", experience: "5 років", score: 78 },
            4: { id: 4, name: "Дмитро 'Кріт'", bio: "Спеціаліст з вибухових речовин та розмінування.", avatar: "", favoriteWeapon: "АКС-74", additionalWeapon: "Сигнальний пістолет", equipment: ["Набір сапера", "Детектор металу"], role: "Сапер", experience: "7 років", score: 89 },
        };
    },
    
    /**
     * Обробка сортування.
     * @param {string} type - Тип сортування ('default', 'score', 'name').
     */
    handleSort(type) {
        this.state.currentSort = type;
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
        
        // Сортування
        profilesArray.sort((a, b) => {
            switch (this.state.currentSort) {
                case 'score': return b.score - a.score;
                case 'name': return a.name.localeCompare(b.name);
                default: return a.id - b.id;
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
     * Перемикання між виглядами (список учасників / профіль).
     * @param {'participants' | 'profile'} viewName - Назва вигляду.
     * @param {string | null} id - ID профілю (для вигляду 'profile').
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
     * Відображення повідомлень для користувача.
     * @param {'loading' | 'success' | 'error'} type - Тип повідомлення.
     * @param {string} message - Текст повідомлення.
     * @param {number | null} timeout - Час в мс, після якого повідомлення зникне.
     */
    showMessage(type, message, timeout = null) {
        const messageEl = this.elements.messageContainer;
        messageEl.innerHTML = `<div class="message ${type}">${message}</div>`;
        messageEl.classList.remove('hidden');

        if (timeout) {
            setTimeout(() => {
                messageEl.classList.add('hidden');
            }, timeout);
        }
    },

    // --- Функції-шаблонізатори для генерації HTML ---

    createParticipantCardHTML(p) {
        const avatarUrl = this.getImageUrl(p.avatar, p.name);
        return `
            <div class="participant-card" data-id="${p.id}">
                <div class="participant-header">
                    <div class="score-badge">${p.score} 🏆</div>
                    <img src="${avatarUrl}" alt="Аватар ${p.name}" class="participant-avatar" onerror="this.src='${this.getImageUrl('', p.name)}'" loading="lazy">
                    <div class="participant-name">${p.name}</div>
                    <div class="participant-role">${p.role}</div>
                </div>
                <div class="participant-info">
                    <p class="participant-bio">${p.bio}</p>
                    <div class="participant-weapons">
                        <div class="weapon-info"><span class="weapon-label">Основна:</span> ${p.favoriteWeapon}</div>
                        <div class="weapon-info"><span class="weapon-label">Додаткова:</span> ${p.additionalWeapon}</div>
                    </div>
                </div>
            </div>`;
    },

    createProfileHTML(p) {
        const avatarUrl = this.getImageUrl(p.avatar, p.name, 150);
        const equipmentList = p.equipment.length > 0
            ? p.equipment.map(item => `<div class="equipment-item">${item}</div>`).join('')
            : '<div class="equipment-item">Спорядження не вказано</div>';

        return `
            <div class="profile-header">
                <div class="profile-score">${p.score} 🏆</div>
                <img src="${avatarUrl}" alt="Аватар ${p.name}" class="profile-avatar" onerror="this.src='${this.getImageUrl('', p.name, 150)}'">
                <h2 class="profile-name">${p.name}</h2>
                <p class="profile-bio">${p.role} | Досвід: ${p.experience}</p>
            </div>
            <div class="profile-content">
                <div class="profile-section">
                    <h3 class="section-title">📄 Біографія</h3>
                    <p>${p.bio}</p>
                </div>
                <div class="profile-section">
                    <h3 class="section-title">🔫 Озброєння</h3>
                    <div class="weapon-card">
                        <div class="weapon-title">Основна зброя</div>
                        <div>${p.favoriteWeapon}</div>
                    </div>
                    <div class="weapon-card">
                        <div class="weapon-title">Додаткова зброя</div>
                        <div>${p.additionalWeapon}</div>
                    </div>
                </div>
                <div class="profile-section">
                    <h3 class="section-title">🎒 Спорядження</h3>
                    <div class="equipment-card">
                        <div class="equipment-list">${equipmentList}</div>
                    </div>
                </div>
            </div>`;
    },

    // --- Допоміжні функції ---

    getImageUrl(url, name, size = 80) {
        if (url && (url.startsWith('http') || url.startsWith('data:'))) {
            return url;
        }
        if (url && url.includes('drive.google.com')) {
            const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (fileIdMatch) {
                return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
            }
        }
        // Повертаємо SVG-заглушку, якщо URL відсутній або недійсний
        const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
        const colors = ['#c1a270', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#1abc9c'];
        const color = colors[name.length % colors.length];
        const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="white" font-size="${size/2.5}" font-family="Roboto, sans-serif" font-weight="bold">${initials}</text></svg>`;
        
        // --- ВИПРАВЛЕННЯ ---
        // Кодуємо SVG рядок, щоб він був сумісний з btoa()
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    }
};

// Запуск додатку після повного завантаження DOM
App.init();
