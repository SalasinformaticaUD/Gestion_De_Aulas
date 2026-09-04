export type ObservationType = "GENERAL" | "NOVEDAD" | "RESTRICCION";

export type OperationalObservation = {
  id: string;
  folio: string;
  roomId: string;
  roomCode: string;
  type: ObservationType;
  content: string;
  createdAt: string;
  validFrom: string | null;
  validUntil: string | null;
  author?: { id: string; name: string };
};
