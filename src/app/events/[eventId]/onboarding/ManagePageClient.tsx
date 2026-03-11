"use client";

import React from "react";
import { Container } from "@mantine/core";
import OnboardingForm from "~/app/_components/OnboardingForm";

interface ManagePageClientProps {
  applicationId: string;
  applicantName: string;
}

export default function ManagePageClient({
  applicationId,
  applicantName,
}: ManagePageClientProps) {
  return (
    <Container size="md" py="xl">
      <OnboardingForm
        applicationId={applicationId}
        applicantName={applicantName}
      />
    </Container>
  );
}
