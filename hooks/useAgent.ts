import {useRef, useEffect} from 'react';
import type {Agent, InitConfig} from '@credo-ts/core';
import {Agent as AgentClass} from '@credo-ts/core';
import {agentDependencies} from '@credo-ts/react-native';
import {AskarModule} from '@credo-ts/askar';
import {ariesAskar} from '@hyperledger/aries-askar-react-native';
import {OpenId4VcHolderModule} from '@credo-ts/openid4vc';

export function useAgent() {
  const agentRef = useRef<Agent | null>(null);

  useEffect(() => {
    const config: InitConfig = {
      label: 'docs-agent-react-native',
      walletConfig: {
        id: 'wallet-id',
        key: 'testkey0000000000000000000000000',
      },
    };

    const agent = new AgentClass({
      config,
      dependencies: agentDependencies,
      modules: {
        askar: new AskarModule({
          ariesAskar,
        }),
        openId4VcHolderModule: new OpenId4VcHolderModule(),
      },
    });

    agent
      .initialize()
      .then(() => {
        agentRef.current = agent;
        console.log('Agent initialized!');
      })
      .catch(e => {
        console.error(
          `Something went wrong while setting up the agent! Message: ${e}`,
        );
      });
  }, []);

  return agentRef;
}
