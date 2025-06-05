// ===============================================
// FINANCE APP - COMPLETE JAVASCRIPT
// ===============================================

// Global State Management
const AppState = {
    currentPage: 'dashboard',
    isLoading: false,
    datiSpreadsheet: {
        conti: [],
        categorie: [],
        transazioni: []
    },
    tags: [],
    connectionStatus: APP_STATES.LOADING
};

// ===============================================
// APPLICATION INITIALIZATION
// ===============================================

document.addEventListener('DOMContentLoaded', function() {
    DEBUG.log('Inizializzazione app completa...');
    
    initializeApp();
    loadSpreadsheetData();
});

// Funzione per gestire i parametri URL
function handleURLParameters() {
    // Ottieni i parametri dall'URL
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');
    
    // Se c'è un parametro 'page', vai a quella pagina
    if (page) {
        // Aspetta che l'app sia inizializzata
        setTimeout(() => {
            changePage(page);
        }, 100);
    }
}

function initializeApp() {
    initializeNavigation();
    initializeTransactionForm();
    initializeConnectionStatus();
    initializeAmountInput();
    initializeStickySubmit();
    updateLastConnectionTime();
    handleURLParameters();
    
    DEBUG.log('App completa inizializzata con successo');
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
        const url = CONFIG.GOOGLE_SHEET_URL;
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
    const lookerUrl = CONFIG.LOOKER_STUDIO_URL || CONFIG.GOOGLE_SHEET_URL;
    
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

function changePage(page) {
    DEBUG.log('Cambio pagina', { from: AppState.currentPage, to: page });
    
    // Nascondi tutte le pagine
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Rimuovi active da tutti i nav items
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
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
        setTimeout(() => handlePageChange(page), 100);
    }
}

function updatePageTitle(page) {
    const titleEl = document.getElementById('pageTitle');
    const pageConfig = PAGES[page];
    
    if (titleEl && pageConfig) {
        titleEl.textContent = pageConfig.title;
    }
}

function handlePageChange(page) {
    switch(page) {
        case 'dashboard':
            updateDashboard();
            hideStickySubmit();
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
    }
    
    if (submitSpinner && submitSpinnerSticky) {
        submitSpinnerSticky.style.display = submitSpinner.style.display;
        if (submitTextSticky) {
            submitTextSticky.style.display = submitText ? submitText.style.display : 'inline';
        }
    }
}

// ===============================================
// TRANSACTIONS PAGE MANAGEMENT
// ===============================================

function updateTransactionsPage() {
    DEBUG.log('Aggiornamento pagina transazioni...');
    loadTransactionsList();
}

function loadTransactionsList() {
    const transactionsListEl = document.getElementById('transactionsList');
    if (!transactionsListEl) return;
    
    // Mostra skeleton loading
    showTransactionsLoading();
    
    // Se abbiamo già i dati, mostrali
    if (AppState.datiSpreadsheet.transazioni && AppState.datiSpreadsheet.transazioni.length > 0) {
        displayTransactionsList(AppState.datiSpreadsheet.transazioni);
    } else {
        // Carica dati da Google Sheets
        fetch(CONFIG.GOOGLE_APPS_SCRIPT_URL + '?action=getTransactions')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    AppState.datiSpreadsheet.transazioni = data.transactions || [];
                    displayTransactionsList(AppState.datiSpreadsheet.transazioni);
                } else {
                    throw new Error(data.message || 'Errore nel caricamento transazioni');
                }
            })
            .catch(error => {
                DEBUG.error('Errore nel caricamento transazioni', error);
                showTransactionsError();
            });
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
    
    // Prendi le ultime transazioni (limita a CONFIG.TRANSACTIONS.LIST_LIMIT)
    const recentTransactions = transactions
        .slice(-CONFIG.TRANSACTIONS.LIST_LIMIT)
        .reverse(); // Più recenti prima
    
    let transactionsHTML = '';
    
    recentTransactions.forEach(transaction => {
        const amount = parseFloat(transaction['Importo (€)']) || 0;
        const isExpense = amount < 0;
        const isIncome = amount > 0;
        const isTransfer = transaction.Tipo === 'Trasferimento';
        
        let amountClass = 'transfer';
        if (isExpense) amountClass = 'expense';
        else if (isIncome) amountClass = 'income';
        
        const formattedAmount = NumberUtils.formatCurrency(Math.abs(amount));
        const displayAmount = isExpense ? `-${formattedAmount}` : formattedAmount;
        
        const date = transaction.Data ? new Date(transaction.Data) : new Date();
        const formattedDate = formatDate(date);
        
        transactionsHTML += `
            <div class="transaction-item">
                <div class="transaction-left">
                    <div class="transaction-description">${transaction.Descrizione || 'Senza descrizione'}</div>
                    <div class="transaction-category">${transaction.Categoria || 'Senza categoria'}</div>
                    <div class="transaction-date">${formattedDate}</div>
                </div>
                <div class="transaction-right">
                    <div class="transaction-amount ${amountClass}">${displayAmount}</div>
                    <div class="transaction-account">${transaction.Conto || ''}</div>
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

function loadSpreadsheetData() {
    updateConnectionStatus(APP_STATES.LOADING, 'Caricamento dati...');
    
    fetch(CONFIG.GOOGLE_APPS_SCRIPT_URL + '?action=getInitialData')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
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
        })
        .catch(error => {
            DEBUG.error('Errore nel caricamento dati', error);
            updateConnectionStatus(APP_STATES.ERROR, 'Errore di connessione');
            showMessage('error', 'Impossibile collegarsi al Google Sheet: ' + error.message);
        });
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

function updateMonthlyStats() {
    // Carica statistiche reali o usa dati simulati come fallback
    fetch(CONFIG.GOOGLE_APPS_SCRIPT_URL + '?action=getDashboardStats')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayMonthlyStats(data);
                DEBUG.log('Stats mensili reali caricate', data);
            } else {
                throw new Error(data.message || 'Errore nel caricamento statistiche');
            }
        })
        .catch(error => {
            DEBUG.error('Errore nel caricamento statistiche mensili', error);
            // Fallback ai dati simulati
            displayMonthlyStatsSimulated();
        });
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
                    <div class="account-balance ${balanceClass}">${NumberUtils.formatCurrency(saldo)}</div>
                </div>
            `;
        });
        
        totalBalanceEl.textContent = NumberUtils.formatCurrency(totalBalance);
        accountsListEl.innerHTML = accountsHTML;
        
        DEBUG.log('Saldi aggiornati', { totalBalance, accounts: AppState.datiSpreadsheet.conti.length });
    } else {
        totalBalanceEl.textContent = NumberUtils.formatCurrency(0);
        accountsListEl.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">Nessun conto trovato</div>';
    }
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
        if (isExpense) amountClass = 'expense';
        else if (isIncome) amountClass = 'income';
        
        const formattedAmount = NumberUtils.formatCurrency(Math.abs(amount));
        const displayAmount = isExpense ? `-${formattedAmount}` : `+${formattedAmount}`;
        
        transactionsHTML += `
            <div class="transaction-item">
                <div class="transaction-left">
                    <div class="transaction-description">${transaction.Descrizione || 'Senza descrizione'}</div>
                    <div class="transaction-category">${transaction.Categoria || 'Senza categoria'}</div>
                </div>
                <div class="transaction-amount ${amountClass}">${displayAmount}</div>
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
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const transactions = createTransactions(data);
        submitTransactions(transactions);
    } catch (error) {
        DEBUG.error('Errore nella creazione della transazione', error);
        showMessage('error', 'Errore nella creazione della transazione: ' + error.message);
    }
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

function submitTransactions(transactions) {
    const submitBtn = document.getElementById('submitBtn');
    const submitBtnSticky = document.getElementById('submitBtnSticky');
    const submitText = document.getElementById('submitText');
    const submitTextSticky = document.getElementById('submitTextSticky');
    const submitSpinner = document.getElementById('submitSpinner');
    const submitSpinnerSticky = document.getElementById('submitSpinnerSticky');
    
    // Disabilita entrambi i pulsanti e mostra loading
    AppState.isLoading = true;
    
    [submitBtn, submitBtnSticky].forEach(btn => {
        if (btn) btn.disabled = true;
    });
    
    [submitText, submitTextSticky].forEach(text => {
        if (text) text.style.display = 'none';
    });
    
    [submitSpinner, submitSpinnerSticky].forEach(spinner => {
        if (spinner) {
            spinner.style.display = 'inline-block';
            spinner.classList.remove('hidden');
        }
    });
    
    showMessage('loading', 'Registrazione in corso...');
    
    const formData = new URLSearchParams();
    formData.append('action', 'addTransaction');
    formData.append('transactions', JSON.stringify(transactions));
    
    DEBUG.log('Invio transazioni', transactions);
    
    fetch(CONFIG.GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
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
    })
    .catch(error => {
        DEBUG.error('Errore nella registrazione', error);
        showMessage('error', 'Errore nella registrazione: ' + error.message);
    })
    .finally(() => {
        // Riabilita entrambi i pulsanti
        AppState.isLoading = false;
        
        [submitBtn, submitBtnSticky].forEach(btn => {
            if (btn) btn.disabled = false;
        });
        
        [submitText, submitTextSticky].forEach(text => {
            if (text) text.style.display = 'inline';
        });
        
        [submitSpinner, submitSpinnerSticky].forEach(spinner => {
            if (spinner) {
                spinner.style.display = 'none';
                spinner.classList.add('hidden');
            }
        });
    });
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
    
    document.querySelectorAll('.tipo-btn').forEach(btn => btn.classList.remove('active'));
    const expenseBtn = document.querySelector('.tipo-btn--expense');
    if (expenseBtn) expenseBtn.classList.add('active');
    
    if (dataField) {
        dataField.valueAsDate = new Date();
    }
    
    // Reset tags
    AppState.tags = [];
    updateTagsDisplay();
    updateTagsInput();
    
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
