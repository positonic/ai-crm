"use client";

import { useRef, useEffect, useCallback } from "react";

export interface ConsoleEntry {
  level: "error" | "warn";
  message: string;
  timestamp: string;
}

/**
 * Intercepts console.error and console.warn, storing the last N entries
 * in a ring buffer for bug report capture. Uses useRef to avoid re-renders.
 */
export function useConsoleCapture(maxEntries = 50) {
  const entriesRef = useRef<ConsoleEntry[]>([]);

  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;

    const stringify = (args: unknown[]): string => {
      return args
        .map((a) => {
          if (typeof a === "string") return a;
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        })
        .join(" ");
    };

    console.error = (...args: unknown[]) => {
      entriesRef.current.push({
        level: "error",
        message: stringify(args).slice(0, 2000),
        timestamp: new Date().toISOString(),
      });
      if (entriesRef.current.length > maxEntries) {
        entriesRef.current = entriesRef.current.slice(-maxEntries);
      }
      originalError.apply(console, args);
    };

    console.warn = (...args: unknown[]) => {
      entriesRef.current.push({
        level: "warn",
        message: stringify(args).slice(0, 2000),
        timestamp: new Date().toISOString(),
      });
      if (entriesRef.current.length > maxEntries) {
        entriesRef.current = entriesRef.current.slice(-maxEntries);
      }
      originalWarn.apply(console, args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [maxEntries]);

  const getEntries = useCallback(() => [...entriesRef.current], []);
  const clearEntries = useCallback(() => {
    entriesRef.current = [];
  }, []);

  return { getEntries, clearEntries };
}
