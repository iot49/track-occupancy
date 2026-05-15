/**
 * MQTT service for DCC-EX command station communication.
 *
 * Publishes DCC-EX commands to `{prefix}/dcc-ex/cmd` and subscribes
 * to `{prefix}/dcc-ex/status` for responses.
 */
import mqtt from 'mqtt';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MqttServiceOptions {
  brokerUrl: string;
  prefix: string;
}

type StateListener = (state: ConnectionState) => void;
type MessageListener = (message: string) => void;

const DEFAULT_BROKER = 'wss://mqtt.rails49.org';
const DEFAULT_PREFIX = 'rails49';

export class MqttService {
  private client: mqtt.MqttClient | null = null;
  private stateListeners = new Set<StateListener>();
  private messageListeners = new Set<MessageListener>();
  private _state: ConnectionState = 'disconnected';
  private brokerUrl: string;
  private prefix: string;

  constructor(options?: Partial<MqttServiceOptions>) {
    this.brokerUrl = options?.brokerUrl ?? DEFAULT_BROKER;
    this.prefix = options?.prefix ?? DEFAULT_PREFIX;
  }

  get state(): ConnectionState {
    return this._state;
  }

  get cmdTopic(): string {
    return `${this.prefix}/dcc-ex/cmd`;
  }

  get statusTopic(): string {
    return `${this.prefix}/dcc-ex/status`;
  }

  connect(): void {
    if (this.client) return;

    this.setState('connecting');

    this.client = mqtt.connect(this.brokerUrl, {
      clientId: `webthrottle-${Math.random().toString(36).slice(2, 8)}`,
      clean: true,
      reconnectPeriod: 3000,
    });

    this.client.on('connect', () => {
      this.setState('connected');
      this.client!.subscribe(this.statusTopic);
    });

    this.client.on('close', () => {
      this.setState('disconnected');
    });

    this.client.on('error', (err) => {
      console.error('[mqtt]', err);
      this.setState('error');
    });

    this.client.on('message', (_topic, payload) => {
      const msg = payload.toString();
      for (const listener of this.messageListeners) {
        listener(msg);
      }
    });
  }

  disconnect(): void {
    this.client?.end();
    this.client = null;
    this.setState('disconnected');
  }

  /** Send a raw DCC-EX command string, e.g. `<t 10 50 1>` */
  send(command: string): void {
    if (this._state !== 'connected' || !this.client) {
      console.warn('[mqtt] Not connected, dropping:', command);
      return;
    }
    this.client.publish(this.cmdTopic, command);
  }

  onState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  private setState(state: ConnectionState): void {
    this._state = state;
    for (const listener of this.stateListeners) {
      listener(state);
    }
  }
}
