export type CredentialStatus = "ACTIVA" | "INACTIVA";

export type CredentialAccess = {
  userId: string;
  canView: boolean;
  canEdit: boolean;
};

export type OperationalCredential = {
  id: string;
  code: string;
  name: string;
  category: string;
  username?: string;
  description?: string;
  status: CredentialStatus;
  createdAt: string;
  updatedAt: string;
  access: CredentialAccess[];
};

export type CredentialUser = {
  id: string;
  name: string;
  role: string;
  initials: string;
};
