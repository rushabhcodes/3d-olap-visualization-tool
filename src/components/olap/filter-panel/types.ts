import type { CsvColumnMapping } from "@/data/mock-cube";

export type PendingUpload = {
  fileName: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
  previewRows: Array<Record<string, unknown>>;
  mapping: CsvColumnMapping;
  parseErrors: string[];
};
