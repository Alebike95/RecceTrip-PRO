/*
========================================
TRIP B DISPLAY
========================================
Mostra i km percorsi in alto a sinistra.
Tap lungo (3 secondi) per reset completo.
Include barra di progresso durante il tap.

EDUCATIVO: Esempio di gestione eventi touch
e animazioni CSS
========================================
*/

export class TripBDisplay {
  constructor(containerId, callbacks) {
    this.container = document.getElementById(containerId);
    this.onResetAll = callbacks.onResetAll;
    
    this.currentValue = 0;
    this.resetTimer = null;
    
    this.render();
    this.attachEvents();
  }

  getTemplate() {
    return `
      <div class="trip-b-container">
        <div class="reset-progress" id="reset-bar"></div>
        <span class="trip-b-label">TRIP B</span>
        <span class="trip-b-value">${(this.currentValue / 1000).toFixed(2)}</span>
      </div>
    `;
  }

  getStyles() {
    return `
      /* TripB: top-left */
      .trip-b-container {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        position: relative;
      }
      
      .trip-b-label {
        font-size: 2vh;
        color: var(--text-dim);
        font-weight: bold;
        margin-bottom: 5px;
        text-transform: uppercase;
      }
      
      .trip-b-value {
        font-size: 9vh;
        font-weight: bold;
        color: var(--text-main);
        line-height: 0.9;
        font-variant-numeric: tabular-nums;
      }
      
      /* Barra progresso reset */
      .reset-progress {
        position: absolute;
        top: 0;
        left: 0;
        height: 6px;
        background-color: var(--alert);
        width: 0%;
        z-index: 10;
        transition: none;
      }
      
      /* Responsive landscape */
      @media (orientation: landscape) {
        .trip-b-value {
          font-size: 11vh;
        }
      }
    `;
  }

  render() {
    if (!document.getElementById('trip-b-styles')) {
      const style = document.createElement('style');
      style.id = 'trip-b-styles';
      style.textContent = this.getStyles();
      document.head.appendChild(style);
    }

    this.container.innerHTML = this.getTemplate();
  }

  /*
  ========================================
  TOUCH EVENTS
  Gestisce il tap lungo per reset
  ========================================
  */
  attachEvents() {
    const resetBar = document.getElementById('reset-bar');
    
    // Touch start: inizia il timer
    this.container.addEventListener('touchstart', (e) => {
      e.preventDefault();
      
      // Avvia animazione barra
      resetBar.style.width = '100%';
      resetBar.style.transition = 'width 3s linear';
      
      // Timer: dopo 3 secondi resetta tutto
      this.resetTimer = setTimeout(() => {
        this.onResetAll();
        resetBar.style.width = '0%';
      }, 3000);
    });
    
    // Touch end: cancella il timer se rilasci prima
    this.container.addEventListener('touchend', () => {
      if (this.resetTimer) {
        clearTimeout(this.resetTimer);
        this.resetTimer = null;
      }
      
      // Reset barra immediatamente
      resetBar.style.transition = 'none';
      resetBar.style.width = '0%';
    });
    
    // Touch cancel: stessa cosa di touchend
    this.container.addEventListener('touchcancel', () => {
      if (this.resetTimer) {
        clearTimeout(this.resetTimer);
        this.resetTimer = null;
      }
      
      resetBar.style.transition = 'none';
      resetBar.style.width = '0%';
    });
  }

  /*
  ========================================
  UPDATE
  Aggiorna il valore mostrato
  ========================================
  */
  update(newValue) {
    this.currentValue = newValue;
    
    const valueElement = this.container.querySelector('.trip-b-value');
    if (valueElement) {
      // Mostra in km con 2 decimali
      valueElement.textContent = (newValue / 1000).toFixed(2);
    }
  }
}