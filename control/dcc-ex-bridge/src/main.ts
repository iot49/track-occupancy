import * as net from 'node:net';
import { SerialPort } from 'serialport';
import mqtt from 'mqtt';

const SERIAL_PATH = process.env.SERIAL_PORT || '/dev/ttyUSB0';
const TCP_PORT = parseInt(process.env.TCP_PORT || '2560');
const MQTT_HOST = process.env.MQTT_HOST || 'localhost';
const MQTT_PREFIX = process.env.MQTT_PREFIX || 'rails49';

/**
 * Protocol Parser: Reconstructs <...> commands from byte streams
 */
class DCCProtocolParser {
  private buffer: string = '';

  constructor(private onCommand: (cmd: string) => void) {}

  public feed(chunk: Buffer | string) {
    this.buffer += chunk.toString();
    this.extract();
  }

  private extract() {
    let start: number;
    while ((start = this.buffer.indexOf('<')) !== -1) {
      const end = this.buffer.indexOf('>', start);
      if (end === -1) {
        // If buffer is getting too large without a closing tag, prune it
        if (this.buffer.length > 2048) {
          console.warn('Buffer overflow, clearing data');
          this.buffer = '';
        }
        break;
      }

      const cmd = this.buffer.substring(start, end + 1);
      this.onCommand(cmd);
      this.buffer = this.buffer.substring(end + 1);
    }
  }
}

/**
 * DCC-EX Bridge
 */
class DCCExBridge {
  private serial: SerialPort;
  private mqttClient: mqtt.MqttClient;
  private tcpClients: Set<net.Socket> = new Set();
  private serialParser: DCCProtocolParser;

  constructor() {
    console.log(`Initializing DCC-EX Bridge on ${SERIAL_PATH}`);

    this.serial = new SerialPort({
      path: SERIAL_PATH,
      baudRate: 115200,
      autoOpen: false,
    });

    this.serialParser = new DCCProtocolParser((resp) => {
      this.broadcastResponse(resp);
    });

    this.mqttClient = mqtt.connect(`mqtt://${MQTT_HOST}`);
    
    this.init();
  }

  private async init() {
    // 1. Serial setup
    this.serial.open((err) => {
      if (err) {
        console.error('Failed to open serial port:', err.message);
        process.exit(1);
      }
      console.log('Serial port opened');
    });

    this.serial.on('data', (data) => {
      this.serialParser.feed(data);
    });

    // 2. MQTT setup
    this.mqttClient.on('connect', () => {
      console.log('Connected to MQTT');
      this.mqttClient.subscribe(`${MQTT_PREFIX}/dcc-ex/cmd`);
    });

    this.mqttClient.on('message', (topic, message) => {
      if (topic === `${MQTT_PREFIX}/dcc-ex/cmd`) {
        this.sendCommand(message.toString());
      }
    });

    // 3. TCP Server setup
    const server = net.createServer((socket) => {
      const remote = `${socket.remoteAddress}:${socket.remotePort}`;
      console.log(`TCP Client connected: ${remote}`);
      this.tcpClients.add(socket);

      const clientParser = new DCCProtocolParser((cmd) => {
        this.sendCommand(cmd);
      });

      socket.on('data', (data) => {
        clientParser.feed(data);
      });

      socket.on('close', () => {
        console.log(`TCP Client disconnected: ${remote}`);
        this.tcpClients.delete(socket);
      });

      socket.on('error', (err) => {
        console.error(`Socket error (${remote}):`, err.message);
      });
    });

    server.listen(TCP_PORT, () => {
      console.log(`TCP Server listening on port ${TCP_PORT}`);
    });
  }

  /**
   * Sends a command to the serial port. 
   * Since DCC-EX commands are short, serial.write is effectively atomic 
   * for our purposes as long as we don't interleave fragments.
   */
  private sendCommand(cmd: string) {
    if (!cmd.startsWith('<') || !cmd.endsWith('>')) {
      console.warn(`Invalid command dropped: ${cmd}`);
      return;
    }

    // Gemini is Making this up. Keeping comment for now, but verified that things work without.
    // Rewrite <1 MAIN> to <1> to avoid Power SC (Power State Conflict) 
    // in newer DCC-EX firmware versions.
    /*
    if (cmd === '<1 MAIN>') {
      cmd = '<1>';
    } else if (cmd === '<0 MAIN>') {
      cmd = '<0>';
    }
    */
    
    console.log(`-> ${cmd}`);
    this.serial.write(cmd, (err: Error | null | undefined) => {
      if (err) console.error('Serial write error:', err.message);
    });
  }

  /**
   * Broadcasts a response from the command station to all listeners
   */
  private broadcastResponse(resp: string) {
    console.log(`<- ${resp}`);

    // Broadcast to TCP clients
    for (const client of this.tcpClients) {
      client.write(resp);
    }

    // Publish to MQTT
    // Extract opcode: e.g. <p1> -> p, <iDCC-EX...> -> i
    /*
    const opcode = resp.substring(1, 2);
    this.mqttClient.publish(`${MQTT_PREFIX}/dcc-ex/status/${opcode}`, resp);
    */
    
    // Also publish full raw status
    this.mqttClient.publish(`${MQTT_PREFIX}/dcc-ex/status`, resp);
  }
}

new DCCExBridge();
