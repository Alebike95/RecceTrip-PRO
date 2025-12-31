/*
========================================
SPEED DISPLAY
========================================
Mostra la velocità corrente in km/h.
Top-right della top bar.

EDUCATIVO: Questo è il componente più semplice,
perfetto per capire la struttura base.
========================================
*/

export class SpeedDisplay {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentSpeed = 0;
    
    this.render();
  }

  getTemplate() {
    return `
      <div class="speed-container">
        <span class="speed-label">KM/H</span>
        <span class="speed-value">${this.currentSpeed}</span>
      </div>
    `;
  }

  getStyles() {
    return `
      /* Speed: top-right */
      .speed-container {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }
      
      .speed-label {
        font-size: 2vh;
        color: var(--text-dim);
        font-weight: bold;
        margin-bottom: 5px;
        text-transform: uppercase;
      }
      
      .speed-value {
        font-size: 9vh;
        font-weight: bold;
        color: var(--text-main);
        line-height: 0.9;
        font-variant-numeric: tabular-nums;
      }
      
      /* Responsive landscape */
      @media (orientation: landscape) {
        .speed-value {
          font-size: 11vh;
        }
      }
    `;
  }

  render() {
    if (!document.getElementById('speed-styles')) {
      const style = document.createElement('style');
      style.id = 'speed-styles';
      style.textContent = this.getStyles();
      document.head.appendChild(style);
    }

    this.container.innerHTML = this.getTemplate();
  }

  /*
  ========================================
  UPDATE
  Chiamato quando la velocità cambia
  ========================================
  */
  update(newSpeed) {
    this.currentSpeed = Math.max(0, Math.round(newSpeed));
    
    const valueElement = this.container.querySelector('.speed-value');
    if (valueElement) {
      valueElement.textContent = this.currentSpeed;
    }
  }
}