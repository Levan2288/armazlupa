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
