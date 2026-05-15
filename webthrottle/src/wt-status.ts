import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ConnectionState } from './mqtt-service.js';

/**
 * Connection status indicator with colored dot + label.
 */
@customElement('wt-status')
export class WtStatus extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      color: var(--wt-text-dim);
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      transition: background var(--wt-transition), box-shadow var(--wt-transition);
    }

    .dot[data-state="connected"] {
      background: var(--wt-green);
      box-shadow: 0 0 6px var(--wt-green);
    }

    .dot[data-state="connecting"] {
      background: var(--wt-amber);
      animation: pulse 1s infinite;
    }

    .dot[data-state="disconnected"] {
      background: var(--wt-text-dim);
    }

    .dot[data-state="error"] {
      background: var(--wt-red);
      box-shadow: 0 0 6px var(--wt-red);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `;

  @property() state: ConnectionState = 'disconnected';

  render() {
    return html`
      <span class="dot" data-state=${this.state}></span>
      <span>${this.state}</span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-status': WtStatus;
  }
}
