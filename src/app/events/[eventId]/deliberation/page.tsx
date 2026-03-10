"use client";

import { Suspense } from "react";
import { Center, Loader } from "@mantine/core";
import DeliberationClient from "./DeliberationClient";

export default function DeliberationPage() {
  return (
    <Suspense
      fallback={
        <Center h="60vh">
          <Loader size="lg" />
        </Center>
      }
    >
      <DeliberationClient />
    </Suspense>
  );
}
