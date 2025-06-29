import {useCallback} from 'react';
import {DifPresentationExchangeService} from '@credo-ts/core';

export function useVerificationRequest(agentRef: any) {
  const handleVerificationRequest = useCallback(
    async (authorizationRequest: string) => {
      if (!authorizationRequest || !agentRef.current) return;
      const resolvedAuthorizationRequest =
        await agentRef.current.modules.openId4VcHolderModule.resolveSiopAuthorizationRequest(
          authorizationRequest,
        );
      const presentationExchangeService =
        agentRef.current.dependencyManager.resolve(
          DifPresentationExchangeService,
        );
      const selectedCredentials =
        presentationExchangeService.selectCredentialsForRequest(
          resolvedAuthorizationRequest.presentationExchange
            .credentialsForRequest,
        );
      await agentRef.current.modules.openId4VcHolderModule.acceptSiopAuthorizationRequest(
        {
          authorizationRequest:
            resolvedAuthorizationRequest.authorizationRequest,
          presentationExchange: {
            credentials: selectedCredentials,
          },
        },
      );
    },
    [agentRef],
  );
  return {handleVerificationRequest};
}
