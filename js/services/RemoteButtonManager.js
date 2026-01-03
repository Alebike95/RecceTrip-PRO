/*
========================================
REMOTE BUTTON MANAGER
========================================
Gestisce l'input da tastiere/telecomandi Bluetooth.
- Pressione breve (< 2s): Reset Trip A
- Pressione lunga (> 3s): Reset Trip B (Reset All)
========================================
*/

export class RemoteButtonManager {
    constructor(callbacks) {
        this.onResetA = callbacks.onResetA;
        this.onResetB = callbacks.onResetB;
        
        this.buttonTimer = null;
        this.isLongPressTriggered = false;
        
        // Tasti da ignorare per evitare conflitti con il browser
        this.ignoredKeys = ['F1', 'F2', 'F5', 'F12', 'Escape', 'Tab', 'Meta', 'Control', 'Alt', 'Shift'];
        
        this.init();
    }

    init() {
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        console.log("⌨️ RemoteButtonManager inizializzato");
    }

    handleKeyDown(e) {
        // Evitiamo tasti pericolosi e la ripetizione automatica del sistema operativo
        if (this.ignoredKeys.includes(e.key) || e.repeat) return;

        // Se è già partito un timer, non ne facciamo partire altri
        if (this.buttonTimer) return;

        this.isLongPressTriggered = false;

        console.log(`KeyDown rilevato: ${e.key} - Avvio Timer`);

        // Avviamo il timer per i 3 secondi (Reset B)
        this.buttonTimer = setTimeout(() => {
            console.log("⏱️ Long Press Rilevata: Reset Trip B");
            this.isLongPressTriggered = true;
            if (this.onResetB) this.onResetB();
            this.vibrate(500); // Feedback vibrazione lungo
        }, 3000);
    }

    handleKeyUp(e) {
        if (this.ignoredKeys.includes(e.key)) return;

        // Se il tasto viene rilasciato prima dei 3 secondi e il timer era attivo
        if (!this.isLongPressTriggered && this.buttonTimer) {
            console.log("🖱️ Short Press Rilevata: Reset Trip A");
            if (this.onResetA) this.onResetA();
            this.vibrate(100); // Feedback vibrazione breve
        }

        // Pulizia timer
        if (this.buttonTimer) {
            clearTimeout(this.buttonTimer);
            this.buttonTimer = null;
        }
    }

    vibrate(ms) {
        if (navigator.vibrate) {
            try {
                navigator.vibrate(ms);
            } catch (e) {
                // Ignora errori su dispositivi che non supportano la vibrazione
            }
        }
    }
}