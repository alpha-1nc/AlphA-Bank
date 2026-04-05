export const WORKPLACE_TYPE = {
  PARTTIME: "PARTTIME",
  FULLTIME: "FULLTIME",
} as const;

export type WorkplaceTypeValue = (typeof WORKPLACE_TYPE)[keyof typeof WORKPLACE_TYPE];

export function isFulltimeWorkplace(wp: { type?: string | null }): boolean {
  return wp.type === WORKPLACE_TYPE.FULLTIME;
}
