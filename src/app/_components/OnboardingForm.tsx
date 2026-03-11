"use client";

import React, { useState, useEffect } from "react";
import {
  Container,
  Card,
  Title,
  Text,
  Stack,
  Button,
  Checkbox,
  Group,
  Textarea,
  Progress,
  Box,
  Loader,
  Center,
  TextInput,
  Radio,
  Slider,
  Divider,
  SimpleGrid,
  Accordion,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconShield,
  IconStar,
  IconCheck,
  IconX,
  IconUser,
  IconLanguage,
  IconBrain,
  IconPresentation,
  IconPalette,
  IconPhoto,
  IconClipboardCheck,
  IconHeart,
  IconEdit,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface OnboardingFormData {
  // Contact & Logistics
  bloodType: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  arrivalDateTime: string; // Use string for datetime-local inputs
  departureDateTime: string; // Use string for datetime-local inputs

  // Food & Dietary Needs
  dietType: string; // Use string for radio values
  dietTypeOther: string;
  allergiesIntolerances: string;

  // English Proficiency
  englishProficiencyLevel: number;

  // Knowledge Sharing, Community & Mentorship
  primaryGoals: string;
  skillsToGain: string;
  openToMentoring: string; // Use string for radio values
  mentorsToLearnFrom: string;
  organizationsToConnect: string;

  // Technical Workshop
  technicalWorkshopTitle: string;
  technicalWorkshopDescription: string;
  technicalWorkshopDuration: string;
  technicalWorkshopMaterials: string;

  // Beyond Work Activities
  beyondWorkInterests: string;
  beyondWorkTitle: string;
  beyondWorkDescription: string;
  beyondWorkDuration: string;
  beyondWorkMaterials: string;

  // Commitments & Confirmations
  participateExperiments: boolean;
  mintHypercert: boolean;
  interestedIncubation: boolean;
  interestedEIR: boolean;
  liabilityWaiverConsent: boolean;
  codeOfConductAgreement: boolean;
  communityActivitiesConsent: boolean;

  // Additional Information
  additionalComments: string;
}

interface OnboardingFormProps {
  applicationId: string;
  applicantName: string;
}

export default function OnboardingForm({
  applicationId,
  applicantName,
}: OnboardingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // API hooks
  const { data: onboardingData, isLoading } =
    api.onboarding.getOnboarding.useQuery({
      applicationId,
    });

  const submitOnboarding = api.onboarding.submitOnboarding.useMutation();

  const form = useForm<OnboardingFormData>({
    initialValues: {
      // Contact & Logistics
      bloodType: "",
      emergencyContactName: "",
      emergencyContactRelationship: "",
      emergencyContactPhone: "",
      arrivalDateTime: "",
      departureDateTime: "",

      // Food & Dietary Needs
      dietType: "",
      dietTypeOther: "",
      allergiesIntolerances: "",

      // English Proficiency
      englishProficiencyLevel: 80,

      // Knowledge Sharing, Community & Mentorship
      primaryGoals: "",
      skillsToGain: "",
      openToMentoring: "",
      mentorsToLearnFrom: "",
      organizationsToConnect: "",

      // Technical Workshop
      technicalWorkshopTitle: "",
      technicalWorkshopDescription: "",
      technicalWorkshopDuration: "",
      technicalWorkshopMaterials: "",

      // Beyond Work Activities
      beyondWorkInterests: "",
      beyondWorkTitle: "",
      beyondWorkDescription: "",
      beyondWorkDuration: "",
      beyondWorkMaterials: "",

      // Commitments & Confirmations
      participateExperiments: false,
      mintHypercert: false,
      interestedIncubation: false,
      interestedEIR: false,
      liabilityWaiverConsent: false,
      codeOfConductAgreement: false,
      communityActivitiesConsent: false,

      // Additional Information
      additionalComments: "",
    },
    validate: {
      emergencyContactName: (value) =>
        !value ? "Emergency contact name is required" : null,
      arrivalDateTime: (value) =>
        !value ? "Arrival date and time is required" : null,
      participateExperiments: (value) =>
        !value ? "This commitment is required for participation" : null,
      mintHypercert: (value) =>
        !value ? "This commitment is required for participation" : null,
      liabilityWaiverConsent: (value) =>
        !value ? "Liability waiver consent is required" : null,
      codeOfConductAgreement: (value) =>
        !value ? "Code of conduct agreement is required" : null,
      communityActivitiesConsent: (value) =>
        !value ? "Community activities consent is required" : null,
    },
  });

  // Initialize form with existing data if available
  useEffect(() => {
    if (onboardingData?.onboarding) {
      const existing = onboardingData.onboarding;

      // Helper to format dates for datetime-local inputs
      const formatDateTimeLocal = (date: Date | null) => {
        if (!date) return "";
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
      };

      form.setValues({
        // Contact & Logistics
        bloodType: existing.bloodType ?? "",
        emergencyContactName: existing.emergencyContactName ?? "",
        emergencyContactRelationship:
          existing.emergencyContactRelationship ?? "",
        emergencyContactPhone: existing.emergencyContactPhone ?? "",
        arrivalDateTime: formatDateTimeLocal(existing.arrivalDateTime),
        departureDateTime: formatDateTimeLocal(existing.departureDateTime),

        // Food & Dietary Needs
        dietType: existing.dietType ?? "",
        dietTypeOther: existing.dietTypeOther ?? "",
        allergiesIntolerances: existing.allergiesIntolerances ?? "",

        // English Proficiency
        englishProficiencyLevel: existing.englishProficiencyLevel ?? 80,

        // Knowledge Sharing, Community & Mentorship
        primaryGoals: existing.primaryGoals ?? "",
        skillsToGain: existing.skillsToGain ?? "",
        openToMentoring: existing.openToMentoring ?? "",
        mentorsToLearnFrom: existing.mentorsToLearnFrom ?? "",
        organizationsToConnect: existing.organizationsToConnect ?? "",

        // Technical Workshop
        technicalWorkshopTitle: existing.technicalWorkshopTitle ?? "",
        technicalWorkshopDescription:
          existing.technicalWorkshopDescription ?? "",
        technicalWorkshopDuration: existing.technicalWorkshopDuration ?? "",
        technicalWorkshopMaterials: existing.technicalWorkshopMaterials ?? "",

        // Beyond Work Activities
        beyondWorkInterests: existing.beyondWorkInterests ?? "",
        beyondWorkTitle: existing.beyondWorkTitle ?? "",
        beyondWorkDescription: existing.beyondWorkDescription ?? "",
        beyondWorkDuration: existing.beyondWorkDuration ?? "",
        beyondWorkMaterials: existing.beyondWorkMaterials ?? "",

        // Commitments & Confirmations
        participateExperiments: existing.participateExperiments ?? false,
        mintHypercert: existing.mintHypercert ?? false,
        interestedIncubation: existing.interestedIncubation ?? false,
        interestedEIR:
          (existing as { interestedEIR?: boolean } | null)?.interestedEIR ??
          false,
        liabilityWaiverConsent: existing.liabilityWaiverConsent ?? false,
        codeOfConductAgreement: existing.codeOfConductAgreement ?? false,
        communityActivitiesConsent:
          existing.communityActivitiesConsent ?? false,

        // Additional Information
        additionalComments: existing.additionalComments ?? "",
      });

      if (existing.completed) {
        setIsSubmitted(true);
      }
    }
  }, [onboardingData?.onboarding?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values: OnboardingFormData) => {
    setIsSubmitting(true);
    try {
      // For now, we'll simulate file uploads with placeholder URLs
      // In a real implementation, you would upload files to cloud storage first

      // Helper to convert string to Date or undefined
      const parseDateTime = (dateStr: string) => {
        if (!dateStr) return undefined;
        return new Date(dateStr);
      };

      // Helper to convert empty strings to undefined
      const emptyToUndefined = (str: string) => str || undefined;

      await submitOnboarding.mutateAsync({
        applicationId,

        // Contact & Logistics
        bloodType: emptyToUndefined(values.bloodType),
        emergencyContactName: values.emergencyContactName,
        emergencyContactRelationship: emptyToUndefined(
          values.emergencyContactRelationship,
        ),
        emergencyContactPhone: emptyToUndefined(values.emergencyContactPhone),
        arrivalDateTime: parseDateTime(values.arrivalDateTime),
        departureDateTime: parseDateTime(values.departureDateTime),

        // Food & Dietary Needs
        dietType: emptyToUndefined(values.dietType) as
          | "OMNIVORE"
          | "VEGETARIAN"
          | "VEGAN"
          | "OTHER"
          | undefined,
        dietTypeOther: emptyToUndefined(values.dietTypeOther),
        allergiesIntolerances: emptyToUndefined(values.allergiesIntolerances),

        // English Proficiency
        englishProficiencyLevel: values.englishProficiencyLevel,

        // Knowledge Sharing, Community & Mentorship
        primaryGoals: emptyToUndefined(values.primaryGoals),
        skillsToGain: emptyToUndefined(values.skillsToGain),
        openToMentoring: emptyToUndefined(values.openToMentoring) as
          | "YES"
          | "NO"
          | "MAYBE"
          | undefined,
        mentorsToLearnFrom: emptyToUndefined(values.mentorsToLearnFrom),
        organizationsToConnect: emptyToUndefined(values.organizationsToConnect),

        // Technical Workshop
        technicalWorkshopTitle: emptyToUndefined(values.technicalWorkshopTitle),
        technicalWorkshopDescription: emptyToUndefined(
          values.technicalWorkshopDescription,
        ),
        technicalWorkshopDuration: emptyToUndefined(
          values.technicalWorkshopDuration,
        ),
        technicalWorkshopMaterials: emptyToUndefined(
          values.technicalWorkshopMaterials,
        ),

        // Beyond Work Activities
        beyondWorkInterests: emptyToUndefined(values.beyondWorkInterests),
        beyondWorkTitle: emptyToUndefined(values.beyondWorkTitle),
        beyondWorkDescription: emptyToUndefined(values.beyondWorkDescription),
        beyondWorkDuration: emptyToUndefined(values.beyondWorkDuration),
        beyondWorkMaterials: emptyToUndefined(values.beyondWorkMaterials),

        // Commitments & Confirmations
        participateExperiments: values.participateExperiments,
        mintHypercert: values.mintHypercert,
        interestedIncubation: values.interestedIncubation,
        liabilityWaiverConsent: values.liabilityWaiverConsent,
        codeOfConductAgreement: values.codeOfConductAgreement,
        communityActivitiesConsent: values.communityActivitiesConsent,

        // Additional Information
        additionalComments: emptyToUndefined(values.additionalComments),
      });

      notifications.show({
        title: "Onboarding Complete!",
        message:
          "Thank you for completing your onboarding. We'll be in touch soon with more details.",
        color: "green",
        icon: <IconCheck />,
      });

      setIsSubmitted(true);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "There was an error submitting your onboarding form. Please try again.";
      notifications.show({
        title: "Submission Failed",
        message: errorMessage,
        color: "red",
        icon: <IconX />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate completion percentage for key required fields
  const requiredFields = 7; // Core required fields - updated to match actual validation
  const completedFields = [
    form.values.emergencyContactName,
    form.values.arrivalDateTime,
    form.values.participateExperiments,
    form.values.mintHypercert,
    form.values.liabilityWaiverConsent,
    form.values.codeOfConductAgreement,
    form.values.communityActivitiesConsent,
  ].filter(Boolean).length;

  const completionPercentage = (completedFields / requiredFields) * 100;

  // Form completion tracking (debug logging removed for production)

  // Loading state
  if (isLoading) {
    return (
      <Container size="md" py="xl">
        <Center h={400}>
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text c="dimmed">Loading your onboarding information...</Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  // Completed state
  if (isSubmitted) {
    return (
      <Container size="md" py="xl">
        <Card shadow="sm" padding="xl" radius="md">
          <Stack align="center" gap="lg">
            <IconCheck size={64} color="green" />
            <Title order={2} ta="center">
              Onboarding Complete!
            </Title>
            <Text size="lg" ta="center" c="dimmed">
              Thank you for completing your onboarding, {applicantName}.
              We&apos;ll be in touch soon with more details about the residency.
            </Text>
          </Stack>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        {/* Bilingual Header */}
        <Card
          shadow="sm"
          padding="xl"
          radius="md"
          style={{
            background:
              "linear-gradient(135deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-purple-0) 100%)",
          }}
        >
          <Stack gap="lg">
            <div>
              <Title order={1} ta="center" c="blue.8" mb="sm">
                Congratulations! 🎉
              </Title>
              <Text size="lg" ta="center" fw={600} c="blue.7" mb="md">
                You&apos;re in! You&apos;ve been selected for the 2025 Builder
                Residency.
              </Text>

              <Text
                size="md"
                ta="center"
                c="dimmed"
                style={{ lineHeight: 1.6 }}
              >
                We can&apos;t wait to welcome you to Buenos Aires for three
                weeks of collaboration, creativity, and community. This form
                will help us get to know you better, prepare for your arrival,
                and make sure your experience is the best it can be.
              </Text>
            </div>

            <Divider />

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
              <div>
                <Text fw={600} c="blue.7">
                  Dates:
                </Text>
                <Text size="sm">October 24 – November 14, 2025</Text>
              </div>
              <div>
                <Text fw={600} c="blue.7">
                  Location:
                </Text>
                <Text size="sm">
                  Senador Dupont, JC23+9F Tigre, Buenos Aires Province,
                  Argentina
                </Text>
              </div>
              <div>
                <Text fw={600} c="blue.7">
                  Telegram Group:
                </Text>
                <Text size="sm">
                  <a
                    href="https://t.me/+L_kFV7eIdQ9mN2Iy"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--mantine-color-blue-6)" }}
                  >
                    Join Group
                  </a>
                </Text>
              </div>
            </SimpleGrid>

            <Divider />

            <Group justify="space-between" align="center">
              <div>
                <Text fw={500}>Progress</Text>
                <Text size="sm" c="dimmed">
                  {completedFields}/{requiredFields} required items completed
                </Text>
              </div>
              <Box w={200}>
                <Progress
                  value={completionPercentage}
                  size="lg"
                  radius="xl"
                  color="blue"
                />
                <Text size="xs" c="dimmed" ta="center" mt={4}>
                  {Math.round(completionPercentage)}%
                </Text>
              </Box>
            </Group>
          </Stack>
        </Card>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Accordion variant="filled" radius="md" defaultValue="contact">
            {/* Contact & Logistics */}
            <Accordion.Item value="contact">
              <Accordion.Control icon={<IconUser size={20} />}>
                <Title order={3}>Contact & Logistics</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text c="dimmed" mb="md">
                    Essential information for your arrival and stay.
                  </Text>

                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <TextInput
                      label="Blood Type"
                      description="Optional, for medical emergencies"
                      placeholder="e.g., O+, A-, AB+"
                      {...form.getInputProps("bloodType")}
                    />

                    <TextInput
                      label="Emergency Contact Name"
                      description="Someone we can contact in case of emergency"
                      placeholder="e.g., Jane Doe"
                      required
                      {...form.getInputProps("emergencyContactName")}
                    />
                  </SimpleGrid>

                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <TextInput
                      label="Emergency Contact Relationship"
                      description="Relationship to you"
                      placeholder="e.g., Parent, Spouse, Friend"
                      {...form.getInputProps("emergencyContactRelationship")}
                    />

                    <TextInput
                      label="Emergency Contact Phone"
                      description="Include country code"
                      placeholder="e.g., +1-555-123-4567"
                      {...form.getInputProps("emergencyContactPhone")}
                    />
                  </SimpleGrid>

                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <TextInput
                      label="Arrival Date & Time"
                      description="When will you arrive in Buenos Aires?"
                      placeholder="e.g., Oct 24, 2025 at 3:00 PM"
                      type="datetime-local"
                      required
                      {...form.getInputProps("arrivalDateTime")}
                    />

                    <TextInput
                      label="Departure Date & Time"
                      description="When will you depart?"
                      placeholder="e.g., Nov 14, 2025 at 10:00 AM"
                      type="datetime-local"
                      {...form.getInputProps("departureDateTime")}
                    />
                  </SimpleGrid>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Food & Dietary Needs */}
            <Accordion.Item value="food">
              <Accordion.Control icon={<IconHeart size={20} />}>
                <Title order={3}>Food & Dietary Needs</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text c="dimmed" mb="md">
                    Help us accommodate your dietary preferences and needs.
                  </Text>

                  <Radio.Group
                    label="Diet Type"
                    description="What best describes your diet?"
                    {...form.getInputProps("dietType")}
                  >
                    <Stack mt="xs" gap="xs">
                      <Radio value="OMNIVORE" label="Omnivore" />
                      <Radio value="VEGETARIAN" label="Vegetarian" />
                      <Radio value="VEGAN" label="Vegan" />
                      <Radio value="OTHER" label="Other" />
                    </Stack>
                  </Radio.Group>

                  {form.values.dietType === "OTHER" && (
                    <TextInput
                      label="Please specify"
                      placeholder="e.g., Pescatarian, Keto, etc."
                      {...form.getInputProps("dietTypeOther")}
                    />
                  )}

                  <Textarea
                    label="Allergies & Intolerances"
                    description="List any food allergies or intolerances"
                    placeholder="e.g., Nuts, shellfish, lactose intolerant... / ej., Nueces, mariscos, intolerante a la lactosa..."
                    minRows={2}
                    {...form.getInputProps("allergiesIntolerances")}
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* English Proficiency */}
            <Accordion.Item value="english">
              <Accordion.Control icon={<IconLanguage size={20} />}>
                <Title order={3}>English Proficiency</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text c="dimmed" mb="md">
                    Help us understand your English comfort level for workshops
                    and collaboration.
                  </Text>

                  <div>
                    <Text fw={500} mb="xs">
                      English Proficiency Level:{" "}
                      {form.values.englishProficiencyLevel}%
                    </Text>
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      marks={[
                        { value: 0, label: "Beginner" },
                        { value: 50, label: "Intermediate" },
                        { value: 100, label: "Fluent" },
                      ]}
                      {...form.getInputProps("englishProficiencyLevel")}
                    />
                    <br />
                    <Text size="sm" c="dimmed" mt="md">
                      Be honest - we want to support you!
                    </Text>
                  </div>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Knowledge Sharing, Community & Mentorship */}
            <Accordion.Item value="community">
              <Accordion.Control icon={<IconBrain size={20} />}>
                <Title order={3}>Knowledge Sharing & Community</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text c="dimmed" mb="md">
                    Tell us about your goals and how you&apos;d like to
                    contribute to the community.
                  </Text>

                  <Textarea
                    label="Primary Goals"
                    description="What are your main goals for the residency?"
                    placeholder="e.g., Build connections, advance my project, learn new skills..."
                    minRows={3}
                    {...form.getInputProps("primaryGoals")}
                  />

                  <Textarea
                    label="Skills to Gain"
                    description="What specific skills do you hope to develop?"
                    placeholder="e.g., Solidity programming, governance design, fundraising..."
                    minRows={2}
                    {...form.getInputProps("skillsToGain")}
                  />

                  <Radio.Group
                    label="Open to Mentoring Others?"
                    description="Would you be interested in mentoring other residents?"
                    {...form.getInputProps("openToMentoring")}
                  >
                    <Group mt="xs">
                      <Radio value="YES" label="Yes, I&apos;d love to!" />
                      <Radio value="MAYBE" label="Maybe" />
                      <Radio
                        value="NO"
                        label="No, I prefer to focus on learning"
                      />
                    </Group>
                  </Radio.Group>

                  <Textarea
                    label="Mentors to Learn From"
                    description="Are there specific people or types of experts you&apos;d like to connect with?"
                    placeholder="e.g., Smart contract auditors, DAO founders, impact measurement experts..."
                    minRows={2}
                    {...form.getInputProps("mentorsToLearnFrom")}
                  />

                  <Textarea
                    label="Organizations to Connect With"
                    description="Any specific organizations or communities you&apos;d like to connect with?"
                    placeholder="e.g., Gitcoin, Protocol Labs, local blockchain communities..."
                    minRows={2}
                    {...form.getInputProps("organizationsToConnect")}
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Technical Workshop */}
            <Accordion.Item value="workshop">
              <Accordion.Control icon={<IconPresentation size={20} />}>
                <Title order={3}>Technical Workshop</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text c="dimmed" mb="md">
                    Share your expertise! Propose a technical or non-technical
                    workshop you could run.
                  </Text>

                  <TextInput
                    label="Workshop Title"
                    description="What would you call your workshop?"
                    placeholder="e.g., Introduction to Zero-Knowledge Proofs"
                    {...form.getInputProps("technicalWorkshopTitle")}
                  />

                  <Textarea
                    label="Workshop Description"
                    description="What would you teach and why is it valuable?"
                    placeholder="Describe the content, learning objectives, and audience..."
                    minRows={4}
                    {...form.getInputProps("technicalWorkshopDescription")}
                  />

                  <TextInput
                    label="Duration"
                    description="How long would your workshop be?"
                    placeholder="e.g., 2 hours, Half day, 3 sessions of 1 hour each"
                    {...form.getInputProps("technicalWorkshopDuration")}
                  />

                  <Textarea
                    label="Materials Needed"
                    description="What equipment or setup would you need?"
                    placeholder="e.g., Projector, laptops with specific software, whiteboards..."
                    minRows={2}
                    {...form.getInputProps("technicalWorkshopMaterials")}
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Beyond Work Activities */}
            <Accordion.Item value="beyond">
              <Accordion.Control icon={<IconPalette size={20} />}>
                <Title order={3}>Beyond Work Activities</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text c="dimmed" mb="md">
                    Balance is important! What non-work activity would you like
                    to share or organize?
                  </Text>

                  <Textarea
                    label="Interests"
                    description="What do you enjoy doing outside of work?"
                    placeholder="e.g., Photography, cooking, music, sports, art..."
                    minRows={2}
                    {...form.getInputProps("beyondWorkInterests")}
                  />

                  <TextInput
                    label="Activity Title"
                    description="What activity could you lead or organize?"
                    placeholder="e.g., Morning Yoga Session, Photography Walk, Cooking Class..."
                    {...form.getInputProps("beyondWorkTitle")}
                  />

                  <Textarea
                    label="Activity Description"
                    description="Describe what participants would do and enjoy"
                    placeholder="What would make this fun and engaging for the group?"
                    minRows={3}
                    {...form.getInputProps("beyondWorkDescription")}
                  />

                  <TextInput
                    label="Duration"
                    description="How long would this activity take?"
                    placeholder="e.g., 1 hour, Evening session, Weekend morning"
                    {...form.getInputProps("beyondWorkDuration")}
                  />

                  <Textarea
                    label="Materials Needed"
                    description="What would you need to make this happen?"
                    placeholder="e.g., Yoga mats, camera equipment, kitchen access, music speakers..."
                    minRows={2}
                    {...form.getInputProps("beyondWorkMaterials")}
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Profile Setup */}
            <Accordion.Item value="profile">
              <Accordion.Control icon={<IconPhoto size={20} />}>
                <Title order={3}>Profile Setup</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text c="dimmed" mb="md">
                    Complete your profile to connect with other residents and
                    showcase your work.
                  </Text>

                  <Card
                    withBorder
                    p="lg"
                    style={{ backgroundColor: "var(--mantine-color-blue-0)" }}
                  >
                    <Stack gap="md">
                      <Group gap="sm">
                        <IconUser size={20} color="blue" />
                        <Text fw={600} c="blue.7">
                          Profile Management
                        </Text>
                      </Group>

                      <Text size="sm" c="dimmed">
                        Please update your profile information including your
                        bio, headshot, and project details through the platform
                        profile system.
                      </Text>

                      <Group gap="md">
                        <Button
                          component="a"
                          href="https://platform.fundingthecommons.io/profiles/me"
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="light"
                          color="blue"
                          leftSection={<IconUser size={16} />}
                        >
                          View My Profile
                        </Button>
                        <Button
                          component="a"
                          href="https://platform.fundingthecommons.io/profile/edit"
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="filled"
                          color="blue"
                          leftSection={<IconEdit size={16} />}
                        >
                          Edit Profile
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Final Confirmations */}
            <Accordion.Item value="confirmations">
              <Accordion.Control icon={<IconClipboardCheck size={20} />}>
                <Title order={3}>Final Confirmations</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text c="dimmed" mb="md">
                    Please read and confirm your agreement with our policies.
                  </Text>

                  {/* Residency Commitments */}
                  <Card
                    withBorder
                    p="md"
                    style={{ backgroundColor: "var(--mantine-color-blue-0)" }}
                  >
                    <Stack gap="md">
                      <Group gap="sm">
                        <IconHeart size={20} color="blue" />
                        <Text fw={600} c="blue.7">
                          Residency Commitments
                        </Text>
                      </Group>

                      <Checkbox
                        label="I commit to full participation in the residency, and will try to make it as productive and successful for myself and other participants as I can"
                        description="Active participation in collaborative experiments is a core part of the residency experience"
                        required
                        {...form.getInputProps("participateExperiments", {
                          type: "checkbox",
                        })}
                      />

                      <Checkbox
                        label="I commit to documenting my work and any projects I work on before, during and after the residency in order to help document and evaluate the impact of the residency and my contribution"
                        description="This includes setting milestones, minting hypercerts, making attestations etc."
                        required
                        {...form.getInputProps("mintHypercert", {
                          type: "checkbox",
                        })}
                      />

                      <Checkbox
                        label="I am interested in incubation for my project"
                        description="Optional: Express interest in potential incubation opportunities"
                        {...form.getInputProps("interestedIncubation", {
                          type: "checkbox",
                        })}
                      />

                      <Checkbox
                        label={
                          <Text>
                            I&apos;m interested in the{" "}
                            <Text
                              component="a"
                              href="https://platform.fundingthecommons.io/events/entrepreneur-in-residency"
                              target="_blank"
                              c="blue"
                              td="underline"
                            >
                              Entrepreneur in Residency (EIR) program
                            </Text>
                          </Text>
                        }
                        description="Optional: Express interest in the EIR program at Commons Lab"
                        {...form.getInputProps("interestedEIR", {
                          type: "checkbox",
                        })}
                      />
                    </Stack>
                  </Card>

                  {/* Legal & Safety */}
                  <Card
                    withBorder
                    p="md"
                    style={{ backgroundColor: "var(--mantine-color-orange-0)" }}
                  >
                    <Stack gap="md">
                      <Group gap="sm">
                        <IconShield size={20} color="orange" />
                        <Text fw={600} c="orange.7">
                          Legal & Safety
                        </Text>
                      </Group>

                      <Checkbox
                        label="I consent to the liability waiver and understand the risks"
                        description="I understand that I participate at my own risk and release FtC from liability"
                        required
                        {...form.getInputProps("liabilityWaiverConsent", {
                          type: "checkbox",
                        })}
                      />

                      <Checkbox
                        label="I agree to follow the Code of Conduct"
                        description="I commit to maintaining a respectful, inclusive, and safe environment"
                        required
                        {...form.getInputProps("codeOfConductAgreement", {
                          type: "checkbox",
                        })}
                      />

                      <Checkbox
                        label="I consent to participation in community activities and documentation"
                        description="This may include photos, videos, and other content for community building"
                        required
                        {...form.getInputProps("communityActivitiesConsent", {
                          type: "checkbox",
                        })}
                      />
                    </Stack>
                  </Card>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Additional Information */}
            <Accordion.Item value="additional">
              <Accordion.Control icon={<IconStar size={20} />}>
                <Title order={3}>Additional Information</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text c="dimmed" mb="md">
                    Is there anything else you&apos;d like us to know?
                  </Text>

                  <Textarea
                    label="Additional Comments"
                    description="Questions, special requests, accessibility needs, or anything else..."
                    placeholder="Optional comments..."
                    minRows={4}
                    {...form.getInputProps("additionalComments")}
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          {/* Submit Button */}
          <Card shadow="sm" padding="lg" radius="md" mt="xl">
            <Group justify="space-between" align="center">
              <div>
                <Text fw={500}>Ready to submit?</Text>
                <Text size="sm" c="dimmed">
                  Make sure all required items are completed.
                </Text>
                {/* Show validation errors clearly */}
                {!form.isValid() && (
                  <Stack gap="xs" mt="sm">
                    {Object.entries(form.errors).map(([field, error]) => (
                      <Text key={field} size="xs" c="red">
                        • {error}
                      </Text>
                    ))}
                  </Stack>
                )}
                {/* Show missing required fields when submit button is disabled */}
                {completionPercentage < 100 && (
                  <Stack gap="xs" mt="sm">
                    <Text size="xs" c="orange" fw={500}>
                      Missing required fields:
                    </Text>
                    {!form.values.emergencyContactName && (
                      <Text size="xs" c="orange">
                        • Emergency Contact Name
                      </Text>
                    )}
                    {!form.values.arrivalDateTime && (
                      <Text size="xs" c="orange">
                        • Arrival Date & Time
                      </Text>
                    )}
                    {!form.values.participateExperiments && (
                      <Text size="xs" c="orange">
                        • Participation commitment (Final Confirmations section)
                      </Text>
                    )}
                    {!form.values.mintHypercert && (
                      <Text size="xs" c="orange">
                        • Documentation commitment (Final Confirmations section)
                      </Text>
                    )}
                    {!form.values.liabilityWaiverConsent && (
                      <Text size="xs" c="orange">
                        • Liability waiver consent (Final Confirmations section)
                      </Text>
                    )}
                    {!form.values.codeOfConductAgreement && (
                      <Text size="xs" c="orange">
                        • Code of conduct agreement (Final Confirmations
                        section)
                      </Text>
                    )}
                    {!form.values.communityActivitiesConsent && (
                      <Text size="xs" c="orange">
                        • Community activities consent (Final Confirmations
                        section)
                      </Text>
                    )}
                  </Stack>
                )}
              </div>
              <div>
                <Button
                  type="submit"
                  size="lg"
                  loading={isSubmitting}
                  disabled={completionPercentage < 100}
                  leftSection={<IconCheck size={18} />}
                >
                  Complete Onboarding
                </Button>
                {completionPercentage < 100 && (
                  <Text size="xs" c="dimmed" ta="center" mt="xs">
                    {Math.round(completionPercentage)}% complete
                  </Text>
                )}
              </div>
            </Group>
          </Card>
        </form>
      </Stack>
    </Container>
  );
}
