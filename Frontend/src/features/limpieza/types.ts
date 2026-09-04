export type CleaningRecord = {
  id: string;
  folio: string;
  roomId: string;
  roomCode: string;
  performedAt: string;
  status: "REALIZADA" | "NOVEDAD";
  observation?: string;
};
