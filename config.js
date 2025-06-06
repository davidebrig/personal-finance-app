// ===============================================
// FINANCE APP - CONFIGURATION SIMPLIFIED
// ===============================================

// Default Configuration
const CONFIG = {
    // URL del Google Apps Script
    DEFAULT_GOOGLE_APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyrTIRJ6ZHrvgqj1hN4iPQrBvarT436if2z_RqgY5TxFn6ZQPY54sypVwCKnu2MUtfU/exec',
    
    // ID del Google Sheet (per aprire il link diretto)
    DEFAULT_GOOGLE_SHEET_ID: '1HbC77mPPxFm378OnJXqnoyRrEGzIp1WBooth37sZWXU',
    
    // URL diretto del Google Sheet
    get DEFAULT_GOOGLE_SHEET_URL() {
        return `https://docs.google.com/spreadsheets/d/${this.DEFAULT_GOOGLE_SHEET_ID}/edit`;
    },
    
    // URL Looker Studio Dashboard (SOSTITUISCI CON IL TUO URL)
    LOOKER_STUDIO_URL: null, // Imposta quando crei la dashboard
    
    // Impostazioni app
    APP_NAME: 'Finance App',
    VERSION: '1.5 PWA',
    
    // Timeout per le richieste (in millisecondi)
    REQUEST_TIMEOUT: 30000,
    
    // Impostazioni UI
    UI: {
        AUTO_HIDE_MESSAGES: true,
        SUCCESS_MESSAGE_DURATION: 3000,
        ERROR_MESSAGE_DURATION: 8000,
        SKELETON_LOADING_MIN_DURATION: 500
    },
    
    // Impostazioni dashboard (semplificate)
    DASHBOARD: {
        RECENT_TRANSACTIONS_LIMIT: 5,
        AUTO_REFRESH_INTERVAL: 30000 // 30 secondi
    },
    
    // Impostazioni form
    FORM: {
        AUTO_FOCUS_AMOUNT: true,
        RESET_AFTER_SUBMIT: true,
        VALIDATE_ON_CHANGE: false
    },
    
    // Impostazioni transazioni
    TRANSACTIONS: {
        LIST_LIMIT: 10,
        AUTO_REFRESH: true
    }
};

// Suggerimenti per l'autocomplete della descrizione
const DESCRIPTION_SUGGESTIONS = [
    'Supermercato', 'Benzina', 'Ristorante', 'Bar', 'Farmacia', 'Trasporti pubblici',
    'Abbonamento', 'Bolletta', 'Affitto', 'Spesa alimentare', 'Caffè', 'Pranzo',
    'Cena', 'Colazione', 'Spesa casa', 'Medicina', 'Taxi', 'Parcheggio',
    'Cinema', 'Libro', 'Abbigliamento', 'Sport', 'Palestra', 'Parrucchiere',
    'Supermercato Esselunga', 'Supermercato Coop', 'Supermercato Conad',
    'Stazione benzina', 'Autostrada', 'Parcheggio centro', 'Metro',
    'Amazon', 'Spotify', 'Netflix', 'Gym membership'
];

// Configurazione pagine (semplificata)
const PAGES = {
    dashboard: {
        title: '📊 Dashboard',
        icon: '📊',
        label: 'Dashboard'
    },
    transaction: {
        title: '💰 Transazioni',
        icon: '💰', 
        label: 'Transazioni'
    },
    addTransaction: {
        title: '➕ Nuova Transazione',
        icon: '➕',
        label: 'Aggiungi'
    },
    shared: {
        title: '👥 Transazioni Condivise',
        icon: '👥',
        label: 'Condivise'
    },
    settings: {
        title: '⚙️ Impostazioni', 
        icon: '⚙️',
        label: 'Impostazioni'
    }
};

// Stati dell'applicazione
const APP_STATES = {
    LOADING: 'loading',
    SUCCESS: 'success',
    ERROR: 'error',
    OFFLINE: 'offline'
};

// Tipi di transazione
const TRANSACTION_TYPES = {
    EXPENSE: 'spesa',
    INCOME: 'entrata', 
    TRANSFER: 'trasferimento'
};

// Formattazione numeri per formato europeo
const NUMBER_FORMAT = {
    // Formato italiano: 1.234,56 €
    LOCALE: 'it-IT',
    CURRENCY: 'EUR',
    
    // Opzioni per Intl.NumberFormat
    CURRENCY_OPTIONS: {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    },
    
    DECIMAL_OPTIONS: {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }
};

// Utility function per logging (solo in development)
const DEBUG = {
    enabled: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    
    log: function(message, data = null) {
        if (this.enabled) {
            console.log(`[${CONFIG.APP_NAME}] ${message}`, data);
        }
    },
    
    error: function(message, error = null) {
        if (this.enabled) {
            console.error(`[${CONFIG.APP_NAME}] ERROR: ${message}`, error);
        }
    },
    
    warn: function(message, data = null) {
        if (this.enabled) {
            console.warn(`[${CONFIG.APP_NAME}] WARNING: ${message}`, data);
        }
    }
};

// Utility functions per formattazione numeri
const NumberUtils = {
    // Formatta un numero in valuta europea
    formatCurrency: function(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '€ 0,00';
        }
        
        return new Intl.NumberFormat(NUMBER_FORMAT.LOCALE, NUMBER_FORMAT.CURRENCY_OPTIONS)
            .format(parseFloat(amount));
    },
    
    // Formatta un numero decimale
    formatDecimal: function(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '0,00';
        }
        
        return new Intl.NumberFormat(NUMBER_FORMAT.LOCALE, NUMBER_FORMAT.DECIMAL_OPTIONS)
            .format(parseFloat(amount));
    },
    
    // Converte una stringa in formato europeo in numero
    parseEuropeanNumber: function(value) {
        if (!value) return 0;
        
        // Rimuovi simboli di valuta e spazi
        let cleanValue = value.toString()
            .replace(/[€\s]/g, '')
            .trim();
        
        // Se contiene sia punto che virgola, il punto è separatore migliaia
        if (cleanValue.includes('.') && cleanValue.includes(',')) {
            cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
        }
        // Se contiene solo virgola, è separatore decimale
        else if (cleanValue.includes(',') && !cleanValue.includes('.')) {
            cleanValue = cleanValue.replace(',', '.');
        }
        // Se contiene solo punto, potrebbe essere migliaia o decimali
        else if (cleanValue.includes('.')) {
            // Se ci sono più di 2 cifre dopo il punto, è separatore migliaia
            const afterDot = cleanValue.split('.').pop();
            if (afterDot.length > 2) {
                cleanValue = cleanValue.replace(/\./g, '');
            }
        }
        
        const parsed = parseFloat(cleanValue);
        return isNaN(parsed) ? 0 : parsed;
    },
    
    // Formatta input field con formato europeo
    formatInputValue: function(value) {
        const num = this.parseEuropeanNumber(value);
        return this.formatDecimal(num);
    },
    
    // Calcola percentuale di cambiamento
    calculatePercentageChange: function(current, previous) {
        if (!previous || previous === 0) {
            return current > 0 ? 100 : 0;
        }
        
        const change = ((current - previous) / Math.abs(previous)) * 100;
        return Math.round(change * 10) / 10; // Una cifra decimale
    },
    
    // Formatta percentuale con segno
    formatPercentageChange: function(percentage) {
        if (percentage === 0) return '0%';

        // Arrotonda a una cifra decimale
        const rounded = Math.round(percentage * 10) / 10;
        
        // Assicurati che ci sia sempre una cifra decimale
        const formatted = rounded.toFixed(1);

        const sign = rounded > 0 ? '+' : '';
        return `${sign}${formatted}%`;
    }
};

// Export per moduli (se necessario)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        DESCRIPTION_SUGGESTIONS,
        PAGES,
        APP_STATES,
        TRANSACTION_TYPES,
        NUMBER_FORMAT,
        DEBUG,
        NumberUtils
    };
}
