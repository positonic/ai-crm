import { Center, Loader, Text, Stack } from "@mantine/core";

export default function MyProfileLoading() {
  return (
    <Center h={400}>
      <Stack align="center" gap="md">
        <Loader size="lg" />
        <Text c="dimmed">Loading your profile...</Text>
      </Stack>
    </Center>
  );
}
