"use client";

import { useState } from "react";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";
import {
  Container,
  Title,
  Text,
  Card,
  Stack,
  Group,
  Button,
  TextInput,
  Textarea,
  TagsInput,
  Select,
  Checkbox,
  Grid,
  Badge,
  Alert,
  Progress,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconX,
  IconPhone,
  IconBrandTelegram,
  IconBrandDiscord,
  IconBrandLinkedin,
  IconBrandTwitter,
  IconBrandGithub,
  IconWorld,
  IconUsers,
  IconBriefcase,
  IconUser,
  IconTool,
  IconLink,
  IconClock,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import SkillsMultiSelect from "./SkillsMultiSelect";

const mentorApplicationSchema = z.object({
  skills: z.array(z.string()).min(1, "Please add at least one skill"), // Now stores skill IDs
  interests: z
    .array(z.string())
    .min(1, "Please add at least one area of experience"),
  timezone: z.string().min(1, "Timezone is required"),
  mentorAvailableDates: z
    .array(z.string())
    .min(1, "Please select at least one availability period"),
  mentorHoursPerWeek: z.string().min(1, "Please specify your time commitment"),
  // Profile fields - Basic Information
  bio: z.string().max(1000).optional(),
  jobTitle: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  // Profile fields - Links & Contact
  website: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  phoneNumber: z.string().optional(),
  telegramHandle: z.string().optional(),
  discordHandle: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  // Profile fields - Professional Details
  languages: z.array(z.string().max(50)).max(10).optional(),
  // Mentorship fields
  mentorshipStyle: z
    .string()
    .min(1, "Please describe your mentorship approach"),
  previousMentoringExp: z
    .string()
    .min(1, "Please describe your previous mentoring experience"),
  mentorSpecializations: z
    .array(z.string())
    .min(1, "Please add at least one specialization"),
  mentorGoals: z.string().min(1, "Please describe your goals as a mentor"),
});

type MentorApplicationData = z.infer<typeof mentorApplicationSchema>;

const availabilityOptions = [
  { value: "week1", label: "Week 1: Oct 24-31, 2025" },
  { value: "week2", label: "Week 2: Nov 1-7, 2025" },
  { value: "week3", label: "Week 3: Nov 8-14, 2025" },
  { value: "pre-event", label: "Pre-event preparation (Oct 15-23)" },
  { value: "post-event", label: "Post-event follow-up (Nov 15-30)" },
];

const timeCommitmentOptions = [
  { value: "1-2", label: "1-2 days" },
  { value: "2-3", label: "2-3 days" },
  { value: "3-4", label: "3-4 days" },
  { value: "4+", label: "4+ days" },
  { value: "flexible", label: "Flexible based on needs" },
];

const timezoneOptions = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT)" },
];

interface MentorApplicationFormProps {
  eventId: string;
  eventName: string;
  invitationToken?: string;
}

export default function MentorApplicationForm({
  eventId,
  eventName,
  invitationToken,
}: MentorApplicationFormProps) {
  console.log(
    "🎫 [MentorApplicationForm] Received invitation token:",
    invitationToken,
  );

  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: config } = api.config.getPublicConfig.useQuery();

  // Fetch skills data to convert IDs to names
  const { data: skillsByCategory } = api.skills.getSkillsByCategory.useQuery();

  // Mutation for updating user skills
  const updateUserSkills = api.skills.updateUserSkills.useMutation();

  // Mutation for creating mentor application
  const createApplication = api.application.createApplication.useMutation();

  const form = useForm<MentorApplicationData>({
    validate: zodResolver(mentorApplicationSchema),
    initialValues: {
      skills: [],
      interests: [],
      timezone: "",
      mentorAvailableDates: [],
      mentorHoursPerWeek: "",
      // Profile fields - Basic Information
      bio: "",
      jobTitle: "",
      company: "",
      location: "",
      // Profile fields - Links & Contact
      website: "",
      githubUrl: "",
      twitterUrl: "",
      phoneNumber: "",
      telegramHandle: "",
      discordHandle: "",
      linkedinUrl: "",
      // Profile fields - Professional Details
      languages: [],
      // Mentorship fields
      mentorshipStyle: "",
      previousMentoringExp: "",
      mentorSpecializations: [],
      mentorGoals: "",
    },
  });

  const updateProfile = api.profile.updateProfile.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Mentor Application Submitted!",
        message:
          "Your mentor profile has been updated successfully. You're now ready to mentor!",
        color: "green",
        icon: <IconCheck size={16} />,
      });

      // Redirect back to mentor dashboard
      router.push(`/events/${eventId}?tab=application`);
    },
    onError: (error) => {
      notifications.show({
        title: "Submission Failed",
        message:
          error.message ??
          "There was an error updating your mentor profile. Please try again.",
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  const handleSubmit = async (values: MentorApplicationData) => {
    setIsSubmitting(true);

    try {
      // Convert skill IDs to skill names for backward compatibility with profile API
      const skillNames: string[] = [];
      if (skillsByCategory) {
        const allSkills = Object.values(skillsByCategory).flat();
        values.skills.forEach((skillId) => {
          const skill = allSkills.find((s) => s.id === skillId);
          if (skill) {
            skillNames.push(skill.name);
          }
        });
      }

      // Update the user's skills in the new Skills system
      await updateUserSkills.mutateAsync({
        skillIds: values.skills,
      });

      // Create mentor application record
      console.log("🎫 [MentorApplicationForm] Sending to API:", {
        eventId,
        applicationType: "MENTOR",
        invitationToken: invitationToken,
      });

      await createApplication.mutateAsync({
        eventId: eventId,
        applicationType: "MENTOR",
        language: "en",
        invitationToken: invitationToken,
      });

      // Update the user's profile with mentor information
      await updateProfile.mutateAsync({
        skills: skillNames, // Send skill names to maintain backward compatibility
        interests: values.interests,
        timezone: values.timezone,
        availableForMentoring: true, // Set this to true when they complete mentor application
        // Profile fields - Basic Information
        bio: values.bio,
        jobTitle: values.jobTitle,
        company: values.company,
        location: values.location,
        // Profile fields - Links & Contact
        website: values.website,
        githubUrl: values.githubUrl,
        twitterUrl: values.twitterUrl,
        phoneNumber: values.phoneNumber,
        telegramHandle: values.telegramHandle,
        discordHandle: values.discordHandle,
        linkedinUrl: values.linkedinUrl,
        // Profile fields - Professional Details
        languages: values.languages,
        // Mentorship fields
        mentorshipStyle: values.mentorshipStyle,
        previousMentoringExp: values.previousMentoringExp,
        mentorSpecializations: values.mentorSpecializations,
        mentorGoals: values.mentorGoals,
        mentorAvailableDates: values.mentorAvailableDates,
        mentorHoursPerWeek: values.mentorHoursPerWeek,
      });
    } catch {
      // Error is handled by the mutation's onError callback
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      // Validate current step before proceeding
      const isValid = getStepValidation(currentStep);
      if (isValid) {
        setCurrentStep((prev) => prev + 1);
      } else {
        // Trigger validation to show errors
        form.validate();
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const getStepValidation = (step: number) => {
    switch (step) {
      case 1:
        return (
          form.values.skills.length > 0 && form.values.interests.length > 0
        );
      case 2:
        return (
          form.values.mentorAvailableDates.length > 0 &&
          form.values.mentorHoursPerWeek &&
          form.values.timezone
        );
      case 3:
        return (
          form.values.mentorshipStyle &&
          form.values.previousMentoringExp &&
          form.values.mentorSpecializations.length > 0 &&
          form.values.mentorGoals
        );
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Stack gap="lg">
              <Group gap="md" align="center">
                <IconBriefcase size={28} color="var(--mantine-color-blue-6)" />
                <div>
                  <Title order={3}>Skills & Experience</Title>
                  <Text size="sm" c="dimmed">
                    Tell us about your expertise and background
                  </Text>
                </div>
              </Group>

              <Grid>
                <Grid.Col span={12}>
                  <SkillsMultiSelect
                    label="Skills & Technologies"
                    placeholder="Select or add your technical skills (e.g., React, Solidity, Python)"
                    description="What technical skills can you mentor others on?"
                    value={form.values.skills}
                    onChange={(skillIds) =>
                      form.setFieldValue("skills", skillIds)
                    }
                    error={
                      typeof form.errors.skills === "string"
                        ? form.errors.skills
                        : undefined
                    }
                    required
                  />
                </Grid.Col>

                <Grid.Col span={12}>
                  <TagsInput
                    label="Experience Areas"
                    placeholder="Add your areas of expertise (e.g., DeFi, Product Strategy, Startups)"
                    description="What domains or industries do you have experience in?"
                    {...form.getInputProps("interests")}
                    required
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </Card>
        );

      case 2:
        return (
          <Stack gap="xl">
            {/* Basic Information */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={2} size="h3" mb="md">
                <Group gap="sm" align="center">
                  <IconUser size={24} color="var(--mantine-color-blue-6)" />
                  Basic Information
                </Group>
              </Title>
              <Grid>
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
                    required
                  />
                </Grid.Col>
              </Grid>
            </Card>

            {/* Professional Details */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={2} size="h3" mb="md">
                <Group gap="sm" align="center">
                  <IconTool size={24} color="var(--mantine-color-green-6)" />
                  Professional Details
                </Group>
              </Title>
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TagsInput
                    label="Languages"
                    placeholder="English, Spanish, French, etc."
                    {...form.getInputProps("languages")}
                  />
                </Grid.Col>
              </Grid>
            </Card>

            {/* Links & Contact */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={2} size="h3" mb="md">
                <Group gap="sm" align="center">
                  <IconLink size={24} color="var(--mantine-color-purple-6)" />
                  Links & Contact
                </Group>
              </Title>
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Website"
                    placeholder="https://your-website.com"
                    leftSection={<IconWorld size={16} />}
                    {...form.getInputProps("website")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="GitHub"
                    placeholder="https://github.com/username"
                    leftSection={<IconBrandGithub size={16} />}
                    {...form.getInputProps("githubUrl")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="LinkedIn"
                    placeholder="https://linkedin.com/in/username"
                    leftSection={<IconBrandLinkedin size={16} />}
                    {...form.getInputProps("linkedinUrl")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Twitter/X"
                    placeholder="https://twitter.com/username"
                    leftSection={<IconBrandTwitter size={16} />}
                    {...form.getInputProps("twitterUrl")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Telegram Handle"
                    placeholder="username (without @)"
                    leftSection={<IconBrandTelegram size={16} />}
                    {...form.getInputProps("telegramHandle")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Discord Handle"
                    placeholder="username#1234"
                    leftSection={<IconBrandDiscord size={16} />}
                    {...form.getInputProps("discordHandle")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Phone Number"
                    placeholder="+1 (555) 123-4567"
                    leftSection={<IconPhone size={16} />}
                    {...form.getInputProps("phoneNumber")}
                  />
                </Grid.Col>
              </Grid>
            </Card>

            {/* Availability */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={2} size="h3" mb="md">
                <Group gap="sm" align="center">
                  <IconClock size={24} color="var(--mantine-color-orange-6)" />
                  Availability
                </Group>
              </Title>
              <Stack gap="md">
                {/* Available Periods */}
                <div>
                  <Text size="sm" fw={500} mb="xs">
                    Available Periods{" "}
                    <Text component="span" c="red">
                      *
                    </Text>
                  </Text>
                  <Text size="xs" c="dimmed" mb="md">
                    Select all periods when you&apos;ll be available to mentor
                  </Text>
                  <Stack gap="xs">
                    {availabilityOptions.map((option) => (
                      <Checkbox
                        key={option.value}
                        label={option.label}
                        checked={form.values.mentorAvailableDates.includes(
                          option.value,
                        )}
                        onChange={(event) => {
                          const checked = event.currentTarget.checked;
                          const currentDates = form.values.mentorAvailableDates;

                          if (checked) {
                            form.setFieldValue("mentorAvailableDates", [
                              ...currentDates,
                              option.value,
                            ]);
                          } else {
                            form.setFieldValue(
                              "mentorAvailableDates",
                              currentDates.filter((d) => d !== option.value),
                            );
                          }
                        }}
                      />
                    ))}
                  </Stack>
                </div>

                {/* Time Commitment */}
                <Select
                  label="Time Commitment"
                  placeholder="How much time can you dedicate?"
                  data={timeCommitmentOptions}
                  {...form.getInputProps("mentorHoursPerWeek")}
                  required
                />
              </Stack>
            </Card>
          </Stack>
        );

      case 3:
        return (
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Stack gap="lg">
              <Group gap="md" align="center">
                <IconUsers size={28} color="var(--mantine-color-orange-6)" />
                <div>
                  <Title order={3}>Mentorship Details</Title>
                  <Text size="sm" c="dimmed">
                    Tell us about your approach to mentoring
                  </Text>
                </div>
              </Group>

              <Grid>
                <Grid.Col span={12}>
                  <TagsInput
                    label="Specializations"
                    placeholder="Add specific areas you'd like to focus on (e.g., Smart Contract Security, UX Design)"
                    description="What specific topics or skills do you want to mentor on during the residency?"
                    {...form.getInputProps("mentorSpecializations")}
                    required
                  />
                </Grid.Col>

                <Grid.Col span={12}>
                  <Textarea
                    label="Mentorship Style & Approach"
                    placeholder="Describe how you typically approach mentoring, your style, and what mentees can expect..."
                    description="How do you like to mentor? What's your approach to helping others learn and grow?"
                    minRows={4}
                    {...form.getInputProps("mentorshipStyle")}
                    required
                  />
                </Grid.Col>

                <Grid.Col span={12}>
                  <Textarea
                    label="Previous Mentoring Experience"
                    placeholder="Tell us about your experience mentoring others, whether formal or informal..."
                    description="What's your background with mentoring? This can include formal programs, informal guidance, teaching, etc."
                    minRows={3}
                    {...form.getInputProps("previousMentoringExp")}
                    required
                  />
                </Grid.Col>

                <Grid.Col span={12}>
                  <Textarea
                    label="Goals for this Residency"
                    placeholder="What do you hope to achieve as a mentor during this residency? What excites you about this opportunity?"
                    description="What are your personal goals for participating as a mentor?"
                    minRows={3}
                    {...form.getInputProps("mentorGoals")}
                    required
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <div>
          <Title order={1} mb="md">
            Mentor Application
          </Title>
          <Text size="lg" c="dimmed" mb="md">
            Complete your mentor profile for {eventName}
          </Text>

          {/* Progress Bar */}
          <Card p="md" radius="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm" fw={500}>
                  Step {currentStep} of 3
                </Text>
                <Text size="sm" c="dimmed">
                  {Math.round((currentStep / 3) * 100)}% Complete
                </Text>
              </Group>
              <Progress value={(currentStep / 3) * 100} size="lg" radius="xl" />

              <Group justify="space-between">
                <Badge
                  size="sm"
                  variant={currentStep >= 1 ? "filled" : "light"}
                >
                  Skills
                </Badge>
                <Badge
                  size="sm"
                  variant={currentStep >= 2 ? "filled" : "light"}
                >
                  Availability
                </Badge>
                <Badge
                  size="sm"
                  variant={currentStep >= 3 ? "filled" : "light"}
                >
                  Details
                </Badge>
              </Group>
            </Stack>
          </Card>
        </div>

        {/* Form Content */}
        <form onSubmit={form.onSubmit(handleSubmit)}>
          {renderStep()}

          {/* Navigation Buttons */}
          <Group justify="space-between" mt="xl">
            <Button
              variant="light"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              Previous
            </Button>

            {currentStep < 3 ? (
              <Button onClick={nextStep}>Next Step</Button>
            ) : (
              <Button
                type="submit"
                loading={isSubmitting}
                leftSection={<IconCheck size={16} />}
                disabled={!getStepValidation(currentStep)}
              >
                Submit Application
              </Button>
            )}
          </Group>
        </form>

        {/* Help Text */}
        <Alert color="blue" title="Need Help?">
          <Text size="sm">
            If you have any questions about completing this form, please contact
            the residency organizers at{" "}
            <Text component="span" fw={500}>
              {config?.adminEmail ?? ""}
            </Text>
          </Text>
        </Alert>
      </Stack>
    </Container>
  );
}
