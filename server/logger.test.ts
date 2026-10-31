import { describe, expect, it, vi } from 'vitest';
import { consoleLogger, silentLogger } from './logger';

describe('loggers', () => {
  it('consoleLogger writes each level to the matching console method', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    consoleLogger.info('a');
    consoleLogger.warn('b');
    consoleLogger.error('c');

    expect(info).toHaveBeenCalledWith('a');
    expect(warn).toHaveBeenCalledWith('b');
    expect(error).toHaveBeenCalledWith('c');
  });

  it('silentLogger writes nothing', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    silentLogger.error('hidden');
    silentLogger.info('hidden');
    silentLogger.warn('hidden');
    expect(spy).not.toHaveBeenCalled();
  });
});
