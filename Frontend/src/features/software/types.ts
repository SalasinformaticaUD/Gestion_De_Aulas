export type InstalledSoftware = {
  id: string;
  name: string;
  version: string;
  description?: string;
};

export type SoftwareAssignment = {
  roomId: string;
  softwareId: string;
  installedAt: string;
};

export type ImportResult = "EXITOSA" | "PARCIAL" | "FALLIDA";

export type SoftwareImport = {
  id: string;
  fileName?: string;
  createdAt: string;
  userName?: string;
  totalRecords: number;
  processedRecords: number;
  errorRecords: number;
  result: ImportResult;
  errors: Array<{ row: number; roomCode: string; name: string; version: string; error: string }>;
};
