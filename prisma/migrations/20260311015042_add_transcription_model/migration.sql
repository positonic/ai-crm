-- CreateEnum
CREATE TYPE "DeliberationStatus" AS ENUM ('COLLECTING', 'CLOSED', 'ANALYZING', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "TranscriptStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TranscriptionSource" AS ENUM ('MANUAL', 'WHISPER_API', 'BROWSER', 'WEBHOOK', 'API');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "featureDeliberation" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Deliberation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "DeliberationStatus" NOT NULL DEFAULT 'COLLECTING',
    "closesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "summaryUri" TEXT,
    "summaryCid" TEXT,
    "pcaUri" TEXT,
    "pcaCid" TEXT,
    "activityUri" TEXT,
    "activityCid" TEXT,
    "boardUri" TEXT,
    "boardCid" TEXT,
    "analysisResult" JSONB,

    CONSTRAINT "Deliberation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transcription" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "deliberationId" TEXT,
    "sessionId" TEXT,
    "title" TEXT NOT NULL,
    "transcript" TEXT,
    "summary" TEXT,
    "notes" TEXT,
    "source" "TranscriptionSource" NOT NULL DEFAULT 'MANUAL',
    "sourceSessionId" TEXT,
    "audioUrl" TEXT,
    "audioFileName" TEXT,
    "status" "TranscriptStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transcription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicCluster" (
    "id" TEXT NOT NULL,
    "deliberationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "keywords" TEXT[],
    "mentionCount" INTEGER NOT NULL DEFAULT 0,
    "sourceExcerpts" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliberationPriority" (
    "id" TEXT NOT NULL,
    "deliberationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "trackId" TEXT,
    "isModerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliberationPriority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliberationVote" (
    "id" TEXT NOT NULL,
    "priorityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliberationVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliberationBlocker" (
    "id" TEXT NOT NULL,
    "priorityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliberationBlocker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliberationResourceSuggestion" (
    "id" TEXT NOT NULL,
    "priorityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliberationResourceSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deliberation_eventId_idx" ON "Deliberation"("eventId");

-- CreateIndex
CREATE INDEX "Deliberation_status_idx" ON "Deliberation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Deliberation_eventId_title_key" ON "Deliberation"("eventId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "Transcription_sourceSessionId_key" ON "Transcription"("sourceSessionId");

-- CreateIndex
CREATE INDEX "Transcription_eventId_idx" ON "Transcription"("eventId");

-- CreateIndex
CREATE INDEX "Transcription_deliberationId_idx" ON "Transcription"("deliberationId");

-- CreateIndex
CREATE INDEX "Transcription_status_idx" ON "Transcription"("status");

-- CreateIndex
CREATE INDEX "Transcription_source_idx" ON "Transcription"("source");

-- CreateIndex
CREATE INDEX "TopicCluster_deliberationId_idx" ON "TopicCluster"("deliberationId");

-- CreateIndex
CREATE INDEX "TopicCluster_mentionCount_idx" ON "TopicCluster"("mentionCount");

-- CreateIndex
CREATE INDEX "DeliberationPriority_deliberationId_idx" ON "DeliberationPriority"("deliberationId");

-- CreateIndex
CREATE INDEX "DeliberationPriority_userId_idx" ON "DeliberationPriority"("userId");

-- CreateIndex
CREATE INDEX "DeliberationVote_priorityId_idx" ON "DeliberationVote"("priorityId");

-- CreateIndex
CREATE INDEX "DeliberationVote_userId_idx" ON "DeliberationVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliberationVote_priorityId_userId_key" ON "DeliberationVote"("priorityId", "userId");

-- CreateIndex
CREATE INDEX "DeliberationBlocker_priorityId_idx" ON "DeliberationBlocker"("priorityId");

-- CreateIndex
CREATE INDEX "DeliberationBlocker_userId_idx" ON "DeliberationBlocker"("userId");

-- CreateIndex
CREATE INDEX "DeliberationResourceSuggestion_priorityId_idx" ON "DeliberationResourceSuggestion"("priorityId");

-- CreateIndex
CREATE INDEX "DeliberationResourceSuggestion_userId_idx" ON "DeliberationResourceSuggestion"("userId");

-- AddForeignKey
ALTER TABLE "Deliberation" ADD CONSTRAINT "Deliberation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcription" ADD CONSTRAINT "Transcription_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcription" ADD CONSTRAINT "Transcription_deliberationId_fkey" FOREIGN KEY ("deliberationId") REFERENCES "Deliberation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcription" ADD CONSTRAINT "Transcription_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicCluster" ADD CONSTRAINT "TopicCluster_deliberationId_fkey" FOREIGN KEY ("deliberationId") REFERENCES "Deliberation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliberationPriority" ADD CONSTRAINT "DeliberationPriority_deliberationId_fkey" FOREIGN KEY ("deliberationId") REFERENCES "Deliberation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliberationPriority" ADD CONSTRAINT "DeliberationPriority_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliberationVote" ADD CONSTRAINT "DeliberationVote_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES "DeliberationPriority"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliberationVote" ADD CONSTRAINT "DeliberationVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliberationBlocker" ADD CONSTRAINT "DeliberationBlocker_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES "DeliberationPriority"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliberationBlocker" ADD CONSTRAINT "DeliberationBlocker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliberationResourceSuggestion" ADD CONSTRAINT "DeliberationResourceSuggestion_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES "DeliberationPriority"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliberationResourceSuggestion" ADD CONSTRAINT "DeliberationResourceSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
