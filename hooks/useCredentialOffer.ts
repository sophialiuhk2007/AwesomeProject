import {useCallback} from 'react';
import {
  KeyDidCreateOptions,
  DidKey,
  getJwkFromKey,
  KeyType,
} from '@credo-ts/core';
import {OpenId4VciCredentialFormatProfile} from '@credo-ts/openid4vc';

export function useCredentialOffer(
  agentRef: any,
  fetchCredentials: () => void,
) {
  const handleCredentialOffer = useCallback(
    async (credentialOffer: string) => {
      if (!credentialOffer || !agentRef.current) return;
      const resolvedCredentialOffer =
        await agentRef.current.modules.openId4VcHolderModule.resolveCredentialOffer(
          credentialOffer,
        );
      const credentials =
        await agentRef.current.modules.openId4VcHolderModule.acceptCredentialOfferUsingPreAuthorizedCode(
          resolvedCredentialOffer,
          {
            credentialBindingResolver: async ({
              supportedDidMethods,
              keyType,
              supportsAllDidMethods,
              supportsJwk,
              credentialFormat,
            }: {
              supportedDidMethods?: string[];
              keyType: KeyType;
              supportsAllDidMethods: boolean;
              supportsJwk?: boolean;
              credentialFormat: OpenId4VciCredentialFormatProfile;
            }) => {
              if (
                supportsAllDidMethods ||
                supportedDidMethods?.includes('did:key')
              ) {
                const didResult = await agentRef.current.dids.create({
                  method: 'key',
                  options: {
                    keyType,
                  },
                });
                if (didResult.didState.state !== 'finished') {
                  throw new Error('DID creation failed.');
                }
                const didKey = DidKey.fromDid(didResult.didState.did);
                return {
                  method: 'did',
                  didUrl: `${didKey.did}#${didKey.key.fingerprint}`,
                };
              }
              if (
                supportsJwk &&
                credentialFormat === OpenId4VciCredentialFormatProfile.SdJwtVc
              ) {
                const key = await agentRef.current.wallet.createKey({
                  keyType,
                });
                return {
                  method: 'jwk',
                  jwk: getJwkFromKey(key),
                };
              }
              throw new Error('Unable to create a key binding');
            },
          },
        );
      for (const credential of credentials) {
        if ('compact' in credential) {
          await agentRef.current.sdJwtVc.store(credential.compact);
        } else {
          await agentRef.current.w3cCredentials.storeCredential({credential});
        }
      }
      fetchCredentials();
    },
    [agentRef, fetchCredentials],
  );
  return {handleCredentialOffer};
}
