export type ObservationType = "GENERAL" | "SEMANAL" | "NOVEDAD" | "RESTRICCION";

export type OperationalObservation = {
  id: string;
  folio: string;
  roomId: string;
  roomCode: string;
  type: ObservationType;
  content: string;
  createdAt: string;
  validUntil: string | null;
};
