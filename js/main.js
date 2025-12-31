/*
========================================
MAIN.JS - L'ORCHESTRATORE
========================================
Questo file è il "direttore d'orchestra":
- Importa tutti i componenti
- Li crea e li collega tra loro
- Gestisce il flusso di dati tra GPSManager e UI
========================================
*/

import { TripADisplay } from './components/TripADisplay.js';
import { TripBDisplay } from './components/TripBDisplay.js';
import { SpeedDisplay } from './components/SpeedDisplay.js';
import { DebugPanel } from './components/DebugPanel.js';
import { GPSManager } from './services/GPSManager.js';

class RecceTrip {
  constructor() {
    // Questi sono i "pezzi" della nostra app
    this.components = {};
    this.gpsManager = null;
    
    this.init();
  }

  init() {
    console.log('🚀 RecceTrip v9.0 - Avvio...');
    
    // PRIMA: Crea i componenti UI (così sono pronti a ricevere dati)
    this.createComponents();
    
    // DOPO: Crea il GPSManager (che inizierà a inviare dati ai componenti già pronti)
    this.gpsManager = new GPSManager({
      onTripUpdate: (tripA, tripB) => this.handleTripUpdate(tripA, tripB),
      onSpeedUpdate: (speed) => this.handleSpeedUpdate(speed),
      onDebugUpdate: (debugData) => this.handleDebugUpdate(debugData),
      onRaceboxStatusChange: (connected) => this.handleRaceboxStatus(connected)
    });
        
    // Step 3: Registra il Service Worker per funzionamento offline
    this.registerServiceWorker();
    
    // Step 4: Richiedi Wake Lock (schermo sempre acceso)
    this.requestWakeLock();
    
    console.log('✅ RecceTrip pronto!');
  }

  createComponents() {
    // TripA: il numero gigante centrale
    this.components.tripA = new TripADisplay('tripA-container', 'last-reset-container', {
      onReset: () => this.gpsManager.resetTripA()
    });
    
    // TripB: top-left con reset lungo
    this.components.tripB = new TripBDisplay('tripB-container', {
      onResetAll: () => this.gpsManager.resetAll()
    });
    
    // Speed: top-right
    this.components.speed = new SpeedDisplay('speed-container');
    
    // Debug Panel: diagnostica e Racebox
    this.components.debug = new DebugPanel('debug-container', {
      onToggleRacebox: () => this.gpsManager.toggleRacebox(),
      onFullscreen: () => this.toggleFullscreen()
    });
  }

  /*
  ========================================
  HANDLERS - Gestiscono i dati dal GPS
  ========================================
  Questi metodi vengono chiamati dal GPSManager
  quando ha nuovi dati da mostrare
  */

  handleTripUpdate(tripA, tripB) {
    // Aggiorna i display con i nuovi valori
    this.components.tripA.update(tripA);
    this.components.tripB.update(tripB);
  }

  handleSpeedUpdate(speed) {
    this.components.speed.update(speed);
  }

  handleDebugUpdate(debugData) {
    this.components.debug.updateDebugInfo(debugData);
  }

  handleRaceboxStatus(connected) {
    this.components.debug.updateRaceboxStatus(connected);
  }

  /*
  ========================================
  UTILITY FUNCTIONS
  ========================================
  */

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker registrato:', reg))
        .catch(err => console.error('Errore Service Worker:', err));
    }
  }

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        const wakeLock = await navigator.wakeLock.request('screen');
        console.log('Wake Lock attivo');
        
        // Re-richiedi wake lock se la pagina diventa visibile
        document.addEventListener('visibilitychange', async () => {
          if (document.visibilityState === 'visible') {
            await navigator.wakeLock.request('screen');
          }
        });
      }
    } catch (err) {
      console.log('Wake Lock non disponibile:', err);
    }
  }
}

// Avvia l'app quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
  window.recceTrip = new RecceTrip();

});
