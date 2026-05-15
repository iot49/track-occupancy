/**
 * DCC-EX command helpers.
 *
 * Builds well-formed `<...>` command strings for the DCC-EX protocol.
 */

/** Turn track power ON (both main & programming tracks). */
export function powerOnCmd(): string {
  return '<1>';
}

/** Turn track power OFF. */
export function powerOffCmd(): string {
  return '<0>';
}

/**
 * Parse a DCC-EX status broadcast to determine track power state.
 * Returns true if power is on, false if off, null if not a power message.
 */
export function parsePowerState(msg: string): boolean | null {
  if (/^<p1/.test(msg)) return true;   // <p1>, <p1 A>, <p1 JOIN>
  if (/^<p0/.test(msg)) return false;  // <p0>
  return null;
}

/** Set locomotive speed and direction. Speed 0–126, or -1 for emergency stop. */
export function throttleCmd(cab: number, speed: number, forward: boolean): string {
  const dir = forward ? 1 : 0;
  return `<t ${cab} ${speed} ${dir}>`;
}

/** Toggle a locomotive function (0 = headlight). */
export function functionCmd(cab: number, func: number, on: boolean): string {
  const state = on ? 1 : 0;
  return `<F ${cab} ${func} ${state}>`;
}

/** Request command station status. */
export function statusCmd(): string {
  return '<s>';
}

/** Emergency stop a single loco (speed = -1). */
export function estopCmd(cab: number, forward: boolean): string {
  return throttleCmd(cab, -1, forward);
}

/** Clamp speed to valid range. */
export function clampSpeed(value: number): number {
  return Math.max(0, Math.min(126, Math.round(value)));
}

/**
 * Parse a DCC-EX loco status broadcast `<l cab reg speedByte functMap>`.
 * Returns speed (0-126) and direction (forward: boolean), or null if not a match.
 */
export function parseLocoState(msg: string, cab: number): { speed: number, forward: boolean, f0: boolean } | null {
  const match = msg.match(/^<l\s+(\d+)\s+\d+\s+(\d+)\s+(\d+)/);
  if (!match) return null;

  const msgCab = parseInt(match[1], 10);
  if (msgCab !== cab) return null;

  const speedByte = parseInt(match[2], 10);
  const functMap = parseInt(match[3], 10);
  
  let speed = 0;
  let forward = true;

  if (speedByte >= 128) {
    forward = true;
    if (speedByte > 129) speed = speedByte - 129;
  } else {
    forward = false;
    if (speedByte > 1) speed = speedByte - 1;
  }

  const f0 = (functMap & 1) === 1;

  return { speed: clampSpeed(speed), forward, f0 };
}
