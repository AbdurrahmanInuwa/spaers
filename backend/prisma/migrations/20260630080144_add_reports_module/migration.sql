-- AlterTable
ALTER TABLE "Citizen" ADD COLUMN     "avatarKey" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "familyAckAt" TIMESTAMP(3),
ADD COLUMN     "familyCallEligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "familyId" TEXT,
ADD COLUMN     "spaersId" TEXT,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Institution" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Volunteer" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "idFileName" TEXT,
    "idFileKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Volunteer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Emergency" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT,
    "type" TEXT NOT NULL,
    "victimLat" DOUBLE PRECISION NOT NULL,
    "victimLng" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "source" TEXT NOT NULL DEFAULT 'sos_panic',
    "priority" TEXT,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Emergency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyAttachment" (
    "id" TEXT NOT NULL,
    "emergencyId" TEXT NOT NULL,
    "mediaKey" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "originalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyToken" (
    "id" TEXT NOT NULL,
    "emergencyId" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "audienceId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyNotification" (
    "id" TEXT NOT NULL,
    "emergencyId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "audienceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyDispatch" (
    "id" TEXT NOT NULL,
    "emergencyId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "dispatcherId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispatcher" (
    "id" TEXT NOT NULL,
    "dispatcherId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emails" TEXT[],
    "phones" TEXT[],
    "mode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispatcher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Volunteer_status_idx" ON "Volunteer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Volunteer_citizenId_key" ON "Volunteer"("citizenId");

-- CreateIndex
CREATE INDEX "Emergency_status_idx" ON "Emergency"("status");

-- CreateIndex
CREATE INDEX "Emergency_createdAt_idx" ON "Emergency"("createdAt");

-- CreateIndex
CREATE INDEX "Emergency_citizenId_createdAt_idx" ON "Emergency"("citizenId", "createdAt");

-- CreateIndex
CREATE INDEX "EmergencyAttachment_emergencyId_idx" ON "EmergencyAttachment"("emergencyId");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyToken_tokenHash_key" ON "EmergencyToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmergencyToken_audience_audienceId_idx" ON "EmergencyToken"("audience", "audienceId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispatcher_dispatcherId_key" ON "Dispatcher"("dispatcherId");

-- CreateIndex
CREATE UNIQUE INDEX "Citizen_spaersId_key" ON "Citizen"("spaersId");

-- AddForeignKey
ALTER TABLE "Volunteer" ADD CONSTRAINT "Volunteer_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emergency" ADD CONSTRAINT "Emergency_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyAttachment" ADD CONSTRAINT "EmergencyAttachment_emergencyId_fkey" FOREIGN KEY ("emergencyId") REFERENCES "Emergency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyToken" ADD CONSTRAINT "EmergencyToken_emergencyId_fkey" FOREIGN KEY ("emergencyId") REFERENCES "Emergency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyNotification" ADD CONSTRAINT "EmergencyNotification_emergencyId_fkey" FOREIGN KEY ("emergencyId") REFERENCES "Emergency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyDispatch" ADD CONSTRAINT "EmergencyDispatch_emergencyId_fkey" FOREIGN KEY ("emergencyId") REFERENCES "Emergency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyDispatch" ADD CONSTRAINT "EmergencyDispatch_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyDispatch" ADD CONSTRAINT "EmergencyDispatch_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "Dispatcher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatcher" ADD CONSTRAINT "Dispatcher_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

