"use client";

import { Suspense } from "react";
import { Center, Loader } from "@mantine/core";
import DeliberationsAdminClient from "./DeliberationsAdminClient";

export default function DeliberationsAdminPage() {
  return (
    <Suspense
      fallback={
        <Center h="60vh">
          <Loader size="lg" />
        </Center>
      }
    >
      <DeliberationsAdminClient />
    </Suspense>
  );
}
