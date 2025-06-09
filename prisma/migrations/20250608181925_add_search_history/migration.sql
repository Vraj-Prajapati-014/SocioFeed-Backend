-- CreateTable
CREATE TABLE "SearchHistory" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "searchedUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchHistory_userId_idx" ON "SearchHistory"("userId");

-- CreateIndex
CREATE INDEX "SearchHistory_searchedUserId_idx" ON "SearchHistory"("searchedUserId");

-- CreateIndex
CREATE INDEX "SearchHistory_createdAt_idx" ON "SearchHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "SearchHistory" ADD CONSTRAINT "SearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchHistory" ADD CONSTRAINT "SearchHistory_searchedUserId_fkey" FOREIGN KEY ("searchedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
