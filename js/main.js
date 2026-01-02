/*
========================================
MAIN.JS - L'ORCHESTRATORE
========================================
*/

import { TripADisplay } from './components/TripADisplay.js';
import { TripBDisplay } from './components/TripBDisplay.js';
import { SpeedDisplay } from './components/SpeedDisplay.js';
import { DebugPanel } from './components/DebugPanel.js';
import { GPSManager } from './services/GPSManager.js';
import { StatusPanel } from './components/StatusPanel.js';
import { MapPanel } from './components/MapPanel.js';

class RecceTrip {
  constructor() {
    this.components = {};
    this.gpsManager = null;
    this.init();
  }

  init() {
    console.log('🚀 RecceTrip v9.0 - Avvio...');

    // 1. Inizializziamo il GPSManager
    // Se lastLat/lastLon sono null (simulazione off), ora il MapPanel è istruito per non crashare
    this.gpsManager = new GPSManager({
      onTripUpdate: (tripA, tripB) => this.handleTripUpdate(tripA, tripB),
      onSpeedUpdate: (speed) => this.handleSpeedUpdate(speed),
      onDebugUpdate: (debugData) => this.handleDebugUpdate(debugData),
      onRaceboxStatusChange: (connected) => this.handleRaceboxStatus(connected)
    });

    // 2. Creiamo i componenti UI
    this.createComponents();
        
    this.registerServiceWorker();
    this.requestWakeLock();
    
    console.log('✅ RecceTrip pronto!');
  }

  createComponents() {
    try {
        // I componenti base
        this.components.tripA = new TripADisplay('tripA-container', 'last-reset-container', {
          onReset: () => this.gpsManager.resetTripA()
        });
        
        this.components.tripB = new TripBDisplay('tripB-container', {
          onResetAll: () => this.gpsManager.resetAll()
        });
        
        this.components.speed = new SpeedDisplay('speed-container');
        
        this.components.debug = new DebugPanel('debug-container', {
          onToggleRacebox: () => this.gpsManager.toggleRacebox(),
          onFullscreen: () => this.toggleFullscreen()
        });

        this.components.status = new StatusPanel();
        
        // Inizializzazione MapPanel
        // Usiamo il MapPanel con i controlli "null-safe" che abbiamo visto prima
        this.components.map = new MapPanel(this.gpsManager);

        console.log('✅ Tutti i componenti UI sono stati creati');
    } catch (error) {
        console.error('❌ ERRORE CRITICO durante la creazione dei componenti:', error);
        // Questo alert ti dirà esattamente cosa è fallito se lo schermo resta nero
        // alert("Errore inizializzazione: " + error.message);
    }
  }

  handleTripUpdate(tripA, tripB) {
    if (this.components.tripA) this.components.tripA.update(tripA);
    if (this.components.tripB) this.components.tripB.update(tripB);
  }

  handleSpeedUpdate(speed) {
    if (this.components.speed) this.components.speed.update(speed);
  }

  handleDebugUpdate(debugData) {
    if (this.components.debug) this.components.debug.updateDebugInfo(debugData);
    if (debugData.battery !== undefined && this.components.status) {
      this.components.status.updateBattery('rbx', debugData.battery);
    }
  }

  handleRaceboxStatus(connected) {
    if (this.components.debug) this.components.debug.updateRaceboxStatus(connected);
    if (this.components.status) this.components.status.updateStatus('rbx', connected);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
    } else {
      document.exitFullscreen();
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker registrato'))
        .catch(err => console.error('Errore SW:', err));
    }
  }

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        let wakeLock = await navigator.wakeLock.request('screen');
        document.addEventListener('visibilitychange', async () => {
          if (document.visibilityState === 'visible') {
            wakeLock = await navigator.wakeLock.request('screen');
          }
        });
      }
    } catch (err) {
      console.log('Wake Lock non disponibile');
    }
  }
}

// Funzione globale per il vecchio sistema o debug
window.handleMapClick = function() {
    if (window.recceTrip && window.recceTrip.components.map) {
        window.recceTrip.components.map.openMap();
    }
};

document.addEventListener('DOMContentLoaded', () => {
  window.recceTrip = new RecceTrip();
});
