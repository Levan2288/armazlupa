import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBQbeYu7QMrm2C5tQNehzlFaIK1iMm6ZfI",
    authDomain: "a-coin-fb077.firebaseapp.com",
    databaseURL: "https://a-coin-fb077-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "a-coin-fb077",
    storageBucket: "a-coin-fb077.firebasestorage.app",
    messagingSenderId: "190102987448",
    appId: "1:190102987448:web:f7c363053d732817baca4d",
    measurementId: "G-F1QSGEK6N5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let PMC_balance = 0;

document.addEventListener('DOMContentLoaded', () => {

    const config = {
        defaultImageUrl: 'https://i.pinimg.com/736x/87/a4/08/87a408ed3ffa34ff6d8c32f9bf7f72a7.jpg'
    };

    const state = {
        profiles: {},
        currentSort: 'default',
        isLoading: false,
    };

    const contentArea = document.getElementById('content-area');

    const translations = {
        participants_title: "Личный состав",
        PMC_balance_title: "Баланс ЧВК",
        participants_quantity: "Бойцов в строю",
        sort_default: "По умолчанию",
        sort_balance: "По балансу",
        sort_name: "По имени",
        sort_unit: "По отряду",
        search_placeholder: "Поиск бойца...",
        refresh_button: "Обновить",
        unit: "Отряд",
        certificate: "Статус",
        balance: "Баланс",
        back_button: "Назад",
        main_info: "Основная информация",
        notes: "Заметки"
    };

    function getImageUrl(profileUrl) {
        return (profileUrl && profileUrl.startsWith('http')) ? profileUrl : config.defaultImageUrl;
    }

    const templates = {
        participantsList: (T) => `
            <section id="participantsSection">
                <div id="additional-info">
                    <h2 class="main-title" data-lang-key="participants_title">${T.participants_title}</h2>
                    <span id="PMC-balance-section">
                        <h2 class="main-title" data-lang-key="PMC_balance_title">${T.PMC_balance_title}</h2>
                        <h2 class="main-title" id="PMC-balance" style="text-align: center;">${PMC_balance}</h2>
                    </span>
                    <span id="participant-quantity-section">
                        <h2 class="main-title" data-lang-key="participants_quantity">${T.participants_quantity}</h2>
                        <h2 class="main-title" id="participant-quantity">0</h2>
                    </span>
                </div>
                <div class="controls-container">
                    <div id="sortControls" class="sort-controls">
                        <button class="sort-btn active" data-sort="default" data-lang-key="sort_default">${T.sort_default}</button>
                        <button class="sort-btn" data-sort="balance" data-lang-key="sort_balance">${T.sort_balance}</button>
                        <button class="sort-btn" data-sort="name" data-lang-key="sort_name">${T.sort_name}</button>
                        <button class="sort-btn" data-sort="unit" data-lang-key="sort_unit">${T.sort_unit}</button>
                    </div>
                    <input id="search-input" type="search" placeholder="${T.search_placeholder}">
                    <button id="refreshBtn" class="btn refresh-btn" data-lang-key="refresh_button">${T.refresh_button}</button>
                </div>
                <div id="messageContainer" class="hidden"></div>
                <div id="participantsContainer" class="participants-grid" aria-live="polite"></div>
            </section>
        `,
        participantCard: (p, T) => {
            const avatarUrl = getImageUrl(p.avatarUrl);
            return `
                <a href="?id=${p.id}" class="participant-card" style="text-decoration: none;" data-id="${p.id}">
                    <div class="card-header">
                        <img src="${avatarUrl}" alt="Avatar ${p.name}" class="participant-avatar" loading="lazy">
                        <div class="name-role-group">
                            <div class="participant-name">${p.name}</div>
                            <div class="participant-position">${p.position}</div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="info-item"><span class="info-label" data-lang-key="unit">${T.unit}:</span><span class="info-value">${p.unit}</span></div>
                        <div class="info-item"><span class="info-label" data-lang-key="certificate">${T.certificate}:</span><span class="info-value">${p.certificate}</span></div>
                        <div class="info-item balance"><span class="info-label" data-lang-key="balance">${T.balance}:</span><span class="info-value balance-value">${p.balance}<img src="images/Acoin.png" class="coin-img"></span></div>
                    </div>
                </a>`;
        },
        profileDetails: (p, T) => {
            const avatarUrl = getImageUrl(p.avatarUrl);
            return `
                <section id="profileSection">
                    <a href="participants.html" class="btn back-btn" data-lang-key="back_button">${T.back_button}</a>
                    <div class="profile">
                        <div class="profile-header">
                            <img src="${avatarUrl}" alt="Avatar ${p.name}" class="profile-avatar">
                            <h2 class="profile-name">${p.name}</h2>
                            <p class="profile-position">${p.position}</p>
                        </div>
                        <div class="profile-content">
                            <div class="profile-section">
                                <h3 class="section-title" data-lang-key="main_info">${T.main_info}</h3>
                                <div class="info-grid">
                                    <div class="info-card"><div class="info-card-title" data-lang-key="unit">${T.unit}</div><div class="info-card-value">${p.unit}</div></div>
                                    <div class="info-card"><div class="info-card-title" data-lang-key="certificate">${T.certificate}</div><div class="info-card-value">${p.certificate}</div></div>
                                    <div class="info-card"><div class="info-card-title" data-lang-key="balance">${T.balance}</div><div class="info-card-value balance">${p.balance} <img src="images/Acoin.png" class="coin-img"></div></div>
                                </div>
                            </div>
                            <div class="profile-section">
                                <h3 class="section-title" data-lang-key="notes">${T.notes}</h3>
                                <div class="note-card-value">${p.note ? p.note.replace(/\n/g, '<br>') : ''}</div>
                            </div>
                        </div>
                    </div>
                </section>
            `;
        }
    };

    function renderParticipants() {
        const container = document.getElementById('participantsContainer');
        if (!container) return;

        container.innerHTML = '';
        const T = translations;

        let profilesList = Object.values(state.profiles);

        const searchInput = document.getElementById('search-input');
        if (searchInput && searchInput.value) {
            const term = searchInput.value.toLowerCase();
            profilesList = profilesList.filter(p =>
                p.name.toLowerCase().includes(term) ||
                p.unit.toLowerCase().includes(term) ||
                p.position.toLowerCase().includes(term)
            );
        }

        if (state.currentSort === 'balance') {
            profilesList.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));
        } else if (state.currentSort === 'name') {
            profilesList.sort((a, b) => a.name.localeCompare(b.name));
        } else if (state.currentSort === 'unit') {
            profilesList.sort((a, b) => a.unit.localeCompare(b.unit));
        }

        profilesList.forEach(p => {
            container.innerHTML += templates.participantCard(p, T);
        });
    }

    function renderProfile(profileId) {
        const profile = state.profiles[profileId];
        const T = translations;

        if (profile) {
            contentArea.innerHTML = templates.profileDetails(profile, T);
        } else {
            contentArea.innerHTML = `<p class="text-center">Профиль не найден. <a href="participants.html">Вернуться</a></p>`;
        }
    }

    async function initParticipantsPage() {
        state.isLoading = true;

        try {
            console.log("Fetching users from Firebase...");
            const querySnapshot = await getDocs(collection(db, "users"));

            const profiles = {};
            let totalBalance = 0;

            querySnapshot.forEach((doc) => {
                const data = doc.data();

                if (data.role === 'admin') return;

                profiles[doc.id] = {
                    id: doc.id,
                    name: data.username || "Неизвестный",
                    position: data.position || "Нет должности",
                    unit: data.unit || "Нет отряда",
                    certificate: data.certificate || "Неизвестно",
                    balance: data.balance !== undefined ? data.balance : 0,
                    note: data.notes || "",
                    avatarUrl: ""
                };

                totalBalance += (Number(data.balance) || 0);
            });

            state.profiles = profiles;
            state.isLoading = false;
            PMC_balance = totalBalance;

            const urlParams = new URLSearchParams(window.location.search);
            const profileId = urlParams.get('id');

            if (profileId) {
                renderProfile(profileId);
            } else {
                const T = translations;
                contentArea.innerHTML = templates.participantsList(T);

                const quantityEl = document.getElementById('participant-quantity');
                if (quantityEl) quantityEl.textContent = Object.keys(state.profiles).length || 0;

                const pmcBalanceEl = document.getElementById('PMC-balance');
                if (pmcBalanceEl) pmcBalanceEl.textContent = PMC_balance;

                renderParticipants();
                bindListEvents();
                console.log("Participants loaded:", Object.keys(state.profiles).length, "users");
            }

        } catch (error) {
            console.error("Error fetching participants:", error);
            contentArea.innerHTML = `<p style="color:red; text-align:center;">Ошибка загрузки данных: ${error.message}</p>`;
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

    // Сначала анонимный вход → потом запрос к Firestore
    signInAnonymously(auth)
        .then(() => {
            console.log("Firebase: signed in anonymously");
            initParticipantsPage();
        })
        .catch((error) => {
            console.error("Anonymous auth failed:", error.code, error.message);
            contentArea.innerHTML = `
                <div style="color:red; text-align:center; padding: 2rem;">
                    <strong>Ошибка авторизации Firebase</strong><br><br>
                    ${error.message}<br><br>
                    <small>Включите Anonymous Authentication:<br>
                    Firebase Console → Authentication → Sign-in method → Anonymous → Enable</small>
                </div>`;
        });
});