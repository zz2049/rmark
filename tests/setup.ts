import { vi } from 'vitest';

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  value: ResizeObserverStub,
  configurable: true,
});

Object.defineProperty(globalThis, 'requestAnimationFrame', {
  value: (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 0) as unknown as number,
  configurable: true,
});

Object.defineProperty(globalThis, 'cancelAnimationFrame', {
  value: (handle: number) => clearTimeout(handle),
  configurable: true,
});

Object.defineProperty(window, 'matchMedia', {
  value: vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
  configurable: true,
});
