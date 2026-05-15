import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { MqttService } from './mqtt-service.js';
import { throttleCmd, functionCmd, estopCmd, clampSpeed, powerOnCmd, powerOffCmd, parsePowerState, statusCmd, parseLocoState } from './dcc-commands.js';
import type { ConnectionState } from './mqtt-service.js';
import './wt-status.js';
import './wt-speed-slider.js';

/**
 * Root application shell — DCC throttle controller.
 */
@customElement('wt-app')
export class WtApp extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      user-select: none;
    }

    /* ── Header ──────────────────────────────────── */
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 4px 12px 4px; /* Internal side padding to prevent clipping */
      border-bottom: 1px solid var(--wt-border);
    }

    .title {
      font-size: 1.6rem;
      font-weight: 900;
      color: var(--wt-text);
      letter-spacing: -0.01em; /* Less aggressive spacing */
      line-height: 1.2;
    }

    /* ── Address bar ─────────────────────────────── */
    .address-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: var(--wt-surface);
      border: 1px solid var(--wt-border);
      border-radius: var(--wt-radius);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    }

    .address-bar label {
      font-size: 0.8rem;
      font-weight: 800;
      color: var(--wt-text-dim);
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .address-bar input {
      flex: 1;
      min-width: 0;
      background: #161b22;
      border: 1px solid var(--wt-border);
      border-radius: var(--wt-radius-sm);
      color: var(--wt-accent);
      font-family: var(--wt-font);
      font-size: 1.5rem;
      font-weight: 800;
      padding: 10px;
      text-align: center;
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .address-bar input:focus {
      outline: none;
      border-color: var(--wt-accent);
      box-shadow: 0 0 0 3px var(--wt-accent-glow), inset 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    /* ── Throttle body ───────────────────────────── */
    .throttle-body {
      display: flex;
      gap: 16px;
      flex: 1;
      min-height: 0; /* Critical: allows shrinking inside fixed-height parent */
    }

    /* ── Side controls ───────────────────────────── */
    .controls {
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex-shrink: 0;
      width: 140px;
    }

    /* ── Buttons ─────────────────────────────────── */
    button {
      flex: 1; /* All buttons share height equally within .controls */
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--wt-border);
      border-radius: var(--wt-radius);
      font-family: var(--wt-font);
      font-weight: 800;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all var(--wt-transition);
      padding: 0; /* Let flex handle height entirely */
      text-transform: uppercase;
      letter-spacing: 0.1em;
      background: var(--wt-surface-raised);
      color: var(--wt-text);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    button:active {
      transform: translateY(3px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    }

    .btn-direction {
      background: var(--wt-surface-raised);
    }

    .btn-direction:hover {
      background: #3c444d;
      border-color: var(--wt-accent);
    }

    .btn-direction .arrow {
      font-size: 1.8rem;
      color: var(--wt-accent);
    }

    .btn-light {
      font-size: 1.8rem;
    }

    .btn-light.on {
      color: var(--wt-amber);
      border-color: var(--wt-amber);
      background: rgba(251, 191, 36, 0.15);
      box-shadow: 0 0 20px rgba(251, 191, 36, 0.2);
    }

    .btn-stop {
      border-color: var(--wt-amber);
      color: var(--wt-amber);
      background: rgba(209, 153, 34, 0.08);
    }

    .btn-stop:hover {
      background: rgba(251, 191, 36, 0.15);
    }

    .btn-estop {
      background: var(--wt-red);
      border-color: #f87171;
      color: #fff;
      font-size: 1rem;
      box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3);
    }

    .btn-estop:hover {
      background: #dc2626;
    }

    .btn-power {
      background: var(--wt-surface-raised);
      border: 1px solid var(--wt-border);
      color: var(--wt-text-dim);
      font-size: 1.1rem;
    }

    .btn-power.on {
      background: rgba(52, 211, 153, 0.12);
      border-color: var(--wt-green);
      color: var(--wt-green);
      box-shadow: 0 0 12px rgba(52, 211, 153, 0.2);
    }

    .btn-power.off {
      background: rgba(239, 68, 68, 0.1);
      border-color: var(--wt-red);
      color: var(--wt-red);
    }

    /* ── Footer messages ─────────────────────────── */
    .messages {
      font-size: 0.75rem;
      color: var(--wt-text-dim);
      background: var(--wt-surface);
      border: 1px solid var(--wt-border);
      border-radius: var(--wt-radius-sm);
      padding: 8px 10px;
      max-height: 48px;
      overflow-y: auto;
      font-family: monospace;
      white-space: pre-wrap;
      word-break: break-all;
    }
  `;

  private mqtt = new MqttService();

  @state() private connectionState: ConnectionState = 'disconnected';
  @state() private cabAddress = 10;
  @state() private speed = 0;
  @state() private forward = true;
  @state() private lightOn = false;
  @state() private lastMessage = '';
  @state() private trackPower: boolean | null = null;

  connectedCallback() {
    super.connectedCallback();

    // Load persisted address
    const saved = localStorage.getItem('wt-cab-address');
    if (saved) {
      this.cabAddress = parseInt(saved, 10) || 10;
    }

    this.mqtt.onState((s) => { 
      this.connectionState = s;
      // Request system status (including power) when we connect
      if (s === 'connected') {
        this.mqtt.send(statusCmd());
        // Also request loco status to sync speed
        this.mqtt.send(`<t ${this.cabAddress}>`);
      }
    });
    this.mqtt.onMessage((m) => {
      // Filter out high-frequency diagnostic/current messages (<c ...>)
      if (m.startsWith('<c ')) return;

      this.lastMessage = m;
      
      const power = parsePowerState(m);
      if (power !== null) this.trackPower = power;

      const loco = parseLocoState(m, this.cabAddress);
      if (loco) {
        this.speed = loco.speed;
        this.forward = loco.forward;
        this.lightOn = loco.f0;
      }
    });
    this.mqtt.connect();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.mqtt.disconnect();
  }

  render() {
    return html`
      <header>
        <span class="title">WebThrottle</span>
        <wt-status .state=${this.connectionState}></wt-status>
      </header>

      <div class="address-bar">
        <label for="cab-address">DCC Addr</label>
        <input
          id="cab-address"
          type="number"
          min="1"
          max="10293"
          .value=${String(this.cabAddress)}
          @change=${this.onAddressChange}
        />
      </div>

      <div class="throttle-body">
        <wt-speed-slider
          .speed=${this.speed}
          @speed-change=${this.onSpeedChange}
        ></wt-speed-slider>

        <div class="controls">
          <button
            class="btn-direction"
            id="direction-toggle"
            @click=${this.toggleDirection}
          >
            <span class="arrow">${this.forward ? '▲' : '▼'}</span>
            ${this.forward ? 'FWD' : 'REV'}
          </button>

          <button
            class="btn-light ${this.lightOn ? 'on' : ''}"
            id="light-toggle"
            @click=${this.toggleLight}
          >
            💡
          </button>

          <button
            class="btn-power ${this.trackPower === true ? 'on' : this.trackPower === false ? 'off' : ''}"
            id="power-toggle"
            @click=${this.togglePower}
          >
            ${this.trackPower === true ? '⚡ ON' : this.trackPower === false ? '⚡ OFF' : '⚡ ?'}
          </button>

          <button
            class="btn-stop"
            id="stop-btn"
            @click=${this.stop}
          >
            Stop
          </button>

          <button
            class="btn-estop"
            id="estop-btn"
            @click=${this.emergencyStop}
          >
            E-Stop
          </button>
        </div>
      </div>

      ${this.lastMessage
        ? html`<div class="messages">${this.lastMessage}</div>`
        : null
      }
    `;
  }

  private onAddressChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.cabAddress = Math.max(1, Math.min(10293, parseInt(input.value) || 1));
    localStorage.setItem('wt-cab-address', String(this.cabAddress));
    // Request loco status for new address
    this.mqtt.send(`<t ${this.cabAddress}>`);
  }

  private onSpeedChange(e: CustomEvent<{ speed: number }>) {
    this.speed = clampSpeed(e.detail.speed);
    this.mqtt.send(throttleCmd(this.cabAddress, this.speed, this.forward));
  }

  private toggleDirection() {
    this.forward = !this.forward;
    if (this.speed > 0) {
      this.mqtt.send(throttleCmd(this.cabAddress, this.speed, this.forward));
    }
  }

  private toggleLight() {
    this.lightOn = !this.lightOn;
    this.mqtt.send(functionCmd(this.cabAddress, 0, this.lightOn));
  }

  private stop() {
    this.speed = 0;
    this.mqtt.send(throttleCmd(this.cabAddress, 0, this.forward));
  }

  private emergencyStop() {
    this.speed = 0;
    this.mqtt.send(estopCmd(this.cabAddress, this.forward));
  }

  private togglePower() {
    const cmd = this.trackPower ? powerOffCmd() : powerOnCmd();
    this.mqtt.send(cmd);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-app': WtApp;
  }
}
