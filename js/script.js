document.addEventListener('DOMContentLoaded', () => {

    const App = {
        // --- Конфигурация ---
        config: {
            publishedId: '2PACX-1vSyv3bAifxY2clEjSnLpiSFm3RwRULCbbuk19HGQYBiRmE-Llq81jmk5kalFY8v07Vt4DODTxltvVZa',
            gid: '0',
            autoRefreshInterval: 30000,
            defaultImageUrl: 'https://i.pinimg.com/736x/87/a4/08/87a408ed3ffa34ff6d8c32f9bf7f72a7.jpg'
        },

        // --- Состояние приложения ---
        state: {
            profiles: {},
            currentSort: 'default',
            isLoading: false,
            currentLang: 'ru',
            currentPage: 'home',
            currentProfileId: null,
        },

        // --- Кэшированные DOM-элементы ---
        elements: {
            appRoot: document.getElementById('app-root'),
            navMenu: document.querySelector('.nav-menu'),
            sidebarNav: document.querySelector('.sidebar-nav'),
            langSwitcher: document.querySelector('.lang-switcher'),
            // Элементы для мобильного меню
            menuToggle: document.querySelector('.mobile-menu-toggle'),
            sidebar: document.querySelector('.sidebar'),
            overlay: document.querySelector('.overlay'),
            closeBtn: document.querySelector('.close-btn'),
        },

        // --- Инициализация ---
        init() {
            this.bindEvents();
            // Определяем начальный язык
            const savedLang = localStorage.getItem('lang');
            const urlLang = new URLSearchParams(window.location.search).get('lang');
            const browserLang = navigator.language.slice(0, 2);
            let initialLang = urlLang || savedLang || browserLang;
            if (!translations[initialLang]) {
                initialLang = 'ru';
            }
            this._applyLanguageChange(initialLang, false); // Применяем язык без перерисовки страницы

            // Переходим на начальную страницу
            const [page, profileId] = window.location.hash.slice(1).split('/');
            this.navigateTo(page || 'home', profileId);
        },

        // --- Управление языком ---
        _applyLanguageChange(lang, shouldRenderPage = true) {
            // Обновляем состояние
            this.state.currentLang = lang;
            
            // Сохраняем выбор
            localStorage.setItem('lang', lang);
            document.documentElement.lang = lang;
            
            // Обновляем статические элементы UI
            this.updateLangSwitcherUI();
            this.renderNav();

            // Перерисовываем основное содержимое, если нужно
            if (shouldRenderPage) {
                this.renderPage(this.state.currentPage, this.state.currentProfileId);
            }
        },

        changeLanguage(lang) {
            // Ничего не делаем, если язык не поддерживается или уже активен
            if (!translations[lang] || lang === this.state.currentLang) return;
            this._applyLanguageChange(lang, true);
        },

        updateLangSwitcherUI() {
            this.elements.langSwitcher.querySelectorAll('.lang-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.lang === this.state.currentLang);
            });
        },
        
        // --- Роутинг и рендеринг ---
        navigateTo(pageId, profileId = null) {
            if (!pageId) pageId = 'home';
            this.state.currentPage = pageId;
            this.state.currentProfileId = profileId;
            window.location.hash = pageId + (profileId ? `/${profileId}` : '');
            this.renderPage(pageId, profileId);
            this.updateNavActiveState(pageId);
        },
        
        renderPage(pageId, profileId = null) {
             const T = translations[this.state.currentLang];
             let html = '';

             switch(pageId) {
                case 'home':
                    html = this.templates.home(T);
                    break;
                case 'participants':
                    html = this.templates.participantsList(T);
                    break;
                case 'profile':
                     html = this.templates.profileView(T);
                     break;
                case 'organizers':
                    html = this.templates.organizers(T);
                    break;
                case 'price':
                    html = this.templates.price(T);
                    break;
                default:
                    this.navigateTo('home');
                    return;
             }
             this.elements.appRoot.innerHTML = html;
             this.onPageRendered(pageId, profileId);
        },

        onPageRendered(pageId, profileId) {
            if (pageId === 'participants') {
                this.initParticipantsPage();
            }
             if (pageId === 'profile') {
                // Данные уже должны быть загружены, если мы перешли со страницы участников
                if (Object.keys(this.state.profiles).length > 0) {
                     this.renderProfile(profileId);
                } else {
                    // Если мы попали на страницу профиля напрямую, загружаем данные
                    this.loadData().then(() => {
                        this.renderProfile(profileId);
                    });
                }
            }
        },

        renderNav() {
            const T = translations[this.state.currentLang];
            const navItems = `
                <ul>
                    <li><a href="#home" data-page="home">${T.nav_home}</a></li>
                    <li><a href="#participants" data-page="participants">${T.nav_participants}</a></li>
                    <li><a href="#organizers" data-page="organizers">${T.nav_organizers}</a></li>
                    <li><a href="#price" data-page="price">${T.nav_price}</a></li>
                </ul>
            `;
            this.elements.navMenu.innerHTML = navItems;
            this.elements.sidebarNav.innerHTML = navItems;
        },

        updateNavActiveState(currentPage) {
            document.querySelectorAll('.nav-menu a, .sidebar-nav a').forEach(a => {
                a.classList.toggle('active', a.dataset.page === currentPage);
            });
        },

        // --- Управление событиями ---
        bindEvents() {
            // Навигация
            document.body.addEventListener('click', e => {
                const link = e.target.closest('a[data-page]');
                if (link) {
                    e.preventDefault();
                    this.navigateTo(link.dataset.page);
                    this.closeMobileMenu(); // Закрыть мобильное меню при навигации
                }
            });

            // Переключение языка
            this.elements.langSwitcher.addEventListener('click', e => {
                 if(e.target.matches('.lang-btn')) {
                    this.changeLanguage(e.target.dataset.lang);
                 }
            });

            // Мобильное меню
            this.elements.menuToggle.addEventListener('click', () => this.openMobileMenu());
            this.elements.closeBtn.addEventListener('click', () => this.closeMobileMenu());
            this.elements.overlay.addEventListener('click', () => this.closeMobileMenu());
            
            // Отслеживание изменений хэша для кнопок "вперед/назад" браузера
            window.addEventListener('hashchange', () => {
                const [page, profileId] = window.location.hash.slice(1).split('/');
                if(page !== this.state.currentPage || profileId !== this.state.currentProfileId) {
                    this.navigateTo(page || 'home', profileId);
                }
            });
        },
        
        // --- Логика для страницы участников ---
        
        initParticipantsPage() {
            this.cacheParticipantsElements();
            this.bindParticipantsEvents();
            this.loadData();
        },
        
        cacheParticipantsElements() {
            this.elements.participantsContainer = document.getElementById('participantsContainer');
            this.elements.profileContainer = document.getElementById('profileContainer');
            this.elements.messageContainer = document.getElementById('messageContainer');
            this.elements.refreshBtn = document.getElementById('refreshBtn');
            this.elements.sortControls = document.getElementById('sortControls');
            this.elements.searchInput = document.getElementById('search-input');
            this.elements.participantQuantity = document.getElementById('participant-quantity');
        },
        
        bindParticipantsEvents() {
            if (this.elements.refreshBtn) {
                 this.elements.refreshBtn.addEventListener('click', () => this.loadData());
            }
           
            if (this.elements.sortControls) {
                this.elements.sortControls.addEventListener('click', e => {
                    if (e.target.matches('.sort-btn')) {
                        this.handleSort(e.target.dataset.sort);
                    }
                });
            }

            if (this.elements.appRoot) {
                 this.elements.appRoot.addEventListener('click', e => {
                    const card = e.target.closest('.participant-card');
                    if (card) {
                        this.navigateTo('profile', card.dataset.id);
                    }
                    const backBtn = e.target.closest('.back-btn');
                    if(backBtn) {
                        this.navigateTo('participants');
                    }
                });
            }
            
            if (this.elements.searchInput) {
                 this.elements.searchInput.addEventListener('input', () => this.renderParticipants());
            }

            // Автоматическое обновление данных
            if (!this.autoRefreshTimer) {
                this.autoRefreshTimer = setInterval(() => this.loadData(true), this.config.autoRefreshInterval);
            }
        },
        
        async loadData(isAutoRefresh = false) {
            if (this.state.isLoading) return;
            this.state.isLoading = true;

            const T = translations[this.state.currentLang];

            if (!isAutoRefresh && this.elements.messageContainer) {
                this.showMessage('loading', T.loading_message);
            }

            try {
                const url = `https://docs.google.com/spreadsheets/d/e/${this.config.publishedId}/pub?gid=${this.config.gid}&single=true&output=csv`;
                const response = await fetch(url, { cache: 'no-cache' });

                if (!response.ok) {
                    throw new Error(`${T.network_error}: ${response.statusText}. ${T.check_id}`);
                }

                const csvText = await response.text();
                this.parseAndStoreData(csvText);
                this.renderParticipants();
                
                if (!isAutoRefresh) {
                   this.showMessage('success', T.success_message, 3000);
                }

            } catch (error) {
                console.error('Data loading error:', error);
                this.showMessage('error', `<strong>${T.error_loading}</strong> ${error.message}<br><em>${T.error_demo}</em>`, 5000);
                this.loadDemoData(); 
                this.renderParticipants();
            } finally {
                if(this.elements.participantQuantity) {
                    this.elements.participantQuantity.textContent = Object.keys(this.state.profiles).length || 0;
                }
                this.state.isLoading = false;
            }
        },

        parseAndStoreData(csvText) {
            const T = translations[this.state.currentLang];
            const rows = this.parseCSV(csvText);
            if (rows.length < 2) {
                 throw new Error(T.table_empty);
            }

            const newProfiles = {};
            rows.slice(1).forEach((row) => {
                if (row.length > 0 && row[0]?.trim()) {
                    const id = row[0].trim().toLowerCase(); 
                    newProfiles[id] = {
                        id: id,
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

            if (Object.keys(newProfiles).length === 0) {
                throw new Error(T.no_valid_data);
            }
            this.state.profiles = newProfiles;
        },
        
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

        loadDemoData() {
            this.state.profiles = {
                'фішер': { id: 'фішер', name: 'Фішер', position: 'Командир відділення', unit: 'Альфа', certificate: 'Пісочний', balance: 0, avatarUrl: null, note: 'Написав цей текст' },
                'віхрь': { id: 'віхрь', name: 'Віхрь', position: 'Ст.стрілець', unit: 'Дельта', certificate: 'Пісочний', balance: 10, avatarUrl: null, note: '123' },
            };
        },
        
        handleSort(type) {
            this.state.currentSort = type;
            this.elements.sortControls.querySelectorAll('.sort-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.sort === type);
            });
            this.renderParticipants();
        },

        renderParticipants() {
            if (!this.elements.participantsContainer) return;

            const T = translations[this.state.currentLang];
            const query = this.elements.searchInput ? this.elements.searchInput.value.trim().toLowerCase() : '';
            
            let profilesArray = Object.values(this.state.profiles);

            if (query) {
                profilesArray = profilesArray.filter(p =>
                    p.name.toLowerCase().includes(query) ||
                    p.id.toLowerCase().includes(query)
                );
            }

            profilesArray.sort((a, b) => {
                switch (this.state.currentSort) {
                    case 'balance': return b.balance - a.balance;
                    case 'unit': return a.unit.localeCompare(b.unit, this.state.currentLang);
                    case 'name': return a.name.localeCompare(b.name, this.state.currentLang);
                    default: return 0;
                }
            });

            if (profilesArray.length === 0) {
                this.elements.participantsContainer.innerHTML = `<p class="message">${T.not_found}</p>`;
                return;
            }
            
            this.elements.participantsContainer.innerHTML = profilesArray.map(p => this.templates.participantCard(p, T)).join('');
        },

        renderProfile(profileId) {
            const T = translations[this.state.currentLang];
            const profile = this.state.profiles[profileId];
            const container = document.getElementById('profileContainer');
            if (!container) return;

            if (!profile) {
                container.innerHTML = `<p class="message error">${T.profile_not_found}</p>`;
                return;
            }
            container.innerHTML = this.templates.profileDetails(profile, T);
        },
        
        showMessage(type, message, timeout = null) {
            if (!this.elements.messageContainer) return;
            if(this.elements.messageContainer.timeoutId) clearTimeout(this.elements.messageContainer.timeoutId);
            
            this.elements.messageContainer.innerHTML = `<div class="message ${type}">${message}</div>`;
            this.elements.messageContainer.classList.remove('hidden');

            if (timeout) {
                this.elements.messageContainer.timeoutId = setTimeout(() => {
                    this.elements.messageContainer.classList.add('hidden');
                }, timeout);
            }
        },

        getImageUrl(profileUrl) {
            return (profileUrl && profileUrl.startsWith('http')) ? profileUrl : this.config.defaultImageUrl;
        },
        
        // --- Логика мобильного меню ---
        openMobileMenu() {
            if (this.elements.sidebar && this.elements.overlay) {
                this.elements.sidebar.classList.add('active');
                this.elements.overlay.classList.add('active');
            }
        },
        closeMobileMenu() {
            if (this.elements.sidebar && this.elements.overlay) {
                this.elements.sidebar.classList.remove('active');
                this.elements.overlay.classList.remove('active');
            }
        },
        
        // --- Шаблоны HTML ---
        templates: {
            home: (T) => `
                <section id="welcomeSection">
                    <h2 class="main-title">${T.home_title}</h2>
                    <p class="subtitle">${T.home_subtitle}</p>
                    <div class="features">
                        <div class="feature-card"><h3>${T.home_feature1_title}</h3><p>${T.home_feature1_text}</p></div>
                        <div class="feature-card"><h3>${T.home_feature2_title}</h3><p>${T.home_feature2_text}</p></div>
                        <div class="feature-card"><h3>${T.home_feature3_title}</h3><p>${T.home_feature3_text}</p></div>
                    </div>
                    <div class="cta-container">
                        <a href="https://t.me/Alive_kurs" class="btn cta-btn">${T.home_join_button}</a>
                    </div>
                </section>
                <section class="gallery-section">
                    <h2 class="gallery-title">${T.home_gallery_title}</h2>
                    <div class="image-grid">
                        <img src="https://i.pinimg.com/736x/6a/4c/6d/6a4c6ddf038d262595473effcc11a3f3.jpg" alt="Скриншот из игры Arma 3" onerror="this.onerror=null;this.src='https://placehold.co/300x200/cccccc/ffffff?text=Image';">
                        <img src="https://i.pinimg.com/736x/d5/aa/0e/d5aa0e091715eeeba58e69b0b8642b1c.jpg" alt="Скриншот из игры Arma 3" onerror="this.onerror=null;this.src='https://placehold.co/300x200/cccccc/ffffff?text=Image';">
                        <img src="https://i.pinimg.com/736x/43/57/f6/4357f6ba44faec2f8845a8ed97f71d27.jpg" alt="Скриншот из игры Arma 3" onerror="this.onerror=null;this.src='https://placehold.co/300x200/cccccc/ffffff?text=Image';">
                    </div>
                </section>
            `,
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
                const avatarUrl = App.getImageUrl(p.avatarUrl);
                return `
                    <div class="participant-card" data-id="${p.id}">
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
                    </div>`;
            },
            profileView: (T) => `
                <section id="profileSection">
                     <button class="btn back-btn">${T.back_button}</button>
                     <div id="profileContainer" class="profile">
                         <!-- Profile details will be loaded here -->
                     </div>
                </section>
            `,
            profileDetails: (p, T) => {
                 const avatarUrl = App.getImageUrl(p.avatarUrl);
                 return `
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
                    </div>`;
            },
             organizers: (T) => `
                <section class="organizer-section">
                    <div class="organizer-photo">
                        <img src="images/photo_2025-05-25_10-17-57.jpg" alt="Фото інструктора" onerror="this.onerror=null;this.src='https://placehold.co/250x300/cccccc/ffffff?text=Photo';">
                    </div>
                    <div class="organizer-info">
                        <h2>${T.organizer_name}</h2>
                        <p class="role">${T.organizer_role}</p>
                        <p>${T.organizer_desc}</p>
                        <ul class="info-list">
                            <li><strong>${T.organizer_rank}</strong> ${T.organizer_rank_value}</li>
                            <li><strong>${T.organizer_service_years}</strong> ${T.organizer_service_years_value}</li>
                            <li><strong>${T.organizer_service_areas}</strong>
                                <ul class="sub-list">
                                    <li>${T.organizer_service_area1}</li>
                                    <li>${T.organizer_service_area2}</li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                </section>
            `,
            price: (T) => `
                 <section class="pricing-section">
                    <h2 class="pricing-title">${T.price_title}</h2>
                    <p class="subtitle">${T.price_subtitle}</p>
                    <div class="pricing-grid">
                        <div class="pricing-card">
                            <div class="pricing-price">15$ <span class="price-period">${T.price_period}</span></div>
                            <ul class="pricing-features"><li>${T.price_feature1}</li></ul>
                        </div>
                        <div class="pricing-card">
                            <div class="pricing-price">20$ <span class="price-period">${T.price_period}</span></div>
                            <ul class="pricing-features">
                                <li>${T.price_feature1}</li>
                                <li>${T.price_feature2}</li>
                            </ul>
                        </div>
                        <div class="pricing-card">
                            <div class="pricing-price">25$ <span class="price-period">${T.price_period}</span></div>
                            <ul class="pricing-features">
                                <li>${T.price_feature1}</li>
                                <li>${T.price_feature2}</li>
                                <li>${T.price_feature3}</li>
                            </ul>
                        </div>
                    </div>
                    <div class="pricing-action">
                        <a href="https://t.me/Alive_kurs" class="btn cta-btn">${T.price_contact_button}</a>
                    </div>
                </section>
            `,
        }
    };

    App.init();

});