import { type ReactNode } from "react";
import { Card, Table, Text, Group, ActionIcon, Title } from "@mantine/core";
import { IconRefresh, IconX } from "@tabler/icons-react";
import InvitationStatusBadge from "./InvitationStatusBadge";

interface InvitationRow {
  id: string;
  email: string;
  status: string;
  createdAt: Date | string;
  expiresAt: Date | string;
  token?: string;
  event?: { name: string } | null;
  role?: { name: string } | null;
  globalRole?: string | null;
  type?: string;
}

interface ExtraColumn<T extends InvitationRow> {
  header: string;
  render: (invitation: T) => ReactNode;
}

interface InvitationsTableProps<T extends InvitationRow> {
  invitations: T[];
  totalCount: number;
  roleName: string;
  title?: string;
  onResend: (invitationId: string) => void;
  onCancel: (invitationId: string) => void;
  isResending: boolean;
  isCancelling: boolean;
  extraColumns?: ExtraColumn<T>[];
  extraActions?: (invitation: T) => ReactNode;
}

export default function InvitationsTable<T extends InvitationRow>({
  invitations,
  totalCount,
  roleName,
  title,
  onResend,
  onCancel,
  isResending,
  isCancelling,
  extraColumns,
  extraActions,
}: InvitationsTableProps<T>) {
  return (
    <Card withBorder>
      <Group justify="space-between" mb="md">
        <Title order={3}>
          {title ?? `${capitalize(roleName)} Invitations`}
        </Title>
        <Text size="sm" c="dimmed">
          {invitations.length} of {totalCount} invitations
        </Text>
      </Group>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Email</Table.Th>
            {extraColumns?.map((col) => (
              <Table.Th key={col.header}>{col.header}</Table.Th>
            ))}
            <Table.Th>Status</Table.Th>
            <Table.Th>Invited</Table.Th>
            <Table.Th>Expires</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {invitations.map((invitation) => (
            <Table.Tr key={invitation.id}>
              <Table.Td>
                <Text size="sm">{invitation.email}</Text>
              </Table.Td>
              {extraColumns?.map((col) => (
                <Table.Td key={col.header}>{col.render(invitation)}</Table.Td>
              ))}
              <Table.Td>
                <InvitationStatusBadge status={invitation.status} />
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {new Date(invitation.createdAt).toLocaleDateString()}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {new Date(invitation.expiresAt).toLocaleDateString()}
                </Text>
              </Table.Td>
              <Table.Td>
                <Group gap={4}>
                  {invitation.status === "PENDING" && (
                    <>
                      {extraActions?.(invitation)}
                      <ActionIcon
                        variant="light"
                        color="blue"
                        size="sm"
                        onClick={() => onResend(invitation.id)}
                        loading={isResending}
                        title={`Resend ${roleName} invitation`}
                      >
                        <IconRefresh size={14} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        size="sm"
                        onClick={() => onCancel(invitation.id)}
                        loading={isCancelling}
                        title={`Cancel ${roleName} invitation`}
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    </>
                  )}
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {invitations.length === 0 && (
        <Text ta="center" py="xl" c="dimmed">
          {totalCount === 0
            ? `No ${roleName} invitations yet. Send your first ${roleName} invitation to get started.`
            : `No ${roleName} invitations match your filter.`}
        </Text>
      )}
    </Card>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
