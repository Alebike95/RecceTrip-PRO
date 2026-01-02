/*
========================================
DEBUG PANEL
========================================
Overlay fullscreen con:
- Info diagnostica GPS
- Bottone connessione Racebox
- Bottone fullscreen
- Bottone info per aprire/chiudere

EDUCATIVO: Mostra come gestire overlay
e stato interno (aperto/chiuso, connesso/disconnesso)
========================================
*/

export class DebugPanel {
  constructor(containerId, callbacks) {
    this.container = document.getElementById(containerId);
    this.onToggleRacebox = callbacks.onToggleRacebox;
    this.onFullscreen = callbacks.onFullscreen;
    
    // Stato
    this.isOpen = false;
    this.isRaceboxConnected = false;
    this.debugData = {
      source: 'GPS Interno',
      battery: '--',
      hz: '0',
      speed: '0.00',
      distance3d: '0.0000',
      altitude: '0',
      fixStatus: '--'
    };
    
    this.render();
    this.attachEvents();
  }

  getTemplate() {
    return `
      <!-- Bottone Info (sempre visibile) -->
      <div class="info-btn" id="info-btn">i</div>
      
      <!-- Panel (nascosto di default) -->
      <div class="debug-panel" id="debug-panel" style="display: none;">
        <h2 style="color:white; margin-bottom: 20px;">DIAGNOSTICA GPS</h2>
        <div class="debug-row">
        Fonte: <span id="dbg-source" style="color:yellow">${this.debugData.source}</span>
        </div>
        
        <div class="debug-row" id="racebox-battery-row" style="display:none;">
          Batteria RaceBox: <span id="dbg-battery" style="color:#0f0">${this.debugData.battery}</span>%
        </div>
        
        <div class="debug-row">
          HZ: <span id="dbg-hz" style="color:yellow">${this.debugData.hz}</span>
        </div>
        
        <div class="debug-row">
          Speed GPS: <span id="dbg-spd">${this.debugData.speed}</span> m/s
        </div>
        
        <div class="debug-row">
          Delta 3D: <span id="dbg-dist3d" style="color:#0f0">${this.debugData.distance3d}</span> m
        </div>
        
        <div class="debug-row">
          Alt: <span id="dbg-alt">${this.debugData.altitude}</span> m
        </div>
        
        <div class="debug-row">
          Fix: <span id="dbg-status">${this.debugData.fixStatus}</span>
        </div>
        
        <!-- Bottoni -->
        <div class="btn-debug btn-racebox" id="racebox-btn">
          🔗 CONNETTI RACEBOX
        </div>
        
        <div class="btn-debug" style="background:#222;" id="fullscreen-btn">
          FULLSCREEN
        </div>
        
        <div class="btn-debug" style="background:#400;" id="close-debug-btn">
          CHIUDI
        </div>
      </div>
    `;
  }

  getStyles() {
    return `
      /* Bottone Info - Posizionato sotto il tasto MAP */
      .info-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        background: rgba(30, 30, 30, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        color: #FFFFFF;
        font-size: 24px;
        font-family: monospace;
        font-weight: bold;
        cursor: pointer;
        z-index: 10005; /* Molto alto per stare sopra a tutto */
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
      }
      
      /* Debug Panel */
      .debug-panel {
        position: fixed; /* Usiamo fixed per coprire tutto lo schermo */
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.98);
        z-index: 10000; /* Massimo livello */
        display: flex;
        flex-direction: column;
        padding: 25px;
        overflow-y: auto;
      }
      
      .debug-row {
        font-size: 0.95rem;
        margin: 8px 0;
        border-bottom: 1px solid #333;
        width: 100%;
        padding-bottom: 6px;
        font-family: monospace;
        color: #ccc;
      }
      
      /* Bottoni debug */
      .btn-debug {
        margin-top: 15px;
        padding: 18px;
        color: white;
        border: 1px solid #444;
        width: 100%;
        text-align: center;
        cursor: pointer;
        font-weight: bold;
        border-radius: 8px;
        transition: all 0.2s;
      }
      
      .btn-debug:active {
        opacity: 0.7;
      }
      
      .btn-racebox {
        background: #004400;
        border-color: #00ff00;
      }
      
      .btn-racebox.connected {
        background: #00aa00;
      }
    `;
  }

  render() {
    if (!document.getElementById('debug-styles')) {
      const style = document.createElement('style');
      style.id = 'debug-styles';
      style.textContent = this.getStyles();
      document.head.appendChild(style);
    }
    if (this.container) {
      this.container.innerHTML = this.getTemplate();
    }
  }

  attachEvents() {
    // Bottone Info: toggle panel
    const infoBtn = document.getElementById('info-btn');
    if (infoBtn) {
        infoBtn.addEventListener('click', () => {
          this.toggle();
        });
    }
    
    // Bottone Chiudi
    const closeBtn = document.getElementById('close-debug-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.toggle();
        });
    }
    
    // Bottone Racebox
    const rbBtn = document.getElementById('racebox-btn');
    if (rbBtn) {
        rbBtn.addEventListener('click', () => {
          this.onToggleRacebox();
        });
    }
    
    // Bottone Fullscreen
    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) {
        fsBtn.addEventListener('click', () => {
          this.onFullscreen();
        });
    }
  }

  /*
  ========================================
  TOGGLE
  Apre/chiude il panel
  ========================================
  */
  toggle() {
    this.isOpen = !this.isOpen;
    const panel = document.getElementById('debug-panel');
    if (panel) {
        panel.style.display = this.isOpen ? 'flex' : 'none';
  }
  }

  /*
  ========================================
  UPDATE DEBUG INFO
  Aggiorna i dati diagnostici
  ========================================
  */
  updateDebugInfo(data) {
    this.debugData = { ...this.debugData, ...data };
    
    // Aggiorna solo se il panel è aperto (performance)
    if (!this.isOpen) return;
    
    if (data.source) {
      const el = document.getElementById('dbg-source');
      if (el) el.textContent = data.source;
    }
    
    if (data.battery !== undefined) {
      const el = document.getElementById('dbg-battery');
      if (el) el.textContent = data.battery;
    }
    
    if (data.hz) {
      const el = document.getElementById('dbg-hz');
      if (el) el.textContent = data.hz;
    }
    
    if (data.speed !== undefined) {
      const el = document.getElementById('dbg-spd');
      if (el) el.textContent = data.speed.toFixed(2);
    }
    
    if (data.distance3d !== undefined) {
      const el = document.getElementById('dbg-dist3d');
      if (el) el.textContent = data.distance3d.toFixed(4);
    }
    
    if (data.altitude !== undefined) {
      const el = document.getElementById('dbg-alt');
      if (el) el.textContent = data.altitude ? data.altitude.toFixed(1) : 'N/A';
    }
    
    if (data.fixStatus) {
      const el = document.getElementById('dbg-status');
      if (el) el.textContent = data.fixStatus;
    }
  }

  /*
  ========================================
  UPDATE RACEBOX STATUS
  Cambia aspetto bottone Racebox
  ========================================
  */
  updateRaceboxStatus(connected) {
    this.isRaceboxConnected = connected;
    
    const btn = document.getElementById('racebox-btn');
    const batteryRow = document.getElementById('racebox-battery-row');
    
    if (connected) {
    if (btn) {
          btn.textContent = '✅ RACEBOX CONNESSO';
          btn.classList.add('connected');
      }
      if (batteryRow) batteryRow.style.display = 'block';
      
      // Aggiorna source
      this.updateDebugInfo({ source: 'RaceBox Mini' });
    } else {
      if (btn) {
          btn.textContent = '🔗 CONNETTI RACEBOX';
          btn.classList.remove('connected');
    }
      if (batteryRow) batteryRow.style.display = 'none';
      
      // Aggiorna source
      this.updateDebugInfo({ source: 'GPS Interno' });
    }
  }
}
