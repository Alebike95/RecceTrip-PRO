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
        <span class="last-reset-value">${this.lastResetValue || ''}</span>
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
      /* TripA: numero centrale gigante */
      .trip-a-display {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100%;
        cursor: pointer;
      }
      
      .trip-a-value {
        font-size: 30vh;
        line-height: 0.8;
        font-weight: bold;
        color: var(--highlight);
        margin-top: 10vh;
        font-variant-numeric: tabular-nums;
      }
      
      .trip-a-unit {
        font-size: 3vh;
        color: var(--text-dim);
        letter-spacing: 15px;
        margin-top: 15px;
      }
      
      /* Last Reset: centro top bar */
      .last-reset-group {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      
      .last-reset-label {
        font-size: 2vh;
        color: #400;
        font-weight: bold;
        margin-bottom: 5px;
        text-transform: uppercase;
      }
      
      .last-reset-value {
        font-size: 30vh;
        color: var(--last-val);
        font-weight: bold;
        line-height: 0.8;
      }
      
      /* Responsive landscape */
      @media (orientation: landscape) {
        .trip-a-value {
          font-size: 80vh !important;
        }
        
        .last-reset-value {
          font-size: 80vh;
        }
      }
      
      /* Animazione flash al tap */
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
    if (valueElement) {
      valueElement.textContent = Math.floor(newValue);
    }
  }

}



