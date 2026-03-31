/**
 * Server Actions 공통 응답 형태 (클라이언트에서 분기 처리 용이)
 */
export type ActionResult<TData> =
  | { success: true; data: TData; error?: undefined }
  | { success: false; data?: undefined; error: string };
