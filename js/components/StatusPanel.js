/* ========================================================================
MODULO: StatusPanel.js
Gestisce la grafica dei LED e delle batterie (RBX e AZZ)
========================================================================
*/

export class StatusPanel {
    constructor() {
        this.container = document.getElementById('status-panel-root');
        this.render();
    }

    getStyles() {
        return `
            .status-panel {
                position: absolute;
                bottom: 60px; /* Sopra la versione v0.2 */
                left: 20px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                z-index: 10;
            }

            .status-row {
                display: flex;
                align-items: center;
                gap: 10px;
                font-family: monospace;
                font-weight: bold;
            }

            .status-label { color: #888; font-size: 14px; width: 35px; }

            .led { width: 14px; height: 14px; border-radius: 50%; transition: all 0.3s ease; }
            .led-red { background-color: #ff0000; box-shadow: 0 0 8px #800; }
            .led-green { background-color: #00ff00; box-shadow: 0 0 15px #0f0; }

            .status-battery { color: #fff; font-size: 14px; }
        `;
    }

    getTemplate() {
        return `
            <div class="status-panel">
                <div class="status-row">
                    <span class="status-label">RBX</span>
                    <div class="led led-red" id="led-rbx"></div>
                    <span class="status-battery" id="batt-rbx">--%</span>
                </div>
                <div class="status-row">
                    <span class="status-label">AZZ</span>
                    <div class="led led-red" id="led-azz"></div>
                    <span class="status-battery" id="batt-azz">--%</span>
                </div>
            </div>
        `;
    }

    render() {
        if (!document.getElementById('status-panel-styles')) {
            const style = document.createElement('style');
            style.id = 'status-panel-styles';
            style.textContent = this.getStyles();
            document.head.appendChild(style);
        }
        const container = document.querySelector('.main-content');
        if (container) {
            const div = document.createElement('div');
            div.innerHTML = this.getTemplate();
            container.appendChild(div.firstElementChild);
        }
    }

    updateStatus(rigaId, isConnected) {
        const ledElement = document.getElementById(`led-${rigaId}`);
        if (ledElement) {
            ledElement.classList.toggle('led-green', isConnected);
            ledElement.classList.toggle('led-red', !isConnected);
        }
    }

    /* Metodo per aggiornare la percentuale batteria */
    updateBattery(rigaId, level) {
        const battElement = document.getElementById(`batt-${rigaId}`);
        if (battElement) {
            battElement.innerText = `${level}%`;
        }
    }
}

/* ========================================================================
FINE MODULO: StatusPanel.js
========================================================================
*/