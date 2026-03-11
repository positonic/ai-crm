import { Container, Title, Text } from "@mantine/core";
import { ApplicationQueue } from "~/app/_components/ApplicationQueue";

export default function ReviewQueuePage() {
  return (
    <Container size="xl" py="md">
      <div style={{ marginBottom: "2rem" }}>
        <Title order={1} mb="xs">
          Review Queue
        </Title>
        <Text c="dimmed">Pick applications from the queue to review</Text>
      </div>

      <ApplicationQueue />
    </Container>
  );
}
