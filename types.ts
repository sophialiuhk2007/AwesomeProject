export type Tab = 'Credentials' | 'Verification' | 'MyCredentials';

export type CredentialItem = {
  id: string;
  type: string[];
  issuer: string;
};

export type DetailedCredentialItem = {
  id: string;
  type: string[];
  issuer: string;
  issuanceDate?: string;
  expirationDate?: string;
  claims: Record<string, any>;
};
