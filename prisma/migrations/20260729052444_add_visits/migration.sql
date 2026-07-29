-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "session_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visits_session_hash_created_at_idx" ON "visits"("session_hash", "created_at");

