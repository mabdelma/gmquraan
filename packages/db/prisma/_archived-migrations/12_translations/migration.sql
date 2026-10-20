-- Cache for machine translations of dynamic/DB content.
CREATE TABLE "Translation" (
    "hash" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Translation_pkey" PRIMARY KEY ("hash")
);
