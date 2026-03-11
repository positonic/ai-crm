"use client";

import { useState, useRef, useEffect } from "react";
import {
  TextInput,
  Paper,
  Group,
  Avatar,
  Text,
  Stack,
  Loader,
} from "@mantine/core";
import { api } from "~/trpc/react";
import { IconSearch } from "@tabler/icons-react";
import { getDisplayName } from "~/utils/userDisplay";

interface User {
  id: string;
  firstName?: string | null;
  surname?: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface UserSearchSelectProps {
  onSelect: (user: User) => void;
  excludeUserIds?: string[];
  placeholder?: string;
}

export function UserSearchSelect({
  onSelect,
  excludeUserIds = [],
  placeholder = "Search users...",
}: UserSearchSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: searchResults, isLoading } = api.user.searchUsers.useQuery(
    { query: searchQuery, limit: 10 },
    { enabled: searchQuery.length > 0 },
  );

  // Filter out excluded users
  const filteredResults =
    searchResults?.filter((user) => !excludeUserIds.includes(user.id)) ?? [];

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredResults.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredResults.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredResults.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleSelect(filteredResults[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (user: User) => {
    onSelect(user);
    setSearchQuery("");
    setIsOpen(false);
    setSelectedIndex(0);
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setIsOpen(value.length > 0);
    setSelectedIndex(0);
  };

  return (
    <div style={{ position: "relative" }}>
      <TextInput
        ref={inputRef}
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => handleInputChange(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => searchQuery.length > 0 && setIsOpen(true)}
        leftSection={<IconSearch size={16} />}
        rightSection={isLoading ? <Loader size="xs" /> : null}
      />

      {isOpen && searchQuery.length > 0 && (
        <Paper
          ref={dropdownRef}
          shadow="md"
          p="xs"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {isLoading ? (
            <Group justify="center" p="md">
              <Loader size="sm" />
            </Group>
          ) : filteredResults.length > 0 ? (
            <Stack gap="xs">
              {filteredResults.map((user, index) => (
                <Paper
                  key={user.id}
                  p="xs"
                  style={{
                    cursor: "pointer",
                    backgroundColor:
                      index === selectedIndex
                        ? "var(--mantine-color-gray-1)"
                        : "transparent",
                  }}
                  onClick={() => handleSelect(user)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <Group gap="sm">
                    <Avatar
                      src={user.image}
                      alt={getDisplayName(user, "User")}
                      size="sm"
                    />
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fw={500}>
                        {getDisplayName(user, "Unknown")}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {user.email}
                      </Text>
                    </div>
                  </Group>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed" ta="center" p="md">
              No users found
            </Text>
          )}
        </Paper>
      )}
    </div>
  );
}
