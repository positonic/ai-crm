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
  Divider,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";

// Mock data for individual praise instances
interface PraiseInstance {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  recipientImage: string | null;
  message: string;
  createdAt: Date;
}

const MOCK_PRAISE_INSTANCES: PraiseInstance[] = [
  {
    id: "p1",
    recipientId: "1",
    recipientName: "Jane Doe",
    recipientEmail: "jane@example.com",
    recipientImage: null,
    message:
      "Amazing presentation on AI ethics! Really opened my eyes to new perspectives.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
  },
  {
    id: "p2",
    recipientId: "2",
    recipientName: "John Smith",
    recipientEmail: "john@example.com",
    recipientImage: null,
    message: "Thanks for helping me debug that tricky authentication issue!",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
  },
  {
    id: "p3",
    recipientId: "1",
    recipientName: "Jane Doe",
    recipientEmail: "jane@example.com",
    recipientImage: null,
    message: "Your workshop on design systems was incredibly valuable.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
  },
  {
    id: "p4",
    recipientId: "3",
    recipientName: "Alice Johnson",
    recipientEmail: "alice@example.com",
    recipientImage: null,
    message: "Great insights during the product review meeting!",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10), // 10 days ago
  },
  {
    id: "p5",
    recipientId: "4",
    recipientName: "Bob Wilson",
    recipientEmail: "bob@example.com",
    recipientImage: null,
    message: "Love your energy and positivity in all our team discussions!",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12), // 12 days ago
  },
  {
    id: "p6",
    recipientId: "2",
    recipientName: "John Smith",
    recipientEmail: "john@example.com",
    recipientImage: null,
    message: "Your code review feedback made my implementation so much better.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14), // 14 days ago
  },
  {
    id: "p7",
    recipientId: "1",
    recipientName: "Jane Doe",
    recipientEmail: "jane@example.com",
    recipientImage: null,
    message: "Thank you for mentoring me on the project architecture!",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15), // 15 days ago
  },
  {
    id: "p8",
    recipientId: "4",
    recipientName: "Bob Wilson",
    recipientEmail: "bob@example.com",
    recipientImage: null,
    message:
      "Really appreciate you organizing those social events. Makes the team feel connected!",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18), // 18 days ago
  },
];

const TOTAL_POINTS = 100;

export function PraiseInstanceQuantifyPanel() {
  const instances = MOCK_PRAISE_INSTANCES;

  // Initialize allocations with equal distribution
  const [allocations, setAllocations] = useState<Record<string, number>>(() => {
    const equalShare = Math.floor(TOTAL_POINTS / instances.length);
    const remainder = TOTAL_POINTS % instances.length;

    const initial: Record<string, number> = {};
    instances.forEach((instance, index) => {
      // Give remainder to first instances
      initial[instance.id] = equalShare + (index < remainder ? 1 : 0);
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
  const handleSliderChange = (instanceId: string, newValue: number) => {
    const oldValue = allocations[instanceId] ?? 0;
    const difference = newValue - oldValue;

    if (difference === 0) return;

    // Get all other instances (excluding the one being changed)
    const otherInstances = instances.filter((i) => i.id !== instanceId);
    const otherTotal = otherInstances.reduce(
      (sum, i) => sum + (allocations[i.id] ?? 0),
      0,
    );

    const newAllocations: Record<string, number> = { ...allocations };
    newAllocations[instanceId] = newValue;

    // Distribute the difference proportionally among others
    if (otherTotal > 0) {
      let remaining = -difference;

      otherInstances.forEach((instance, index) => {
        const currentValue = allocations[instance.id] ?? 0;

        if (index === otherInstances.length - 1) {
          // Last instance gets the remainder to ensure total = 100
          newAllocations[instance.id] = Math.max(0, currentValue + remaining);
        } else {
          // Proportional distribution
          const proportion = currentValue / otherTotal;
          const adjustment = Math.round(proportion * -difference);
          const adjusted = Math.max(0, currentValue + adjustment);
          newAllocations[instance.id] = adjusted;
          remaining -= adjustment;
        }
      });
    }

    setAllocations(newAllocations);
  };

  const handleSave = () => {
    console.log("Saving instance allocations:", allocations);
    // TODO: Call tRPC mutation in Milestone 2
    alert("Instance allocations saved! (Demo mode - not persisted)");
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
        <Title order={3}>Quantify Each Praise Instance</Title>
        <Text size="sm" c="dimmed" mt="xs">
          Allocate your {TOTAL_POINTS} praise points across each individual
          praise you&apos;ve sent. This allows you to weight specific moments of
          impact differently.
        </Text>
      </div>

      {/* Info Alert */}
      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
        <Text size="sm">
          <strong>Instance-level quantification:</strong> Each praise message
          you sent can be weighted independently. Use this to emphasize
          particularly impactful moments or contributions.
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

      {/* Praise Instance Sliders */}
      <Stack gap="md">
        {instances.map((instance) => {
          const points = allocations[instance.id] ?? 0;

          return (
            <Paper key={instance.id} withBorder p="md">
              <Stack gap="md">
                {/* Recipient Info & Timestamp */}
                <Group justify="space-between">
                  <Group>
                    <Avatar
                      src={instance.recipientImage}
                      alt={instance.recipientName}
                      radius="xl"
                      size="md"
                    />
                    <div>
                      <Text fw={500}>{instance.recipientName}</Text>
                      <Text size="xs" c="dimmed">
                        {formatDistanceToNow(instance.createdAt, {
                          addSuffix: true,
                        })}
                      </Text>
                    </div>
                  </Group>
                  <Badge size="lg" variant="light" color="blue">
                    {points} points
                  </Badge>
                </Group>

                {/* Praise Message */}
                <Paper p="sm" bg="gray.0" style={{ borderRadius: 8 }}>
                  <Text size="sm" style={{ fontStyle: "italic" }}>
                    &quot;{instance.message}&quot;
                  </Text>
                </Paper>

                <Divider />

                {/* Slider */}
                <div>
                  <Text size="xs" c="dimmed" mb="xs">
                    Allocate points for this specific praise
                  </Text>
                  <Slider
                    value={points}
                    onChange={(value) => handleSliderChange(instance.id, value)}
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
                </div>
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
