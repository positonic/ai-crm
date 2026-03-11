import "@testing-library/jest-dom";
import { vi, beforeEach, afterEach } from "vitest";

// Setup DOM globals for testing
Object.defineProperty(global, "Element", {
  value: class Element {},
  configurable: true,
});

Object.defineProperty(global, "HTMLElement", {
  value: class HTMLElement extends Element {},
  configurable: true,
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = "0px";
  thresholds = [0];

  constructor() {
    /* Mock constructor */
  }
  disconnect() {
    /* Mock method */
  }
  observe() {
    /* Mock method */
  }
  unobserve() {
    /* Mock method */
  }
  takeRecords() {
    return [];
  }
};
// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {
    /* Mock constructor */
  }
  disconnect() {
    /* Mock method */
  }
  observe() {
    /* Mock method */
  }
  unobserve() {
    /* Mock method */
  }
};

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query as string,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock fetch for any API calls
global.fetch = vi.fn();

// Silence console errors in tests
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalError;
});
