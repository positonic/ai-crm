"use client";

import { useState } from "react";
import {
  Stack,
  Paper,
  Group,
  Avatar,
  Text,
  Slider,
  Button,
  Progress,
  Badge,
  Alert,
  Title,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

// Mock data for demo purposes
interface PraiseRecipient {
  id: string;
  name: string;
  email: string;
  image: string | null;
  praiseCount: number;
}

const MOCK_RECIPIENTS: PraiseRecipient[] = [
  {
    id: "1",
    name: "Jane Doe",
    email: "jane@example.com",
    image: null,
    praiseCount: 5,
  },
  {
    id: "2",
    name: "John Smith",
    email: "john@example.com",
    image: null,
    praiseCount: 3,
  },
  {
    id: "3",
    name: "Alice Johnson",
    email: "alice@example.com",
    image: null,
    praiseCount: 2,
  },
  {
    id: "4",
    name: "Bob Wilson",
    email: "bob@example.com",
    image: null,
    praiseCount: 4,
  },
  {
    id: "5",
    name: "Carol Martinez",
    email: "carol@example.com",
    image: null,
    praiseCount: 1,
  },
];

const TOTAL_POINTS = 100;

export function PraiseQuantifyPanel() {
  const recipients = MOCK_RECIPIENTS;

  // Initialize allocations with equal distribution
  const [allocations, setAllocations] = useState<Record<string, number>>(() => {
    const equalShare = Math.floor(TOTAL_POINTS / recipients.length);
    const remainder = TOTAL_POINTS % recipients.length;

    const initial: Record<string, number> = {};
    recipients.forEach((recipient, index) => {
      // Give remainder to first recipients
      initial[recipient.id] = equalShare + (index < remainder ? 1 : 0);
    });
    return initial;
  });

  // Calculate total allocated points
  const totalAllocated = Object.values(allocations).reduce(
    (sum, value) => sum + value,
    0,
  );
  const isValid = totalAllocated === TOTAL_POINTS;

  // Handle slider change with proportional redistribution
  const handleSliderChange = (recipientId: string, newValue: number) => {
    const oldValue = allocations[recipientId] ?? 0;
    const difference = newValue - oldValue;

    if (difference === 0) return;

    // Get all other recipients (excluding the one being changed)
    const otherRecipients = recipients.filter((r) => r.id !== recipientId);
    const otherTotal = otherRecipients.reduce(
      (sum, r) => sum + (allocations[r.id] ?? 0),
      0,
    );

    const newAllocations: Record<string, number> = { ...allocations };
    newAllocations[recipientId] = newValue;

    // Distribute the difference proportionally among others
    if (otherTotal > 0) {
      let remaining = -difference;

      otherRecipients.forEach((recipient, index) => {
        const currentValue = allocations[recipient.id] ?? 0;

        if (index === otherRecipients.length - 1) {
          // Last recipient gets the remainder to ensure total = 100
          newAllocations[recipient.id] = Math.max(0, currentValue + remaining);
        } else {
          // Proportional distribution
          const proportion = currentValue / otherTotal;
          const adjustment = Math.round(proportion * -difference);
          const adjusted = Math.max(0, currentValue + adjustment);
          newAllocations[recipient.id] = adjusted;
          remaining -= adjustment;
        }
      });
    }

    setAllocations(newAllocations);
  };

  const handleSave = () => {
    console.log("Saving allocations:", allocations);
    // TODO: Call tRPC mutation in Milestone 2
    alert("Allocations saved! (Demo mode - not persisted)");
  };

  const getProgressColor = () => {
    if (totalAllocated === TOTAL_POINTS) return "green";
    if (totalAllocated > TOTAL_POINTS) return "red";
    return "blue";
  };

  return (
    <Stack gap="lg">
      {/* Header */}
      <div>
        <Title order={3}>Quantify Your Praise</Title>
        <Text size="sm" c="dimmed" mt="xs">
          You have {TOTAL_POINTS} praise points to distribute across all the
          people you&apos;ve praised. Adjust the sliders to allocate more points
          to those whose contributions you value most.
        </Text>
      </div>

      {/* Info Alert */}
      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
        <Text size="sm">
          <strong>How it works:</strong> If you only praised 1 person, they get
          all 100 points. If you praised 10 people, each starts with 10 points.
          Increase points for one person to automatically decrease others
          proportionally.
        </Text>
      </Alert>

      {/* Progress Bar */}
      <Paper withBorder p="md">
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={500}>
            Total Points Allocated
          </Text>
          <Badge color={getProgressColor()} variant="filled" size="lg">
            {totalAllocated} / {TOTAL_POINTS}
          </Badge>
        </Group>
        <Progress
          value={(totalAllocated / TOTAL_POINTS) * 100}
          color={getProgressColor()}
          size="xl"
          animated={!isValid}
        />
        {!isValid && (
          <Text
            size="xs"
            c={totalAllocated > TOTAL_POINTS ? "red" : "orange"}
            mt="xs"
          >
            {totalAllocated > TOTAL_POINTS
              ? `You've allocated ${totalAllocated - TOTAL_POINTS} too many points`
              : `You have ${TOTAL_POINTS - totalAllocated} unallocated points`}
          </Text>
        )}
      </Paper>

      {/* Recipient Sliders */}
      <Stack gap="md">
        {recipients.map((recipient) => {
          const points = allocations[recipient.id] ?? 0;

          return (
            <Paper key={recipient.id} withBorder p="md">
              <Stack gap="md">
                {/* Recipient Info */}
                <Group justify="space-between">
                  <Group>
                    <Avatar
                      src={recipient.image}
                      alt={recipient.name}
                      radius="xl"
                      size="md"
                    />
                    <div>
                      <Text fw={500}>{recipient.name}</Text>
                      <Text size="xs" c="dimmed">
                        {recipient.praiseCount} praise
                        {recipient.praiseCount !== 1 ? "s" : ""} sent
                      </Text>
                    </div>
                  </Group>
                  <Badge size="lg" variant="light" color="blue">
                    {points} points
                  </Badge>
                </Group>

                {/* Slider */}
                <Slider
                  value={points}
                  onChange={(value) => handleSliderChange(recipient.id, value)}
                  min={0}
                  max={TOTAL_POINTS}
                  step={1}
                  label={(value) => `${value} points`}
                  marks={[
                    { value: 0, label: "0" },
                    { value: 25, label: "25" },
                    { value: 50, label: "50" },
                    { value: 75, label: "75" },
                    { value: 100, label: "100" },
                  ]}
                  styles={{
                    markLabel: { fontSize: "10px" },
                  }}
                />
              </Stack>
            </Paper>
          );
        })}
      </Stack>

      {/* Save Button */}
      <Group justify="flex-end">
        <Button
          size="lg"
          disabled={!isValid}
          onClick={handleSave}
          variant="filled"
        >
          Save Allocations ({totalAllocated}/{TOTAL_POINTS} points)
        </Button>
      </Group>
    </Stack>
  );
}
