"use client";

import { ActionIcon, Tooltip } from "@mantine/core";
import { IconSun, IconMoon } from "@tabler/icons-react";
import { useThemeContext } from "./ThemeProvider";

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useThemeContext();

  const isDark = resolvedTheme === "dark";

  return (
    <Tooltip
      label={`Switch to ${isDark ? "light" : "dark"} mode`}
      position="left"
      offset={16}
    >
      <ActionIcon
        onClick={toggleTheme}
        size="xl"
        radius="xl"
        variant="filled"
        color={isDark ? "yellow" : "dark"}
        className="theme-toggle-btn"
        style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          zIndex: 999,
          transition: "all 200ms ease",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        }}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      >
        {isDark ? (
          <IconSun size={24} stroke={1.5} />
        ) : (
          <IconMoon size={24} stroke={1.5} />
        )}
      </ActionIcon>
    </Tooltip>
  );
}
