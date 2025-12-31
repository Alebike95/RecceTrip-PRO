/*
========================================
GPS MANAGER
========================================
Il "cervello" dell'app. Gestisce:
- GPS interno (con interpolazione fluida)
- Racebox via Bluetooth (aggiornamento diretto)
- Calcolo distanze 3D
- Parsing pacchetti Racebox
- Rendering loop per fluidità GPS interno

EDUCATIVO: Questo è un "Service" - non ha UI,
solo logica business. È il più complesso ma anche
il più importante.
========================================
*/

export class GPSManager {
  constructor(callbacks) {
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
    // Avvia GPS interno
    this.startInternalGPS();
    
    // Avvia rendering loop (per fluidità GPS interno)
    this.startRenderLoop();
  }

  /*
  ========================================
  GPS INTERNO
  ========================================
  */
  startInternalGPS() {
    if (!navigator.geolocation) {
      console.error('Geolocation non supportata');
      return;
    }

    navigator.geolocation.watchPosition(
      (position) => {
        // Solo se Racebox NON è connesso
        if (!this.raceboxConnected) {
          this.handlePosition(position);
        }
      },
      (error) => {
        if (!this.raceboxConnected) {
          this.onDebugUpdate({
            fixStatus: `ERR: ${error.message}`
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
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
    // Se già connesso, disconnetti
    if (this.raceboxConnected) {
      await this.disconnectRacebox();
      return;
    }

    // Altrimenti connetti
    try {
      // Richiedi device Bluetooth
      this.raceboxDevice = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'RaceBox Mini' }],
        optionalServices: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']
      });

      // Listener per disconnessione automatica
      this.raceboxDevice.addEventListener('gattserverdisconnected', () => {
        this.handleRaceboxDisconnect();
      });

      // Connetti GATT
      const server = await this.raceboxDevice.gatt.connect();
      const service = await server.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
      const tx = await service.getCharacteristic('6e400003-b5a3-f393-e0a9-e50e24dcca9e');

      // Avvia notifiche
      await tx.startNotifications();
      this.raceboxCharacteristic = tx;
      this.raceboxConnected = true;

      // Reset posizione GPS (per evitare salti)
      this.lastLat = null;
      this.lastLon = null;
      this.lastAlt = null;
      
      // Allinea valori visuali (per evitare interpolazioni strane)
      this.visTripA = this.tripA;
      this.visTripB = this.tripB;

      // Notifica UI
      this.onRaceboxStatusChange(true);

      // Listener dati Racebox
      tx.addEventListener('characteristicvaluechanged', (event) => {
        const data = new Uint8Array(event.target.value.buffer);
        const parsed = this.parseRaceBoxPacket(data);
        
        if (parsed) {
          // Crea oggetto position-like per riusare handlePosition
          this.handlePosition({
            coords: {
              latitude: parsed.lat,
              longitude: parsed.lon,
              altitude: parsed.alt,
              speed: parsed.speed,
              accuracy: 1
            }
          });
          
          // Aggiorna batteria
          this.onDebugUpdate({ battery: parsed.battery });
        }
      });

      console.log('✅ Racebox connesso');

    } catch (error) {
      alert('Errore connessione Racebox: ' + error.message);
      console.error('Racebox error:', error);
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
    
    // Reset GPS state
    this.lastLat = null;
    this.lastLon = null;
    this.lastAlt = null;
    
    // Notifica UI
    this.onRaceboxStatusChange(false);
    
    console.log('Racebox disconnesso');
  }

  /*
  ========================================
  PARSING PACCHETTI RACEBOX
  ========================================
  */
  parseRaceBoxPacket(data) {
    // Verifica lunghezza minima
    if (data.length < 70) return null;
    
    // Verifica header UBX
    if (data[0] !== 0xB5 || data[1] !== 0x62 || data[2] !== 0xFF || data[3] !== 0x01) {
      return null;
    }
    
    const p = 6; // Offset payload
    
    return {
      lon: this.i32(data, p + 24) * 1e-7,
      lat: this.i32(data, p + 28) * 1e-7,
      alt: this.i32(data, p + 32) / 1000,
      speed: this.i32(data, p + 48) / 1000,
      battery: this.u8(data, p + 67)
    };
  }

  // Helper per leggere bytes
  u8(data, offset) {
    return data[offset];
  }

  u32(data, offset) {
    return data[offset] | (data[offset+1]<<8) | (data[offset+2]<<16) | (data[offset+3]<<24);
  }

  i32(data, offset) {
    return (this.u32(data, offset) << 0);
  }

  /*
  ========================================
  HANDLE POSITION
  Gestisce dati GPS (sia interno che Racebox)
  ========================================
  */
  handlePosition(position) {
    const crd = position.coords;
    const now = Date.now();

    // Calcola Hz (aggiornamenti al secondo)
    this.updateTimestamps.push(now);
    this.updateTimestamps = this.updateTimestamps.filter(t => t > now - 2000);
    
    let hz = 0;
    if (this.updateTimestamps.length > 1) {
      const dt = (this.updateTimestamps.at(-1) - this.updateTimestamps[0]) / 1000;
      hz = (this.updateTimestamps.length / dt).toFixed(1);
    }

    // Aggiorna velocità IMMEDIATAMENTE (serve reattività, non fluidità)
    this.currentSpeed = Math.max(0, (crd.speed || 0) * 3.6);
    this.onSpeedUpdate(this.currentSpeed);

    // Aggiorna debug info
    this.onDebugUpdate({
      hz: hz,
      speed: crd.speed || 0,
      altitude: crd.altitude,
      fixStatus: 'FIX OK'
    });

    // Calcola distanza se abbiamo una posizione precedente
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

      // Debug
      this.onDebugUpdate({ distance3d: distFinal });

      // Aggiungi distanza solo se ci stiamo muovendo e la distanza è ragionevole
      if (crd.speed > 0.1 && distFinal < 50) {
        // Aggiorna valori REALI
        this.tripA += distFinal;
        this.tripB += distFinal;

        // STRADA 1: RACEBOX (Aggiornamento diretto)
        if (this.raceboxConnected) {
          this.visTripA = this.tripA;
          this.visTripB = this.tripB;
          this.updateUIImmediate();
        }
        // STRADA 2: GPS Interno (Aggiornamento fluido nel renderLoop)
        // Non facciamo nulla qui, il renderLoop farà l'interpolazione
      }
    }

    // Salva posizione corrente
    this.lastLat = crd.latitude;
    this.lastLon = crd.longitude;
    this.lastAlt = crd.altitude;
  }

  /*
  ========================================
  CALCOLO DISTANZA (Formula Haversine)
  ========================================
  */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Raggio Terra in metri
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
  Interpolazione fluida per GPS interno
  Gira a 60 FPS
  ========================================
  */
  startRenderLoop() {
    const loop = () => {
      // Solo se GPS interno (non Racebox)
      if (!this.raceboxConnected) {
        // Interpolazione TripA
        const diffA = this.tripA - this.visTripA;
        if (Math.abs(diffA) > 0.05) {
          // Muovi del 10% verso il target (effetto smooth)
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

      // Loop continuo
      requestAnimationFrame(loop);
    };

    loop();
  }

  /*
  ========================================
  UPDATE UI IMMEDIATE (Racebox)
  ========================================
  */
  updateUIImmediate() {
    // Notifica UI con valori reali (no interpolazione)
    this.onTripUpdate(this.tripA, this.tripB);
  }

  /*
  ========================================
  RESET FUNCTIONS
  ========================================
  */
  resetTripA() {
    this.tripA = 0;
    this.visTripA = 0;
    this.updateUIImmediate();
  }

  resetAll() {
    this.tripA = 0;
    this.tripB = 0;
    this.visTripA = 0;
    this.visTripB = 0;
    this.updateUIImmediate();
  }
}