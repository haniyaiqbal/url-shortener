export const CLICKS_QUEUE = 'clicks';
export const RECORD_CLICK_JOB = 'record-click';

/** What the redirect puts on the queue. Plain JSON, so it survives Redis. */
export interface RecordClickJob {
  linkId: string;
  clickedAt: string;
  referrer: string | null;
  userAgent: string | null;
}
