export type FineStatus = "ACTIVA" | "CUMPLIDA" | "ANULADA";

export type FineStudent = {
  id: string;
  code: string;
  name: string;
};

export type FineReason = {
  id: string;
  name: string;
  description?: string;
};

export type FineRecord = {
  id: string;
  folio: string;
  student: FineStudent;
  reasonId: string;
  description?: string;
  status: FineStatus;
  date: string;
  imposedBy?: string;
  fulfilledAt?: string;
  fulfilledBy?: string;
  deliveredItems?: string;
  annulledAt?: string;
  annulledBy?: string;
  annulmentReason?: string;
};
