-- CreateTable
CREATE TABLE "playroom" (
    "owner_id" TEXT NOT NULL PRIMARY KEY,
    "sound_on" BOOLEAN NOT NULL DEFAULT false,
    "voice_on" BOOLEAN NOT NULL DEFAULT false,
    "voice_language" TEXT NOT NULL DEFAULT '',
    "keys_smashed" INTEGER NOT NULL DEFAULT 0,
    "best_run" INTEGER NOT NULL DEFAULT 0
);
