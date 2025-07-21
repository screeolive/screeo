-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL DEFAULT 'NOT_PROVIDED',
    "password" TEXT NOT NULL,
    "isMailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verification_otp" TEXT NOT NULL DEFAULT '',
    "passwd_reset_otp" TEXT NOT NULL DEFAULT '',
    "provider" TEXT NOT NULL DEFAULT 'email',
    "providerId" TEXT,
    "UserAddedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UserUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
