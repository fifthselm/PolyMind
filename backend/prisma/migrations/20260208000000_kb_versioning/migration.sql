-- ============================================
-- Knowledge Base Versioning Tables
-- Migration: Add kb_versions and kb_version_contents tables
-- ============================================

-- CreateEnum for version status
CREATE TYPE "VersionStatus" AS ENUM ('draft', 'published', 'archived');

-- ============================================
-- Knowledge Base Versions Table
-- ============================================
CREATE TABLE "kb_versions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "changeSummary" TEXT,
    "status" "VersionStatus" NOT NULL DEFAULT 'draft',
    "tags" TEXT[] DEFAULT '{}',
    "isAutoSave" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kb_versions_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- Knowledge Base Version Contents Table
-- ============================================
CREATE TABLE "kb_version_contents" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "blockType" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_version_contents_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- Indexes for kb_versions
-- ============================================
CREATE INDEX "kb_versions_documentId_idx" ON "kb_versions"("documentId");

CREATE INDEX "kb_versions_createdAt_idx" ON "kb_versions"("createdAt");

CREATE INDEX "kb_versions_documentId_versionNumber_idx" ON "kb_versions"("documentId", "versionNumber");

CREATE INDEX "kb_versions_status_idx" ON "kb_versions"("status");

CREATE INDEX "kb_versions_createdById_idx" ON "kb_versions"("createdById");

-- ============================================
-- Indexes for kb_version_contents
-- ============================================
CREATE INDEX "kb_version_contents_versionId_idx" ON "kb_version_contents"("versionId");

CREATE INDEX "kb_version_contents_versionId_order_idx" ON "kb_version_contents"("versionId", "order");

-- ============================================
-- Foreign Keys
-- ============================================
ALTER TABLE "kb_versions" ADD CONSTRAINT "kb_versions_createdById_fkey" 
    FOREIGN KEY ("createdById") REFERENCES "users"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kb_version_contents" ADD CONSTRAINT "kb_version_contents_versionId_fkey" 
    FOREIGN KEY ("versionId") REFERENCES "kb_versions"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Unique Constraints
-- ============================================
-- Ensure unique version number per document
ALTER TABLE "kb_versions" ADD CONSTRAINT "kb_versions_documentId_versionNumber_key" 
    UNIQUE ("documentId", "versionNumber");
