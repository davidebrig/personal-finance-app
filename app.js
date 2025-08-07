// ===============================================
// FINANCE APP - COMPLETE JAVASCRIPT
// ===============================================

// ===============================================
// GLOBAL LOADING STATE MANAGEMENT
// ===============================================
function showGlobalLoading() {
    AppState.isLoading = true;
    let loader = document.getElementById('globalLoadingOverlay');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'globalLoadingOverlay';
        loader.style.position = 'fixed';
        loader.style.top = 0;
        loader.style.left = 0;
        loader.style.width = '100vw';
        loader.style.height = '100vh';
        loader.style.background = 'rgba(20,20,20,0.85)'; // Overlay dark
        loader.style.zIndex = 9999;
        loader.style.display = 'flex';
        loader.style.alignItems = 'center';
        loader.style.justifyContent = 'center';
        loader.innerHTML = `
            <div class="loader-spinner-dark" style="
                border: 6px solid #333;
                border-top: 6px solid var(--color-primary, #4fc3f7);
                border-radius: 50%;
                width: 48px;
                height: 48px;
                animation: spin-dark 1s linear infinite;
                box-shadow: 0 0 16px 2px rgba(0,0,0,0.25);
            "></div>
        `;
        document.body.appendChild(loader);

        // Spinner CSS (aggiungi solo se non già presente)
        if (!document.getElementById('globalLoadingSpinnerStyle')) {
            const style = document.createElement('style');
            style.id = 'globalLoadingSpinnerStyle';
            style.innerHTML = `
                @keyframes spin-dark {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .loader-spinner-dark {
                    /* fallback per chi non supporta var() */
                    border-top: 6px solid var(--color-primary, #4fc3f7) !important;
                }
            `;
            document.head.appendChild(style);
        }
    } else {
        loader.style.display = 'flex';
    }
}

function hideGlobalLoading() {
    AppState.isLoading = false;
    const loader = document.getElementById('globalLoadingOverlay');
    if (loader) loader.style.display = 'none';
}

//

// Global State Management & Balance Visibility
const AppState = {
    currentPage: 'dashboard', // Imposta 'dashboard' come pagina di default
    isLoading: false,
    datiSpreadsheet: {
        conti: [],
        categorie: [],
        transazioni: []
    },
    editingTransactionId: null, // ID della transazione in modifica, o null
    userConfig: { // Per configurazioni backend
        googleAppsScriptUrl: '',
        googleSheetId: '',
        lookerStudioUrl: ''    },    tags: [],
    userPreferences: { // Nuova sezione per preferenze utente
        userName: '',
        defaultBalanceVisible: true,
        defaultHomepage: 'dashboard'
    },
    connectionStatus: APP_STATES.LOADING
};

const BALANCE_VISIBILITY_KEY = 'financeAppBalancesVisible';
let balancesVisible = true; // Verrà inizializzato correttamente in base alle preferenze

const USER_NAME_KEY = 'financeAppUserName';
const DEFAULT_BALANCE_VISIBLE_KEY = 'financeAppDefaultBalanceVisible';
const DEFAULT_HOMEPAGE_KEY = 'financeAppDefaultHomepage';

// let userName = localStorage.getItem(USER_NAME_KEY) || ''; // Spostato in AppState.userPreferences
// Chiavi localStorage per configurazioni backend
const APPS_SCRIPT_URL_KEY = 'financeAppAppsScriptUrl';
const SHEET_ID_KEY = 'financeAppSheetId';
const LOOKER_URL_KEY = 'financeAppLookerUrl';

// ===============================================
// APPLICATION INITIALIZATION
// ===============================================

document.addEventListener('DOMContentLoaded', function() {
    DEBUG.log('Inizializzazione app completa...');
    
    initializeApp();
    loadSpreadsheetData();
});

function initializeApp() {
    initializeNavigation();
    initializeTransactionForm();
    initializeConnectionStatus();
    initializeAmountInput();
    initializeStickySubmit();
    initializeUserPreferences(); // Carica tutte le preferenze utente
    initializeBalanceVisibility(); // Applica la visibilità dei saldi e inizializza il toggle
    initializeBackendConfig(); // Inizializza configurazioni backend

    // Gestione pagina iniziale (default o da URL)
    const urlParams = new URLSearchParams(window.location.search);
    const pageFromUrl = urlParams.get('page');
    let initialPage = AppState.userPreferences.defaultHomepage; // Usa la preferenza utente

    if (pageFromUrl && document.getElementById(pageFromUrl + 'Page')) {
        initialPage = pageFromUrl; // L'URL ha la precedenza
    }
    AppState.currentPage = initialPage; // Imposta la pagina corrente globale
    changePage(initialPage, true); // true per indicare caricamento iniziale
    updateLastConnectionTime(); // Chiamato dopo il setup della pagina
    
    DEBUG.log('App completa inizializzata con successo');
}

function initializeUserPreferences() {
    AppState.userPreferences.userName = localStorage.getItem(USER_NAME_KEY) || '';
    
    const defaultBalancePref = localStorage.getItem(DEFAULT_BALANCE_VISIBLE_KEY);
    AppState.userPreferences.defaultBalanceVisible = (defaultBalancePref === null) ? true : (defaultBalancePref === 'true');
    
    AppState.userPreferences.defaultHomepage = localStorage.getItem(DEFAULT_HOMEPAGE_KEY) || 'dashboard';
    
    DEBUG.log('Preferenze utente inizializzate:', AppState.userPreferences);
}

function initializeBackendConfig() {
    AppState.userConfig.googleAppsScriptUrl = localStorage.getItem(APPS_SCRIPT_URL_KEY) || CONFIG.DEFAULT_GOOGLE_APPS_SCRIPT_URL;
    AppState.userConfig.googleSheetId = localStorage.getItem(SHEET_ID_KEY) || CONFIG.DEFAULT_GOOGLE_SHEET_ID;
    AppState.userConfig.lookerStudioUrl = localStorage.getItem(LOOKER_URL_KEY) || CONFIG.LOOKER_STUDIO_URL; // LOOKER_STUDIO_URL può essere null di default

    // Popola i campi nelle impostazioni se la pagina è già caricata o quando viene caricata
    // Questo verrà gestito meglio in handlePageChange per 'settings'
    DEBUG.log('Configurazioni backend inizializzate:', AppState.userConfig);
}

function getEffectiveGoogleSheetURL() {
    return `https://docs.google.com/spreadsheets/d/${AppState.userConfig.googleSheetId}/edit`;
}

function initializeConnectionStatus() {
    const statusEl = document.getElementById('connectionStatus');
    
    if (statusEl) {
        statusEl.addEventListener('click', function() {
            if (AppState.connectionStatus === APP_STATES.SUCCESS) {
                openGoogleSheet();
            } else if (AppState.connectionStatus === APP_STATES.ERROR) {
                // Riprova connessione
                loadSpreadsheetData();
            }
        });
        
        // Tooltip dinamico
        statusEl.addEventListener('mouseenter', function() {
            if (AppState.connectionStatus === APP_STATES.SUCCESS) {
                this.title = 'Clicca per aprire il Google Sheet';
            } else if (AppState.connectionStatus === APP_STATES.ERROR) {
                this.title = 'Clicca per riprovare la connessione';
            } else {
                this.title = 'Connessione in corso...';
            }
        });
    }
    
    DEBUG.log('Status connessione inizializzato');
}

function openGoogleSheet() {
    try {
        const url = getEffectiveGoogleSheetURL();
        window.open(url, '_blank', 'noopener,noreferrer');
        
        DEBUG.log('Apertura Google Sheet', { url });
        showMessage('success', 'Apertura Google Sheet...');
        
    } catch (error) {
        DEBUG.error('Errore nell\'apertura Google Sheet', error);
        showMessage('error', 'Impossibile aprire il Google Sheet');
    }
}

function openLookerStudio() {
    // Per ora apre Google Sheets, ma puoi sostituire con il tuo URL Looker Studio
    const lookerUrl = AppState.userConfig.lookerStudioUrl || getEffectiveGoogleSheetURL(); // Fallback a Google Sheet se Looker non è configurato
    
    try {
        window.open(lookerUrl, '_blank', 'noopener,noreferrer');
        DEBUG.log('Apertura Looker Studio/Analytics Dashboard');
        showMessage('success', 'Apertura dashboard analytics...');
        
    } catch (error) {
        DEBUG.error('Errore nell\'apertura Looker Studio', error);
        showMessage('error', 'Impossibile aprire la dashboard analytics');
    }
}

function updateLastConnectionTime() {
    const lastConnectionEl = document.getElementById('lastConnection');
    if (lastConnectionEl) {
        const now = new Date();
        lastConnectionEl.textContent = now.toLocaleTimeString('it-IT', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
}

// ===============================================
// BALANCE VISIBILITY MANAGEMENT
// ===============================================

function initializeBalanceVisibility() {
    // Imposta lo stato iniziale di balancesVisible in base alla preferenza caricata
    balancesVisible = AppState.userPreferences.defaultBalanceVisible;

    const toggleButton = document.getElementById('toggleBalanceVisibility');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleBalanceState);
    }    applyBalanceVisibility(balancesVisible); // Applica lo stato iniziale subito
    DEBUG.log('Toggle visibilità saldi inizializzato');
}

function applyBalanceVisibility(visible) {
    const elementsToToggle = document.querySelectorAll('.balance-value');
    elementsToToggle.forEach(el => {
        if (visible) {
            el.classList.remove('blurred-balance');
        } else {
            el.classList.add('blurred-balance');
        }
    });
    const toggleButton = document.getElementById('toggleBalanceVisibility');
    if (toggleButton) {
        if (visible) { // Se i saldi sono VISIBILI, l'icona mostra l'azione per NASCONDERE
            toggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
            toggleButton.setAttribute('aria-label', 'Nascondi saldi');
        } else { // Se i saldi sono NASCOSTI, l'icona mostra l'azione per MOSTRARE
            toggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
            toggleButton.setAttribute('aria-label', 'Mostra saldi');
        }
    }
}

function toggleBalanceState() {
    balancesVisible = !balancesVisible;
    // Non salviamo più BALANCE_VISIBILITY_KEY qui, perché il default viene dalle preferenze.
    // Lo stato 'balancesVisible' è per la sessione corrente.
    // Se l'utente vuole che questo diventi il nuovo default, lo farà tramite le impostazioni.
    applyBalanceVisibility(balancesVisible);
}

// ===============================================
// USER PREFERENCES MANAGEMENT (SETTINGS PAGE)
// ===============================================
function populateUserPreferencesInputs() {
    const userNameInput = document.getElementById('userNameInput');
    const defaultBalanceToggle = document.getElementById('defaultBalanceVisibilityToggle');
    const defaultHomepageSelect = document.getElementById('defaultHomepageSelect');

    if (userNameInput) userNameInput.value = AppState.userPreferences.userName;
    if (defaultBalanceToggle) defaultBalanceToggle.checked = AppState.userPreferences.defaultBalanceVisible;
    if (defaultHomepageSelect) defaultHomepageSelect.value = AppState.userPreferences.defaultHomepage;
}

function saveUserPreferences() {
    const userNameInput = document.getElementById('userNameInput');
    const defaultBalanceToggle = document.getElementById('defaultBalanceVisibilityToggle');
    const defaultHomepageSelect = document.getElementById('defaultHomepageSelect');

    const newName = userNameInput ? userNameInput.value.trim() : AppState.userPreferences.userName;
    const newDefaultBalanceVisible = defaultBalanceToggle ? defaultBalanceToggle.checked : AppState.userPreferences.defaultBalanceVisible;
    const newDefaultHomepage = defaultHomepageSelect ? defaultHomepageSelect.value : AppState.userPreferences.defaultHomepage;

    // if (!newName) { // Il nome può essere vuoto se l'utente lo desidera
    //     showPersonalizationMessage('error', 'Il nome non può essere vuoto.');
    //     return;
    // }

    AppState.userPreferences.userName = newName;
    AppState.userPreferences.defaultBalanceVisible = newDefaultBalanceVisible;
    AppState.userPreferences.defaultHomepage = newDefaultHomepage;

    localStorage.setItem(USER_NAME_KEY, newName);
    localStorage.setItem(DEFAULT_BALANCE_VISIBLE_KEY, newDefaultBalanceVisible.toString());
    localStorage.setItem(DEFAULT_HOMEPAGE_KEY, newDefaultHomepage);

    updateWelcomeMessage(); // Aggiorna il messaggio di benvenuto
    // Se la visibilità dei saldi di default è cambiata, applicala subito
    if (balancesVisible !== newDefaultBalanceVisible) {
        balancesVisible = newDefaultBalanceVisible;
        applyBalanceVisibility(balancesVisible);
    }
    
    showPersonalizationMessage('success', 'Preferenze salvate!');
    DEBUG.log('Preferenze utente salvate:', AppState.userPreferences);
}

document.addEventListener('DOMContentLoaded', () => {
    const savePrefsBtn = document.getElementById('saveUserPreferencesBtn');
    if (savePrefsBtn) savePrefsBtn.addEventListener('click', saveUserPreferences);
    updateWelcomeMessage(); // Mostra il messaggio di benvenuto all'avvio se il nome è già impostato
});

// ===============================================
// NAVIGATION MANAGEMENT
// ===============================================

function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const page = this.dataset.page;
            if (page) {
                changePage(page);
            }
        });
    });
    
    DEBUG.log('Navigazione inizializzata');
}

function changePage(page, isInitialLoad = false) {
    DEBUG.log('Cambio pagina', { from: AppState.currentPage, to: page, initial: isInitialLoad });

    // Se sto uscendo dalla pagina di modifica (addTransaction) e la modalità modifica è attiva, resetta la modalità modifica
    if (AppState.currentPage === 'addTransaction' && page !== 'addTransaction' && AppState.editingTransactionId) {
        resetTransactionForm();
    }
    
    // Nascondi tutte le pagine
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Rimuovi active da tutti i nav items
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // Gestisci visibilità del bottone mostra/nascondi saldi
    const balanceToggleButton = document.getElementById('toggleBalanceVisibility');
    if (balanceToggleButton) {
        if (page === 'dashboard') {
            balanceToggleButton.style.display = 'flex'; // O il display originale se diverso da flex
        } else {
            balanceToggleButton.style.display = 'none';
        }
    }
    
    // Mostra la pagina richiesta
    const targetPage = document.getElementById(page + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
        AppState.currentPage = page;
        
        // Aggiorna nav item attivo
        const navItem = document.querySelector(`[data-page="${page}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
        
        // Aggiorna titolo
        updatePageTitle(page);
        
        // Logica specifica per pagina
        // Se è il caricamento iniziale e la pagina è addTransaction, non serve ricaricare tutto subito
        // handlePageChange si occuperà di caricare i dati se necessario per altre pagine
        if (!isInitialLoad || page !== 'addTransaction') {
            setTimeout(() => handlePageChange(page), 50); // Ridotto timeout
        } else if (isInitialLoad && page === 'addTransaction') {
            // Assicurati che lo sticky submit sia visibile
            showStickySubmit();
            // Il titolo è già impostato dall'HTML e da updatePageTitle
        }
    }
}

function updatePageTitle(page) {
    const titleEl = document.getElementById('pageTitle');
    const pageConfig = PAGES[page];
    const closeEditBtn = document.getElementById('closeEditBtn');
    if (titleEl) {
        if (page === 'addTransaction' && AppState.editingTransactionId) {
            titleEl.innerHTML = `<span style="display: flex; align-items: center; gap: 10px;"><svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg> Modifica</span>`;
            if (closeEditBtn) closeEditBtn.classList.remove('hidden');
        } else if (pageConfig) {
            let iconSVG = '';
            switch(page) {
                case 'dashboard':
                    iconSVG = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='12' width='4' height='8'/><rect x='9' y='8' width='4' height='12'/><rect x='15' y='4' width='4' height='16'/></svg>`;
                    pageConfig.title = 'Personal Finance App';
                    break;
                case 'transaction':
                    iconSVG = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 8v8m0 0l-4-4m4 4l4-4'/></svg>`;
                    break;
                case 'addTransaction':
                    iconSVG = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg>`;
                    break;
                case 'shared':
                    iconSVG = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M23 21v-2a4 4 0 0 0-3-3.87'/><path d='M16 3.13a4 4 0 0 1 0 7.75'/></svg>`;
                    break;
                case 'settings':
                    iconSVG = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='3'/><path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 5 15.4a1.65 1.65 0 0 0-1.51-1V13a2 2 0 0 1 0-4v-.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09c.38.07.73.24 1 .51a1.65 1.65 0 0 0 1.82.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8c.07.38.24.73.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-.51 1z'/></svg>`;
                    break;
            }
            titleEl.innerHTML = `<span style="display: flex; align-items: center; gap: 10px;">${iconSVG} ${pageConfig.title}</span>`;
            if (closeEditBtn) closeEditBtn.classList.add('hidden');
        } else if (AppState.currentPage === 'addTransaction' && page === 'addTransaction') {
            titleEl.innerHTML = `<span style="display: flex; align-items: center; gap: 10px;"><svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg> Nuovo record</span>`;
            if (closeEditBtn) closeEditBtn.classList.add('hidden');
        }
    }
}

function handlePageChange(page) {
    switch(page) {
        case 'dashboard':
            updateDashboard();
            hideStickySubmit();
            // Assicurati che il messaggio di benvenuto sia aggiornato quando si va alla dashboard
            // Questo è utile se il nome viene cambiato e poi si torna alla dashboard
            // senza ricaricare l'intera app.
            updateWelcomeMessage();
            break;
        case 'transaction':
            updateTransactionsPage();
            hideStickySubmit();
            break;
        case 'addTransaction':
            showStickySubmit();
            if (CONFIG.FORM.AUTO_FOCUS_AMOUNT) {
                setTimeout(() => {
                    const importoField = document.getElementById('importo');
                    if (importoField) importoField.focus();
                }, 100);
            }
            break;
        case 'shared':
            // Per ora non fa nulla, pagina placeholder
            hideStickySubmit();
            break;
        case 'settings':
            updateLastConnectionTime();
            populateUserPreferencesInputs(); // Popola input per preferenze utente
            populateBackendConfigInputs(); // Popola input per URL backend
            hideStickySubmit();
            break;
    }
}

// ===============================================
// STICKY SUBMIT MANAGEMENT
// ===============================================

function initializeStickySubmit() {
    const stickySubmit = document.getElementById('stickySubmit');
    const stickyBtn = document.getElementById('submitBtnSticky');
    
    if (stickyBtn) {
        // Il sticky button deve submitare il form principale
        stickyBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const form = document.getElementById('transactionForm');
            if (form) {
                // Triggera il submit del form principale
                const submitEvent = new Event('submit', { 
                    bubbles: true, 
                    cancelable: true 
                });
                form.dispatchEvent(submitEvent);
            }
        });
    }
    
    DEBUG.log('Sticky submit inizializzato');
}

function showStickySubmit() {
    const stickySubmit = document.getElementById('stickySubmit');
    const appMain = document.querySelector('.app-main');
    
    if (stickySubmit) {
        stickySubmit.classList.add('active');
    }
    
    if (appMain) {
        appMain.classList.add('with-sticky-submit');
    }
    
    // Sincronizza i due bottoni
    syncSubmitButtons();
    
    // Se siamo in modalità modifica, assicurati che il bottone "Annulla Modifica" sia visibile
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (cancelEditBtn && AppState.editingTransactionId) cancelEditBtn.classList.remove('hidden');

    DEBUG.log('Sticky submit mostrato');
}

function hideStickySubmit() {
    const stickySubmit = document.getElementById('stickySubmit');
    const appMain = document.querySelector('.app-main');
    
    if (stickySubmit) {
        stickySubmit.classList.remove('active');
    }
    
    if (appMain) {
        appMain.classList.remove('with-sticky-submit');
    }
    // Nascondi il bottone "Annulla Modifica" se non siamo in modalità modifica o non siamo sulla pagina addTransaction
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (cancelEditBtn) {
        cancelEditBtn.classList.add('hidden');
    }
    
    DEBUG.log('Sticky submit nascosto');
}

function syncSubmitButtons() {
    const originalBtn = document.getElementById('submitBtn');
    const stickyBtn = document.getElementById('submitBtnSticky');
    const tipoField = document.getElementById('tipo');
    
    if (!originalBtn || !stickyBtn || !tipoField) return;
    
    const tipo = tipoField.value;
    
    // Sincronizza classi
    stickyBtn.className = originalBtn.className;
    
    // Sincronizza stato disabled
    stickyBtn.disabled = originalBtn.disabled;
    
    // Sincronizza testo del bottone
    const submitText = document.getElementById('submitText');
    const submitTextSticky = document.getElementById('submitTextSticky');
    const submitSpinner = document.getElementById('submitSpinner');
    const submitSpinnerSticky = document.getElementById('submitSpinnerSticky');
    
    if (submitTextSticky) {
        let tipoText = '';
        switch(tipo) {
            case TRANSACTION_TYPES.EXPENSE:
                tipoText = 'Spesa';
                break;
            case TRANSACTION_TYPES.INCOME:
                tipoText = 'Entrata';
                break;
            case TRANSACTION_TYPES.TRANSFER:
                tipoText = 'Trasferimento';
                break;
            default:
                tipoText = 'Transazione';
        }
        submitTextSticky.textContent = `Salva ${tipoText}`;
        if (AppState.editingTransactionId) {
            submitTextSticky.textContent = `Salva Modifiche`;
        }
    }
    
    if (submitSpinner && submitSpinnerSticky) {
        submitSpinnerSticky.style.display = submitSpinner.style.display;
        if (submitTextSticky) {
            submitTextSticky.style.display = submitText ? submitText.style.display : 'inline';
        }    
    }
    if (submitText && AppState.editingTransactionId) {
        submitText.textContent = 'Salva Modifiche';
    }
}

// ===============================================
// TRANSACTIONS PAGE MANAGEMENT
// ===============================================

function updateTransactionsPage() {
    DEBUG.log('Aggiornamento pagina transazioni...');
    loadTransactionsList();
}

async function loadTransactionsList() {
    const transactionsListEl = document.getElementById('transactionsList');
    if (!transactionsListEl) return;
    showGlobalLoading();
    // Mostra skeleton loading
    showTransactionsLoading();
    
    // Se abbiamo già i dati, mostrali
    if (AppState.datiSpreadsheet.transazioni && AppState.datiSpreadsheet.transazioni.length > 0) {
        displayTransactionsList(AppState.datiSpreadsheet.transazioni);
        hideGlobalLoading();
    } else {
        // Carica dati da Google Sheets
        try {
            const response = await fetch(AppState.userConfig.googleAppsScriptUrl + '?action=getTransactions');
            const data = await response.json();
            if (data.success) {
                AppState.datiSpreadsheet.transazioni = data.transactions || [];
                displayTransactionsList(AppState.datiSpreadsheet.transazioni);
            } else {
                throw new Error(data.message || 'Errore nel caricamento transazioni');
            }
        } catch (error) {
            DEBUG.error('Errore nel caricamento transazioni', error);
            showTransactionsError();
        } finally {
            hideGlobalLoading();
        }
    }
}

function showTransactionsLoading() {
    const transactionsListEl = document.getElementById('transactionsList');
    if (!transactionsListEl) return;
    
    let loadingHTML = '';
    for (let i = 0; i < 5; i++) {
        loadingHTML += '<div class="skeleton skeleton--text"></div>';
    }
    
    transactionsListEl.innerHTML = loadingHTML;
}

function showTransactionsError() {
    const transactionsListEl = document.getElementById('transactionsList');
    if (!transactionsListEl) return;
    
    transactionsListEl.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
            <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
            <div>Errore nel caricamento</div>
            <div style="font-size: 12px; margin-top: 8px;">
                <button onclick="loadTransactionsList()" style="padding: 8px 16px; border: none; background: #000; color: #fff; border-radius: 6px; cursor: pointer;">
                    Riprova
                </button>
            </div>
        </div>
    `;
}

function displayTransactionsList(transactions) {
    const transactionsListEl = document.getElementById('transactionsList');
    if (!transactionsListEl) return;
    
    if (!transactions || transactions.length === 0) {
        transactionsListEl.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
                <div>Nessuna transazione trovata</div>
                <div style="font-size: 12px; margin-top: 8px;">
                    <button onclick="changePage('addTransaction')" style="padding: 8px 16px; border: none; background: #000; color: #fff; border-radius: 6px; cursor: pointer;">
                        Aggiungi la prima transazione
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    // Ordina le transazioni per data decrescente (più recenti prima)
    const recentTransactions = transactions
        .slice() // copia per non mutare l'originale
        .sort((a, b) => new Date(b.Data) - new Date(a.Data))
        .slice(0, CONFIG.TRANSACTIONS.LIST_LIMIT);
    
    let transactionsHTML = '';
    
    recentTransactions.forEach(transaction => {
        const amount = parseFloat(transaction['Importo (€)']) || 0;
        const isExpense = amount < 0;
        const isIncome = amount > 0;
        const isTransfer = transaction.Tipo === 'Trasferimento';
        
        let amountClass = 'transfer';
        const transactionId = transaction.ID; // Assicurati che l'ID sia disponibile
        if (isExpense) amountClass = 'expense';
        else if (isIncome) amountClass = 'income';
        
        const formattedAmount = NumberUtils.formatCurrency(Math.abs(amount));
        const displayAmount = isExpense ? `-${formattedAmount}` : formattedAmount;
        
        const date = transaction.Data ? new Date(transaction.Data) : new Date();
        const formattedDate = formatDate(date);
        
        transactionsHTML += `
            <div class="transaction-item" data-id="${transactionId}">
                <div class="transaction-left">
                    <div class="transaction-description">${transaction.Descrizione || 'Senza descrizione'}</div>
                    <div class="transaction-category">${transaction.Categoria || 'Senza categoria'}</div>
                    <div class="transaction-date">${formattedDate}</div>
                </div>
                <div class="transaction-right">
                    <div class="transaction-amount ${amountClass}">${displayAmount}</div>
                    <div class="transaction-account">${transaction.Conto || ''}</div>
                </div>
                <div class="transaction-actions">
                    <button class="btn-edit" onclick="initiateEditTransaction('${transactionId}')" aria-label="Modifica transazione">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/></svg>
                    </button>
                    <button class="btn-delete" onclick="confirmDeleteTransaction('${transactionId}')" aria-label="Elimina transazione">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                </div>
            </div>
        `;
    });
    
    transactionsListEl.innerHTML = transactionsHTML;
    
    DEBUG.log('Lista transazioni aggiornata', { count: recentTransactions.length });
}

// ===============================================
// AMOUNT INPUT MANAGEMENT (EUROPEAN FORMAT)
// ===============================================

function initializeAmountInput() {
    const importoInput = document.getElementById('importo');
    if (!importoInput) return;
    
    // Cambia il tipo da number a text per gestire formato europeo
    importoInput.type = 'text';
    
    // Gestione input in tempo reale
    importoInput.addEventListener('input', function(e) {
        let value = e.target.value;
        
        // Permetti solo numeri, virgole, punti e spazi
        value = value.replace(/[^0-9.,\s]/g, '');
        
        e.target.value = value;
    });
    
    // Formattazione al blur
    importoInput.addEventListener('blur', function(e) {
        const value = e.target.value;
        if (value) {
            const parsed = NumberUtils.parseEuropeanNumber(value);
            e.target.value = NumberUtils.formatDecimal(parsed);
        }
    });
    
    // Gestione enter per andare al campo successivo
    importoInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const contoField = document.getElementById('conto');
            if (contoField) contoField.focus();
        }
    });
    
    DEBUG.log('Input importo inizializzato con formato europeo');
}

// ===============================================
// DATA MANAGEMENT
// ===============================================

async function loadSpreadsheetData() {
    updateConnectionStatus(APP_STATES.LOADING, 'Caricamento dati...');
    showGlobalLoading();
    try {
        const response = await fetch(AppState.userConfig.googleAppsScriptUrl + '?action=getInitialData');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
            AppState.datiSpreadsheet = data.data;
            // Popola solo i conti qui, le categorie verranno gestite da updateFieldVisibility
            populateAccountSelects(); 
            // Ora che i dati ci sono, aggiorna la visibilità e i filtri del form
            // in base al tipo di transazione corrente.
            updateFieldVisibility(); 
            updateConnectionStatus(APP_STATES.SUCCESS, 'Connesso al Google Sheet');
            updateLastConnectionTime();
            
            // Aggiorna dashboard se siamo sulla pagina dashboard
            if (AppState.currentPage === 'dashboard') {
                updateDashboard();
            }
            
            // Aggiorna transazioni se siamo sulla pagina transazioni
            if (AppState.currentPage === 'transaction') {
                updateTransactionsPage();
            }
            
            DEBUG.log('Dati caricati con successo', data.data);
        } else {
            throw new Error(data.message || 'Errore nel caricamento dati dal Google Sheet');
        }
    } catch (error) {
        DEBUG.error('Errore nel caricamento dati', error);
        updateConnectionStatus(APP_STATES.ERROR, 'Errore di connessione');
        showMessage('error', 'Impossibile collegarsi al Google Sheet: ' + error.message);
    } finally {
        hideGlobalLoading();
    }
}

function updateConnectionStatus(status, text) {
    AppState.connectionStatus = status;
    
    const statusEl = document.getElementById('connectionStatus');
    if (!statusEl) return;
    
    // Rimuovi classi di stato precedenti
    statusEl.classList.remove('success', 'error', 'loading');
    
    // Aggiorna il dot
    const dot = statusEl.querySelector('.status-dot');
    if (dot) {
        dot.className = `status-dot ${status}`;
    }
    
    // Aggiorna contenuto e classe
    statusEl.innerHTML = `<span class="status-dot ${status}"></span><span class="status-text">${text}</span>`;
    statusEl.classList.add(status);
    
    // Aggiorna testo in base allo stato
    let displayText = text;
    if (status === APP_STATES.SUCCESS) {
        displayText = 'Connesso';
    } else if (status === APP_STATES.ERROR) {
        displayText = 'Errore';
    } else if (status === APP_STATES.LOADING) {
        displayText = 'Connessione...';
    }
    
    statusEl.innerHTML = `<span class="status-dot ${status}"></span><span class="status-text">${displayText}</span>`;
    
    // Aggiorna stato app nelle impostazioni
    const appStatusEl = document.getElementById('appStatus');
    if (appStatusEl) {
        if (status === APP_STATES.SUCCESS) {
            appStatusEl.textContent = '🟢 Operativo';
        } else if (status === APP_STATES.ERROR) {
            appStatusEl.textContent = '🔴 Errore';
        } else {
            appStatusEl.textContent = '🟡 Connessione...';
        }
    }
    
    DEBUG.log('Stato connessione aggiornato', { status, text: displayText });
}

// ===============================================
// SIMPLIFIED DASHBOARD MANAGEMENT
// ===============================================

function updateDashboard() {
    DEBUG.log('Aggiornamento dashboard semplificata...');
    
    updateAccountBalances();
    updateMonthlyStats();
    updateRecentTransactions();
}

async function updateMonthlyStats() {
    // Carica statistiche reali o usa dati simulati come fallback
    showGlobalLoading();
    try {
        const response = await fetch(AppState.userConfig.googleAppsScriptUrl + '?action=getDashboardStats');
        const data = await response.json();
        if (data.success) {
            displayMonthlyStats(data);
            DEBUG.log('Stats mensili reali caricate', data);
        } else {
            throw new Error(data.message || 'Errore nel caricamento statistiche');
        }
    } catch (error) {
        DEBUG.error('Errore nel caricamento statistiche mensili', error);
        // Fallback ai dati simulati
        displayMonthlyStatsSimulated();
    } finally {
        hideGlobalLoading();
    }
}

function displayMonthlyStats(stats) {
    const monthlyIncomeEl = document.getElementById('monthlyIncome');
    const monthlyExpensesEl = document.getElementById('monthlyExpenses');
    const savingRateEl = document.getElementById('savingRate');
    const incomeChangeEl = document.getElementById('incomeChange');
    const expenseChangeEl = document.getElementById('expenseChange');
    const savingRateChangeEl = document.getElementById('savingRateChange');
    
    if (monthlyIncomeEl) {
        monthlyIncomeEl.textContent = NumberUtils.formatCurrency(stats.monthlyIncome || 0);
    }
    
    if (monthlyExpensesEl) {
        monthlyExpensesEl.textContent = NumberUtils.formatCurrency(stats.monthlyExpenses || 0);
    }
    
    // Calcola e mostra Saving Rate
    if (savingRateEl) {
        const currentSavingRate = calculateSavingRate(stats.monthlyIncome || 0, stats.monthlyExpenses || 0);
        savingRateEl.textContent = `${currentSavingRate.toFixed(1)}%`;
        
        // Aggiorna l'indicatore
        updateSavingRateIndicator(currentSavingRate);
    }
    
    // Mostra percentuali di cambiamento
    if (incomeChangeEl) {
        const change = stats.incomeChange || 0;
        incomeChangeEl.textContent = NumberUtils.formatPercentageChange(change);
        incomeChangeEl.className = `stat-change ${getChangeClass(change)}`;
    }
    
    if (expenseChangeEl) {
        const change = stats.expenseChange || 0;
        expenseChangeEl.textContent = NumberUtils.formatPercentageChange(change);
        // Per le spese, il verde indica una diminuzione (positivo)
        expenseChangeEl.className = `stat-change ${getChangeClass(-change)}`;
    }
    
    // Mostra cambiamento Saving Rate
    if (savingRateChangeEl) {
        const change = stats.savingRateChange || 0;
        savingRateChangeEl.textContent = NumberUtils.formatPercentageChange(change);
        savingRateChangeEl.className = `stat-change ${getChangeClass(change)}`;
    }

    // Applica visibilità saldi dopo aver aggiornato il DOM
    applyBalanceVisibility(balancesVisible);
}

function calculateSavingRate(income, expenses) {
    if (!income || income <= 0) {
        return 0;
    }
    
    const savings = income - expenses;
    const savingRate = (savings / income) * 100;
    
    // Assicurati che il saving rate sia tra -100% e 100%
    return Math.max(-100, Math.min(100, savingRate));
}

function displayMonthlyStatsSimulated() {
    // Fallback con dati simulati
    const currentMonth = new Date().getMonth();
    const monthlyData = generateMonthlyData(currentMonth);
    const previousMonthData = generateMonthlyData(currentMonth - 1);
    
    const incomeChange = NumberUtils.calculatePercentageChange(
        monthlyData.income, 
        previousMonthData.income
    );
    const expenseChange = NumberUtils.calculatePercentageChange(
        monthlyData.expenses, 
        previousMonthData.expenses
    );
    
    // Calcola saving rate per entrambi i mesi
    const currentSavingRate = calculateSavingRate(monthlyData.income, monthlyData.expenses);
    const previousSavingRate = calculateSavingRate(previousMonthData.income, previousMonthData.expenses);
    const savingRateChange = previousSavingRate !== 0 ? currentSavingRate - previousSavingRate : 0;
    
    displayMonthlyStats({
        monthlyIncome: monthlyData.income,
        monthlyExpenses: monthlyData.expenses,
        incomeChange: incomeChange,
        expenseChange: expenseChange,
        savingRateChange: savingRateChange
    });
}

function getChangeClass(percentage) {
    if (percentage > 0) return 'positive';
    if (percentage < 0) return 'negative';
    return 'neutral';
}

function updateSavingRateIndicator(savingRate) {
    const indicatorEl = document.getElementById('savingRateIndicator');
    if (!indicatorEl) return;
    
    const indicatorText = indicatorEl.querySelector('.indicator-text');
    if (!indicatorText) return;
    
    // Rimuovi classi precedenti
    indicatorText.classList.remove('excellent', 'good', 'low');
    
    // Logica per determinare lo stato
    if (savingRate >= 30) {
        // 30% o più: Eccellente
        indicatorText.textContent = 'Eccellente';
        indicatorText.classList.add('excellent');
    } else if (savingRate >= 20) {
        // 20-29%: Buono
        indicatorText.textContent = 'Buono';
        indicatorText.classList.add('good');
    } else if (savingRate >= 10) {
        // 10-19%: Neutro
        indicatorText.textContent = 'Neutro';
        // Nessuna classe aggiuntiva, usa lo stile default
    } else if (savingRate >= 0) {
        // 0-9%: Basso
        indicatorText.textContent = 'Basso';
        indicatorText.classList.add('low');
    } else {
        // Negativo: Deficit
        indicatorText.textContent = 'Deficit';
        indicatorText.classList.add('low');
    }
}

function updateAccountBalances() {
    const totalBalanceEl = document.getElementById('totalBalance');
    const accountsListEl = document.getElementById('accountsList');
    
    if (!totalBalanceEl || !accountsListEl) return;
    
    if (AppState.datiSpreadsheet.conti && AppState.datiSpreadsheet.conti.length > 0) {
        let totalBalance = 0;
        let accountsHTML = '';
        
        AppState.datiSpreadsheet.conti.forEach(conto => {
            const saldo = parseFloat(conto.saldo) || 0;
            totalBalance += saldo;
            
            const balanceClass = saldo >= 0 ? 'positive' : 'negative';
            accountsHTML += `
                <div class="account-item">
                    <div class="account-name">${conto.nome}</div>
                    <div class="account-balance ${balanceClass} balance-value">${NumberUtils.formatCurrency(saldo)}</div>
                </div>
            `;
        });
        
        if (totalBalanceEl) totalBalanceEl.textContent = NumberUtils.formatCurrency(totalBalance); // totalBalanceEl è già un .balance-value
        accountsListEl.innerHTML = accountsHTML;
        
        DEBUG.log('Saldi aggiornati', { totalBalance, accounts: AppState.datiSpreadsheet.conti.length });
    } else {
        totalBalanceEl.textContent = NumberUtils.formatCurrency(0);
        accountsListEl.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">Nessun conto trovato</div>';
    }

    // Applica visibilità saldi dopo aver aggiornato il DOM
    applyBalanceVisibility(balancesVisible);
}

function updateRecentTransactions() {
    const recentTransactionsEl = document.getElementById('recentTransactions');
    if (!recentTransactionsEl) return;
    
    // Usa SOLO i dati reali - no fallback simulati
    if (AppState.datiSpreadsheet.transazioni && AppState.datiSpreadsheet.transazioni.length > 0) {
        displayRecentTransactions(AppState.datiSpreadsheet.transazioni);
    } else {
        // Mostra messaggio per invitare ad aggiungere transazioni
        showNoTransactionsMessage();
    }
}

function displayRecentTransactions(transactions) {
    const recentTransactionsEl = document.getElementById('recentTransactions');
    if (!recentTransactionsEl) return;
    
    // Prendi le ultime 5 transazioni
    const recentTransactions = transactions.slice(-CONFIG.DASHBOARD.RECENT_TRANSACTIONS_LIMIT).reverse();
    
    let transactionsHTML = '';
    
    recentTransactions.forEach(transaction => {
        const amount = parseFloat(transaction['Importo (€)']) || 0;
        const isExpense = amount < 0;
        const isIncome = amount > 0;
        
        let amountClass = 'transfer';
        const transactionId = transaction.ID; // Assicurati che l'ID sia disponibile
        if (isExpense) amountClass = 'expense';
        else if (isIncome) amountClass = 'income';
        
        const formattedAmount = NumberUtils.formatCurrency(Math.abs(amount));
        const displayAmount = isExpense ? `-${formattedAmount}` : `+${formattedAmount}`;
        
        transactionsHTML += `
            <div class="transaction-item" data-id="${transactionId}">
                <div class="transaction-left">
                    <div class="transaction-description">${transaction.Descrizione || 'Senza descrizione'}</div>
                    <div class="transaction-category">${transaction.Categoria || 'Senza categoria'}</div>
                </div>
                <div class="transaction-amount ${amountClass}">${displayAmount}</div>
                <div class="transaction-actions dashboard-actions">
                    <button class="btn-edit" onclick="initiateEditTransaction('${transactionId}')" aria-label="Modifica transazione">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/></svg>
                    </button>
                    <button class="btn-delete" onclick="confirmDeleteTransaction('${transactionId}')" aria-label="Elimina transazione">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                </div>
            </div>    
        `;
    });
    
    recentTransactionsEl.innerHTML = transactionsHTML;
    
    DEBUG.log('Transazioni recenti reali mostrate', { count: recentTransactions.length });
}

function showNoTransactionsMessage() {
    const recentTransactionsEl = document.getElementById('recentTransactions');
    if (!recentTransactionsEl) return;
    
    recentTransactionsEl.innerHTML = `
        <div style="text-align: center; padding: 30px 20px; color: #666;">
            <div style="font-size: 48px; margin-bottom: 12px;">💰</div>
            <div style="font-weight: 500; margin-bottom: 8px;">Nessuna transazione</div>
            <div style="font-size: 12px; margin-bottom: 16px; color: #999;">Inizia aggiungendo la tua prima transazione</div>
            <button onclick="changePage('addTransaction')" style="
                padding: 8px 16px; 
                border: none; 
                background: #000; 
                color: #fff; 
                border-radius: 20px; 
                cursor: pointer;
                font-size: 12px;
                font-weight: 600;
                transition: all 0.2s ease;
            " onmouseover="this.style.background='#333'" onmouseout="this.style.background='#000'">
                ➕ Aggiungi Prima Transazione
            </button>
        </div>
    `;
}

// ===============================================
// FORM MANAGEMENT
// ===============================================

function initializeTransactionForm() {
    // Imposta data corrente
    const dataField = document.getElementById('data');
    if (dataField) {
        dataField.valueAsDate = new Date();
    }

    // Spesa preselezionata
    updateFieldVisibility();
    updateButtonStyles();

    // Gestione tipo transazione
    const tipoBtns = document.querySelectorAll('.tipo-btn');
    tipoBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tipoBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const tipoField = document.getElementById('tipo');
            if (tipoField) {
                tipoField.value = this.dataset.tipo;
            }
            updateFieldVisibility();
            updateButtonStyles();
        });
    });

    // Gestione categoria/sottocategoria
    const categoriaField = document.getElementById('categoria');
    if (categoriaField) {
        categoriaField.addEventListener('change', updateSubcategories);
    }

    // Gestione form submit
    const form = document.getElementById('transactionForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // Inizializza sistema tag
    initializeTags();

    // Inizializza autocomplete descrizione
    initializeAutocomplete();

    // Bottone Annulla Modifica
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', cancelEditMode);
    }
    // Bottone X chiudi modifica
    const closeEditBtn = document.getElementById('closeEditBtn');
    if (closeEditBtn) {
        closeEditBtn.addEventListener('click', cancelEditMode);
    }

    showSubmitButton();
    
    DEBUG.log('Form transazioni inizializzato');
}

function showSubmitButton() {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.classList.remove('hidden');
        DEBUG.log('Submit button mostrato');
    }
}

function populateFormSelects() {
    populateAccountSelects(); // Le categorie verranno popolate da updateFieldVisibility
    // populateCategorySelects(); // Rimuoviamo questa chiamata da qui
}

function populateAccountSelects() {
    const selectConto = document.getElementById('conto');
    const selectContoDestinazione = document.getElementById('contoDestinazione');
    
    if (!selectConto) return;
    
    selectConto.innerHTML = '<option value="">Seleziona conto...</option>';
    if (selectContoDestinazione) {
        selectContoDestinazione.innerHTML = '<option value="">Seleziona destinazione...</option>';
    }
    
    if (AppState.datiSpreadsheet.conti && AppState.datiSpreadsheet.conti.length > 0) {
        let defaultAccountFound = false;
        
        AppState.datiSpreadsheet.conti.forEach((conto, index) => {
            const saldoText = conto.saldo !== undefined ? ` (${NumberUtils.formatCurrency(conto.saldo)})` : '';
            const option1 = new Option(`${conto.nome}${saldoText}`, conto.nome);
            selectConto.add(option1);
            
            // OPZIONE 1: Seleziona il conto predefinito se configurato
            if (CONFIG.FORM.DEFAULT_ACCOUNT && conto.nome === CONFIG.FORM.DEFAULT_ACCOUNT) {
                selectConto.value = conto.nome;
                defaultAccountFound = true;
            }
            
            // OPZIONE 2: Seleziona il primo conto se non c'è un predefinito
            // if (index === 0) {
            //     selectConto.value = conto.nome;
            // }
            
            if (selectContoDestinazione) {
                const option2 = new Option(`${conto.nome}${saldoText}`, conto.nome);
                selectContoDestinazione.add(option2);
            }
        });
        
        // Se il conto predefinito non è stato trovato, seleziona il primo
        if (!defaultAccountFound && AppState.datiSpreadsheet.conti.length > 0) {
            selectConto.value = AppState.datiSpreadsheet.conti[0].nome;
        }
    } else {
        selectConto.innerHTML = '<option value="">❌ Nessun conto trovato</option>';
        if (selectContoDestinazione) {
            selectContoDestinazione.innerHTML = '<option value="">❌ Nessun conto trovato</option>';
        }
    }
}

function populateCategorySelects(filterTipo = null) {
    const selectCategoria = document.getElementById('categoria');
    if (!selectCategoria) return;

    selectCategoria.innerHTML = '<option value="">Seleziona categoria...</option>';

    let categorieDaMostrare = [];
    if (AppState.datiSpreadsheet.categorie && AppState.datiSpreadsheet.categorie.length > 0) {
        if (filterTipo) {
            // Filtra le categorie in base al tipo (es. "spesa" o "entrata")
            // Assumiamo che cat.tipo nello spreadsheet sia "Spesa", "Entrata"
            // e filterTipo sia "spesa", "entrata"
            const tipoNormalizzato = filterTipo.charAt(0).toUpperCase() + filterTipo.slice(1);
            categorieDaMostrare = AppState.datiSpreadsheet.categorie
                .filter(c => c.tipo === tipoNormalizzato)
                .map(c => c.categoria);
        } else {
            // Mostra tutte le categorie se nessun filtro è applicato (o se i dati non sono pronti per il filtro)
            categorieDaMostrare = AppState.datiSpreadsheet.categorie.map(c => c.categoria);
        }
    }

    const uniqueCategorie = [...new Set(categorieDaMostrare)].filter(c => c); // Rimuovi eventuali valori nulli o stringhe vuote

    if (uniqueCategorie.length > 0) {
        uniqueCategorie.forEach(categoria => {
            if (categoria) { // Assicurati che la categoria non sia vuota
                const option = new Option(categoria, categoria);
                selectCategoria.add(option);
            }
        });
        selectCategoria.disabled = false;
    } else {
        selectCategoria.innerHTML = filterTipo ? `<option value="">❌ Nessuna categoria per "${filterTipo}"</option>` : '<option value="">❌ Nessuna categoria</option>';
        selectCategoria.disabled = true;
    }
    updateSubcategories(); // Aggiorna le sottocategorie in base alle nuove categorie
}

function updateButtonStyles() {
    const tipoField = document.getElementById('tipo');
    const submitBtn = document.getElementById('submitBtn');
    const submitBtnSticky = document.getElementById('submitBtnSticky');
    
    if (!tipoField) return;
    
    const tipo = tipoField.value;
    
    // Aggiorna entrambi i bottoni
    [submitBtn, submitBtnSticky].forEach(btn => {
        if (btn) {
            // Rimuovi tutte le classi di tipo
            btn.classList.remove('btn--expense', 'btn--income', 'btn--transfer');
            
            // Aggiungi la classe corrente
            switch(tipo) {
                case TRANSACTION_TYPES.EXPENSE:
                    btn.classList.add('btn--expense');
                    break;
                case TRANSACTION_TYPES.INCOME:
                    btn.classList.add('btn--income');
                    break;
                case TRANSACTION_TYPES.TRANSFER:
                    btn.classList.add('btn--transfer');
                    break;
            }
        }
    });
    
    // Sincronizza i bottoni
    if (AppState.currentPage === 'addTransaction') {
        syncSubmitButtons();
    }
}

function updateFieldVisibility() {
    const tipoField = document.getElementById('tipo');
    const contoDestinazioneGroup = document.getElementById('contoDestinazioneGroup');
    const contoDestinazione = document.getElementById('contoDestinazione');
    const categoriaGroup = document.getElementById('categoriaGroup');
    const sottocategoriaGroup = document.getElementById('sottocategoriaGroup');
    const categoriaField = document.getElementById('categoria');
    const sottocategoriaField = document.getElementById('sottocategoria');

    if (!tipoField || !categoriaGroup || !sottocategoriaGroup || !categoriaField || !sottocategoriaField) {
        DEBUG.warn("Elementi del form mancanti per updateFieldVisibility");
        return;
    }

    const tipo = tipoField.value;

    if (tipo === TRANSACTION_TYPES.TRANSFER) {
        // Gestione Trasferimento
        if (contoDestinazioneGroup) {
            contoDestinazioneGroup.classList.remove('hidden');
        }
        if (contoDestinazione) {
            contoDestinazione.required = true;
        }
        // Nascondi e resetta Categoria e Sottocategoria
        categoriaGroup.classList.add('hidden');
        sottocategoriaGroup.classList.add('hidden');
        categoriaField.required = false;
        sottocategoriaField.required = false; 
        categoriaField.innerHTML = '<option value="">N/A per Trasferimento</option>';
        sottocategoriaField.innerHTML = '<option value="">N/A per Trasferimento</option>';
        categoriaField.value = '';
        sottocategoriaField.value = '';
        categoriaField.disabled = true;
        sottocategoriaField.disabled = true;

    } else {
        // Gestione Spesa o Entrata
        if (contoDestinazioneGroup) {
            contoDestinazioneGroup.classList.add('hidden');
        }
        if (contoDestinazione) {
            contoDestinazione.required = false;
            contoDestinazione.value = '';
        }
        // Mostra Categoria e Sottocategoria e popola Categorie
        categoriaGroup.classList.remove('hidden');
        sottocategoriaGroup.classList.remove('hidden');
        categoriaField.required = true;
        categoriaField.disabled = false;
        sottocategoriaField.disabled = false;
        populateCategorySelects(tipo); // Filtra le categorie per tipo "spesa" o "entrata"
    }
    // Aggiorna lo stile dei bottoni submit in base al tipo
    updateButtonStyles();
}

function updateSubcategories() {
    const categoriaField = document.getElementById('categoria');
    const selectSottocategoria = document.getElementById('sottocategoria');
    
    if (!selectSottocategoria || !categoriaField) return;

    const categoriaSelezionata = categoriaField.value;
    selectSottocategoria.innerHTML = '<option value="">Seleziona sottocategoria...</option>';

    // Se il campo categoria è disabilitato (es. per Trasferimento o nessuna categoria trovata), non fare nulla
    if (categoriaField.disabled || !categoriaSelezionata) {
        selectSottocategoria.innerHTML = categoriaField.disabled ? '<option value="">N/A</option>' : '<option value="">Prima seleziona categoria</option>';
        return;
    }

    if (categoriaSelezionata && AppState.datiSpreadsheet.categorie) {
        const sottocategorie = AppState.datiSpreadsheet.categorie
            .filter(c => c.categoria === categoriaSelezionata && c.sottocategoria) // Assicurati che la sottocategoria esista
            .map(c => c.sottocategoria)
            .filter(s => s);

        if (sottocategorie.length > 0) {
            [...new Set(sottocategorie)].forEach(sottocategoria => { // Assicura unicità
                const option = new Option(sottocategoria, sottocategoria);
                selectSottocategoria.add(option);
            });
        } else {
            selectSottocategoria.innerHTML = '<option value="">Nessuna sottocategoria</option>';
        }
    }
}

// ===============================================
// TAGS SYSTEM
// ===============================================

function initializeTags() {
    const tagsInput = document.getElementById('tagsInput');
    
    if (!tagsInput) {
        DEBUG.warn('Campo tagsInput non trovato');
        return;
    }
    
    tagsInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = this.value.trim();
            if (value && !AppState.tags.includes(value)) {
                addTag(value);
                this.value = '';
            }
        }
    });

    tagsInput.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && this.value === '' && AppState.tags.length > 0) {
            removeTag(AppState.tags[AppState.tags.length - 1]);
        }
    });
    
    DEBUG.log('Sistema tag inizializzato');
}

function addTag(text) {
    AppState.tags.push(text);
    updateTagsDisplay();
    updateTagsInput();
    
    DEBUG.log('Tag aggiunto', text);
}

function removeTag(text) {
    AppState.tags = AppState.tags.filter(tag => tag !== text);
    updateTagsDisplay();
    updateTagsInput();
    
    DEBUG.log('Tag rimosso', text);
}

// Funzione globale per rimuovere tag (chiamata dall'HTML)
function removeTagGlobal(text) {
    removeTag(text);
}

function updateTagsDisplay() {
    const tagsDisplay = document.getElementById('tagsDisplay');
    const tagsInput = document.getElementById('tagsInput');
    
    if (!tagsDisplay || !tagsInput) return;
    
    // Rimuovi tutti i tag esistenti
    const existingTags = tagsDisplay.querySelectorAll('.tag');
    existingTags.forEach(tag => tag.remove());
    
    // Aggiungi i tag attuali
    AppState.tags.forEach(tagText => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag';
        tagEl.innerHTML = `${tagText}<span class="tag-remove" onclick="removeTagGlobal('${tagText}')">×</span>`;
        tagsDisplay.insertBefore(tagEl, tagsInput);
    });
}

function updateTagsInput() {
    const hiddenInput = document.getElementById('etichetta');
    if (hiddenInput) {
        hiddenInput.value = AppState.tags.join(', ');
    }
}

// ===============================================
// AUTOCOMPLETE SYSTEM
// ===============================================

function initializeAutocomplete() {
    const descrizioneInput = document.getElementById('descrizione');
    const suggestionsContainer = document.getElementById('descrizioneSuggestions');
    
    if (!descrizioneInput || !suggestionsContainer) {
        DEBUG.warn('Elementi autocomplete non trovati');
        return;
    }
    
    let selectedIndex = -1;

    descrizioneInput.addEventListener('input', function() {
        const value = this.value;
        
        if (value.length >= 3) {
            const filteredSuggestions = DESCRIPTION_SUGGESTIONS.filter(suggestion =>
                suggestion.toLowerCase().includes(value.toLowerCase())
            );
            
            showSuggestions(filteredSuggestions);
        } else {
            hideSuggestions();
        }
        
        selectedIndex = -1;
    });

    descrizioneInput.addEventListener('keydown', function(e) {
        const suggestions = suggestionsContainer.querySelectorAll('.autocomplete-suggestion');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
            updateSelectedSuggestion(suggestions);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            updateSelectedSuggestion(suggestions);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            selectSuggestion(suggestions[selectedIndex].textContent);
        } else if (e.key === 'Escape') {
            hideSuggestions();
        }
    });

    function showSuggestions(suggestions) {
        suggestionsContainer.innerHTML = '';
        
        if (suggestions.length > 0) {
            suggestions.forEach(suggestion => {
                const div = document.createElement('div');
                div.className = 'autocomplete-suggestion';
                div.textContent = suggestion;
                div.addEventListener('click', () => selectSuggestion(suggestion));
                suggestionsContainer.appendChild(div);
            });
            
            suggestionsContainer.style.display = 'block';
        } else {
            hideSuggestions();
        }
    }

    function hideSuggestions() {
        suggestionsContainer.style.display = 'none';
        selectedIndex = -1;
    }

    function updateSelectedSuggestion(suggestions) {
        suggestions.forEach((suggestion, index) => {
            suggestion.classList.toggle('selected', index === selectedIndex);
        });
    }

    function selectSuggestion(value) {
        descrizioneInput.value = value;
        hideSuggestions();
    }

    // Nasconde suggerimenti quando si clicca fuori
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.autocomplete-container')) {
            hideSuggestions();
        }
    });
    
    DEBUG.log('Autocomplete inizializzato');
}

// ===============================================
// TRANSACTION MANAGEMENT
// ===============================================

function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn'); // Bottone originale nel form
    const originalSubmitTextEl = document.getElementById('submitText'); // Testo del bottone originale
    const originalSubmitSpinnerEl = document.getElementById('submitSpinner'); // Spinner del bottone originale

    // Usa il bottone sticky per i riferimenti se il bottone originale non è visibile (improbabile ma per sicurezza)
    const effectiveSubmitTextEl = originalSubmitTextEl || document.getElementById('submitTextSticky');
    const effectiveSubmitSpinnerEl = originalSubmitSpinnerEl || document.getElementById('submitSpinnerSticky');

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // --- VALIDAZIONE AVANZATA ---
    // Importo
    const amount = NumberUtils.parseEuropeanNumber(data.importo);
    if (isNaN(amount) || amount <= 0) {
        showMessage('error', 'L\'importo deve essere un numero maggiore di zero.');
        setSubmitButtonsLoading(false, effectiveSubmitTextEl, effectiveSubmitSpinnerEl);
        return;
    }
    // Data
    if (!data.data || isNaN(new Date(data.data).getTime())) {
        showMessage('error', 'Data non valida.');
        setSubmitButtonsLoading(false, effectiveSubmitTextEl, effectiveSubmitSpinnerEl);
        return;
    }
    // Conto
    if (!data.conto) {
        showMessage('error', 'Seleziona un conto.');
        setSubmitButtonsLoading(false, effectiveSubmitTextEl, effectiveSubmitSpinnerEl);
        return;
    }
    // Categoria (obbligatoria se non trasferimento)
    if (data.tipo !== TRANSACTION_TYPES.TRANSFER && !data.categoria) {
        showMessage('error', 'Seleziona una categoria.');
        setSubmitButtonsLoading(false, effectiveSubmitTextEl, effectiveSubmitSpinnerEl);
        return;
    }
    // Conto destinazione (obbligatorio se trasferimento)
    if (data.tipo === TRANSACTION_TYPES.TRANSFER) {
        if (!data.contoDestinazione) {
            showMessage('error', 'Seleziona un conto di destinazione.');
            setSubmitButtonsLoading(false, effectiveSubmitTextEl, effectiveSubmitSpinnerEl);
            return;
        }
        if (data.contoDestinazione === data.conto) {
            showMessage('error', 'Il conto di destinazione deve essere diverso dal conto di partenza.');
            setSubmitButtonsLoading(false, effectiveSubmitTextEl, effectiveSubmitSpinnerEl);
            return;
        }
    }
    // Descrizione (opzionale, ma puoi renderla obbligatoria se vuoi)
    // if (!data.descrizione) {
    //     showMessage('error', 'Inserisci una descrizione.');
    //     setSubmitButtonsLoading(false, effectiveSubmitTextEl, effectiveSubmitSpinnerEl);
    //     return;
    // }

    try {
        if (AppState.editingTransactionId) {
            // Modalità Modifica
            let determinedClasse = '';
            if (data.categoria && AppState.datiSpreadsheet.categorie) {
                const categoriaInfo = AppState.datiSpreadsheet.categorie.find(
                    cat => cat.categoria === data.categoria
                );
                if (categoriaInfo && categoriaInfo.classe) {
                    determinedClasse = categoriaInfo.classe;
                }
            }

            const updatedTransactionData = {
                ID: AppState.editingTransactionId, // ID originale è già in AppState
                Tipo: data.tipo === TRANSACTION_TYPES.EXPENSE ? 'Spesa' : (data.tipo === TRANSACTION_TYPES.INCOME ? 'Entrata' : 'Trasferimento'),
                Data: data.data,
                Conto: data.conto,
                'Conto Destinazione': data.tipo === TRANSACTION_TYPES.TRANSFER ? data.contoDestinazione : '',
                Categoria: data.tipo !== TRANSACTION_TYPES.TRANSFER ? data.categoria : '',
                Sottocategoria: data.tipo !== TRANSACTION_TYPES.TRANSFER ? (data.sottocategoria || '') : '',
                Descrizione: data.descrizione || '',
                'Importo (€)': data.tipo === TRANSACTION_TYPES.EXPENSE ? -amount : (data.tipo === TRANSACTION_TYPES.INCOME ? amount : (data.conto === AppState.datiSpreadsheet.transazioni.find(t => t.ID === AppState.editingTransactionId)?.Conto ? -amount : amount)), // Logica importo per trasferimenti
                Etichetta: data.etichetta || '',
                Classe: determinedClasse
            };
             // Per i trasferimenti, l'importo dipende se stiamo modificando la parte 'uscita' o 'entrata' del trasferimento originale.
            // Questa logica è semplificata. Una gestione robusta dei trasferimenti modificati potrebbe richiedere di modificare entrambe le parti.
            // Per ora, modifichiamo solo la singola riga. Il backend si aspetta un solo oggetto.
            if (updatedTransactionData.Tipo === 'Trasferimento') {
                 const originalTransaction = AppState.datiSpreadsheet.transazioni.find(t => t.ID === AppState.editingTransactionId);
                 if (originalTransaction && parseFloat(originalTransaction['Importo (€)']) < 0) { // Se era la parte di uscita
                    updatedTransactionData['Importo (€)'] = -amount;
                 } else { // Se era la parte di entrata
                    updatedTransactionData['Importo (€)'] = amount;
                 }
            }

            submitEditTransactionOnServer(AppState.editingTransactionId, updatedTransactionData, effectiveSubmitTextEl, effectiveSubmitSpinnerEl);

        } else {
            // Modalità Aggiunta
            const transactions = createTransactions(data);
            submitTransactions(transactions, effectiveSubmitTextEl, effectiveSubmitSpinnerEl);
        }
    } catch (error) {
        DEBUG.error('Errore nella creazione della transazione', error);
        showMessage('error', 'Errore nella creazione della transazione: ' + error.message);
        // Riabilita i bottoni in caso di errore di validazione prima della chiamata fetch
        AppState.isLoading = false;
        setSubmitButtonsLoading(false, effectiveSubmitTextEl, effectiveSubmitSpinnerEl);
    }
}

function populateFormForEdit(transaction) {
    const form = document.getElementById('transactionForm');
    if (!form || !transaction) return;

    DEBUG.log("Popolamento form per modifica:", transaction);

    // Tipo transazione
    const tipoToSet = transaction.Tipo.toLowerCase(); // es. "spesa", "entrata", "trasferimento"
    document.getElementById('tipo').value = tipoToSet;
    document.querySelectorAll('.tipo-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.classList.remove('tipo-btn--readonly');
        if (btn.dataset.tipo === tipoToSet) {
            btn.classList.add('active');
        }
        // Disabilita e schiarisci i bottoni del tipo in modalità modifica
        if (AppState.editingTransactionId) {
            btn.disabled = true;
            btn.classList.add('tipo-btn--readonly');
        } else {
            btn.disabled = false;
        }
    });
    updateFieldVisibility(); // Questo popolerà anche le categorie corrette

    // Data
    document.getElementById('data').valueAsDate = new Date(transaction.Data);
    // Importo (sempre positivo nel form)
    document.getElementById('importo').value = NumberUtils.formatDecimal(Math.abs(parseFloat(transaction['Importo (€)'])));
    // Conto
    document.getElementById('conto').value = transaction.Conto;
    // Conto Destinazione (per trasferimenti)
    if (tipoToSet === TRANSACTION_TYPES.TRANSFER) {
        document.getElementById('contoDestinazione').value = transaction['Conto Destinazione'] || '';
    }
    // Categoria e Sottocategoria (se non è trasferimento)
    if (tipoToSet !== TRANSACTION_TYPES.TRANSFER) {
        document.getElementById('categoria').value = transaction.Categoria || '';
        updateSubcategories(); // Chiamare dopo aver impostato la categoria per popolare le sottocategorie
        setTimeout(() => { // Timeout per permettere il popolamento delle sottocategorie
            document.getElementById('sottocategoria').value = transaction.Sottocategoria || '';
        }, 50); // Un piccolo delay potrebbe essere necessario
    }
    // Descrizione
    document.getElementById('descrizione').value = transaction.Descrizione || '';
    // Etichette/Tags
    AppState.tags = transaction.Etichetta ? transaction.Etichetta.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    updateTagsDisplay();
    updateTagsInput();

    updateButtonStyles(); // Aggiorna stile bottoni (es. colore)
    syncSubmitButtons(); // Aggiorna testo bottone sticky
}

function cancelEditMode() {
    resetTransactionForm(); // Questo resetterà anche AppState.editingTransactionId
    // showMessage('info', 'Modifica annullata.'); // Il messaggio potrebbe non essere visibile a causa del cambio pagina immediato
    changePage('transaction'); // Reindirizza alla pagina dell'elenco transazioni
    DEBUG.log('Modifica annullata, reindirizzamento a pagina transazioni.');
}

function createTransactions(data) {
    const transactions = [];
    
    // Parse dell'importo in formato europeo
    const amount = NumberUtils.parseEuropeanNumber(data.importo);
    
    if (isNaN(amount) || amount <= 0) {
        throw new Error('Importo non valido');
    }
    
    // Determina la Classe basata sulla Categoria selezionata
    let determinedClasse = '';
    if (data.categoria && AppState.datiSpreadsheet.categorie) {
        // Cerca la categoria nei dati caricati dallo spreadsheet
        // AppState.datiSpreadsheet.categorie contiene oggetti con proprietà in minuscolo (es. cat.classe)
        const categoriaInfo = AppState.datiSpreadsheet.categorie.find(
            cat => cat.categoria === data.categoria
        );
        if (categoriaInfo && categoriaInfo.classe) {
            determinedClasse = categoriaInfo.classe;
        } else {
            DEBUG.warn(`Classe non trovata per Categoria: ${data.categoria}. Verrà lasciata vuota.`);
        }
    }
    
    const baseTransaction = {
        Data: data.data,
        Categoria: data.categoria,
        Sottocategoria: data.sottocategoria || '',
        Descrizione: data.descrizione || '',
        Etichetta: data.etichetta || '',
        Classe: determinedClasse // header di Apps Script
    };

    switch(data.tipo) {
        case TRANSACTION_TYPES.EXPENSE:
            transactions.push({
                Tipo: 'Spesa',
                Conto: data.conto,
                'Conto Destinazione': '',
                'Importo (€)': -amount,
                ...baseTransaction
            });
            break;
            
        case TRANSACTION_TYPES.INCOME:
            transactions.push({
                Tipo: 'Entrata',
                Conto: data.conto,
                'Conto Destinazione': '',
                'Importo (€)': amount,
                ...baseTransaction
            });
            break;
            
        case TRANSACTION_TYPES.TRANSFER:
            if (!data.contoDestinazione || data.conto === data.contoDestinazione) {
                throw new Error('Seleziona un conto di destinazione diverso da quello di partenza');
            }
            
            transactions.push({
                Tipo: 'Trasferimento',
                Conto: data.conto,
                'Conto Destinazione': data.contoDestinazione,
                'Importo (€)': -amount,
                ...baseTransaction
            });
            
            transactions.push({
                Tipo: 'Trasferimento',
                Conto: data.contoDestinazione,
                'Conto Destinazione': data.conto,
                'Importo (€)': amount,
                ...baseTransaction
            });
            break;
    }

    return transactions;
}

function setSubmitButtonsLoading(isLoading, submitTextEl, submitSpinnerEl) {
    const submitBtn = document.getElementById('submitBtn');
    const submitBtnSticky = document.getElementById('submitBtnSticky');
    [submitBtn, submitBtnSticky].forEach(btn => {
        if (btn) btn.disabled = isLoading;
    });
    if (submitTextEl) submitTextEl.style.display = isLoading ? 'none' : 'inline';
    if (submitSpinnerEl) {
        submitSpinnerEl.style.display = isLoading ? 'inline-block' : 'none';
        submitSpinnerEl.classList.toggle('hidden', !isLoading);
    }
}

function enableSubmitButtons() {
    const submitBtn = document.getElementById('submitBtn');
    const submitBtnSticky = document.getElementById('submitBtnSticky');
    [submitBtn, submitBtnSticky].forEach(btn => {
        if (btn) btn.disabled = false;
    });
}

function disableSubmitButtons() {
    const submitBtn = document.getElementById('submitBtn');
    const submitBtnSticky = document.getElementById('submitBtnSticky');
    [submitBtn, submitBtnSticky].forEach(btn => {
        if (btn) btn.disabled = true;
    });
}

async function submitTransactions(transactions, submitTextEl, submitSpinnerEl) {
    AppState.isLoading = true;
    setSubmitButtonsLoading(true, submitTextEl, submitSpinnerEl);
    showGlobalLoading();
    showMessage('loading', 'Registrazione in corso...');
    const formData = new URLSearchParams();
    formData.append('action', 'addTransaction');
    formData.append('transactions', JSON.stringify(transactions));
    DEBUG.log('Invio transazioni a:', AppState.userConfig.googleAppsScriptUrl, transactions);
    try {
        const response = await fetch(AppState.userConfig.googleAppsScriptUrl, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            showMessage('success', data.message || 'Transazione registrata con successo!');
            if (CONFIG.FORM.RESET_AFTER_SUBMIT) {
                resetTransactionForm();
            }
            // Ricarica i dati per aggiornare i saldi e dashboard
            setTimeout(() => {
                loadSpreadsheetData();
            }, 1000);
            DEBUG.log('Transazioni registrate con successo', data);
        } else {
            throw new Error(data.message || 'Errore sconosciuto');
        }
    } catch (error) {
        DEBUG.error('Errore nella registrazione', error);
        showMessage('error', 'Errore nella registrazione: ' + error.message);
    } finally {
        AppState.isLoading = false;
        setSubmitButtonsLoading(false, submitTextEl, submitSpinnerEl);
        hideGlobalLoading();
    }
}

async function submitEditTransactionOnServer(transactionId, updatedData, submitTextEl, submitSpinnerEl) {
    AppState.isLoading = true;
    setSubmitButtonsLoading(true, submitTextEl, submitSpinnerEl);
    showGlobalLoading();
    showMessage('loading', 'Salvataggio modifiche in corso...');
    const formData = new URLSearchParams();
    formData.append('action', 'editTransaction');
    formData.append('transactionId', transactionId);
    formData.append('transactionData', JSON.stringify(updatedData));
    DEBUG.log('Invio modifica transazione:', AppState.userConfig.googleAppsScriptUrl, { transactionId, updatedData });
    try {
        const response = await fetch(AppState.userConfig.googleAppsScriptUrl, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            showMessage('success', result.message || 'Transazione modificata con successo!');
            resetTransactionForm(); // Questo resetta anche AppState.editingTransactionId
            // Ricarica i dati per aggiornare saldi e dashboard
            setTimeout(() => {
                loadSpreadsheetData();
            }, 1000);
            DEBUG.log('Transazione modificata con successo', result);
        } else {
            throw new Error(result.message || 'Errore durante la modifica');
        }
    } catch (error) {
        DEBUG.error('Errore nella modifica transazione:', error);
        showMessage('error', `Errore modifica: ${error.message}`);
    } finally {
        AppState.isLoading = false;
        setSubmitButtonsLoading(false, submitTextEl, submitSpinnerEl);
        hideGlobalLoading();
    }
}

function resetTransactionForm() {
    const form = document.getElementById('transactionForm');
    const tipoField = document.getElementById('tipo');
    const dataField = document.getElementById('data');
    
    if (form) {
        form.reset();
    }
    
    if (tipoField) {
        tipoField.value = TRANSACTION_TYPES.EXPENSE;
    }
    
    const expenseBtn = document.querySelector('.tipo-btn--expense');
    document.querySelectorAll('.tipo-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.classList.remove('tipo-btn--readonly');
        btn.disabled = false; // Riabilita i bottoni del tipo
    });

    if (expenseBtn) expenseBtn.classList.add('active');
    
    if (dataField) {
        dataField.valueAsDate = new Date();
    }
    
    // Reset tags
    AppState.tags = [];
    updateTagsDisplay();
    updateTagsInput();
    
    // Resetta lo stato di modifica
    AppState.editingTransactionId = null;
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (cancelEditBtn) cancelEditBtn.classList.add('hidden');

    // Ripristina il testo originale dei bottoni submit
    const submitText = document.getElementById('submitText');
    if (submitText) submitText.textContent = 'Salva Transazione'; // Testo di default
    // syncSubmitButtons() verrà chiamato da updateButtonStyles e si occuperà del bottone sticky

    updateFieldVisibility();
    updateButtonStyles();
    
    // Focus sull'importo per la prossima transazione
    if (CONFIG.FORM.AUTO_FOCUS_AMOUNT) {
        setTimeout(() => {
            const importoField = document.getElementById('importo');
            if (importoField) importoField.focus();
        }, 100);
    }
    
    DEBUG.log('Form resettato');
}

// ===============================================
// TRANSACTION EDIT/DELETE FUNCTIONS
// ===============================================
function initiateEditTransaction(transactionId) {
    DEBUG.log('Avvio modifica per transazione ID:', transactionId);
    const transactionToEdit = AppState.datiSpreadsheet.transazioni.find(t => t.ID === transactionId);

    if (!transactionToEdit) {
        showMessage('error', 'Transazione non trovata per la modifica.');
        DEBUG.error('Transazione non trovata in AppState per ID:', transactionId);
        return;
    }

    AppState.editingTransactionId = transactionId;
    changePage('addTransaction'); // Vai alla pagina del form

    // Popola il form dopo che la pagina è stata cambiata e gli elementi sono disponibili
    // Potrebbe essere necessario un piccolo timeout se changePage ha animazioni o caricamenti asincroni
    setTimeout(() => {
        populateFormForEdit(transactionToEdit);
        
        // Aggiorna testo bottoni submit
        const submitText = document.getElementById('submitText');
        if (submitText) submitText.textContent = 'Salva Modifiche';
        syncSubmitButtons(); // Assicura che anche il bottone sticky sia aggiornato

        // Mostra bottone "Annulla Modifica"
        const cancelEditBtn = document.getElementById('cancelEditBtn');
        if (cancelEditBtn) cancelEditBtn.classList.remove('hidden');

        // Scrolla in cima alla pagina del form se necessario
        window.scrollTo(0, 0);
        // Focus sul primo campo editabile, es. importo
        const importoField = document.getElementById('importo');
        if (importoField) importoField.focus();

    }, 100); // Un piccolo delay per assicurare che la pagina sia pronta
}

function confirmDeleteTransaction(transactionId) {
    if (confirm('Sei sicuro di voler eliminare questa transazione? L\'azione è irreversibile.')) {
        deleteTransactionOnServer(transactionId);
    }
}

async function deleteTransactionOnServer(transactionId) {
    showMessage('loading', 'Eliminazione transazione in corso...');
    const formData = new URLSearchParams();
    formData.append('action', 'deleteTransaction');
    formData.append('transactionId', transactionId);

    try {
        const response = await fetch(AppState.userConfig.googleAppsScriptUrl, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        if (result.success) {
            showMessage('success', result.message || 'Transazione eliminata con successo!');
            // Rimuovi l'elemento dalla UI e ricarica i dati
            const itemToRemove = document.querySelector(`.transaction-item[data-id="${transactionId}"]`);
            if (itemToRemove) {
                itemToRemove.remove();
            }
            // Ricarica tutti i dati per aggiornare saldi, statistiche, ecc.
            loadSpreadsheetData(); 
        } else {
            throw new Error(result.message || 'Errore durante l\'eliminazione');
        }
    } catch (error) {
        DEBUG.error('Errore eliminazione transazione:', error);
        showMessage('error', `Errore eliminazione: ${error.message}`);
    }
}

// ===============================================
// UI UTILITIES
// ===============================================

function showMessage(type, text) {
    const messageEl = document.getElementById('message');
    if (!messageEl) return;
    
    messageEl.className = `message ${type}`;
    messageEl.textContent = text;
    messageEl.style.display = 'block';
    messageEl.classList.remove('hidden');
    
    if (CONFIG.UI.AUTO_HIDE_MESSAGES) {
        if (type === 'success') {
            setTimeout(() => {
                messageEl.style.display = 'none';
                messageEl.classList.add('hidden');
            }, CONFIG.UI.SUCCESS_MESSAGE_DURATION);
        } else if (type === 'error') {
            setTimeout(() => {
                messageEl.style.display = 'none';
                messageEl.classList.add('hidden');
            }, CONFIG.UI.ERROR_MESSAGE_DURATION);
        }
    }
    
    DEBUG.log('Messaggio mostrato', { type, text });
}

function showPersonalizationMessage(type, text) {
    const messageEl = document.getElementById('userPreferencesMessage');
    if (!messageEl) return;
    
    messageEl.className = `message ${type}`;
    messageEl.textContent = text;
    messageEl.style.display = 'block';
    messageEl.classList.remove('hidden');

    // Nascondi automaticamente dopo un po'
    let duration = CONFIG.UI.SUCCESS_MESSAGE_DURATION;
    if (type === 'error') {
        duration = CONFIG.UI.ERROR_MESSAGE_DURATION;
    }

    setTimeout(() => {
        messageEl.style.display = 'none';
        messageEl.classList.add('hidden');
    }, duration);

    DEBUG.log('Messaggio personalizzazione mostrato', { type, text });
}

function updateWelcomeMessage() {
    const welcomeMessageEl = document.getElementById('welcomeMessage');
    if (welcomeMessageEl) {
        if (AppState.userPreferences.userName) {
            welcomeMessageEl.textContent = `Ciao ${AppState.userPreferences.userName}! 👋`;
            welcomeMessageEl.style.display = 'block';
        } else {
            welcomeMessageEl.style.display = 'none';        }
    }
}

// ===============================================
// BACKEND CONFIGURATION MANAGEMENT (SETTINGS PAGE)
// ===============================================

function populateBackendConfigInputs() {
    const appsScriptUrlInput = document.getElementById('appsScriptUrlInput');
    const sheetIdInput = document.getElementById('sheetIdInput');
    const lookerUrlInput = document.getElementById('lookerUrlInput');

    if (appsScriptUrlInput) appsScriptUrlInput.value = AppState.userConfig.googleAppsScriptUrl;
    if (sheetIdInput) sheetIdInput.value = AppState.userConfig.googleSheetId;
    if (lookerUrlInput) lookerUrlInput.value = AppState.userConfig.lookerStudioUrl || ''; // Gestisce null
}

function showBackendConfigMessage(type, text) {
    const messageEl = document.getElementById('backendConfigMessage');
    if (!messageEl) return;
    messageEl.className = `message ${type}`;
    messageEl.textContent = text;
    messageEl.style.display = 'block';
    messageEl.classList.remove('hidden');
    let duration = CONFIG.UI.SUCCESS_MESSAGE_DURATION;
    if (type === 'error') {
        duration = CONFIG.UI.ERROR_MESSAGE_DURATION;
    }
    setTimeout(() => {
        messageEl.style.display = 'none';
        messageEl.classList.add('hidden');
    }, duration);
}

function saveBackendConfig() {
    const appsScriptUrlInput = document.getElementById('appsScriptUrlInput');
    const sheetIdInput = document.getElementById('sheetIdInput');
    const lookerUrlInput = document.getElementById('lookerUrlInput');

    const newAppsScriptUrl = appsScriptUrlInput ? appsScriptUrlInput.value.trim() : AppState.userConfig.googleAppsScriptUrl;
    const newSheetId = sheetIdInput ? sheetIdInput.value.trim() : AppState.userConfig.googleSheetId;
    const newLookerUrl = lookerUrlInput ? lookerUrlInput.value.trim() : AppState.userConfig.lookerStudioUrl;

    // Validazione semplice (puoi espanderla)
    if (!newAppsScriptUrl || !newSheetId) {
        showBackendConfigMessage('error', 'URL Apps Script e ID Foglio Google sono obbligatori.');
        return;
    }

    AppState.userConfig.googleAppsScriptUrl = newAppsScriptUrl;
    AppState.userConfig.googleSheetId = newSheetId;
    AppState.userConfig.lookerStudioUrl = newLookerUrl;

    localStorage.setItem(APPS_SCRIPT_URL_KEY, newAppsScriptUrl);
    localStorage.setItem(SHEET_ID_KEY, newSheetId);
    localStorage.setItem(LOOKER_URL_KEY, newLookerUrl);

    showBackendConfigMessage('success', 'Configurazioni backend salvate. Ricarica i dati se necessario.');
    DEBUG.log('Configurazioni backend salvate:', AppState.userConfig);

    // Potresti voler forzare un ricaricamento dei dati o avvisare l'utente di farlo
    // Esempio: loadSpreadsheetData(); // per applicare subito le modifiche
}

// Assicurati che il bottone di salvataggio nelle impostazioni chiami saveBackendConfig()
document.addEventListener('DOMContentLoaded', () => {
    const saveBackendConfigBtn = document.getElementById('saveBackendConfigBtn');
    if (saveBackendConfigBtn) saveBackendConfigBtn.addEventListener('click', saveBackendConfig);
});
// ===============================================
// GLOBAL ERROR HANDLING
// ===============================================

window.addEventListener('error', function(e) {
    DEBUG.error('Errore JavaScript globale', e.error);
    showMessage('error', 'Si è verificato un errore imprevisto');
});

window.addEventListener('unhandledrejection', function(e) {
    DEBUG.error('Promise rejection non gestita', e.reason);
    showMessage('error', 'Si è verificato un errore di connessione');
});

// ===============================================
// DATA GENERATION UTILITIES (FALLBACK)
// ===============================================

function generateMonthlyData(month) {
    // Genera dati simulati realistici per il mese corrente
    const baseIncome = 2500;
    const baseExpenses = 1800;
    
    // Simulazione variazioni stagionali
    const seasonalFactor = Math.sin((month / 12) * 2 * Math.PI) * 0.1 + 1;
    
    return {
        income: Math.round((baseIncome + (Math.random() * 500 - 250)) * seasonalFactor),
        expenses: Math.round((baseExpenses + (Math.random() * 400 - 200)) * seasonalFactor)
    };
}

// ===============================================
// UTILITY FUNCTIONS
// ===============================================

// Funzione per formattare date
function formatDate(date) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    return new Intl.DateTimeFormat('it-IT').format(date);
}

// ===============================================
// GLOBAL FUNCTIONS (for HTML onclick events)
// ===============================================

// Export delle funzioni globali necessarie per onclick HTML
window.removeTagGlobal = removeTagGlobal;
window.changePage = changePage;
window.loadTransactionsList = loadTransactionsList;
window.openLookerStudio = openLookerStudio;
window.openGoogleSheet = openGoogleSheet;
window.showStickySubmit = showStickySubmit;
window.hideStickySubmit = hideStickySubmit;
window.syncSubmitButtons = syncSubmitButtons;
window.initiateEditTransaction = initiateEditTransaction; // Esponi globalmente
window.confirmDeleteTransaction = confirmDeleteTransaction; // Esponi globalmente
window.cancelEditMode = cancelEditMode; // Esponi globalmente
