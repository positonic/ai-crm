import { HydrateClient } from "~/trpc/server";
import { Stack, Title, Container } from "@mantine/core";
import CoinsClient from "./CoinsClient";
import CoinsTableClient from "./CoinsTableClient";
import { api } from "~/trpc/server";

export default async function CoinsPage() {
  const categories = await api.coinGecko.getCategories();

  return (
    <HydrateClient>
      <Container size="xl" py="xl">
        <Stack gap="lg">
          <Title order={2}>Import Organizations</Title>
          <CoinsClient categories={categories} />
          <CoinsTableClient categories={categories} />
        </Stack>
      </Container>
    </HydrateClient>
  );
}
