/*
========================================
TRIP A DISPLAY
========================================
Il numero gigante centrale che mostra i metri.
Tap per resettare.
Mostra anche l'ultimo valore resettato.

EDUCATIVO: Questo è un esempio di "componente"
- Ha il suo HTML (getTemplate)
- Ha il suo CSS (getStyles)
- Ha la sua logica (update, reset)
- È completamente autonomo
========================================
*/

export class TripADisplay {
  constructor(containerId, lastResetContainerId, callbacks) {
    // Riferimenti ai container nel DOM
    this.container = document.getElementById(containerId);
    this.lastResetContainer = document.getElementById(lastResetContainerId);
    
    // Callback per notificare il parent quando resettiamo
    this.onReset = callbacks.onReset;
    
    // Stato interno del componente
    this.currentValue = 0;
    this.lastResetValue = 0;
    
    // Inizializza
    this.render();
    this.attachEvents();
  }

  /*
  ========================================
  TEMPLATE HTML
  Definisce come appare il componente
  ========================================
  */
  getTemplate() {
    return `
      <div class="trip-a-display" id="trip-a-clickable">
        <span class="trip-a-value">${Math.floor(this.currentValue)}</span>
        <span class="trip-a-unit">METRI</span>
      </div>
    `;
  }

  getLastResetTemplate() {
    return `
      <div class="last-reset-group">
        <span class="last-reset-label">LAST</span>
        <span class="last-reset-value">${this.lastResetValue || '0'}</span>
      </div>
    `;
  }

  /*
  ========================================
  CSS STYLES
  Stili specifici per questo componente
  ========================================
  */
  getStyles() {
    return `
      /* TripA: contenitore che occupa tutto il 50% inferiore */
      .trip-a-display {
        display: flex;
        flex-direction: column;
        justify-content: center; /* Centra verticalmente */
        align-items: center;     /* Centra orizzontalmente */
        height: 100%;
        width: 100%;
        cursor: pointer;
        box-sizing: border-box;
      }
      
      .trip-a-value {
        font-size: 35vh; /* Regolato per stare nel 50% di altezza */
        line-height: 1;  /* Line-height 1 evita ritagli strani */
        font-weight: bold;
        color: var(--highlight);
        margin: 0;       /* RIMOSSO IL MARGIN TOP che spingeva tutto giù */
        font-variant-numeric: tabular-nums;
      }
      
      .trip-a-unit {
        font-size: 3vh;
        color: var(--text-dim);
        letter-spacing: 15px;
        margin-top: 5px; /* Spazio minimo tra numero e scritta */
      }
      
      /* Last Reset: sta nella top bar (50% superiore) */
      .last-reset-group {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
      }
      
      .last-reset-label {
        font-size: 2vh;
        color: #666;
        font-weight: bold;
        text-transform: uppercase;
      }
      
      .last-reset-value {
        font-size: 35vh; /* Uguale al Trip A per simmetria */
        color: #ff0000;
        font-weight: bold;
        line-height: 1;
      }
      
      /* Responsive landscape (Orizzontale) */
      @media (orientation: landscape) {
        .trip-a-value {
          font-size: 40vh !important; /* Leggermente più grande ma non troppo */
        }
        
        .last-reset-value {
          font-size: 40vh;
        }

        .trip-a-unit {
          font-size: 4vh;
          margin-top: 0;
        }
      }
      
      .trip-a-display.flash {
        animation: flash-anim 0.2s;
      }
      
      @keyframes flash-anim {
        0% { background-color: #333; }
        100% { background-color: #000; }
      }
    `;
  }

  /*
  ========================================
  RENDER
  Inietta HTML e CSS nel DOM
  ========================================
  */
  render() {
    // Inietta CSS (solo una volta)
    if (!document.getElementById('trip-a-styles')) {
      const style = document.createElement('style');
      style.id = 'trip-a-styles';
      style.textContent = this.getStyles();
      document.head.appendChild(style);
    }

    // Inietta HTML
    this.container.innerHTML = this.getTemplate();
    this.lastResetContainer.innerHTML = this.getLastResetTemplate();
  }

  /*
  ========================================
  EVENTS
  Gestisce il tap per reset
  ========================================
  */
  attachEvents() {
    const clickable = document.getElementById('trip-a-clickable');
    
    clickable.addEventListener('click', () => {
      // Salva il valore corrente come "last reset"
      this.lastResetValue = Math.floor(this.currentValue);
      
      // Aggiorna display last reset
      const lastResetElement = this.lastResetContainer.querySelector('.last-reset-value');
      if (lastResetElement) { 
        lastResetElement.textContent = this.lastResetValue;
      }
      
      // Effetto visivo flash
      clickable.classList.add('flash');
      setTimeout(() => clickable.classList.remove('flash'), 200);
      
      // Notifica il parent (GPSManager resetterà i valori reali)
      this.onReset();
    });
  }

  /*
  ========================================
  UPDATE
  Chiamato dal main.js quando arrivano nuovi dati
  ========================================
  */
  update(newValue) {
    this.currentValue = newValue;
    
    // Aggiorna solo il numero, non tutto il componente
    const valueElement = this.container.querySelector('.trip-a-value');
    if (valueElement) { valueElement.textContent = Math.floor(newValue); }
  }
}
