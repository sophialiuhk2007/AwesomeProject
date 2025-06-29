import {useState, useCallback} from 'react';
import type {
  Agent,
  W3cCredentialRecord,
  SdJwtVcRecord,
  KeyType,
} from '@credo-ts/core';
import type {CredentialItem, DetailedCredentialItem} from '../types';
import {base64UrlDecode} from '../utils/base64UrlDecode';

export function useCredentials(agentRef: React.MutableRefObject<Agent | null>) {
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);

  const fetchCredentials = useCallback(async () => {
    if (!agentRef.current) return;

    try {
      const w3cCredentials =
        await agentRef.current.w3cCredentials.getAllCredentialRecords();
      const sdJwtCredentials = await agentRef.current.sdJwtVc.getAll();

      const formattedCredentials: CredentialItem[] = [
        ...w3cCredentials.map(cred => ({
          id: cred.id,
          type: cred.credential.type,
          issuer:
            typeof cred.credential.issuer === 'string'
              ? cred.credential.issuer
              : cred.credential.issuer?.id || 'Unknown Issuer',
        })),
        ...sdJwtCredentials.map(cred => ({
          id: cred.id,
          type: ['SD-JWT-VC'],
          issuer: 'SD-JWT Issuer',
        })),
      ];

      setCredentials(formattedCredentials);
    } catch (error) {
      console.error('Error fetching credentials:', error);
    }
  }, [agentRef]);

  const handleDeleteCredential = useCallback(
    async (id: string) => {
      if (!agentRef.current) return;

      let deleted = false;
      try {
        await agentRef.current.w3cCredentials.removeCredentialRecord(id);
        deleted = true;
      } catch (error: any) {
        if (
          error.name === 'RecordNotFoundError' ||
          error.message?.includes('not found')
        ) {
          try {
            await agentRef.current.sdJwtVc.deleteById(id);
            deleted = true;
          } catch (sdJwtError) {}
        } else {
          console.error('Error deleting credential:', error);
        }
      }
      if (!deleted) {
        console.error('Credential not found in either store:', id);
      } else {
        fetchCredentials();
      }
    },
    [agentRef, fetchCredentials],
  );

  const getDetailedCredential = useCallback(
    async (id: string): Promise<DetailedCredentialItem | null> => {
      if (!agentRef.current) return null;

      try {
        const w3cCreds =
          await agentRef.current.w3cCredentials.getAllCredentialRecords();
        const w3cCred = w3cCreds.find(c => c.id === id);
        if (w3cCred) {
          let claims: Record<string, any> = {};
          if (w3cCred.credential.credentialSubject) {
            if (
              typeof w3cCred.credential.credentialSubject === 'object' &&
              !Array.isArray(w3cCred.credential.credentialSubject)
            ) {
              claims = w3cCred.credential.credentialSubject;
            } else if (Array.isArray(w3cCred.credential.credentialSubject)) {
              w3cCred.credential.credentialSubject.forEach((item: any) => {
                if (typeof item === 'object') {
                  claims = {...claims, ...item};
                }
              });
            }
          }
          const issuanceDate = w3cCred.credential.issuanceDate;
          const expirationDate = w3cCred.credential.expirationDate;
          return {
            id: w3cCred.id,
            type: w3cCred.credential.type,
            issuer:
              typeof w3cCred.credential.issuer === 'string'
                ? w3cCred.credential.issuer
                : w3cCred.credential.issuer?.id || 'Unknown Issuer',
            issuanceDate,
            expirationDate,
            claims,
          };
        }
        // Try SD-JWT
        const sdJwtCred = await agentRef.current.sdJwtVc.getById(id);
        const jwt = (sdJwtCred as any).compactSdJwtVc || (sdJwtCred as any).jwt;
        if (jwt) {
          let claims: Record<string, any> = {};
          try {
            const jwtParts = jwt.split('~')[0];
            const [header, payload] = jwtParts.split('.').slice(0, 2);
            if (payload) {
              const decoded = JSON.parse(base64UrlDecode(payload));
              claims = decoded.vc?.credentialSubject || decoded || {};
            }
          } catch (e) {
            console.warn('Failed to decode SD-JWT claims:', e);
          }
          return {
            id: sdJwtCred.id,
            type: ['SD-JWT-VC'],
            issuer: 'SD-JWT Issuer',
            claims,
          };
        }
      } catch (error) {
        console.error('Error fetching credential details:', error);
      }
      return null;
    },
    [agentRef],
  );

  return {
    credentials,
    fetchCredentials,
    handleDeleteCredential,
    getDetailedCredential,
    setCredentials,
  };
}
