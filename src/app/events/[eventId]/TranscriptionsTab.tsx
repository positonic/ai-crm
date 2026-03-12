"use client";

import { useState } from "react";
import {
  Stack,
  Title,
  Text,
  Button,
  Modal,
  TextInput,
  Textarea,
  Select,
  SegmentedControl,
  Table,
  Badge,
  Group,
  Paper,
  Loader,
  Center,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconFileText } from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface TranscriptionsTabProps {
  eventId: string;
}

export default function TranscriptionsTab({ eventId }: TranscriptionsTabProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [transcriptionType, setTranscriptionType] = useState("session");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");

  const utils = api.useUtils();

  const { data: transcriptions, isLoading } =
    api.transcription.getByEvent.useQuery({ eventId });

  const { data: schedule } = api.schedule.getEventSchedule.useQuery({
    eventId,
  });

  const createMutation = api.transcription.create.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Transcription added",
        message: "The transcription has been saved successfully.",
        color: "green",
      });
      void utils.transcription.getByEvent.invalidate({ eventId });
      resetForm();
      close();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const resetForm = () => {
    setTranscriptionType("session");
    setSessionId(null);
    setTitle("");
    setTranscript("");
    setNotes("");
  };

  const sessions = schedule?.sessions ?? [];

  const sessionOptions =
    sessions.map((s) => ({
      value: s.id,
      label: `${s.title} (${new Date(s.startTime).toLocaleDateString()})`,
    }));

  const sessionMap = new Map(sessions.map((s) => [s.id, s.title]));

  const handleSubmit = () => {
    if (!title.trim() || !transcript.trim()) return;
    if (transcriptionType === "session" && !sessionId) return;

    createMutation.mutate({
      eventId,
      sessionId: sessionId ?? undefined,
      title: title.trim(),
      transcript: transcript.trim(),
      notes: notes.trim() ? notes.trim() : undefined,
      transcriptionType: transcriptionType as "session" | "interview" | "other",
    });
  };

  const handleSessionChange = (value: string | null) => {
    setSessionId(value);
    if (value) {
      const sessionTitle = sessionMap.get(value);
      if (sessionTitle && !title) {
        setTitle(sessionTitle);
      }
    }
  };

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  return (
    <Paper p="xl" radius="md" withBorder>
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={3}>Transcriptions</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={open}>
            Add Transcription
          </Button>
        </Group>

        {transcriptions && transcriptions.length > 0 ? (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Title</Table.Th>
                <Table.Th>Session</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Source</Table.Th>
                <Table.Th>Uploaded By</Table.Th>
                <Table.Th>Date</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {transcriptions.map((t) => (
                <Table.Tr key={t.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <IconFileText size={16} />
                      <Text size="sm" fw={500}>
                        {t.title}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {t.sessionId
                        ? (sessionMap.get(t.sessionId) ?? "Unknown session")
                        : "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      size="sm"
                      color={
                        t.status === "COMPLETED"
                          ? "green"
                          : t.status === "FAILED"
                            ? "red"
                            : t.status === "PROCESSING"
                              ? "blue"
                              : "gray"
                      }
                    >
                      {t.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {t.source}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {t.uploadedBy?.name ?? "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Text c="dimmed" ta="center" py="xl">
            No transcriptions yet. Click &quot;Add Transcription&quot; to get
            started.
          </Text>
        )}
      </Stack>

      <Modal
        opened={opened}
        onClose={close}
        title="Add Transcription"
        size="lg"
      >
        <Stack gap="md">
          <SegmentedControl
            value={transcriptionType}
            onChange={setTranscriptionType}
            data={[
              { label: "Session", value: "session" },
              { label: "Interview", value: "interview" },
              { label: "Other", value: "other" },
            ]}
            fullWidth
          />

          {transcriptionType === "session" && (
            <Select
              label="Session"
              placeholder="Search for a session..."
              data={sessionOptions}
              value={sessionId}
              onChange={handleSessionChange}
              searchable
              clearable
              required
            />
          )}

          <TextInput
            label="Title"
            placeholder="Enter transcription title"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            required
          />

          <Textarea
            label="Transcript"
            placeholder="Paste or type the transcription content..."
            value={transcript}
            onChange={(e) => setTranscript(e.currentTarget.value)}
            minRows={8}
            autosize
            required
          />

          <Textarea
            label="Notes"
            placeholder="Optional notes about this transcription..."
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            minRows={3}
            autosize
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={createMutation.isPending}
              disabled={
                !title.trim() ||
                !transcript.trim() ||
                (transcriptionType === "session" && !sessionId)
              }
            >
              Save Transcription
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}
