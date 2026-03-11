"use client";

import { Suspense } from "react";
import { Center, Loader } from "@mantine/core";
import ResultsClient from "./ResultsClient";

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <Center h="60vh">
          <Loader size="lg" />
        </Center>
      }
    >
      <ResultsClient />
    </Suspense>
  );
}
