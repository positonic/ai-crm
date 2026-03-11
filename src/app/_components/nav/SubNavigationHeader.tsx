"use client";

import { Text, Group } from "@mantine/core";

interface SubNavigationHeaderProps {
  title: string;
}

export function SubNavigationHeader({ title }: SubNavigationHeaderProps) {
  return (
    <Group
      gap="xs"
      className="px-8 py-2 border-b border-gray-200 bg-gray-50/50"
    >
      <Text
        size="xs"
        fw={600}
        c="dimmed"
        tt="uppercase"
        className="tracking-wide"
      >
        {title}
      </Text>
    </Group>
  );
}
