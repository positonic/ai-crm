"use client";

import { useState, useEffect, useMemo } from "react";
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
  Select,
  MultiSelect,
  Checkbox,
  Grid,
  Badge,
  Alert,
  Progress,
  Center,
  Loader,
  FileInput,
  Avatar,
  Box,
  Modal,
  List,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconX,
  IconMicrophone,
  IconUser,
  IconLink,
  IconBrandLinkedin,
  IconBrandTwitter,
  IconBrandBluesky,
  IconWorld,
  IconVideo,
  IconBuilding,
  IconMessageCircle,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { getAvatarUrl, getAvatarInitials } from "~/utils/avatarUtils";
import { getDisplayName } from "~/utils/userDisplay";

const speakerApplicationSchema = z.object({
  // Session details
  talkTitle: z.string().min(1, "Session name is required").max(200),
  talkAbstract: z
    .string()
    .min(50, "Please provide at least 50 characters for your description")
    .max(2000),
  talkFormat: z
    .array(z.string())
    .min(1, "Please select at least one session type"),
  talkDuration: z
    .array(z.string())
    .min(1, "Please select at least one session length"),
  talkTopic: z.string().min(1, "Please specify the topic or track"),
  coHostInfo: z.string().max(2000).optional().or(z.literal("")),
  entityName: z.string().max(200).optional().or(z.literal("")),
  otherFloorsTopicTheme: z.string().max(2000).optional().or(z.literal("")),
  // Speaker info
  bio: z
    .string()
    .min(20, "Please provide at least 20 characters for your bio")
    .max(1000),
  previousSpeakingExperience: z.string().max(2000).optional().or(z.literal("")),
  // Profile fields
  preferredName: z.string().min(1, "Preferred name is required").max(100),
  jobTitle: z.string().min(1, "Job title or role is required").max(100),
  company: z.string().min(1, "Organization is required").max(100),
  displayPreference: z.string().max(500).optional().or(z.literal("")),
  // Links
  website: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  blueskyUrl: z.string().url().optional().or(z.literal("")),
  pastTalkUrl: z.string().url().optional().or(z.literal("")),
});

type SpeakerApplicationData = z.infer<typeof speakerApplicationSchema>;

export const talkFormatOptions = [
  { value: "Art Installation", label: "Art Installation" },
  { value: "Demonstration", label: "Demonstration" },
  { value: "DJ Set", label: "DJ Set" },
  { value: "Fireside Chat", label: "Fireside Chat" },
  { value: "Keynote", label: "Keynote" },
  { value: "Lightning Talk", label: "Lightning Talk" },
  { value: "Live Music", label: "Live Music" },
  { value: "Music Performance", label: "Music Performance" },
  { value: "Panel Discussion", label: "Panel Discussion" },
  { value: "Performance", label: "Performance" },
  { value: "Talk / Presentation", label: "Talk / Presentation" },
  { value: "Workshop", label: "Workshop" },
  { value: "Other", label: "Other" },
];

export const talkDurationOptions = [
  { value: "90", label: "90 minutes" },
  { value: "60", label: "60 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "20", label: "20 minutes" },
  { value: "other", label: "Other" },
];

export const ftcTopicOptions = [
  {
    value: "AI Governance and Coordination",
    label: "AI Governance and Coordination",
  },
  {
    value: "Economic Futures: Public Goods in the Age of AI",
    label: "Economic Futures: Public Goods in the Age of AI",
  },
  {
    value: "AI-Assisted Funding and Resource Allocation",
    label: "AI-Assisted Funding and Resource Allocation",
  },
  {
    value: "Open Infrastructure for Collective Intelligence",
    label: "Open Infrastructure for Collective Intelligence",
  },
  {
    value: "Applied Human-AI Collaboration",
    label: "Applied Human-AI Collaboration",
  },
  { value: "Other", label: "Other" },
];

export const speakerDateOptions = [
  { value: "2026-03-14", label: "Saturday, March 14" },
  { value: "2026-03-15", label: "Sunday, March 15" },
];

export const speakerTimeSlotOptions = [
  { value: "09:00-10:00", label: "9:00 - 10:00 AM" },
  { value: "10:00-11:00", label: "10:00 - 11:00 AM" },
  { value: "11:00-12:00", label: "11:00 AM - 12:00 PM" },
  { value: "12:00-13:00", label: "12:00 - 1:00 PM" },
  { value: "13:00-14:00", label: "1:00 - 2:00 PM" },
  { value: "14:00-15:00", label: "2:00 - 3:00 PM" },
  { value: "15:00-16:00", label: "3:00 - 4:00 PM" },
  { value: "16:00-17:00", label: "4:00 - 5:00 PM" },
  { value: "17:00-18:00", label: "5:00 - 6:00 PM" },
  { value: "18:00-19:00", label: "6:00 - 7:00 PM" },
];

interface SpeakerApplicationFormProps {
  eventId: string;
  eventName: string;
  eventType?: string;
  invitationToken?: string;
  existingApplicationStatus?: string;
  existingVenueIds?: string[];
  existingResponses?: Array<{
    id: string;
    answer: string;
    question: {
      id: string;
      questionKey: string;
    };
  }>;
}

export default function SpeakerApplicationForm({
  eventId,
  eventName,
  eventType,
  invitationToken,
  existingApplicationStatus,
  existingVenueIds,
  existingResponses,
}: SpeakerApplicationFormProps) {
  const router = useRouter();
  const isEIR = eventType === "EIR";
  const isOnBehalfUpdate =
    !!existingApplicationStatus && existingApplicationStatus !== "DRAFT";
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>([]);
  const [invitedByValue, setInvitedByValue] = useState<string[]>([]);
  const [invitedByOtherText, setInvitedByOtherText] = useState("");
  const [hasInitializedVenues, setHasInitializedVenues] = useState(false);
  const [hasInitializedProfile, setHasInitializedProfile] = useState(false);
  const [ftcTopicValues, setFtcTopicValues] = useState<string[]>([]);
  const [ftcTopicOtherText, setFtcTopicOtherText] = useState("");
  const [durationOtherText, setDurationOtherText] = useState("");
  const [sessionTypeOtherText, setSessionTypeOtherText] = useState("");
  const [preferredDates, setPreferredDates] = useState<string[]>([]);
  const [preferredTimes, setPreferredTimes] = useState("");
  const [questionResponses, setQuestionResponses] = useState<
    Record<string, string>
  >({});
  const [hasInitializedResponses, setHasInitializedResponses] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [floorsModalOpen, setFloorsModalOpen] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  const [questionErrors, setQuestionErrors] = useState<Record<string, string>>(
    {},
  );
  const { data: config } = api.config.getPublicConfig.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Fetch available venues/floors for this event
  const { data: scheduleFilters, isLoading: isLoadingFilters } =
    api.schedule.getEventScheduleFilters.useQuery(
      { eventId },
      { refetchOnWindowFocus: false },
    );

  // Stabilize useMemo deps with stringified ID keys to prevent cascading re-renders on refetch
  const venueIdKey = scheduleFilters?.venues?.map((v) => v.id).join(",") ?? "";
  const fmIdKey =
    scheduleFilters?.floorManagers?.map((fm) => fm.id).join(",") ?? "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const venues = useMemo(() => scheduleFilters?.venues ?? [], [venueIdKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const floorManagers = useMemo(
    () => scheduleFilters?.floorManagers ?? [],
    [fmIdKey],
  );

  // If invited, fetch inviter's venues for pre-selection
  const { data: inviterVenues } = api.application.getInviterVenues.useQuery(
    { invitationToken: invitationToken!, eventId },
    { enabled: !!invitationToken, refetchOnWindowFocus: false },
  );

  // Memoize venue select data to avoid creating new arrays every render
  const venueSelectData = useMemo(
    () =>
      venues.map((venue) => ({
        value: venue.id,
        label: `${venue.name}${inviterVenues?.some((v) => v.id === venue.id) ? " (invited)" : ""}`,
      })),
    [venues, inviterVenues],
  );

  // Memoize session type select data
  const sessionTypeSelectData = useMemo(
    () =>
      (scheduleFilters?.sessionTypes ?? []).length > 0
        ? scheduleFilters!.sessionTypes.map((st) => ({
            value: st.name,
            label: st.name,
          }))
        : talkFormatOptions,
    [scheduleFilters],
  );

  // Build "Who invited you?" multi-select options from floor leads
  const inviterOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];

    for (const fm of floorManagers) {
      const displayName = getDisplayName(fm, "Unknown");

      const managerVenueNames = venues
        .filter((v) => fm.venueIds.includes(v.id))
        .map((v) => v.name.replace(/\s*\(([^)]+)\)/, ", $1"));

      const label =
        managerVenueNames.length > 0
          ? `${displayName} (${managerVenueNames.join(", ")})`
          : fm.roleLabel
            ? `${displayName} (${fm.roleLabel})`
            : displayName;

      options.push({ value: fm.id, label });
    }

    options.push({ value: "other", label: "Other" });
    return options;
  }, [floorManagers, venues]);

  // Check if any selected venue is a "Funding the Commons" floor
  const isFtcVenue = useMemo(() => {
    if (selectedVenueIds.length === 0) return false;
    return selectedVenueIds.some((id) => {
      const venue = venues.find((v) => v.id === id);
      return venue?.name.toLowerCase().includes("funding the commons") ?? false;
    });
  }, [selectedVenueIds, venues]);

  // Pre-select inviter's venues and floor lead once when arriving via invitation
  useEffect(() => {
    if (!hasInitializedVenues) {
      // Priority 1: invitation-based venue pre-selection
      if (
        inviterVenues &&
        inviterVenues.length > 0 &&
        floorManagers.length > 0
      ) {
        setHasInitializedVenues(true);
        setSelectedVenueIds([inviterVenues[0]!.id]);

        // Auto-select the inviting floor lead
        const inviterManager = floorManagers.find((fm) =>
          inviterVenues.some((v) => fm.venueIds.includes(v.id)),
        );
        if (inviterManager) {
          setInvitedByValue([inviterManager.id]);
        }
      }
      // Priority 2: existing application venue pre-selection (on-behalf speakers)
      else if (existingVenueIds && existingVenueIds.length > 0) {
        setHasInitializedVenues(true);
        setSelectedVenueIds(existingVenueIds);
      }
    }
  }, [hasInitializedVenues, inviterVenues, floorManagers, existingVenueIds]);

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

  // Fetch event-specific application questions (for dynamic Step 4)
  const { data: eventQuestions } = api.application.getEventQuestions.useQuery(
    { eventId },
    { refetchOnWindowFocus: false },
  );

  const createApplication = api.application.createApplication.useMutation();
  const submitApplication = api.application.submitApplication.useMutation();
  const updateProfile = api.profile.updateProfile.useMutation();
  const bulkUpdateResponses =
    api.application.bulkUpdateApplicationResponses.useMutation();

  // Fetch existing profile for pre-populating form (one-time initialization only)
  const { data: existingProfile } = api.profile.getMyProfile.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: Infinity,
      retry: false,
    },
  );

  // Dynamic step count: show Step 4 (About You) only if event has questions and is not EIR
  const totalSteps = !isEIR && eventQuestions && eventQuestions.length > 0 ? 4 : 3;

  const form = useForm<SpeakerApplicationData>({
    validate: zodResolver(speakerApplicationSchema),
    initialValues: {
      talkTitle: "",
      talkAbstract: "",
      talkFormat: [],
      talkDuration: [],
      talkTopic: "",
      coHostInfo: "",
      entityName: "",
      otherFloorsTopicTheme: "",
      bio: "",
      previousSpeakingExperience: "",
      preferredName: "",
      jobTitle: "",
      company: "",
      displayPreference: "",
      website: "",
      linkedinUrl: "",
      twitterUrl: "",
      blueskyUrl: "",
      pastTalkUrl: "",
    },
  });

  // Pre-populate form from existing profile data (for on-behalf speakers)
  useEffect(() => {
    if (!hasInitializedProfile && existingProfile) {
      setHasInitializedProfile(true);
      const p = existingProfile;
      if (!form.values.talkTitle && p.speakerTalkTitle)
        form.setFieldValue("talkTitle", p.speakerTalkTitle);
      if (!form.values.talkAbstract && p.speakerTalkAbstract)
        form.setFieldValue("talkAbstract", p.speakerTalkAbstract);
      if (form.values.talkFormat.length === 0 && p.speakerTalkFormat) {
        const formats = p.speakerTalkFormat.split(", ").filter(Boolean);
        const otherFormat = formats.find((f) => f.startsWith("Other: "));
        if (otherFormat) {
          setSessionTypeOtherText(otherFormat.replace("Other: ", ""));
          form.setFieldValue(
            "talkFormat",
            formats.map((f) => (f.startsWith("Other: ") ? "Other" : f)),
          );
        } else {
          form.setFieldValue("talkFormat", formats);
        }
      }
      if (form.values.talkDuration.length === 0 && p.speakerTalkDuration) {
        const durations = p.speakerTalkDuration.split(", ").filter(Boolean);
        const knownValues = talkDurationOptions.map((o) => o.value);
        const known = durations.filter((d) => knownValues.includes(d));
        const unknown = durations.filter((d) => !knownValues.includes(d));
        if (unknown.length > 0) {
          known.push("other");
          setDurationOtherText(unknown.join(", "));
        }
        form.setFieldValue("talkDuration", known);
      }
      if (!form.values.talkTopic && p.speakerTalkTopic)
        form.setFieldValue("talkTopic", p.speakerTalkTopic);
      if (!form.values.bio && p.bio) form.setFieldValue("bio", p.bio);
      if (
        !form.values.previousSpeakingExperience &&
        p.speakerPreviousExperience
      )
        form.setFieldValue(
          "previousSpeakingExperience",
          p.speakerPreviousExperience,
        );
      if (!form.values.preferredName && p.user?.name)
        form.setFieldValue("preferredName", p.user.name);
      if (!form.values.jobTitle && p.jobTitle)
        form.setFieldValue("jobTitle", p.jobTitle);
      if (!form.values.company && p.company)
        form.setFieldValue("company", p.company);
      if (!form.values.website && p.website)
        form.setFieldValue("website", p.website);
      if (!form.values.linkedinUrl && p.linkedinUrl)
        form.setFieldValue("linkedinUrl", p.linkedinUrl);
      if (!form.values.twitterUrl && p.twitterUrl)
        form.setFieldValue("twitterUrl", p.twitterUrl);
      if (!form.values.blueskyUrl && p.blueskyUrl)
        form.setFieldValue("blueskyUrl", p.blueskyUrl);
      if (!form.values.pastTalkUrl && p.speakerPastTalkUrl)
        form.setFieldValue("pastTalkUrl", p.speakerPastTalkUrl);
      if (!form.values.entityName && p.speakerEntityName)
        form.setFieldValue("entityName", p.speakerEntityName);
      if (!form.values.displayPreference && p.speakerDisplayPreference)
        form.setFieldValue("displayPreference", p.speakerDisplayPreference);
      if (!form.values.otherFloorsTopicTheme && p.speakerOtherFloorsTopicTheme)
        form.setFieldValue(
          "otherFloorsTopicTheme",
          p.speakerOtherFloorsTopicTheme,
        );
      if (!form.values.coHostInfo && p.speakerCoHostInfo)
        form.setFieldValue("coHostInfo", p.speakerCoHostInfo);
      // Pre-populate avatar URL from profile
      if (!avatarUrl) {
        const profileAvatarUrl = p.avatarUrl ?? p.user?.image ?? null;
        if (profileAvatarUrl) setAvatarUrl(profileAvatarUrl);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitializedProfile, existingProfile]);

  // Pre-populate dynamic question responses from existing application
  useEffect(() => {
    if (
      !hasInitializedResponses &&
      existingResponses &&
      existingResponses.length > 0 &&
      eventQuestions
    ) {
      setHasInitializedResponses(true);
      const initialResponses: Record<string, string> = {};
      for (const response of existingResponses) {
        initialResponses[response.question.questionKey] = response.answer;
      }
      setQuestionResponses(initialResponses);
    }
  }, [hasInitializedResponses, existingResponses, eventQuestions]);

  // For EIR events, auto-set hidden session fields so Zod validation passes
  useEffect(() => {
    if (isEIR) {
      form.setFieldValue("talkTitle", "EIR Application");
      form.setFieldValue("talkFormat", ["EIR"]);
      form.setFieldValue("talkDuration", ["N/A"]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEIR]);

  const handleAvatarUpload = async (file: File | null) => {
    if (!file) return;

    // Show instant client-side preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

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
      setAvatarUrl(result.avatarUrl);

      // Reset FileInput so user can select a different file
      setFileInputKey((prev) => prev + 1);

      notifications.show({
        title: "Photo Uploaded",
        message: "Your profile picture has been uploaded successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      notifications.show({
        title: "Upload Failed",
        message:
          error instanceof Error
            ? error.message
            : "Failed to upload photo. Please try again.",
        color: "red",
        icon: <IconX size={16} />,
        autoClose: 8000,
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (values: SpeakerApplicationData) => {
    setIsSubmitting(true);

    try {
      // Step 1: Create speaker application record
      const application = await createApplication.mutateAsync({
        eventId,
        applicationType: "SPEAKER",
        language: "en",
        invitationToken,
      });

      // Step 2: Update profile with speaker info
      await updateProfile.mutateAsync({
        preferredName: values.preferredName,
        bio: values.bio,
        jobTitle: values.jobTitle,
        company: values.company,
        website: values.website,
        linkedinUrl: values.linkedinUrl,
        twitterUrl: values.twitterUrl,
        blueskyUrl: values.blueskyUrl,
        speakerTalkTitle: values.talkTitle,
        speakerTalkAbstract: values.talkAbstract,
        speakerTalkFormat: values.talkFormat
          .map((f) =>
            f === "Other" && sessionTypeOtherText.trim()
              ? `Other: ${sessionTypeOtherText.trim()}`
              : f,
          )
          .join(", "),
        speakerTalkDuration: values.talkDuration
          .map((d) => (d === "other" ? durationOtherText : d))
          .join(", "),
        speakerTalkTopic: values.talkTopic,
        speakerPreviousExperience: values.previousSpeakingExperience,
        speakerPastTalkUrl: values.pastTalkUrl,
        speakerCoHostInfo: values.coHostInfo,
        speakerEntityName: values.entityName,
        speakerOtherFloorsTopicTheme: values.otherFloorsTopicTheme,
        speakerDisplayPreference: values.displayPreference,
      });

      // Step 3: Save dynamic question responses (if any)
      if (eventQuestions && eventQuestions.length > 0) {
        const responsesToSave = eventQuestions
          .filter((q) => {
            const answer = questionResponses[q.questionKey];
            return answer && answer.trim().length > 0;
          })
          .map((q) => ({
            questionId: q.id,
            answer: questionResponses[q.questionKey]!.trim(),
          }));

        if (responsesToSave.length > 0) {
          await bulkUpdateResponses.mutateAsync({
            applicationId: application.id,
            responses: responsesToSave,
          });
        }
      }

      // Step 4: Submit the application (DRAFT → SUBMITTED) with venue selections
      // Build invited-by fields from multi-select
      const nonOtherInviters = invitedByValue.filter((v) => v !== "other");
      const primaryInviterId = nonOtherInviters[0];
      const additionalInviterNames = nonOtherInviters.slice(1).map((id) => {
        const opt = inviterOptions.find((o) => o.value === id);
        return opt?.label ?? id;
      });
      const otherParts: string[] = [];
      if (additionalInviterNames.length > 0)
        otherParts.push(additionalInviterNames.join(", "));
      if (invitedByValue.includes("other") && invitedByOtherText.trim())
        otherParts.push(invitedByOtherText.trim());

      await submitApplication.mutateAsync({
        applicationId: application.id,
        venueIds: selectedVenueIds.length > 0 ? selectedVenueIds : undefined,
        speakerInvitedByUserId: primaryInviterId ?? undefined,
        speakerInvitedByOther:
          otherParts.length > 0 ? otherParts.join("; ") : undefined,
        speakerPreferredDates:
          preferredDates.length > 0 ? preferredDates.join(",") : undefined,
        speakerPreferredTimes: preferredTimes.trim() || undefined,
      });

      // All steps succeeded - show success and redirect
      notifications.show({
        title: isOnBehalfUpdate
          ? "Application Updated!"
          : isEIR
            ? "EIR Application Submitted!"
            : "Speaker Application Submitted!",
        message: isOnBehalfUpdate
          ? `Your ${isEIR ? "EIR" : "speaker"} details have been updated successfully.`
          : `Your ${isEIR ? "EIR" : "speaker"} application has been submitted successfully. We will review it and get back to you.`,
        color: "green",
        icon: <IconCheck size={16} />,
      });

      router.push(`/events/${eventId}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `There was an error submitting your ${isEIR ? "EIR" : "speaker"} application. Please try again.`;
      notifications.show({
        title: "Submission Failed",
        message,
        color: "red",
        icon: <IconX size={16} />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepFields = (step: number): (keyof SpeakerApplicationData)[] => {
    switch (step) {
      case 1:
        return ["preferredName", "bio", "jobTitle", "company"]; // Speaker Profile
      case 2:
        return [
          "website",
          "linkedinUrl",
          "twitterUrl",
          "blueskyUrl",
          "pastTalkUrl",
        ]; // Links (optional but validate URL format)
      default:
        // About You is always the last step (when it exists)
        if (step === totalSteps && totalSteps === 4) return []; // About You (dynamic questions)
        // Session Details / EIR Questions is step 3
        if (step === 3) {
          if (isEIR) return ["talkAbstract", "talkTopic"];
          return [
            "talkTitle",
            "talkAbstract",
            "talkFormat",
            "talkDuration",
            "talkTopic",
          ];
        }
        return [
          "talkTitle",
          "talkAbstract",
          "talkFormat",
          "talkDuration",
          "talkTopic",
        ]; // Session Details (last step when no questions)
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      const isValid = getStepValidation(currentStep);
      if (isValid) {
        setProfileImageError(false);
        setCurrentStep((prev) => prev + 1);
      } else {
        // Only validate current step's fields, not the entire form
        for (const field of getStepFields(currentStep)) {
          form.validateField(field);
        }
        // Show profile image error on step 1 (Speaker Profile) if missing
        if (currentStep === 1 && !(avatarUrl ?? previewUrl)) {
          setProfileImageError(true);
        }
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
      case 1: // Speaker Profile
        return (
          form.values.preferredName.trim().length > 0 &&
          form.values.bio.length >= 20 &&
          form.values.jobTitle.trim().length > 0 &&
          form.values.company.trim().length > 0 &&
          !!(avatarUrl ?? previewUrl)
        );
      case 2: {
        // Links - all optional, but must be valid URLs if provided
        const urlFields = [
          form.values.website,
          form.values.linkedinUrl,
          form.values.twitterUrl,
          form.values.blueskyUrl,
          form.values.pastTalkUrl,
        ];
        return urlFields.every((val) => {
          if (!val || val.trim() === "") return true;
          try {
            new URL(val);
            return true;
          } catch {
            return false;
          }
        });
      }
      default: {
        // Step 3: Session Details or EIR Questions
        if (step === 3) {
          if (isEIR) {
            return (
              form.values.talkAbstract.length >= 50 &&
              (form.values.previousSpeakingExperience?.trim().length ?? 0) >
                0 &&
              form.values.talkTopic.trim().length > 0 &&
              (form.values.coHostInfo?.trim().length ?? 0) > 0
            );
          }
          return (
            form.values.talkTitle.length > 0 &&
            form.values.talkAbstract.length >= 50 &&
            form.values.talkFormat.length > 0 &&
            form.values.talkDuration.length > 0 &&
            form.values.talkTopic.length > 0 &&
            // If "Other" session type selected, require the fill-in text
            (!form.values.talkFormat.includes("Other") ||
              sessionTypeOtherText.trim().length > 0) &&
            // If FtC venue with "Other" selected, require the fill-in text
            (!isFtcVenue ||
              !ftcTopicValues.includes("Other") ||
              ftcTopicOtherText.trim().length > 0)
          );
        }
        // About You (step 4 when totalSteps === 4)
        if (!eventQuestions) return true;
        return eventQuestions
          .filter((q) => q.required)
          .every((q) => questionResponses[q.questionKey]?.trim());
      }
    }
  };

  const validateAboutYouQuestions = (): boolean => {
    if (totalSteps !== 4 || !eventQuestions) return true;
    const errors: Record<string, string> = {};
    for (const q of eventQuestions) {
      if (q.required && !questionResponses[q.questionKey]?.trim()) {
        errors[q.questionKey] = "This field is required";
      }
    }
    setQuestionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const renderEIRQuestions = () => {
    return (
      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <Stack gap="lg">
          <Group gap="md" align="center">
            <IconMessageCircle size={28} color="var(--mantine-color-teal-6)" />
            <div>
              <Title order={3}>EIR Questions</Title>
              <Text size="sm" c="dimmed">
                Tell us about your interest in the EIR program
              </Text>
            </div>
          </Group>

          <Grid>
            <Grid.Col span={12}>
              <Textarea
                label="Why do you want to be in EIR?"
                placeholder="Tell us about your motivation for joining the Entrepreneur in Residence program..."
                minRows={4}
                maxRows={8}
                {...form.getInputProps("talkAbstract")}
                required
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Textarea
                label="What experience do you have as an entrepreneur and / or initiating projects and seeing them through to the end?"
                placeholder="Describe your entrepreneurial experience and track record..."
                minRows={4}
                maxRows={8}
                {...form.getInputProps("previousSpeakingExperience")}
                required
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Textarea
                label="What is the future of public goods funding in your opinion?"
                placeholder="Share your vision for the future of public goods funding..."
                minRows={4}
                maxRows={8}
                {...form.getInputProps("talkTopic")}
                required
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Textarea
                label="What are the biggest co-ordination challenges we face as a society in 2026 and beyond?"
                placeholder="Describe the coordination challenges you see facing society..."
                minRows={4}
                maxRows={8}
                {...form.getInputProps("coHostInfo")}
                required
              />
            </Grid.Col>
          </Grid>
        </Stack>
      </Card>
    );
  };

  const renderSessionDetails = () => {
    if (isLoadingFilters) {
      return (
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Center h={200}>
            <Stack align="center" gap="md">
              <Loader size="md" />
              <Text c="dimmed" size="sm">
                Loading form data...
              </Text>
            </Stack>
          </Center>
        </Card>
      );
    }
    return (
      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <Stack gap="lg">
          <Group gap="md" align="center">
            <IconMicrophone size={28} color="var(--mantine-color-teal-6)" />
            <div>
              <Title order={3}>Session Details</Title>
              <Text size="sm" c="dimmed">
                Tell us about your session
              </Text>
            </div>
          </Group>

          <Grid>
            <Grid.Col span={12}>
              <TextInput
                label="Session Name"
                placeholder="Enter the name of your proposed session"
                description="This can be changed later, but please put a title broadly describing what your session will be about"
                {...form.getInputProps("talkTitle")}
                required
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <TextInput
                label="Name of Artist, Entity, or Group"
                placeholder="Enter the name as you want it to appear in scheduling and descriptions"
                description="If the name of the entity hosting the session is different than your name, please type it below as you want it to appear in scheduling and descriptions."
                {...form.getInputProps("entityName")}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Textarea
                label="Is anyone else hosting the session with you? If so, share further context and contact information for them."
                description="Please provide a name, email address, and social media link or portfolio about additional speakers, presenters, facilitators or performers joining you as a session host"
                placeholder="e.g., Jane Doe, jane@example.com, linkedin.com/in/janedoe"
                minRows={3}
                maxRows={6}
                {...form.getInputProps("coHostInfo")}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Textarea
                label="Session Description"
                placeholder="Describe what your session will cover, key takeaways for the audience, and why this topic matters..."
                description="This can be changed later, but please provide a brief description of what your session will cover (minimum 50 characters)"
                minRows={5}
                maxRows={10}
                {...form.getInputProps("talkAbstract")}
                required
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <MultiSelect
                label="Session Type"
                placeholder="Select session types"
                description="Select from the dropdown all the formats that could work for your session"
                data={sessionTypeSelectData}
                {...form.getInputProps("talkFormat")}
                required
              />
              {form.values.talkFormat.includes("Other") && (
                <TextInput
                  label="Other Session Type"
                  description={
                    'If you selected "Other" for Session Type or Duration, please clarify below'
                  }
                  placeholder="Describe your session type..."
                  value={sessionTypeOtherText}
                  onChange={(e) =>
                    setSessionTypeOtherText(e.currentTarget.value)
                  }
                  mt="sm"
                  required
                />
              )}
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <MultiSelect
                label="Session Length"
                placeholder="Select session lengths"
                description="Select from the dropdown all the durations that could work for your session"
                data={talkDurationOptions}
                {...form.getInputProps("talkDuration")}
                required
              />
              {form.values.talkDuration.includes("other") && (
                <TextInput
                  label="Other Session Length"
                  placeholder="e.g., 2 hours, half day..."
                  value={durationOtherText}
                  onChange={(e) => setDurationOtherText(e.currentTarget.value)}
                  mt="sm"
                  required
                />
              )}
            </Grid.Col>

            {venues.length > 0 && (
              <Grid.Col span={12}>
                <MultiSelect
                  label="Intelligence at the Frontier hosts curated content from many floors at Frontier Tower, each with their own theme, programming and speaker lineup curated by a Floor Lead. Which floors are you applying to speak on?"
                  placeholder="Select floors"
                  description={
                    <>
                      If you were invited to speak, please select the floor you
                      were invited to speak on. For more information about the
                      floors at IatF,{" "}
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setFloorsModalOpen(true);
                        }}
                        style={{
                          color: "var(--mantine-color-teal-6)",
                          cursor: "pointer",
                        }}
                      >
                        click here
                      </a>
                      .
                    </>
                  }
                  data={venueSelectData}
                  value={selectedVenueIds}
                  onChange={(vals) => {
                    setSelectedVenueIds(vals);
                    // Reset topic fields when venue selection changes
                    form.setFieldValue("talkTopic", "");
                    setFtcTopicValues([]);
                    setFtcTopicOtherText("");
                  }}
                  clearable
                  searchable
                  leftSection={
                    <IconBuilding
                      size={16}
                      color="var(--mantine-color-teal-6)"
                    />
                  }
                />
              </Grid.Col>
            )}

            <Modal
              opened={floorsModalOpen}
              onClose={() => setFloorsModalOpen(false)}
              title="Floors at Intelligence at the Frontier"
              size="lg"
            >
              <Stack gap="md">
                <List spacing="lg" listStyleType="none">
                  <List.Item>
                    <Text fw={600}>Spaceship (Floor 2)</Text>
                    <Text size="sm" c="dimmed">
                      The main stage. AI-assisted funding, public AI
                      infrastructure, and the coordination systems humanity
                      needs to ensure intelligence serves everyone.
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text fw={600}>Robotics &amp; Hard Tech (Floor 4)</Text>
                    <Text size="sm" c="dimmed">
                      36-hour overnight hackathon with Protocol Labs.
                      Open-source robotics, physical AI, and the question of who
                      funds hardware for human flourishing.
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text fw={600}>Arts &amp; Music (Floor 6)</Text>
                    <Text size="sm" c="dimmed">
                      Creativity can&apos;t be automated. Curated gallery, talks
                      on technology and the arts, live music performances into
                      the evening.
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text fw={600}>Maker Space (Floor 7)</Text>
                    <Text size="sm" c="dimmed">
                      4,000 sq ft prototyping lab with laser cutters, 3D
                      printers, and CNCs. Turn ideas into prototypes in minutes.
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text fw={600}>Neuro &amp; Biotech (Floor 8)</Text>
                    <Text size="sm" c="dimmed">
                      Tools to heal people and the planet. Community biolab with
                      hands-on workshops: test your own genetics, test your
                      local water supply, hear how founders cured their own
                      diseases.
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text fw={600}>AI &amp; Autonomous Systems (Floor 9)</Text>
                    <Text size="sm" c="dimmed">
                      Can we build intelligence that amplifies human agency
                      instead of replacing it? Hands-on workshops, motion
                      capture demos, GPU compute, and salons exploring
                      post-labor economics.
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text fw={600}>Health &amp; Longevity (Floor 11)</Text>
                    <Text size="sm" c="dimmed">
                      Live long enough to see the far future. Biotech demos,
                      longevity research talks, and the community building Viva
                      City.
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text fw={600}>Ethereum House (Floor 12)</Text>
                    <Text size="sm" c="dimmed">
                      Live funding experiments in action. Quadratic funding
                      rounds, open agent economy demos (ERC-8004), and working
                      sessions where researchers and builders leave with grants.
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text fw={600}>Flourishing (Floor 14)</Text>
                    <Text size="sm" c="dimmed">
                      Inner, relational and cultural commons on March 14th;
                      Earth Commons on March 15th. Explore climate finance,
                      bioregionalism, alternative capital systems design,
                      embodied and relational practices, and cross-disciplinary
                      dialogue on whether AI can serve life instead of just
                      optimizing it.
                    </Text>
                  </List.Item>
                </List>
              </Stack>
            </Modal>

            {inviterOptions.length > 1 && (
              <Grid.Col span={12}>
                <MultiSelect
                  label="Who invited you?"
                  placeholder="Select who invited you"
                  description="If you were invited by a floor lead, please select their name(s)"
                  data={inviterOptions}
                  value={invitedByValue}
                  onChange={(vals) => {
                    setInvitedByValue(vals);
                    if (!vals.includes("other")) {
                      setInvitedByOtherText("");
                    }
                    // Auto-select venue from the most recently added inviter
                    const lastVal = vals[vals.length - 1];
                    if (lastVal && lastVal !== "other") {
                      const fm = floorManagers.find((m) => m.id === lastVal);
                      if (fm && fm.venueIds.length > 0) {
                        setSelectedVenueIds([fm.venueIds[0]!]);
                      }
                    }
                  }}
                  clearable
                  searchable
                />
              </Grid.Col>
            )}

            {invitedByValue.includes("other") && (
              <Grid.Col span={12}>
                <TextInput
                  label="Who invited you? (please specify)"
                  placeholder="Enter the name of the person who invited you"
                  value={invitedByOtherText}
                  onChange={(e) => setInvitedByOtherText(e.currentTarget.value)}
                />
              </Grid.Col>
            )}

            <Grid.Col span={12}>
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
                      onChange={(e) =>
                        setFtcTopicOtherText(e.currentTarget.value)
                      }
                      mt="sm"
                      required
                    />
                  )}
                  <Textarea
                    label="Other Floors Topic/Theme"
                    description="If you checked any boxes above besides Floor 2 (Funding the Commons), write a few keywords or a brief sentence about which topics/themes your session covers"
                    placeholder="e.g., AI governance, open source sustainability..."
                    minRows={2}
                    maxRows={4}
                    mt="sm"
                    {...form.getInputProps("otherFloorsTopicTheme")}
                  />
                </>
              ) : (
                <TextInput
                  label="Topic / Track"
                  placeholder="Please share which topic areas your proposed session fits into"
                  description="Please share which topic areas your proposed session fits into"
                  {...form.getInputProps("talkTopic")}
                  required
                />
              )}
            </Grid.Col>

            <Grid.Col span={12}>
              <Checkbox.Group
                label="Which day(s) are you available?"
                description="Select all days you could present (March 14-15, 2026)"
                value={preferredDates}
                onChange={setPreferredDates}
              >
                <Group gap="md" mt="xs">
                  {speakerDateOptions.map((option) => (
                    <Checkbox
                      key={option.value}
                      value={option.value}
                      label={option.label}
                    />
                  ))}
                </Group>
              </Checkbox.Group>
            </Grid.Col>

            <Grid.Col span={12}>
              <Textarea
                label="Do you have any hard constraints on your availability during March 14-15 from 10 am - 6 pm? Please indicate them here"
                placeholder="ex: I am unable to stay longer than 3 pm on March 14 because of my flight time"
                value={preferredTimes}
                onChange={(e) => setPreferredTimes(e.currentTarget.value)}
                minRows={2}
                maxRows={4}
              />
            </Grid.Col>
          </Grid>
        </Stack>
      </Card>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: // Speaker Profile
        return (
          <Stack gap="xl">
            <Card shadow="sm" padding="xl" radius="md" withBorder>
              <Stack gap="lg">
                <Group gap="md" align="center">
                  <IconUser size={28} color="var(--mantine-color-blue-6)" />
                  <div>
                    <Title order={3}>{isEIR ? "Your Profile" : "Speaker Profile"}</Title>
                    <Text size="sm" c="dimmed">
                      Tell us about yourself
                    </Text>
                  </div>
                </Group>

                <Grid>
                  <Grid.Col span={12}>
                    <TextInput
                      label="Preferred Name"
                      description="Please keep in mind that it will appear in the following format: James Farrell, Funding the Commons, CTO"
                      placeholder="How you'd like your name to appear"
                      withAsterisk
                      {...form.getInputProps("preferredName")}
                    />
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <Text size="sm" fw={500} mb="xs">
                      Profile Picture{" "}
                      <Text component="span" c="red" size="sm">
                        *
                      </Text>
                    </Text>
                    <Group gap="md" align="flex-start">
                      <Avatar
                        src={
                          previewUrl ??
                          getAvatarUrl({
                            customAvatarUrl: avatarUrl,
                            oauthImageUrl: existingProfile?.user?.image,
                            name: existingProfile?.user?.name,
                            email: existingProfile?.user?.email,
                          })
                        }
                        size="xl"
                        radius="md"
                      >
                        {getAvatarInitials({
                          name: existingProfile?.user?.name,
                          email: existingProfile?.user?.email,
                        })}
                      </Avatar>
                      <Stack style={{ flex: 1 }}>
                        <FileInput
                          key={fileInputKey}
                          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                          placeholder="Choose image file"
                          label="Upload a profile photo"
                          description="JPG, PNG, GIF, or WebP (max 5MB)"
                          onChange={(file) => {
                            setProfileImageError(false);
                            void handleAvatarUpload(file);
                          }}
                          disabled={isUploading}
                          error={
                            profileImageError
                              ? "Profile picture is required"
                              : undefined
                          }
                          required
                        />
                        {isUploading && (
                          <Box>
                            <Text size="sm" mb="xs">
                              Uploading...
                            </Text>
                            <Progress value={uploadProgress} size="sm" />
                          </Box>
                        )}
                      </Stack>
                    </Group>
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Primary Job Title or Role"
                      placeholder="Software Engineer, Researcher, etc."
                      required
                      {...form.getInputProps("jobTitle")}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Primary Organization"
                      placeholder="Your current organization"
                      required
                      {...form.getInputProps("company")}
                    />
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <Textarea
                      label="Preferred Display Format"
                      description="We know that many of our community members wear a multitude of hats. If your role doesn&apos;t fit neatly into &quot;Title, Organization&quot; format in the boxes above, please write how you prefer to be referred to in our agenda and speaker announcements."
                      placeholder="e.g., Independent Researcher & Open Source Advocate"
                      minRows={2}
                      maxRows={4}
                      {...form.getInputProps("displayPreference")}
                    />
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <Textarea
                      label={isEIR ? "Your Bio" : "Speaker Bio"}
                      placeholder="Tell the audience about yourself, your background, and your expertise..."
                      description="This bio may be displayed on the conference website (minimum 20 characters)"
                      minRows={4}
                      maxRows={8}
                      {...form.getInputProps("bio")}
                      required
                    />
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <Textarea
                      label={isEIR ? "Relevant experience" : "Previous Speaking Experience"}
                      placeholder="Share any conferences, meetups, podcasts, or other events where you have spoken before..."
                      description="Optional, but helps us understand your experience level"
                      minRows={3}
                      maxRows={6}
                      {...form.getInputProps("previousSpeakingExperience")}
                    />
                  </Grid.Col>
                </Grid>
              </Stack>
            </Card>
          </Stack>
        );

      case 2: // Links
        return (
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Stack gap="lg">
              <Group gap="md" align="center">
                <IconLink size={28} color="var(--mantine-color-purple-6)" />
                <div>
                  <Title order={3}>Links</Title>
                  <Text size="sm" c="dimmed">
                    Share relevant links (all optional)
                  </Text>
                </div>
              </Group>

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
                    label="BlueSky"
                    placeholder="https://bsky.app/profile/username"
                    leftSection={<IconBrandBluesky size={16} />}
                    {...form.getInputProps("blueskyUrl")}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label={isEIR ? "Your introductory video" : "Past Talk Recording"}
                    placeholder="https://youtube.com/watch?v=..."
                    description="Link to a previous talk, presentation, or video"
                    leftSection={<IconVideo size={16} />}
                    {...form.getInputProps("pastTalkUrl")}
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </Card>
        );

      default: {
        // Step 3: Session Details or EIR Questions
        if (currentStep === 3) {
          return isEIR ? renderEIRQuestions() : renderSessionDetails();
        }

        // Step 4 when totalSteps === 4: About You
        if (currentStep === 4 && totalSteps === 4) {
          if (!eventQuestions || eventQuestions.length === 0) return null;
          return (
            <Card shadow="sm" padding="xl" radius="md" withBorder>
              <Stack gap="lg">
                <Group gap="md" align="center">
                  <IconMessageCircle
                    size={28}
                    color="var(--mantine-color-orange-6)"
                  />
                  <div>
                    <Title order={3}>About You</Title>
                    <Text size="sm" c="dimmed">
                      Help us get to know you better
                    </Text>
                  </div>
                </Group>

                <Text size="sm" c="dimmed">
                  We&apos;d love to ask you a few short questions to help us
                  create meaningful resources for our community. If you have a
                  reason not to answer, you can leave optional questions blank.
                </Text>

                <Grid>
                  {[...eventQuestions]
                    .sort((a, b) => a.order - b.order)
                    .map((question) => {
                      const value =
                        questionResponses[question.questionKey] ?? "";

                      if (question.questionType === "SELECT") {
                        return (
                          <Grid.Col span={12} key={question.id}>
                            <Select
                              label={question.questionEn}
                              placeholder="Select an option"
                              data={question.options}
                              value={value || null}
                              onChange={(val) => {
                                setQuestionResponses((prev) => ({
                                  ...prev,
                                  [question.questionKey]: val ?? "",
                                }));
                                if (questionErrors[question.questionKey]) {
                                  setQuestionErrors((prev) => {
                                    const next = { ...prev };
                                    delete next[question.questionKey];
                                    return next;
                                  });
                                }
                              }}
                              required={question.required}
                              clearable={!question.required}
                              error={questionErrors[question.questionKey]}
                            />
                          </Grid.Col>
                        );
                      }
                      if (question.questionType === "TEXTAREA") {
                        return (
                          <Grid.Col span={12} key={question.id}>
                            <Textarea
                              label={question.questionEn}
                              placeholder="Share your thoughts..."
                              value={value}
                              onChange={(e) => {
                                const val = e.currentTarget.value;
                                setQuestionResponses((prev) => ({
                                  ...prev,
                                  [question.questionKey]: val,
                                }));
                                if (questionErrors[question.questionKey]) {
                                  setQuestionErrors((prev) => {
                                    const next = { ...prev };
                                    delete next[question.questionKey];
                                    return next;
                                  });
                                }
                              }}
                              minRows={3}
                              maxRows={6}
                              required={question.required}
                              error={questionErrors[question.questionKey]}
                            />
                          </Grid.Col>
                        );
                      }
                      // TEXT type (default)
                      return (
                        <Grid.Col span={12} key={question.id}>
                          <TextInput
                            label={question.questionEn}
                            placeholder="Your answer"
                            value={value}
                            onChange={(e) => {
                              const val = e.currentTarget.value;
                              setQuestionResponses((prev) => ({
                                ...prev,
                                [question.questionKey]: val,
                              }));
                              if (questionErrors[question.questionKey]) {
                                setQuestionErrors((prev) => {
                                  const next = { ...prev };
                                  delete next[question.questionKey];
                                  return next;
                                });
                              }
                            }}
                            required={question.required}
                            error={questionErrors[question.questionKey]}
                          />
                        </Grid.Col>
                      );
                    })}
                </Grid>
              </Stack>
            </Card>
          );
        }

        return null;
      }
    }
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <div>
          <Title order={1} mb="md">
            {isEIR ? "EIR Application" : "Speaker Application"}
          </Title>
          <Text size="lg" c="dimmed" mb="md">
            {isOnBehalfUpdate
              ? `Review your ${isEIR ? "EIR" : "speaker"} details for ${eventName}`
              : isEIR
                ? `Apply to be an EIR at ${eventName}`
                : `Apply to speak at ${eventName}`}
          </Text>

          {isOnBehalfUpdate && (
            <Alert
              color="blue"
              title="Your session has been pre-registered"
              mb="md"
            >
              <Text size="sm">
                A floor lead has pre-registered your speaker session. Please
                review the information below, make any updates, and confirm your
                details.
              </Text>
            </Alert>
          )}

          {/* Progress Bar */}
          <Card p="md" radius="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm" fw={500}>
                  Step {currentStep} of {totalSteps}
                </Text>
                <Text size="sm" c="dimmed">
                  {Math.round((currentStep / totalSteps) * 100)}% Complete
                </Text>
              </Group>
              <Progress
                value={(currentStep / totalSteps) * 100}
                size="lg"
                radius="xl"
                color="teal"
              />

              <Group justify="space-between">
                <Badge
                  size="sm"
                  variant={currentStep >= 1 ? "filled" : "light"}
                  color="teal"
                >
                  Speaker Profile
                </Badge>
                <Badge
                  size="sm"
                  variant={currentStep >= 2 ? "filled" : "light"}
                  color="teal"
                >
                  Links
                </Badge>
                <Badge
                  size="sm"
                  variant={currentStep >= 3 ? "filled" : "light"}
                  color="teal"
                >
                  {isEIR ? "EIR Questions" : "Session Details"}
                </Badge>
                {totalSteps >= 4 && (
                  <Badge
                    size="sm"
                    variant={currentStep >= 4 ? "filled" : "light"}
                    color="teal"
                  >
                    About You
                  </Badge>
                )}
              </Group>
            </Stack>
          </Card>
        </div>

        {/* Form Content */}
        <form
          onSubmit={(e) => {
            if (currentStep !== totalSteps) {
              e.preventDefault();
              return;
            }
            if (!validateAboutYouQuestions()) {
              e.preventDefault();
              return;
            }
            // Run Zod validation explicitly to catch errors on hidden steps
            const validationResult = form.validate();
            if (validationResult.hasErrors) {
              e.preventDefault();
              // Find which step has the first error and navigate there
              const errorFields = Object.keys(validationResult.errors);
              const step1Fields = [
                "preferredName",
                "bio",
                "jobTitle",
                "company",
                "displayPreference",
              ];
              const step2Fields = [
                "website",
                "linkedinUrl",
                "twitterUrl",
                "blueskyUrl",
                "pastTalkUrl",
              ];
              const step3Fields = [
                "talkTitle",
                "talkAbstract",
                "talkFormat",
                "talkDuration",
                "talkTopic",
                "coHostInfo",
                "entityName",
                "otherFloorsTopicTheme",
                "previousSpeakingExperience",
              ];

              let errorStep = currentStep;
              for (const field of errorFields) {
                if (step1Fields.includes(field)) {
                  errorStep = 1;
                  break;
                }
                if (step2Fields.includes(field)) {
                  errorStep = Math.min(errorStep, 2);
                }
                if (step3Fields.includes(field)) {
                  errorStep = Math.min(errorStep, 3);
                }
              }

              const stepName =
                errorStep === 1
                  ? "Speaker Profile"
                  : errorStep === 2
                    ? "Links"
                    : "Session Details";
              const firstError = Object.values(validationResult.errors)[0];
              notifications.show({
                title: `Please fix errors in ${stepName}`,
                message:
                  typeof firstError === "string"
                    ? firstError
                    : "Some fields need your attention. We'll take you there.",
                color: "orange",
                icon: <IconX size={16} />,
              });
              setCurrentStep(errorStep);
              return;
            }
            form.onSubmit(handleSubmit)(e);
          }}
        >
          {renderStep()}

          {/* Navigation Buttons */}
          <Group justify="space-between" mt="xl">
            <Button
              type="button"
              variant="light"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              Previous
            </Button>

            {currentStep < totalSteps ? (
              <Button
                key="next-step"
                type="button"
                color="teal"
                onClick={nextStep}
              >
                Next Step
              </Button>
            ) : (
              <Button
                key="submit"
                type="submit"
                color="teal"
                loading={isSubmitting}
                leftSection={<IconCheck size={16} />}
              >
                {isOnBehalfUpdate
                  ? "Confirm & Update Application"
                  : "Submit Application"}
              </Button>
            )}
          </Group>
        </form>

        {/* Help Text */}
        <Alert color="teal" title="Need Help?">
          <Text size="sm">
            If you have any questions about the {isEIR ? "EIR" : "speaker"}{" "}
            application, please contact the event organizers at{" "}
            <Text component="span" fw={500}>
              {config?.adminEmail ?? ""}.
            </Text>
          </Text>
        </Alert>
      </Stack>
    </Container>
  );
}
