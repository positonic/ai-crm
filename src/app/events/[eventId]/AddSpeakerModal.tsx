"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Modal,
  TextInput,
  Textarea,
  Select,
  MultiSelect,
  Checkbox,
  Stack,
  Group,
  Button,
  Text,
  Badge,
  Alert,
  Image,
  FileInput,
  Divider,
  ActionIcon,
} from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconPhoto, IconAlertCircle, IconTrash } from "@tabler/icons-react";
import { z } from "zod";
import { api } from "~/trpc/react";
import {
  talkFormatOptions,
  talkDurationOptions,
  ftcTopicOptions,
} from "./apply/SpeakerApplicationForm";

const formSchema = z.object({
  email: z.string().email("Valid email is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  talkTitle: z.string().min(1, "Session name is required").max(200),
  talkAbstract: z
    .string()
    .min(50, "Description must be at least 50 characters")
    .max(2000),
  talkFormat: z
    .array(z.string())
    .min(1, "Please select at least one session type"),
  talkDuration: z.string().min(1, "Session length is required"),
  talkTopic: z.string().min(1, "Topic is required"),
  entityName: z.string().max(200).optional().or(z.literal("")),
  bio: z.string().min(20, "Bio must be at least 20 characters").max(1000),
  jobTitle: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  previousSpeakingExperience: z.string().max(2000).optional(),
  website: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  pastTalkUrl: z.string().url().optional().or(z.literal("")),
});

interface AddSpeakerModalProps {
  eventId: string;
  opened: boolean;
  onClose: () => void;
}

export function AddSpeakerModal({
  eventId,
  opened,
  onClose,
}: AddSpeakerModalProps) {
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>([]);
  const [headshotUrl, setHeadshotUrl] = useState<string | null>(null);
  const [headshotFileName, setHeadshotFileName] = useState<string | null>(null);
  const [headshotFile, setHeadshotFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [existingUser, setExistingUser] = useState<{
    id: string;
    name: string | null;
    email: string | null;
  } | null>(null);
  const [emailChecked, setEmailChecked] = useState(false);
  const [ftcTopicValues, setFtcTopicValues] = useState<string[]>([]);
  const [ftcTopicOtherText, setFtcTopicOtherText] = useState("");

  const utils = api.useUtils();

  // Fetch floor lead's venues
  const { data: floorsData } = api.schedule.getMyFloors.useQuery(
    { eventId },
    { enabled: opened },
  );
  const venueIdKey = floorsData?.venues?.map((v) => v.id).join(",") ?? "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const venues = useMemo(() => floorsData?.venues ?? [], [venueIdKey]);

  // Fetch schedule filters for session types
  const { data: scheduleFilters } =
    api.schedule.getEventScheduleFilters.useQuery(
      { eventId },
      { enabled: opened },
    );

  // Pre-select floor lead's venues on first load
  const [venuesInitialized, setVenuesInitialized] = useState(false);
  if (
    venues.length > 0 &&
    !venuesInitialized &&
    selectedVenueIds.length === 0
  ) {
    setSelectedVenueIds(venues.map((v) => v.id));
    setVenuesInitialized(true);
  }

  // Check if any selected venue is a "Funding the Commons" floor
  const isFtcVenue = useMemo(() => {
    if (selectedVenueIds.length === 0) return false;
    return venues.some(
      (v) =>
        selectedVenueIds.includes(v.id) &&
        v.name.toLowerCase().includes("funding the commons"),
    );
  }, [selectedVenueIds, venues]);

  // Sync FtC multi-select topic values into the form's talkTopic string field
  useEffect(() => {
    if (!isFtcVenue) return;
    const topics = ftcTopicValues.filter((v) => v !== "Other");
    if (ftcTopicValues.includes("Other") && ftcTopicOtherText.trim()) {
      topics.push(`Other: ${ftcTopicOtherText.trim()}`);
    } else if (ftcTopicValues.includes("Other")) {
      topics.push("Other");
    }
    form.setFieldValue("talkTopic", topics.join(", "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFtcVenue, ftcTopicValues, ftcTopicOtherText]);

  const createSpeakerMutation =
    api.application.createSpeakerOnBehalf.useMutation({
      onSuccess: () => {
        notifications.show({
          title: "Speaker added",
          message: "Speaker application created successfully",
          color: "green",
        });
        void utils.application.invalidate();
        handleClose();
      },
      onError: (error) => {
        notifications.show({
          title: "Error",
          message: error.message,
          color: "red",
        });
      },
    });

  const form = useForm({
    initialValues: {
      email: "",
      firstName: "",
      lastName: "",
      talkTitle: "",
      talkAbstract: "",
      talkFormat: [] as string[],
      talkDuration: "",
      talkTopic: "",
      entityName: "",
      bio: "",
      jobTitle: "",
      company: "",
      previousSpeakingExperience: "",
      website: "",
      linkedinUrl: "",
      twitterUrl: "",
      pastTalkUrl: "",
    },
    validate: zodResolver(formSchema),
  });

  const handleClose = () => {
    form.reset();
    setSelectedVenueIds([]);
    setHeadshotUrl(null);
    setHeadshotFileName(null);
    setHeadshotFile(null);
    setExistingUser(null);
    setEmailChecked(false);
    setVenuesInitialized(false);
    setFtcTopicValues([]);
    setFtcTopicOtherText("");
    onClose();
  };

  const handleEmailBlur = async () => {
    const email = form.values.email.trim();
    if (!email || form.errors.email) {
      setExistingUser(null);
      setEmailChecked(false);
      return;
    }

    try {
      const results = await utils.user.searchUsers.fetch({
        query: email,
        limit: 1,
      });
      const match = results.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase(),
      );
      if (match) {
        setExistingUser({ id: match.id, name: match.name, email: match.email });
        // Pre-populate name fields from existing user
        if (match.firstName && !form.values.firstName) {
          form.setFieldValue("firstName", match.firstName);
        }
        if (match.surname && !form.values.lastName) {
          form.setFieldValue("lastName", match.surname);
        }
      } else {
        setExistingUser(null);
      }
      setEmailChecked(true);
    } catch {
      setExistingUser(null);
      setEmailChecked(true);
    }
  };

  const handleHeadshotUpload = async (file: File | null) => {
    if (!file) {
      setHeadshotFile(null);
      return;
    }

    setIsUploading(true);
    setHeadshotFile(file);
    try {
      const formData = new FormData();
      formData.append("headshot", file);

      const response = await fetch("/api/upload/headshot", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        success?: boolean;
        headshotUrl?: string;
        fileName?: string;
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Upload failed");
      }

      setHeadshotUrl(data.headshotUrl ?? null);
      setHeadshotFileName(data.fileName ?? file.name);
      notifications.show({
        title: "Headshot uploaded",
        message: "Image uploaded successfully",
        color: "green",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      notifications.show({
        title: "Upload failed",
        message,
        color: "red",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveHeadshot = () => {
    setHeadshotUrl(null);
    setHeadshotFileName(null);
    setHeadshotFile(null);
  };

  const handleSubmit = (values: typeof form.values) => {
    createSpeakerMutation.mutate({
      eventId,
      email: values.email.trim(),
      firstName: values.firstName.trim(),
      lastName: values.lastName?.trim() || undefined,
      talkTitle: values.talkTitle.trim(),
      talkAbstract: values.talkAbstract.trim(),
      talkFormat: values.talkFormat.join(", "),
      talkDuration: values.talkDuration,
      talkTopic: values.talkTopic.trim(),
      speakerEntityName: values.entityName?.trim() || undefined,
      venueIds: selectedVenueIds.length > 0 ? selectedVenueIds : undefined,
      bio: values.bio.trim(),
      jobTitle: values.jobTitle?.trim() || undefined,
      company: values.company?.trim() || undefined,
      previousSpeakingExperience:
        values.previousSpeakingExperience?.trim() || undefined,
      website: values.website?.trim() || undefined,
      linkedinUrl: values.linkedinUrl?.trim() || undefined,
      twitterUrl: values.twitterUrl?.trim() || undefined,
      pastTalkUrl: values.pastTalkUrl?.trim() || undefined,
      headshotUrl: headshotUrl ?? undefined,
      headshotFileName: headshotFileName ?? undefined,
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Add Speaker on Behalf"
      size="xl"
      closeOnClickOutside={false}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {/* Speaker Identity */}
          <Text fw={600} size="sm">
            Speaker Identity
          </Text>
          <TextInput
            label="Email"
            placeholder="speaker@example.com"
            required
            {...form.getInputProps("email")}
            onBlur={() => {
              form.validateField("email");
              void handleEmailBlur();
            }}
          />
          {emailChecked && existingUser && (
            <Alert color="blue" variant="light">
              <Group gap="xs">
                <Badge color="blue" size="sm">
                  Existing user
                </Badge>
                <Text size="sm">{existingUser.name ?? existingUser.email}</Text>
              </Group>
            </Alert>
          )}
          {emailChecked &&
            !existingUser &&
            form.values.email &&
            !form.errors.email && (
              <Alert
                color="yellow"
                variant="light"
                icon={<IconAlertCircle size={16} />}
              >
                <Text size="sm">
                  No account found. A new account will be created for this
                  speaker.
                </Text>
              </Alert>
            )}
          <Group grow>
            <TextInput
              label="First Name"
              placeholder="Jane"
              description="Write whatever name you prefer to go by in public"
              required
              {...form.getInputProps("firstName")}
            />
            <TextInput
              label="Last Name"
              placeholder="Doe"
              {...form.getInputProps("lastName")}
            />
          </Group>

          <Divider label="Session Details" labelPosition="center" />

          <TextInput
            label="Session Name"
            placeholder="Enter the session name"
            required
            maxLength={200}
            {...form.getInputProps("talkTitle")}
          />
          <TextInput
            label="Name of Artist, Entity, or Group"
            placeholder="Enter the name as it should appear in scheduling"
            description="If different from the speaker's name"
            maxLength={200}
            {...form.getInputProps("entityName")}
          />
          <Textarea
            label="Session Description"
            placeholder="Describe the session (min 50 characters)"
            required
            minRows={3}
            maxLength={2000}
            {...form.getInputProps("talkAbstract")}
          />
          <Group grow>
            <MultiSelect
              label="Session Type"
              placeholder="Select session types"
              description="Select the type of session you may be interested in"
              data={
                (scheduleFilters?.sessionTypes ?? []).length > 0
                  ? (scheduleFilters?.sessionTypes ?? []).map(
                      (st: { name: string }) => ({
                        value: st.name,
                        label: st.name,
                      }),
                    )
                  : talkFormatOptions
              }
              required
              {...form.getInputProps("talkFormat")}
            />
            <Select
              label="Session Length"
              placeholder="Select session length"
              data={talkDurationOptions}
              required
              {...form.getInputProps("talkDuration")}
            />
          </Group>
          {isFtcVenue ? (
            <>
              <MultiSelect
                label="Topic / Track"
                placeholder="Select topics that apply"
                description="Please select which of the following topics your proposed session fits into"
                data={ftcTopicOptions}
                value={ftcTopicValues}
                onChange={setFtcTopicValues}
                required
                error={form.errors.talkTopic}
              />
              {ftcTopicValues.includes("Other") && (
                <TextInput
                  label="Other topic (please specify)"
                  placeholder="Describe your topic"
                  value={ftcTopicOtherText}
                  onChange={(e) => setFtcTopicOtherText(e.currentTarget.value)}
                  required
                />
              )}
            </>
          ) : (
            <TextInput
              label="Topic / Track"
              placeholder="e.g. AI Safety, Blockchain, etc."
              required
              {...form.getInputProps("talkTopic")}
            />
          )}

          {venues.length > 0 && (
            <Checkbox.Group
              label="Floor / Venue Selection"
              description="Select which floors this speaker should present on"
              value={selectedVenueIds}
              onChange={setSelectedVenueIds}
            >
              <Stack gap="xs" mt="xs">
                {venues.map((venue) => (
                  <Checkbox
                    key={venue.id}
                    value={venue.id}
                    label={venue.name}
                  />
                ))}
              </Stack>
            </Checkbox.Group>
          )}

          <Divider label="Speaker Profile" labelPosition="center" />

          <Group grow>
            <TextInput
              label="Job Title"
              placeholder="e.g. Software Engineer"
              maxLength={100}
              {...form.getInputProps("jobTitle")}
            />
            <TextInput
              label="Organization"
              placeholder="e.g. Acme Corp"
              maxLength={100}
              {...form.getInputProps("company")}
            />
          </Group>
          <Textarea
            label="Speaker Bio"
            placeholder="Speaker biography (min 20 characters)"
            required
            minRows={3}
            maxLength={1000}
            {...form.getInputProps("bio")}
          />
          <Textarea
            label="Previous Speaking Experience"
            placeholder="Any previous speaking experience (optional)"
            minRows={2}
            maxLength={2000}
            {...form.getInputProps("previousSpeakingExperience")}
          />

          <Divider label="Headshot" labelPosition="center" />

          {headshotUrl ? (
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Speaker Headshot
              </Text>
              <Group>
                <Image
                  src={headshotUrl}
                  alt="Speaker headshot"
                  w={80}
                  h={80}
                  radius="md"
                  fit="cover"
                />
                <Stack gap={4}>
                  <Text size="xs" c="green">
                    Uploaded: {headshotFileName}
                  </Text>
                  <Group gap="xs">
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconPhoto size={14} />}
                      onClick={handleRemoveHeadshot}
                    >
                      Replace
                    </Button>
                    <ActionIcon
                      size="sm"
                      variant="light"
                      color="red"
                      onClick={handleRemoveHeadshot}
                      title="Remove headshot"
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Stack>
              </Group>
            </Stack>
          ) : (
            <>
              <FileInput
                label="Speaker Headshot"
                placeholder="Upload headshot image"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                description="JPG, PNG, GIF, or WebP (max 5MB)"
                leftSection={<IconPhoto size={16} />}
                value={headshotFile}
                onChange={(file) => void handleHeadshotUpload(file)}
                disabled={isUploading}
              />
              {isUploading && (
                <Text size="xs" c="dimmed">
                  Uploading...
                </Text>
              )}
            </>
          )}

          <Divider label="Links (Optional)" labelPosition="center" />

          <Group grow>
            <TextInput
              label="Website"
              placeholder="https://example.com"
              {...form.getInputProps("website")}
            />
            <TextInput
              label="LinkedIn"
              placeholder="https://linkedin.com/in/..."
              {...form.getInputProps("linkedinUrl")}
            />
          </Group>
          <Group grow>
            <TextInput
              label="Twitter / X"
              placeholder="https://x.com/..."
              {...form.getInputProps("twitterUrl")}
            />
            <TextInput
              label="Past Talk Recording"
              placeholder="https://youtube.com/..."
              {...form.getInputProps("pastTalkUrl")}
            />
          </Group>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createSpeakerMutation.isPending}>
              Add Speaker
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
