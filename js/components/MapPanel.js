/* ========================================================================
MODULO: MapPanel.js
Gestisce:
- Pulsante MAP
- Prompt registrazione
- Mappa Leaflet
- Traccia Trip B
- Waypoint Trip A
- Marker inizio traccia (Trip B)
- Export KMZ
======================================================================== */

export class MapPanel {
  constructor(gpsManager) {
    this.gpsManager = gpsManager;

    this.map = null;
    this.polyline = null;
    this.markerGroup = null;
    this.tileLayer = null;
    this.layerIndex = 0;

    // Marker inizio Trip B
    this.startMarker = null;

    this.root = document.getElementById('map-panel-root');
    this.render();

    this.modal = document.getElementById('map-modal');
    this.prompt = document.getElementById('rec-prompt');

    this.attachEvents();
  }

  /* ===================== CSS ===================== */
  getStyles() {
    return `
    .map-button {
      position:absolute;
      right:20px;
      bottom:85px;
      width:50px;
      height:50px;
      border-radius:8px;
      background:rgba(255,255,255,0.15);
      border:1px solid rgba(255,255,255,.3);
      color:#fff;
      font-weight:bold;
      display:flex;
      align-items:center;
      justify-content:center;
      cursor:pointer;
      z-index:1001;
    }

    #map-modal {
      position:fixed;
      inset:0;
      background:#000;
      display:none;
      z-index:9999;
    }

    #map-container {
      width:100%;
      height:100%;
    }

    .map-controls {
      position:absolute;
      bottom:30px;
      left:50%;
      transform:translateX(-50%);
      display:flex;
      gap:15px;
      z-index:10000;
    }

    .map-btn {
      background:#000;
      border:2px solid #00ff00;
      color:#00ff00;
      padding:12px 20px;
      font-family:monospace;
      font-size:18px;
      font-weight:bold;
      border-radius:8px;
      cursor:pointer;
    }

    .map-btn.close {
      border-color:#ff0000;
      color:#ff0000;
    }

    #rec-prompt {
      position:absolute;
      top:50%;
      left:50%;
      transform:translate(-50%,-50%);
      background:#000;
      border:2px solid #fff;
      padding:25px;
      width:85%;
      border-radius:12px;
      text-align:center;
      display:none;
      z-index:10001;
    }

    /* ===== MARKER TRIP A ===== */
    .custom-trip-marker {
      background:transparent;
      border:none;
    }

    .marker-wrapper {
      display:flex;
      flex-direction:column;
      align-items:center;
      transform:translateY(-100%);
    }

    .marker-label {
      background:rgba(255,230,0,0.75);
      color:#000;
      font-family:monospace;
      font-weight:bold;
      padding:2px 6px;
      border-radius:3px;
      border:1px solid #000;
    }

    .marker-pin {
      width:0;
      height:0;
      border-left:6px solid transparent;
      border-right:6px solid transparent;
      border-top:10px solid rgba(255,230,0,0.75);
    }

    /* ===== MARKER START ===== */
    .start-flag {
      font-size:22px;
      transform:translateY(-100%);
    }
    `;
  }

  /* ===================== HTML ===================== */
  getTemplate() {
    return `
    <div class="map-button" id="map-btn">MAP</div>

    <div id="map-modal">
      <div id="map-container"></div>

      <div class="map-controls">
        <button class="map-btn" id="btn-center">🎯</button>
        <button class="map-btn" id="btn-layer">LAYERS</button>
        <button class="map-btn" id="btn-export">EXPORT</button>
        <button class="map-btn close" id="btn-close">CHIUDI</button>
      </div>

      <div id="rec-prompt">
        <h3 style="color:#0f0">REGISTRAZIONE ATTIVA</h3>
        <p style="color:#ccc">Vuoi fermarla?</p>
        <button class="map-btn" id="btn-stop">STOP</button>
        <button class="map-btn" id="btn-keep">CONTINUA</button>
      </div>
    </div>
    `;
  }

  render() {
    if (!document.getElementById('map-panel-styles')) {
      const s = document.createElement('style');
      s.id = 'map-panel-styles';
      s.textContent = this.getStyles();
      document.head.appendChild(s);
    }
    this.root.innerHTML = this.getTemplate();
  }

  /* ===================== EVENTS ===================== */
  attachEvents() {
    document.getElementById('map-btn').onclick = () => this.openMap();
    document.getElementById('btn-close').onclick = () => this.closeMap();
    document.getElementById('btn-layer').onclick = () => this.toggleLayer();
    document.getElementById('btn-center').onclick = () => this.center();
    document.getElementById('btn-export').onclick = () => this.exportKMZ();

    document.getElementById('btn-stop').onclick = () => {
      this.gpsManager.setRecording(false);
      this.prompt.style.display = 'none';
    };

    document.getElementById('btn-keep').onclick = () => {
      this.prompt.style.display = 'none';
    };
  }

  /* ===================== MAPPA ===================== */
  openMap() {
    this.modal.style.display = 'block';

    if (!this.map) this.initMap();
    setTimeout(() => this.map.invalidateSize(), 200);

    this.update();
    this.prompt.style.display = this.gpsManager.isRecording ? 'block' : 'none';
  }

  closeMap() {
    this.modal.style.display = 'none';
  }

  initMap() {
    const lat = this.gpsManager.lastLat ?? 45;
    const lon = this.gpsManager.lastLon ?? 9;

    this.map = L.map('map-container', {
      zoomControl:false,
      attributionControl:false
    }).setView([lat, lon], 15);

    this.setLayer(0);

    this.polyline = L.polyline([], {
      color:'red',
      weight:5
    }).addTo(this.map);

    this.markerGroup = L.layerGroup().addTo(this.map);
  }

  update() {
    if (!this.map) return;

    const pts = this.gpsManager.trackPoints;

    // Traccia Trip B
    this.polyline.setLatLngs(pts);

    // Marker inizio Trip B
    if (pts.length === 1 && !this.startMarker) {
      const icon = L.divIcon({
        className:'start-flag',
        html:'🇮🇹'
      });
      this.startMarker = L.marker(pts[0], { icon }).addTo(this.map);
    }

    // Marker Trip A
    this.markerGroup.clearLayers();
    this.gpsManager.waypoints.forEach(wp => {
      const icon = L.divIcon({
        className:'custom-trip-marker',
        html:`
          <div class="marker-wrapper">
            <div class="marker-label">${wp.label}</div>
            <div class="marker-pin"></div>
          </div>
        `
      });
      L.marker([wp.lat, wp.lon], { icon }).addTo(this.markerGroup);
    });
  }

  center() {
    if (this.gpsManager.lastLat && this.gpsManager.lastLon) {
      this.map.flyTo([this.gpsManager.lastLat, this.gpsManager.lastLon], 17);
    }
  }

  toggleLayer() {
    this.layerIndex = (this.layerIndex + 1) % 3;
    this.setLayer(this.layerIndex);
  }

  setLayer(i) {
    if (this.tileLayer) this.map.removeLayer(this.tileLayer);
    const c = document.getElementById('map-container');

    if (i === 0) {
      this.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
      c.style.background='#ddd';
    } else if (i === 1) {
      this.tileLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ).addTo(this.map);
      c.style.background='#000';
    } else {
      this.tileLayer = null;
      c.style.background='#000';
    }
  }

  /* ===================== EXPORT KMZ ===================== */
  exportKMZ() {
    const kml = this.buildKML();
    const blob = new Blob([kml], { type:'application/vnd.google-earth.kmz' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'track.kmz';
    a.click();
  }

  buildKML() {
    const lineCoords = this.gpsManager.trackPoints
      .map(p => `${p[1]},${p[0]},0`)
      .join(' ');

    const waypoints = this.gpsManager.waypoints.map(wp => `
      <Placemark>
        <name>${wp.label}</name>
        <Point><coordinates>${wp.lon},${wp.lat},0</coordinates></Point>
      </Placemark>
    `).join('');

    return `
    <?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2">
      <Document>
        <Placemark>
          <LineString>
            <tessellate>1</tessellate>
            <coordinates>${lineCoords}</coordinates>
          </LineString>
        </Placemark>
        ${waypoints}
      </Document>
    </kml>
    `;
  }
}
