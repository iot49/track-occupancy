import { describe, it, expect } from 'vitest';
import { throttleCmd, functionCmd, statusCmd, estopCmd, clampSpeed, powerOnCmd, powerOffCmd, parsePowerState } from '../src/dcc-commands.js';

describe('dcc-commands', () => {
  describe('throttleCmd', () => {
    it('builds a forward speed command', () => {
      expect(throttleCmd(10, 50, true)).toBe('<t 10 50 1>');
    });

    it('builds a reverse speed command', () => {
      expect(throttleCmd(3, 100, false)).toBe('<t 3 100 0>');
    });

    it('builds a stop command (speed 0)', () => {
      expect(throttleCmd(10, 0, true)).toBe('<t 10 0 1>');
    });
  });

  describe('functionCmd', () => {
    it('turns headlight on', () => {
      expect(functionCmd(10, 0, true)).toBe('<F 10 0 1>');
    });

    it('turns headlight off', () => {
      expect(functionCmd(10, 0, false)).toBe('<F 10 0 0>');
    });

    it('toggles arbitrary function', () => {
      expect(functionCmd(5, 3, true)).toBe('<F 5 3 1>');
    });
  });

  describe('statusCmd', () => {
    it('returns status request', () => {
      expect(statusCmd()).toBe('<s>');
    });
  });

  describe('estopCmd', () => {
    it('sends speed -1 for emergency stop', () => {
      expect(estopCmd(10, true)).toBe('<t 10 -1 1>');
    });
  });

  describe('clampSpeed', () => {
    it('clamps negative to 0', () => {
      expect(clampSpeed(-5)).toBe(0);
    });

    it('clamps above 126 to 126', () => {
      expect(clampSpeed(200)).toBe(126);
    });

    it('rounds fractional values', () => {
      expect(clampSpeed(50.7)).toBe(51);
    });

    it('passes through valid values', () => {
      expect(clampSpeed(63)).toBe(63);
    });
  });

  describe('powerOnCmd', () => {
    it('returns <1>', () => {
      expect(powerOnCmd()).toBe('<1>');
    });
  });

  describe('powerOffCmd', () => {
    it('returns <0>', () => {
      expect(powerOffCmd()).toBe('<0>');
    });
  });

  describe('parsePowerState', () => {
    it('returns true for <p1>', () => {
      expect(parsePowerState('<p1>')).toBe(true);
    });

    it('returns true for <p1 A>', () => {
      expect(parsePowerState('<p1 A>')).toBe(true);
    });

    it('returns true for <p1 JOIN>', () => {
      expect(parsePowerState('<p1 JOIN>')).toBe(true);
    });

    it('returns false for <p0>', () => {
      expect(parsePowerState('<p0>')).toBe(false);
    });

    it('returns null for unrelated messages', () => {
      expect(parsePowerState('<c CurrentMAIN 6 C Milli 0 2498 1 2498>')).toBeNull();
      expect(parsePowerState('<s>')).toBeNull();
    });
  });
});
