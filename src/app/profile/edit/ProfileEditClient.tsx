"use client";

import { useState, useEffect } from "react";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";
import {
  Container,
  Title,
  TextInput,
  Textarea,
  NumberInput,
  Button,
  Group,
  Stack,
  Grid,
  Switch,
  TagsInput,
  Select,
  Loader,
  Box,
  Card,
  Text,
  Modal,
  Badge,
  Checkbox,
  Divider,
  FileInput,
  Avatar,
  Progress,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconX,
  IconArrowLeft,
  IconDownload,
  IconEye,
  IconWallet,
  IconTrash,
  IconStar,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ProjectManager } from "~/app/_components/ProjectManager";
import { getAvatarUrl, getAvatarInitials } from "~/utils/avatarUtils";

const schema = z.object({
  preferredName: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
  jobTitle: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  skills: z.array(z.string().max(50)).max(20).optional(),
  interests: z.array(z.string().max(50)).max(20).optional(),
  availableForMentoring: z.boolean().optional(),
  availableForHiring: z.boolean().optional(),
  availableForOfficeHours: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  timezone: z.string().max(50).optional(),
  languages: z.array(z.string().max(50)).max(10).optional(),
  yearsOfExperience: z.number().min(0).max(50).optional(),
  telegramHandle: z.string().max(100).optional(),
  discordHandle: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  // Speaker details
  speakerTalkTitle: z.string().max(200).optional(),
  speakerTalkAbstract: z.string().max(2000).optional(),
  speakerTalkFormat: z.string().max(200).optional(),
  speakerTalkDuration: z.string().max(50).optional(),
  speakerTalkTopic: z.string().max(500).optional(),
  speakerPreviousExperience: z.string().max(2000).optional(),
  speakerPastTalkUrl: z.string().url().optional().or(z.literal("")),
  speakerEntityName: z.string().max(200).optional(),
  speakerOtherFloorsTopicTheme: z.string().max(2000).optional(),
  speakerDisplayPreference: z.string().max(500).optional(),
  speakerCoHostInfo: z.string().max(2000).optional(),
});

type ProfileFormData = z.infer<typeof schema>;

// NOTE: All fields are currently optional per Zod validation schemas
// If required fields are added in the future, add red asterisk indicators here

const timezoneOptions = [
  // UTC
  { value: "UTC", label: "UTC" },

  // Americas
  { value: "America/New_York", label: "New York (ET)" },
  { value: "America/Chicago", label: "Chicago (CT)" },
  { value: "America/Denver", label: "Denver (MT)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PT)" },
  { value: "America/Anchorage", label: "Anchorage (AKT)" },
  { value: "America/Phoenix", label: "Phoenix (MST)" },
  { value: "America/Toronto", label: "Toronto (ET)" },
  { value: "America/Vancouver", label: "Vancouver (PT)" },
  { value: "America/Mexico_City", label: "Mexico City (CST)" },
  { value: "America/Sao_Paulo", label: "São Paulo (BRT)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (ART)" },
  { value: "America/Lima", label: "Lima (PET)" },
  { value: "America/Bogota", label: "Bogotá (COT)" },
  { value: "America/Caracas", label: "Caracas (VET)" },

  // Europe
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Europe/Rome", label: "Rome (CET)" },
  { value: "Europe/Madrid", label: "Madrid (CET)" },
  { value: "Europe/Amsterdam", label: "Amsterdam (CET)" },
  { value: "Europe/Zurich", label: "Zurich (CET)" },
  { value: "Europe/Vienna", label: "Vienna (CET)" },
  { value: "Europe/Prague", label: "Prague (CET)" },
  { value: "Europe/Warsaw", label: "Warsaw (CET)" },
  { value: "Europe/Stockholm", label: "Stockholm (CET)" },
  { value: "Europe/Helsinki", label: "Helsinki (EET)" },
  { value: "Europe/Athens", label: "Athens (EET)" },
  { value: "Europe/Istanbul", label: "Istanbul (TRT)" },
  { value: "Europe/Moscow", label: "Moscow (MSK)" },

  // Asia-Pacific
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Seoul", label: "Seoul (KST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)" },
  { value: "Asia/Taipei", label: "Taipei (CST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Bangkok", label: "Bangkok (ICT)" },
  { value: "Asia/Jakarta", label: "Jakarta (WIB)" },
  { value: "Asia/Manila", label: "Manila (PHT)" },
  { value: "Asia/Kolkata", label: "Mumbai (IST)" },
  { value: "Asia/Karachi", label: "Karachi (PKT)" },
  { value: "Asia/Dhaka", label: "Dhaka (BST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Riyadh", label: "Riyadh (AST)" },
  { value: "Asia/Tehran", label: "Tehran (IRST)" },
  { value: "Asia/Yerevan", label: "Yerevan (AMT)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT)" },
  { value: "Australia/Melbourne", label: "Melbourne (AEDT)" },
  { value: "Australia/Perth", label: "Perth (AWST)" },
  { value: "Pacific/Auckland", label: "Auckland (NZDT)" },

  // Africa
  { value: "Africa/Cairo", label: "Cairo (EET)" },
  { value: "Africa/Johannesburg", label: "Johannesburg (SAST)" },
  { value: "Africa/Lagos", label: "Lagos (WAT)" },
  { value: "Africa/Nairobi", label: "Nairobi (EAT)" },
  { value: "Africa/Casablanca", label: "Casablanca (WET)" },
];

export function ProfileEditClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Check if user came from an event page
  const referrerEventId = searchParams.get("from-event");

  const {
    data: currentProfile,
    isLoading,
    refetch: refetchProfile,
  } = api.profile.getMyProfile.useQuery();
  const updateProfile = api.profile.updateProfile.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Profile Updated",
        message: "Your profile has been updated successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      if (referrerEventId) {
        // Redirect back to the event page if they came from there
        router.push(`/events/${referrerEventId}`);
      } else if (currentProfile?.user?.id) {
        // Default redirect to their profile page
        router.push(`/profiles/${currentProfile.user.id}`);
      }
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to update profile",
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  const form = useForm<ProfileFormData>({
    validate: zodResolver(schema),
    initialValues: {
      preferredName: "",
      bio: "",
      jobTitle: "",
      company: "",
      location: "",
      website: "",
      githubUrl: "",
      linkedinUrl: "",
      twitterUrl: "",
      skills: [],
      interests: [],
      availableForMentoring: false,
      availableForHiring: false,
      availableForOfficeHours: false,
      timezone: "",
      languages: [],
      yearsOfExperience: undefined,
      telegramHandle: "",
      discordHandle: "",
      avatarUrl: "",
      speakerTalkTitle: "",
      speakerTalkAbstract: "",
      speakerTalkFormat: "",
      speakerTalkDuration: "",
      speakerTalkTopic: "",
      speakerPreviousExperience: "",
      speakerPastTalkUrl: "",
      speakerEntityName: "",
      speakerOtherFloorsTopicTheme: "",
      speakerDisplayPreference: "",
      speakerCoHostInfo: "",
    },
  });

  // Initialize form when profile data loads - stable dependencies only
  useEffect(() => {
    if (currentProfile && !hasInitialized) {
      form.setValues({
        preferredName: currentProfile.user?.name ?? "",
        bio: currentProfile.bio ?? "",
        jobTitle: currentProfile.jobTitle ?? "",
        company: currentProfile.company ?? "",
        location: currentProfile.location ?? "",
        website: currentProfile.website ?? "",
        githubUrl: currentProfile.githubUrl ?? "",
        linkedinUrl: currentProfile.linkedinUrl ?? "",
        twitterUrl: currentProfile.twitterUrl ?? "",
        skills: currentProfile.skills ?? [],
        interests: currentProfile.interests ?? [],
        availableForMentoring: currentProfile.availableForMentoring ?? false,
        availableForHiring: currentProfile.availableForHiring ?? false,
        availableForOfficeHours:
          currentProfile.availableForOfficeHours ?? false,
        timezone: currentProfile.timezone ?? "",
        languages: currentProfile.languages ?? [],
        yearsOfExperience: currentProfile.yearsOfExperience ?? undefined,
        telegramHandle: currentProfile.telegramHandle ?? "",
        discordHandle: currentProfile.discordHandle ?? "",
        avatarUrl: currentProfile.avatarUrl ?? "",
        speakerTalkTitle: currentProfile.speakerTalkTitle ?? "",
        speakerTalkAbstract: currentProfile.speakerTalkAbstract ?? "",
        speakerTalkFormat: currentProfile.speakerTalkFormat ?? "",
        speakerTalkDuration: currentProfile.speakerTalkDuration ?? "",
        speakerTalkTopic: currentProfile.speakerTalkTopic ?? "",
        speakerPreviousExperience:
          currentProfile.speakerPreviousExperience ?? "",
        speakerPastTalkUrl: currentProfile.speakerPastTalkUrl ?? "",
        speakerEntityName: currentProfile.speakerEntityName ?? "",
        speakerOtherFloorsTopicTheme:
          currentProfile.speakerOtherFloorsTopicTheme ?? "",
        speakerDisplayPreference: currentProfile.speakerDisplayPreference ?? "",
        speakerCoHostInfo: currentProfile.speakerCoHostInfo ?? "",
      });
      setHasInitialized(true);
    }
    // ESLint disabled: intentionally using only primitive dependencies to prevent infinite re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProfile?.id, hasInitialized]); // Only primitive dependencies

  const handleAvatarUpload = async (file: File | null) => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "Upload failed");
      }

      const result = (await response.json()) as { avatarUrl: string };

      // Update form with new avatar URL
      form.setFieldValue("avatarUrl", result.avatarUrl);

      notifications.show({
        title: "Avatar Uploaded",
        message: "Your profile picture has been uploaded successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });

      // Trigger a profile refetch to update the UI
      void refetchProfile();
    } catch (error) {
      console.error("Avatar upload error:", error);
      notifications.show({
        title: "Upload Failed",
        message:
          error instanceof Error ? error.message : "Failed to upload avatar",
        color: "red",
        icon: <IconX size={16} />,
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = (values: ProfileFormData) => {
    // Clean up empty strings and convert to undefined
    const cleanedValues = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        value === "" ? undefined : value,
      ]),
    ) as ProfileFormData;

    updateProfile.mutate(cleanedValues);
  };

  if (isLoading) {
    return (
      <Container size="md" py="xl">
        <Box ta="center">
          <Loader size="lg" />
          <Text mt="md">Loading your profile...</Text>
        </Box>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        mb="xl"
        component={Link}
        href={
          referrerEventId
            ? `/events/${referrerEventId}`
            : currentProfile?.user?.id
              ? `/profiles/${currentProfile.user.id}`
              : "/profile"
        }
      >
        {referrerEventId ? "Back to Event" : "Back to My Profile"}
      </Button>

      <Title order={1} mb="xl">
        Edit Your Profile
      </Title>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="xl">
          {/* Profile Picture */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={2} size="h3" mb="md">
              Profile Picture
            </Title>
            <Group gap="md" align="flex-start">
              <Avatar
                src={getAvatarUrl({
                  customAvatarUrl: form.values.avatarUrl,
                  oauthImageUrl: currentProfile?.user?.image,
                  name: currentProfile?.user?.name,
                  email: currentProfile?.user?.email,
                })}
                size="xl"
                radius="md"
              >
                {getAvatarInitials({
                  name: currentProfile?.user?.name,
                  email: currentProfile?.user?.email,
                })}
              </Avatar>
              <Stack style={{ flex: 1 }}>
                <FileInput
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  placeholder="Choose image file"
                  label="Upload new avatar"
                  description="JPG, PNG, GIF, or WebP (max 5MB)"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
                {isUploading && (
                  <Box>
                    <Text size="sm" mb="xs">
                      Uploading...
                    </Text>
                    <Progress value={uploadProgress} size="sm" />
                  </Box>
                )}
                <Text size="xs" c="dimmed">
                  Current:{" "}
                  {form.values.avatarUrl
                    ? "Custom avatar"
                    : currentProfile?.user?.image
                      ? "OAuth provider image"
                      : "No image set"}
                </Text>
              </Stack>
            </Group>
          </Card>

          {/* Basic Information */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={2} size="h3" mb="md">
              Basic Information
            </Title>
            <Grid>
              <Grid.Col span={12}>
                <TextInput
                  label="Preferred Name"
                  description="The name displayed on your profile and throughout the platform"
                  placeholder="How you'd like to be called"
                  {...form.getInputProps("preferredName")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Job Title"
                  placeholder="Software Engineer, Product Manager, etc."
                  {...form.getInputProps("jobTitle")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Company"
                  placeholder="Your current company"
                  {...form.getInputProps("company")}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Bio"
                  placeholder="Tell others who you are, what you're working on, and what you're looking to connect around."
                  minRows={3}
                  maxRows={5}
                  {...form.getInputProps("bio")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Location"
                  placeholder="City, Country"
                  {...form.getInputProps("location")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Select
                  label="Timezone"
                  placeholder="Select your timezone"
                  data={timezoneOptions}
                  searchable
                  clearable
                  {...form.getInputProps("timezone")}
                />
              </Grid.Col>
            </Grid>
          </Card>

          {/* Professional Details */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={2} size="h3" mb="md">
              Professional Details
            </Title>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <NumberInput
                  label="Years of Experience"
                  placeholder="How many years of professional experience?"
                  min={0}
                  max={50}
                  {...form.getInputProps("yearsOfExperience")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TagsInput
                  label="Languages"
                  placeholder="English, Spanish, French, etc."
                  {...form.getInputProps("languages")}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <TagsInput
                  label="Skills & Expertise"
                  placeholder="JavaScript, React, Product Strategy, etc."
                  description="Add your key skills and areas of expertise"
                  {...form.getInputProps("skills")}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <TagsInput
                  label="Interests"
                  placeholder="DeFi, AI/ML, Climate, etc."
                  description="What areas or topics are you interested in?"
                  {...form.getInputProps("interests")}
                />
              </Grid.Col>
            </Grid>
          </Card>

          {/* Speaker Details */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={2} size="h3" mb="md">
              Speaker Details
            </Title>
            <Text size="sm" c="dimmed" mb="md">
              Information about your speaking experience and talk proposals.
              This is displayed on your speaker dashboard and event pages.
            </Text>
            <Grid>
              <Grid.Col span={12}>
                <TextInput
                  label="Talk / Session Title"
                  placeholder="Your proposed talk or session name"
                  {...form.getInputProps("speakerTalkTitle")}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Talk Abstract / Description"
                  placeholder="Describe what your talk or session is about"
                  minRows={3}
                  maxRows={6}
                  {...form.getInputProps("speakerTalkAbstract")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Session Format"
                  placeholder="Talk, Workshop, Panel, etc."
                  {...form.getInputProps("speakerTalkFormat")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Preferred Duration"
                  placeholder="e.g., 30, 60, 90 minutes"
                  {...form.getInputProps("speakerTalkDuration")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Topic / Track"
                  placeholder="The topic or track for your talk"
                  {...form.getInputProps("speakerTalkTopic")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Entity / Group Name"
                  placeholder="Name of artist, entity, or group (if applicable)"
                  {...form.getInputProps("speakerEntityName")}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Previous Speaking Experience"
                  placeholder="Describe your previous speaking experience"
                  minRows={2}
                  maxRows={4}
                  {...form.getInputProps("speakerPreviousExperience")}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <TextInput
                  label="Past Talk URL"
                  placeholder="https://youtube.com/watch?v=..."
                  {...form.getInputProps("speakerPastTalkUrl")}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Display Preference"
                  placeholder="How you&apos;d like to appear on the event agenda"
                  minRows={2}
                  maxRows={3}
                  {...form.getInputProps("speakerDisplayPreference")}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Co-Host Information"
                  placeholder="Names, emails, and links for any co-hosts"
                  minRows={2}
                  maxRows={4}
                  {...form.getInputProps("speakerCoHostInfo")}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Other Floors Topic / Theme"
                  placeholder="Topic or theme for non-main-stage tracks (if applicable)"
                  minRows={2}
                  maxRows={4}
                  {...form.getInputProps("speakerOtherFloorsTopicTheme")}
                />
              </Grid.Col>
            </Grid>
          </Card>

          {/* Links & Contact */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={2} size="h3" mb="md">
              Links & Contact
            </Title>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Website"
                  placeholder="https://your-website.com"
                  {...form.getInputProps("website")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="GitHub"
                  placeholder="https://github.com/username"
                  {...form.getInputProps("githubUrl")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="LinkedIn"
                  placeholder="https://linkedin.com/in/username"
                  {...form.getInputProps("linkedinUrl")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Twitter/X"
                  placeholder="https://twitter.com/username"
                  {...form.getInputProps("twitterUrl")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Telegram Handle"
                  placeholder="username (without @)"
                  {...form.getInputProps("telegramHandle")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Discord Handle"
                  placeholder="username#1234"
                  {...form.getInputProps("discordHandle")}
                />
              </Grid.Col>
            </Grid>
          </Card>

          {/* Availability */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={2} size="h3" mb="md">
              Availability
            </Title>
            <Stack gap="sm">
              <Switch
                label="Available for Mentoring"
                description="I'm open to mentoring others in my areas of expertise"
                {...form.getInputProps("availableForMentoring", {
                  type: "checkbox",
                })}
              />
              <Switch
                label="Open to Opportunities"
                description="I'm open to hearing about new job opportunities"
                {...form.getInputProps("availableForHiring", {
                  type: "checkbox",
                })}
              />
              <Switch
                label="Office Hours Available"
                description="I offer regular office hours for community members"
                {...form.getInputProps("availableForOfficeHours", {
                  type: "checkbox",
                })}
              />
            </Stack>
          </Card>

          {/* Privacy */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={2} size="h3" mb="md">
              Privacy
            </Title>
            <Stack gap="sm">
              <Switch
                label="Public Profile"
                description="Allow non-logged-in users to view your profile. When disabled, only logged-in users can see your profile."
                {...form.getInputProps("isPublic", { type: "checkbox" })}
              />
            </Stack>
          </Card>

          {/* Application Import Section */}
          <ApplicationImportSection
            onImportComplete={() => {
              void refetchProfile();
              // Force re-initialization after import
              setHasInitialized(false);
            }}
          />

          {/* Wallet Addresses Section */}
          <WalletAddressManager />

          {/* Projects Section */}
          {currentProfile && (
            <ProjectManager
              projects={currentProfile.projects ?? []}
              onProjectsChange={() => void refetchProfile()}
            />
          )}

          {/* Action Buttons */}
          <Group justify="flex-end">
            <Button
              variant="light"
              component={Link}
              href={
                referrerEventId
                  ? `/events/${referrerEventId}`
                  : currentProfile?.user?.id
                    ? `/profiles/${currentProfile.user.id}`
                    : "/profile"
              }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={updateProfile.isPending}
              leftSection={<IconCheck size={16} />}
            >
              Save Profile
            </Button>
          </Group>
        </Stack>
      </form>
    </Container>
  );
}

interface ApplicationImportSectionProps {
  onImportComplete: () => void;
}

function ApplicationImportSection({
  onImportComplete,
}: ApplicationImportSectionProps) {
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const { data: applications, isLoading } =
    api.profile.getUserApplicationsForSync.useQuery();
  const { data: previewData, isLoading: previewLoading } =
    api.profile.previewApplicationSync.useQuery(
      { applicationId: selectedAppId! },
      { enabled: !!selectedAppId },
    );

  const syncMutation = api.profile.syncFromApplication.useMutation({
    onSuccess: (data) => {
      notifications.show({
        title: "Import Successful",
        message: `Successfully imported ${data.syncedFields.length} fields from your application`,
        color: "green",
        icon: <IconCheck size={16} />,
      });
      setPreviewModalOpen(false);
      setSelectedAppId(null);
      setSelectedFields([]);
      onImportComplete();
    },
    onError: (error) => {
      notifications.show({
        title: "Import Failed",
        message: error.message,
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  const handlePreview = (applicationId: string) => {
    setSelectedAppId(applicationId);
    setPreviewModalOpen(true);
  };

  const handleImport = () => {
    if (!selectedAppId || selectedFields.length === 0) return;

    syncMutation.mutate({
      applicationId: selectedAppId,
      fieldsToSync: selectedFields,
    });
  };

  const toggleField = (fieldName: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldName)
        ? prev.filter((f) => f !== fieldName)
        : [...prev, fieldName],
    );
  };

  const selectAllSyncableFields = () => {
    if (!previewData) return;
    const syncableFields = Object.entries(previewData.syncableData)
      .filter(([, data]) => data.willSync)
      .map(([fieldName]) => fieldName);
    setSelectedFields(syncableFields);
  };

  if (isLoading) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Loader size="sm" />
        <Text mt="xs">Loading applications...</Text>
      </Card>
    );
  }

  if (!applications?.length) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={2} size="h3" mb="md">
          Import from Applications
        </Title>
        <Text c="dimmed">
          No applications available for import. Submit an application to an
          event to import application data.
        </Text>
      </Card>
    );
  }

  return (
    <>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={2} size="h3" mb="md">
          Import from Applications
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          Import data from any of your submitted applications to automatically
          fill your profile fields. Each application can only be imported once
          to prevent data conflicts.
        </Text>

        <Stack gap="sm">
          {applications.map((app) => (
            <Box
              key={app.id}
              p="sm"
              style={{
                border: "1px solid var(--mantine-color-gray-3)",
                borderRadius: 8,
              }}
            >
              <Group justify="space-between" align="center">
                <div>
                  <Text fw={500}>{app.event?.name}</Text>
                  <Group gap="xs">
                    <Text size="sm" c="dimmed">
                      Submitted:{" "}
                      {app.submittedAt
                        ? new Date(app.submittedAt).toLocaleDateString()
                        : "N/A"}
                    </Text>
                    <Badge
                      size="sm"
                      color={
                        app.status === "ACCEPTED"
                          ? "green"
                          : app.status === "REJECTED"
                            ? "red"
                            : app.status === "WAITLISTED"
                              ? "orange"
                              : "blue"
                      }
                    >
                      {app.status.replace("_", " ")}
                    </Badge>
                    {app.profileSyncs.length > 0 && (
                      <Badge size="sm" color="blue" variant="light">
                        Previously Synced
                      </Badge>
                    )}
                  </Group>
                </div>
                <Button
                  size="sm"
                  variant="light"
                  leftSection={<IconEye size={14} />}
                  onClick={() => handlePreview(app.id)}
                  disabled={app.profileSyncs.length > 0}
                >
                  {app.profileSyncs.length > 0
                    ? "Already Imported"
                    : "Preview Import"}
                </Button>
              </Group>
            </Box>
          ))}
        </Stack>
      </Card>

      <Modal
        opened={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setSelectedAppId(null);
          setSelectedFields([]);
        }}
        title={
          <Group>
            <IconDownload size={20} />
            <Text fw={600}>Preview Application Import</Text>
          </Group>
        }
        size="lg"
      >
        {previewLoading ? (
          <Box ta="center" py="xl">
            <Loader size="lg" />
            <Text mt="md">Loading preview...</Text>
          </Box>
        ) : previewData ? (
          <Stack gap="md">
            <Box>
              <Text fw={500} mb="xs">
                {previewData.application.eventName}
              </Text>
              <Text size="sm" c="dimmed">
                Submitted:{" "}
                {previewData.application.submittedAt
                  ? new Date(
                      previewData.application.submittedAt,
                    ).toLocaleDateString()
                  : "N/A"}
              </Text>
              {previewData.hasBeenSynced && (
                <Badge color="blue" size="sm" mt="xs">
                  Previously Synced
                </Badge>
              )}
            </Box>

            <Divider />

            <div>
              <Group justify="space-between" mb="sm">
                <Text fw={500}>Available Fields</Text>
                <Button
                  size="xs"
                  variant="light"
                  onClick={selectAllSyncableFields}
                  disabled={
                    !Object.values(previewData.syncableData).some(
                      (d) => d.willSync,
                    )
                  }
                >
                  Select All Syncable
                </Button>
              </Group>

              <Stack gap="xs">
                {Object.entries(previewData.syncableData).map(
                  ([fieldName, data]) => (
                    <Box
                      key={fieldName}
                      p="xs"
                      bg={data.willSync ? "gray.0" : "gray.1"}
                      style={{ borderRadius: 4 }}
                    >
                      <Group align="flex-start" gap="sm">
                        <Checkbox
                          checked={selectedFields.includes(fieldName)}
                          onChange={() => toggleField(fieldName)}
                          disabled={!data.willSync}
                          mt={2}
                        />
                        <div style={{ flex: 1 }}>
                          <Group gap="xs" mb="xs">
                            <Text fw={500} size="sm">
                              {fieldName.charAt(0).toUpperCase() +
                                fieldName.slice(1).replace(/([A-Z])/g, " $1")}
                            </Text>
                            {data.willSync ? (
                              <Badge size="xs" color="green">
                                Will Sync
                              </Badge>
                            ) : (
                              <Badge size="xs" color="gray">
                                Won&apos;t Sync
                              </Badge>
                            )}
                          </Group>
                          <Text size="xs" c="dimmed" mb="xs">
                            {data.reason}
                          </Text>
                          {data.applicationValue && (
                            <Text size="xs">
                              <strong>From Application:</strong>{" "}
                              {Array.isArray(data.applicationValue)
                                ? data.applicationValue.join(", ")
                                : data.applicationValue}
                            </Text>
                          )}
                          {data.profileValue && (
                            <Text size="xs" c="dimmed">
                              <strong>Current Profile:</strong>{" "}
                              {Array.isArray(data.profileValue)
                                ? data.profileValue.join(", ")
                                : String(data.profileValue)}
                            </Text>
                          )}
                        </div>
                      </Group>
                    </Box>
                  ),
                )}
              </Stack>
            </div>

            <Group justify="flex-end">
              <Button
                variant="light"
                onClick={() => {
                  setPreviewModalOpen(false);
                  setSelectedFields([]);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedFields.length === 0}
                loading={syncMutation.isPending}
                leftSection={<IconDownload size={16} />}
              >
                Import {selectedFields.length} Field
                {selectedFields.length !== 1 ? "s" : ""}
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>
    </>
  );
}

function WalletAddressManager() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newWallet, setNewWallet] = useState({
    address: "",
    chain: "ETHEREUM" as const,
    label: "",
    isPrimary: false,
  });

  const { data: wallets, refetch: refetchWallets } =
    api.profile.getMyWalletAddresses.useQuery();

  const addWalletMutation = api.profile.addWalletAddress.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Wallet Added",
        message: "Your wallet address has been added successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      setAddModalOpen(false);
      setNewWallet({
        address: "",
        chain: "ETHEREUM",
        label: "",
        isPrimary: false,
      });
      void refetchWallets();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to add wallet address",
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  const updateWalletMutation = api.profile.updateWalletAddress.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Wallet Updated",
        message: "Your wallet address has been updated successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      void refetchWallets();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to update wallet address",
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  const deleteWalletMutation = api.profile.deleteWalletAddress.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Wallet Deleted",
        message: "Your wallet address has been deleted successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      void refetchWallets();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to delete wallet address",
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  const handleAddWallet = () => {
    if (!newWallet.address) {
      notifications.show({
        title: "Validation Error",
        message: "Wallet address is required",
        color: "red",
        icon: <IconX size={16} />,
      });
      return;
    }

    addWalletMutation.mutate({
      address: newWallet.address,
      chain: newWallet.chain,
      label: newWallet.label || undefined,
      isPrimary: newWallet.isPrimary,
    });
  };

  const handleSetPrimary = (walletId: string) => {
    updateWalletMutation.mutate({
      id: walletId,
      isPrimary: true,
    });
  };

  const handleDelete = (walletId: string) => {
    deleteWalletMutation.mutate({ id: walletId });
  };

  const chainOptions = [
    { value: "ETHEREUM", label: "Ethereum" },
    { value: "POLYGON", label: "Polygon" },
    { value: "ARBITRUM", label: "Arbitrum" },
    { value: "OPTIMISM", label: "Optimism" },
    { value: "BASE", label: "Base" },
    { value: "SOLANA", label: "Solana" },
    { value: "COSMOS", label: "Cosmos" },
    { value: "OTHER", label: "Other" },
  ];

  return (
    <>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={2} size="h3">
            Wallet Addresses
          </Title>
          <Button
            leftSection={<IconWallet size={16} />}
            onClick={() => setAddModalOpen(true)}
            size="sm"
          >
            Add Wallet
          </Button>
        </Group>

        {!wallets || wallets.length === 0 ? (
          <Text c="dimmed" size="sm">
            No wallet addresses added yet. Add your wallet addresses to display
            them on your profile.
          </Text>
        ) : (
          <Stack gap="sm">
            {wallets.map((wallet) => (
              <Box
                key={wallet.id}
                p="md"
                style={{
                  border: "1px solid var(--mantine-color-gray-3)",
                  borderRadius: 8,
                  backgroundColor: wallet.isPrimary
                    ? "var(--mantine-color-blue-0)"
                    : undefined,
                }}
              >
                <Group justify="space-between" align="flex-start">
                  <div style={{ flex: 1 }}>
                    <Group gap="xs" mb="xs">
                      <Text fw={500} size="sm">
                        {wallet.chain}
                      </Text>
                      {wallet.isPrimary && (
                        <Badge
                          size="sm"
                          color="blue"
                          leftSection={<IconStar size={12} />}
                        >
                          Primary
                        </Badge>
                      )}
                      {wallet.label && (
                        <Badge size="sm" color="gray" variant="light">
                          {wallet.label}
                        </Badge>
                      )}
                    </Group>
                    <Text
                      size="sm"
                      style={{
                        fontFamily: "monospace",
                        wordBreak: "break-all",
                      }}
                    >
                      {wallet.address}
                    </Text>
                  </div>
                  <Group gap="xs">
                    {!wallet.isPrimary && (
                      <Button
                        size="xs"
                        variant="light"
                        color="blue"
                        onClick={() => handleSetPrimary(wallet.id)}
                        loading={updateWalletMutation.isPending}
                      >
                        Set Primary
                      </Button>
                    )}
                    <Button
                      size="xs"
                      variant="light"
                      color="red"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => handleDelete(wallet.id)}
                      loading={deleteWalletMutation.isPending}
                    >
                      Delete
                    </Button>
                  </Group>
                </Group>
              </Box>
            ))}
          </Stack>
        )}
      </Card>

      <Modal
        opened={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setNewWallet({
            address: "",
            chain: "ETHEREUM",
            label: "",
            isPrimary: false,
          });
        }}
        title={
          <Group>
            <IconWallet size={20} />
            <Text fw={600}>Add Wallet Address</Text>
          </Group>
        }
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Wallet Address"
            placeholder="0x... or solana address"
            value={newWallet.address}
            onChange={(e) =>
              setNewWallet({ ...newWallet, address: e.target.value })
            }
            required
          />

          <Select
            label="Blockchain"
            data={chainOptions}
            value={newWallet.chain}
            onChange={(value) =>
              setNewWallet({
                ...newWallet,
                chain: value as typeof newWallet.chain,
              })
            }
            required
          />

          <TextInput
            label="Label (Optional)"
            placeholder="Main Wallet, Governance, etc."
            value={newWallet.label}
            onChange={(e) =>
              setNewWallet({ ...newWallet, label: e.target.value })
            }
          />

          <Checkbox
            label="Set as primary wallet"
            checked={newWallet.isPrimary}
            onChange={(e) =>
              setNewWallet({ ...newWallet, isPrimary: e.target.checked })
            }
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="light"
              onClick={() => {
                setAddModalOpen(false);
                setNewWallet({
                  address: "",
                  chain: "ETHEREUM",
                  label: "",
                  isPrimary: false,
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddWallet}
              loading={addWalletMutation.isPending}
              leftSection={<IconCheck size={16} />}
            >
              Add Wallet
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
