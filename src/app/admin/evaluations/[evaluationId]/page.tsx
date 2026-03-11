import { Container } from "@mantine/core";
import EvaluationPageClient from "./EvaluationPageClient";

interface EvaluationPageProps {
  params: Promise<{
    evaluationId: string;
  }>;
}

export default async function EvaluationPage({ params }: EvaluationPageProps) {
  const { evaluationId } = await params;

  return (
    <Container size="xl" py="md">
      <EvaluationPageClient evaluationId={evaluationId} />
    </Container>
  );
}
