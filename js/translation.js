// загрузить и применить переводы
async function loadTranslations(lang) {
    // если язык не указан, использовать язык по умолчанию
    const DEFAULT_LANG = 'ru';
    if (!lang) lang = DEFAULT_LANG;

    // проверить, есть ли переводы для этого языка
    const availableLangs = ['ru', 'uk', 'en']; // список доступных языков
    if (!availableLangs.includes(lang)) {
        console.warn(`Language "${lang}" is not supported. Falling back to "${DEFAULT_LANG}".`);
        lang = DEFAULT_LANG;
    }

    // загрузить словарь и применить переводы
    const res = await fetch(`locales/${lang}.json`); // убран ведущий слэш
    const dict = await res.json();
    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.getAttribute('data-lang-key');
        if (dict[key]) el.textContent = dict[key];
    });
    document.getElementById('search-input').setAttribute('placeholder', dict['search_placeholder']);
}

export { loadTranslations };