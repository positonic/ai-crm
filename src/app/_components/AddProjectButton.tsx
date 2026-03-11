"use client";

import { Button, type ButtonProps } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import Link from "next/link";

interface AddProjectButtonProps
  extends Omit<ButtonProps, "component" | "onClick"> {
  /** The text to display on the button */
  children: React.ReactNode;
  /** When provided, button links to profile edit page with event context */
  eventId?: string;
  /** When provided, button triggers this callback (for modal opening, etc.) */
  onClick?: () => void;
  /** Icon size */
  iconSize?: number;
}

export function AddProjectButton({
  children,
  eventId,
  onClick,
  iconSize = 16,
  variant = "light",
  leftSection,
  ...props
}: AddProjectButtonProps) {
  const buttonContent = {
    leftSection: leftSection ?? <IconPlus size={iconSize} />,
    variant,
    ...props,
    children,
  };

  // If onClick is provided, render as regular button with onClick (prioritize modal behavior)
  if (onClick) {
    return <Button onClick={onClick} {...buttonContent} />;
  }

  // If eventId is provided (and no onClick), render as Link to profile edit
  if (eventId) {
    return (
      <Button
        component={Link}
        href={`/profile/edit?from-event=${eventId}`}
        {...buttonContent}
      />
    );
  }

  // Fallback: render as disabled button
  return <Button disabled {...buttonContent} />;
}
