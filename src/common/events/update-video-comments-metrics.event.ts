export class UpdateVideoCommentsMetrics {
  videoId: string;
  commentsCount: number | string | bigint;
  updatedAt: Date;

  constructor(
    videoId: string,
    commentsCount: number | string | bigint,
    updatedAt: Date,
  ) {
    this.videoId = videoId;
    this.commentsCount = commentsCount;
    this.updatedAt = updatedAt;
  }
}
