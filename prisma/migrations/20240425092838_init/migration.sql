-- CreateEnum
CREATE TYPE "video_forum_statutes" AS ENUM ('Registered', 'Unregistered');

-- CreateEnum
CREATE TYPE "video_comment_vote_types" AS ENUM ('None', 'Like', 'Dislike');

-- CreateTable
CREATE TABLE "creators" (
    "id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "thumbnail_url" TEXT,

    CONSTRAINT "creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_forums" (
    "video_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "status" "video_forum_statutes" NOT NULL,
    "allowed_to_comment" BOOLEAN NOT NULL,
    "video_comments_count" INTEGER NOT NULL,
    "root_video_comments_count" INTEGER NOT NULL,

    CONSTRAINT "video_forums_pkey" PRIMARY KEY ("video_id")
);

-- CreateTable
CREATE TABLE "video_comments" (
    "id" UUID NOT NULL,
    "video_id" UUID NOT NULL,
    "parent_comment_id" UUID,
    "creator_id" UUID NOT NULL,
    "comment" TEXT NOT NULL,
    "likes_count" INTEGER NOT NULL,
    "dislikes_count" INTEGER NOT NULL,
    "replies_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited_at" TIMESTAMPTZ(6),

    CONSTRAINT "video_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos_comments_votes" (
    "creator_id" UUID NOT NULL,
    "video_command_id" UUID NOT NULL,
    "video_id" UUID NOT NULL,
    "type" "video_comment_vote_types" NOT NULL,

    CONSTRAINT "videos_comments_votes_pkey" PRIMARY KEY ("creator_id","video_command_id")
);

-- CreateIndex
CREATE INDEX "video_comments_video_id_idx" ON "video_comments"("video_id");

-- CreateIndex
CREATE INDEX "video_comments_video_id_parent_comment_id_idx" ON "video_comments"("video_id", "parent_comment_id");

-- CreateIndex
CREATE INDEX "videos_comments_votes_creator_id_idx" ON "videos_comments_votes"("creator_id");

-- CreateIndex
CREATE INDEX "videos_comments_votes_video_id_idx" ON "videos_comments_votes"("video_id");

-- CreateIndex
CREATE INDEX "videos_comments_votes_video_id_creator_id_idx" ON "videos_comments_votes"("video_id", "creator_id");

-- AddForeignKey
ALTER TABLE "video_forums" ADD CONSTRAINT "video_forums_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_comments" ADD CONSTRAINT "video_comments_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "video_forums"("video_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_comments" ADD CONSTRAINT "video_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "video_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_comments" ADD CONSTRAINT "video_comments_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos_comments_votes" ADD CONSTRAINT "videos_comments_votes_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos_comments_votes" ADD CONSTRAINT "videos_comments_votes_video_command_id_fkey" FOREIGN KEY ("video_command_id") REFERENCES "video_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
