import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Vertical speed slider with large touch target.
 *
 * Fires `speed-change` with `detail: { speed: number }`.
 */
@customElement('wt-speed-slider')
export class WtSpeedSlider extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-height: 0;
    }

    .value {
      font-size: 3rem;
      font-weight: 800;
      color: var(--wt-accent);
      font-variant-numeric: tabular-nums;
      line-height: 1;
      text-shadow: 0 0 20px var(--wt-accent-glow);
    }

    .value-unit {
      font-size: 1rem;
      font-weight: 600;
      color: var(--wt-text-dim);
      margin-left: 2px;
    }

    .slider-track {
      position: relative;
      flex: 1;
      width: 96px;
      min-height: 100px;
      background: #161b22;
      border: 1px solid var(--wt-border);
      border-radius: var(--wt-radius);
      overflow: hidden;
      cursor: pointer;
      touch-action: none;
      box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.4);
    }

    .slider-fill {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, var(--wt-accent), #79c0ff, #a5d6ff);
      transition: height 0.05s linear;
      border-radius: 0 0 var(--wt-radius) var(--wt-radius);
      box-shadow: 0 -4px 12px var(--wt-accent-glow);
    }

    .slider-fill::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: #fff;
      opacity: 0.5;
    }

    .slider-fill.estop {
      background: linear-gradient(to top, var(--wt-red), #ff7b72);
      box-shadow: 0 -4px 12px var(--wt-red-glow);
    }

    .label {
      font-size: 0.85rem;
      font-weight: 800;
      color: var(--wt-text-dim);
      text-transform: uppercase;
      letter-spacing: 0.15em;
    }
  `;

  @property({ type: Number }) speed = 0;
  @property({ type: Number }) max = 126;

  private dragging = false;

  render() {
    const pct = (this.speed / this.max) * 100;
    const displayPct = Math.round(pct);
    return html`
      <div class="value">${displayPct}<span class="value-unit">%</span></div>
      <div
        class="slider-track"
        id="speed-slider"
        @pointerdown=${this.onPointerDown}
        @pointermove=${this.onPointerMove}
        @pointerup=${this.onPointerUp}
        @pointercancel=${this.onPointerUp}
      >
        <div
          class="slider-fill"
          style="height: ${pct}%"
        ></div>
      </div>
      <span class="label">Speed</span>
    `;
  }

  private onPointerDown(e: PointerEvent) {
    this.dragging = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    this.updateFromPointer(e);
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.dragging) return;
    this.updateFromPointer(e);
  }

  private onPointerUp() {
    this.dragging = false;
  }

  private updateFromPointer(e: PointerEvent) {
    const track = this.shadowRoot!.querySelector('.slider-track') as HTMLElement;
    const rect = track.getBoundingClientRect();
    const y = rect.bottom - e.clientY;
    const ratio = Math.max(0, Math.min(1, y / rect.height));
    const speed = Math.round(ratio * this.max);

    this.dispatchEvent(new CustomEvent('speed-change', {
      detail: { speed },
      bubbles: true,
      composed: true,
    }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-speed-slider': WtSpeedSlider;
  }
}
