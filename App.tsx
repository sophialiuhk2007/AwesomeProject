/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useState, useRef} from 'react';
import type {PropsWithChildren} from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
import type {InitConfig} from '@credo-ts/core';
import {
  Agent,
  KeyDidCreateOptions,
  getJwkFromKey,
  DidKey,
  KeyType,
  W3cCredentialRecord,
  SdJwtVcRecord,
  DifPresentationExchangeService,
} from '@credo-ts/core';
import {agentDependencies} from '@credo-ts/react-native';
import {AskarModule} from '@credo-ts/askar';
import {ariesAskar} from '@hyperledger/aries-askar-react-native';
import {
  OpenId4VcHolderModule,
  OpenId4VciCredentialFormatProfile,
} from '@credo-ts/openid4vc';
import {TextEncoder, TextDecoder} from 'text-encoding';
if (typeof global.TextDecoder === 'undefined') {
  // @ts-ignore
  global.TextDecoder = TextDecoder;
}
if (typeof global.TextEncoder === 'undefined') {
  // @ts-ignore
  global.TextEncoder = TextEncoder;
}

type SectionProps = PropsWithChildren<{
  title: string;
}>;

function Section({children, title}: SectionProps): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
}

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [credentialOffer, setCredentialOffer] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [authorizationRequest, setAuthorizationRequest] = useState('');
  const [authInputValue, setAuthInputValue] = useState('');
  const agentRef = useRef<Agent | null>(null);

  React.useEffect(() => {
    const config: InitConfig = {
      label: 'docs-agent-react-native',
      walletConfig: {
        id: 'wallet-id',
        key: 'testkey0000000000000000000000000',
      },
    };

    const agent = new Agent({
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
        agentRef.current = agent; // Store the initialized agent in the ref
        console.log('Agent initialized!');
      })
      .catch(e => {
        console.error(
          `Something went wrong while setting up the agent! Message: ${e}`,
        );
      });
  }, []);

  React.useEffect(() => {
    const processCredentialOffer = async () => {
      if (credentialOffer && agentRef.current) {
        console.log('Credential Offer:', credentialOffer);
        const resolvedCredentialOffer =
          await agentRef.current.modules.openId4VcHolderModule.resolveCredentialOffer(
            credentialOffer,
          );
        console.log(
          'Resolved credential offer',
          JSON.stringify(
            resolvedCredentialOffer.credentialOfferPayload,
            null,
            2,
          ),
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
                // NOTE: example implementation. Adjust based on your needs
                // Return the binding to the credential that should be used. Either did or jwk is supported

                if (
                  supportsAllDidMethods ||
                  supportedDidMethods?.includes('did:key')
                ) {
                  if (!agentRef.current) {
                    throw new Error('Agent is not initialized.');
                  }
                  const didResult =
                    await agentRef.current.dids.create<KeyDidCreateOptions>({
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

                // we also support plain jwk for sd-jwt only
                if (
                  supportsJwk &&
                  credentialFormat === OpenId4VciCredentialFormatProfile.SdJwtVc
                ) {
                  if (!agentRef.current) {
                    throw new Error('Agent is not initialized.');
                  }
                  const key = await agentRef.current.wallet.createKey({
                    keyType,
                  });

                  // you now need to return an object instead of VerificationMethod instance
                  // and method 'did' or 'jwk'
                  return {
                    method: 'jwk',
                    jwk: getJwkFromKey(key),
                  };
                }

                throw new Error('Unable to create a key binding');
              },
            },
          );

        console.log(
          'Received credentials',
          JSON.stringify(credentials, null, 2),
        );

        // Store the received credentials
        const records: Array<W3cCredentialRecord | SdJwtVcRecord> = [];
        for (const credential of credentials) {
          if ('compact' in credential) {
            const record = await agentRef.current.sdJwtVc.store(
              credential.compact,
            );
            records.push(record);
          } else {
            const record =
              await agentRef.current.w3cCredentials.storeCredential({
                credential,
              });
            records.push(record);
          }
        }
        // Use agentRef.current here
        // Example:
        // const credentials = await agentRef.current.modules.openId4VcHolderModule.acceptCredentialOfferUsingPreAuthorizedCode(...);
      }
    };
    processCredentialOffer();
  }, [credentialOffer]);

  React.useEffect(() => {
    const processAuthorizationRequest = async () => {
      if (authorizationRequest && agentRef.current) {
        console.log('Authorization Request:', authorizationRequest);
        const resolvedAuthorizationRequest =
          await agentRef.current.modules.openId4VcHolderModule.resolveSiopAuthorizationRequest(
            authorizationRequest,
          );
        console.log(
          'Resolved credentials for request',
          JSON.stringify(
            resolvedAuthorizationRequest.presentationExchange
              .credentialsForRequest,
            null,
            2,
          ),
        );

        const presentationExchangeService =
          agentRef.current.dependencyManager.resolve(
            DifPresentationExchangeService,
          );
        // Automatically select credentials. In a wallet you could manually choose which credentials to return based on the "resolvedAuthorizationRequest.presentationExchange.credentialsForRequest" value
        const selectedCredentials =
          presentationExchangeService.selectCredentialsForRequest(
            resolvedAuthorizationRequest.presentationExchange
              .credentialsForRequest,
          );

        // issuer only supports pre-authorized flow for now
        const authorizationResponse =
          await agentRef.current.modules.openId4VcHolderModule.acceptSiopAuthorizationRequest(
            {
              authorizationRequest:
                resolvedAuthorizationRequest.authorizationRequest,
              presentationExchange: {
                credentials: selectedCredentials,
              },
            },
          );
        console.log(
          'Submitted authorization response',
          JSON.stringify(authorizationResponse.submittedResponse, null, 2),
        );
      }
    };
    processAuthorizationRequest();
  }, [authorizationRequest]);

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const safePadding = '5%';

  const handleInputSubmit = () => {
    setCredentialOffer(inputValue);
    setInputValue('');
  };

  const handleAuthInputSubmit = () => {
    setAuthorizationRequest(authInputValue);
    setAuthInputValue('');
  };
  return (
    <View style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView style={backgroundStyle}>
        <View style={{paddingRight: safePadding}}>
          <Header />
        </View>
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
            paddingHorizontal: safePadding,
            paddingBottom: safePadding,
          }}>
          <Section title="Credential Offer Input">
            <TextInput
              style={{
                borderColor: '#888',
                borderWidth: 1,
                padding: 8,
                marginBottom: 8,
                color: isDarkMode ? Colors.white : Colors.black,
              }}
              placeholder="Enter credential offer"
              placeholderTextColor={isDarkMode ? '#ccc' : '#888'}
              value={inputValue}
              onChangeText={setInputValue}
              onSubmitEditing={handleInputSubmit}
              returnKeyType="done"
            />
            <Text>Current credentialOffer: {credentialOffer}</Text>
            <Text
              style={{
                color: '#007AFF',
                marginTop: 8,
              }}
              onPress={handleInputSubmit}>
              Submit
            </Text>
          </Section>
          <Section title="Authorization Request Input">
            <TextInput
              style={{
                borderColor: '#888',
                borderWidth: 1,
                padding: 8,
                marginBottom: 8,
                color: isDarkMode ? Colors.white : Colors.black,
              }}
              placeholder="Enter authorization request"
              placeholderTextColor={isDarkMode ? '#ccc' : '#888'}
              value={authInputValue}
              onChangeText={setAuthInputValue}
              onSubmitEditing={handleAuthInputSubmit}
              returnKeyType="done"
            />
            <Text>Current authorizationRequest: {authorizationRequest}</Text>
            <Text
              style={{
                color: '#007AFF',
                marginTop: 8,
              }}
              onPress={handleAuthInputSubmit}>
              Submit
            </Text>
          </Section>
          {/* ...rest of your sections... */}
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;
