/*
========================================
GPS MANAGER - L'ORCHESTRATORE DATI
========================================
Il "cervello" dell'app. Gestisce:
- GPS interno (con interpolazione fluida)
- Racebox via Bluetooth (aggiornamento diretto)
- Calcolo distanze 3D
- Parsing pacchetti Racebox
- Rendering loop per fluidità GPS interno
- SIMULATORE DI MOVIMENTO (per test PC)
- REGISTRAZIONE TRACCE E WAYPOINT (Nuovo)
EDUCATIVO: Questo è un "Service" - non ha UI,
solo logica business. È il più complesso ma anche
il più importante.
========================================
*/

export class GPSManager {
  constructor(callbacks) {
    // --------------------------------------------------------
    // INTERRUTTORE SIMULAZIONE: false = GPS reale
    // --------------------------------------------------------
    this.simulationActive = false; // ⬅️ Cambia qui per attivare/disattivare simulazione 
    // --------------------------------------------------------

    // Callbacks per notificare i componenti UI
    this.onTripUpdate = callbacks.onTripUpdate;
    this.onSpeedUpdate = callbacks.onSpeedUpdate;
    this.onDebugUpdate = callbacks.onDebugUpdate;
    this.onRaceboxStatusChange = callbacks.onRaceboxStatusChange;
    
    // DATI REALI (valori veri dal GPS)
    this.tripA = 0.0;
    this.tripB = 0.0;
    
    // DATI VISUALI (per interpolazione fluida GPS interno)
    this.visTripA = 0.0;
    this.visTripB = 0.0;
    
    // GPS State
    this.lastLat = null;
    this.lastLon = null;
    this.lastAlt = null;
    this.currentSpeed = 0;
    
    // NUOVO: Flag per primo fix GPS
    this.hasFirstFix = false;

    // Stati per Mappa
    this.isRecording = false; // Se stiamo registrando la traccia
    this.trackPoints = []; // Array di coordinate [lat, lon]
    this.waypoints = []; // Array di marcatori {lat, lon, label}
     // -----------------------------
    
    // Racebox State
    this.raceboxConnected = false;
    this.raceboxDevice = null;
    this.raceboxCharacteristic = null;
    
    // Diagnostica
    this.updateTimestamps = [];
    
    // Avvia GPS e rendering loop
    this.init();
  }

  init() {
    console.log('🚀 GPSManager init - Simulation:', this.simulationActive);
    
    if (this.simulationActive) {
      this.startSimulation();
    } else {
      // Avvia GPS interno reale
      this.startInternalGPS();
    }
    
    // Avvia rendering loop (per fluidità GPS interno)
    this.startRenderLoop();
  }

  /*
  ========================================
  SIMULATORE DI MOVIMENTO (DEBUG)
  ========================================
  */
  startSimulation() {
    console.warn('⚠️ MODALITÀ SIMULAZIONE ATTIVA');
    let fakeLat = 45.000000;
    let fakeLon = 9.000000;
    let fakeSpeedMs = 0;
    
    // IMPORTANTE: Setta subito hasFirstFix per la simulazione
    this.hasFirstFix = true;
    
    setInterval(() => {
      // Simula accelerazione e decelerazione ciclica (0-100 km/h)
      const time = Date.now() / 5000;
      fakeSpeedMs = (Math.sin(time) + 1.1) * 13.8; // 13.8 m/s = ~50km/h di media
      
      // Sposta leggermente le coordinate in base alla velocità
      fakeLat += 0.00005; 
      fakeLon += 0.00005;

      // Inietta i dati nel sistema tramite handlePosition
      this.handlePosition({
        coords: {
          latitude: fakeLat,
          longitude: fakeLon,
          altitude: 200,
          speed: fakeSpeedMs,
          accuracy: 1
        },
        timestamp: Date.now()
      });
    }, 1000); // Aggiornamento 1Hz come GPS standard
  }

  /*
  ========================================
  GPS INTERNO - FIXED
  ========================================
  */
  startInternalGPS() {
    if (!navigator.geolocation) {
      console.error('❌ Geolocation non supportata');
      this.onDebugUpdate({ fixStatus: 'GPS non disponibile' });
      return;
    }

    console.log('📡 Avvio GPS interno...');
    
    // Mostra subito che stiamo cercando il segnale
    this.onDebugUpdate({ fixStatus: 'Ricerca satelliti...' });

    navigator.geolocation.watchPosition(
      (position) => {
        if (!this.raceboxConnected) {
          // PRIMO FIX GPS
          if (!this.hasFirstFix) {
            this.hasFirstFix = true;
            console.log('✅ Primo fix GPS ricevuto!');
            this.onDebugUpdate({ fixStatus: 'GPS ATTIVO' });
          }
          
          this.handlePosition(position);
        }
      },
      (error) => {
        if (!this.raceboxConnected) {
          console.error('❌ Errore GPS:', error);
          
          let errorMsg = 'Errore GPS';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = 'Permesso GPS negato';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = 'Segnale GPS non disponibile';
              break;
            case error.TIMEOUT:
              errorMsg = 'Timeout GPS - Riprovo...';
              break;
          }
          
          this.onDebugUpdate({ fixStatus: errorMsg });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,        // ⬅️ Aumentato a 10 secondi
        maximumAge: 0
      }
    );
  }

  /*
  ========================================
  RACEBOX BLUETOOTH
  ========================================
  */
  async toggleRacebox() {
    if (this.raceboxConnected) {
      await this.disconnectRacebox();
      return;
    }

    try {
      this.raceboxDevice = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'RaceBox Mini' }],
        optionalServices: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']
      });

      this.raceboxDevice.addEventListener('gattserverdisconnected', () => {
        this.handleRaceboxDisconnect();
      });

      const server = await this.raceboxDevice.gatt.connect();
      const service = await server.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
      const tx = await service.getCharacteristic('6e400003-b5a3-f393-e0a9-e50e24dcca9e');

      await tx.startNotifications();
      this.raceboxCharacteristic = tx;
      this.raceboxConnected = true;
      
      // IMPORTANTE: Setta hasFirstFix anche per Racebox
      this.hasFirstFix = true;

      this.lastLat = null;
      this.lastLon = null;
      this.lastAlt = null;
      
      this.visTripA = this.tripA;
      this.visTripB = this.tripB;

      this.onRaceboxStatusChange(true);

      tx.addEventListener('characteristicvaluechanged', (event) => {
        const data = new Uint8Array(event.target.value.buffer);
        const parsed = this.parseRaceBoxPacket(data);
        
        if (parsed) {
          this.handlePosition({
            coords: {
              latitude: parsed.lat,
              longitude: parsed.lon,
              altitude: parsed.alt,
              speed: parsed.speed,
              accuracy: 1
            }
          });
          
          this.onDebugUpdate({ battery: parsed.battery });
        }
      });

      console.log('✅ Racebox connesso');

    } catch (error) {
      console.error('❌ Errore Racebox:', error);
      alert('Errore connessione Racebox: ' + error.message);
    }
  }

  async disconnectRacebox() {
    if (this.raceboxCharacteristic) {
      await this.raceboxCharacteristic.stopNotifications();
    }
    
    if (this.raceboxDevice && this.raceboxDevice.gatt.connected) {
      this.raceboxDevice.gatt.disconnect();
    }
    
    this.handleRaceboxDisconnect();
  }

  handleRaceboxDisconnect() {
    this.raceboxConnected = false;
    this.raceboxDevice = null;
    this.raceboxCharacteristic = null;
    this.hasFirstFix = false; // ⬅️ Reset anche questo
    
    this.lastLat = null;
    this.lastLon = null;
    this.lastAlt = null;
    
    this.onRaceboxStatusChange(false);
    this.onDebugUpdate({ fixStatus: 'Racebox disconnesso' });
    
    console.log('Racebox disconnesso');
  }

  /*
  ========================================
  PARSING PACCHETTI RACEBOX
  ========================================
  */
  parseRaceBoxPacket(data) {
    if (data.length < 70) return null;
    
    if (data[0] !== 0xB5 || data[1] !== 0x62 || data[2] !== 0xFF || data[3] !== 0x01) {
      return null;
    }
    
    const p = 6;
    
    return {
      lon: this.i32(data, p + 24) * 1e-7,
      lat: this.i32(data, p + 28) * 1e-7,
      alt: this.i32(data, p + 32) / 1000,
      speed: this.i32(data, p + 48) / 1000,
      battery: this.u8(data, p + 67)
    };
  }

  u8(data, offset) { return data[offset]; }
  
  u32(data, offset) {
    return data[offset] | (data[offset+1]<<8) | (data[offset+2]<<16) | (data[offset+3]<<24);
  }
  
  i32(data, offset) { return (this.u32(data, offset) << 0); }

  /*
  ========================================
  HANDLE POSITION - FIXED
  ========================================
  */
  handlePosition(position) {
    // PROTEZIONE: Ignora dati GPS invalidi
    const crd = position.coords;
    if (!crd || crd.latitude === null || crd.longitude === null) {
      console.warn('⚠️ Posizione GPS invalida, ignoro');
      return;
    }
    
    const now = Date.now();

    // Calcola Hz
    this.updateTimestamps.push(now);
    this.updateTimestamps = this.updateTimestamps.filter(t => t > now - 2000);
    
    let hz = 0;
    if (this.updateTimestamps.length > 1) {
      const dt = (this.updateTimestamps.at(-1) - this.updateTimestamps[0]) / 1000;
      hz = (this.updateTimestamps.length / dt).toFixed(1);
    }

    // Aggiorna velocità IMMEDIATAMENTE
    this.currentSpeed = Math.max(0, (crd.speed || 0) * 3.6);
    this.onSpeedUpdate(this.currentSpeed);

    // Aggiorna debug info
    this.onDebugUpdate({
      hz: hz,
      speed: crd.speed || 0,
      altitude: crd.altitude,
      fixStatus: this.hasFirstFix ? 'FIX OK' : 'Primo fix...',
      pts: this.trackPoints.length
    });

    // CALCOLO DISTANZA - Solo se abbiamo una posizione precedente VALIDA
    if (this.lastLat !== null && this.lastLon !== null) {
      const dist2d = this.calculateDistance(
        this.lastLat,
        this.lastLon,
        crd.latitude,
        crd.longitude
      );
      
      let distFinal = dist2d;

      // Calcola distanza 3D se abbiamo altitudine
      if (this.lastAlt !== null && crd.altitude !== null) {
        const dAlt = crd.altitude - this.lastAlt;
        distFinal = Math.sqrt(dist2d * dist2d + dAlt * dAlt);
      }

      this.onDebugUpdate({ distance3d: distFinal });

      // Aggiungi distanza solo se:
      // 1. Ci stiamo muovendo (speed > 0.1 m/s = 0.36 km/h)
      // 2. La distanza è ragionevole (< 50m tra update)
      // 3. Abbiamo avuto il primo fix
      if (this.hasFirstFix && crd.speed > 0.1 && distFinal < 50) {
        this.tripA += distFinal;
        this.tripB += distFinal;

        // Registrazione traccia
        if (this.isRecording) {
          this.trackPoints.push([crd.latitude, crd.longitude]);
        }

        // Aggiornamento UI
        if (this.raceboxConnected || this.simulationActive) {
          // Racebox/Simulazione: diretto
          this.visTripA = this.tripA;
          this.visTripB = this.tripB;
          this.updateUIImmediate();
        }
        // GPS interno: il renderLoop farà l'interpolazione
      }
    }

    // Salva posizione corrente
    this.lastLat = crd.latitude;
    this.lastLon = crd.longitude;
    this.lastAlt = crd.altitude;
  }

  /*
  ========================================
  CALCOLO DISTANZA (Haversine)
  ========================================
  */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2)**2 +
              Math.cos(lat1 * Math.PI / 180) *
              Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2)**2;
    
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  /*
  ========================================
  RENDERING LOOP
  ========================================
  */
  startRenderLoop() {
    const loop = () => {
      // Solo se GPS interno (non Racebox e non Simulazione)
      if (!this.raceboxConnected && !this.simulationActive) {
        // Interpolazione TripA
        const diffA = this.tripA - this.visTripA;
        if (Math.abs(diffA) > 0.05) {
          this.visTripA += diffA * 0.1;
        } else {
          this.visTripA = this.tripA;
        }

        // Interpolazione TripB
        const diffB = this.tripB - this.visTripB;
        if (Math.abs(diffB) > 0.05) {
          this.visTripB += diffB * 0.1;
        } else {
          this.visTripB = this.tripB;
        }

        // Notifica UI con valori interpolati
        this.onTripUpdate(this.visTripA, this.visTripB);
      }

      requestAnimationFrame(loop);
    };

    loop();
  }

  /*
  ========================================
  UPDATE UI IMMEDIATE
  ========================================
  */
  updateUIImmediate() {
    this.onTripUpdate(this.tripA, this.tripB);
  }

  /*
  ========================================
  RESET FUNCTIONS
  ========================================
  */
  resetTripA() {
    // Salva waypoint prima di resettare
    if (this.lastLat !== null && this.lastLon !== null && this.hasFirstFix) {
      const frozenVal = this.tripA.toFixed(2);
      this.waypoints.push({
        lat: this.lastLat,
        lon: this.lastLon,
        label: frozenVal
      });
      console.log('📍 Waypoint salvato:', frozenVal);
    }

    this.tripA = 0;
    this.visTripA = 0;
    this.updateUIImmediate();
  }

  resetAll() {
    // Reset contatori
    this.tripA = 0;
    this.tripB = 0;
    this.visTripA = 0;
    this.visTripB = 0;

    // --- NUOVO: LOGICA RESET TRACCIA ---
    // Azzerare Trip B significa iniziare una nuova registrazione
    this.trackPoints = [];
    this.waypoints = [];
    this.isRecording = true;
    console.log("🚩 Registrazione Mappa Avviata");
    // ------------------------------------
    
    console.log('🚩 Registrazione Mappa Avviata');
    this.updateUIImmediate();
  }

  // --- NUOVO: CONTROLLO REGISTRAZIONE ---
  setRecording(status) {
    this.isRecording = status;
    console.log("Stato registrazione traccia:", status);
  }
}
