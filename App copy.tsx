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
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Modal,
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

// Constants for the theme
const THEME = {
  primary: '#6C5CE7',
  secondary: '#A8A4FF',
  background: '#F8F9FE',
  darkBackground: '#1A1B2F',
  text: '#2D3436',
  darkText: '#F8F9FE',
  card: '#FFFFFF',
  darkCard: '#252644',
  accent: '#00B894',
};

// Update Tab type to include new screen
type Tab = 'Credentials' | 'Verification' | 'MyCredentials';

// Add new type for credential items
type CredentialItem = {
  id: string;
  type: string[];
  issuer: string;
};

// Add new type for detailed credential view
type DetailedCredentialItem = {
  id: string;
  type: string[];
  issuer: string;
  issuanceDate?: string;
  expirationDate?: string;
  claims: Record<string, any>;
};

// Add simple tab navigation state
function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [tab, setTab] = useState<Tab>('Credentials');
  const [credentialOffer, setCredentialOffer] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [authorizationRequest, setAuthorizationRequest] = useState('');
  const [authInputValue, setAuthInputValue] = useState('');
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [selectedCredential, setSelectedCredential] =
    useState<DetailedCredentialItem | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const agentRef = useRef<Agent | null>(null);
  function base64UrlDecode(input: string) {
    // Replace URL-safe chars and pad with '='
    input = input.replace(/-/g, '+').replace(/_/g, '/');
    while (input.length % 4) input += '=';
    return decodeURIComponent(
      atob(input)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(''),
    );
  }
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
        setCredentialOffer('');
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

  // Add function to fetch credentials
  const fetchCredentials = async () => {
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
          issuer: 'SD-JWT Issuer', // You might want to extract this from the JWT
        })),
      ];

      setCredentials(formattedCredentials);
    } catch (error) {
      console.error('Error fetching credentials:', error);
    }
  };

  // Add delete credential function
  const handleDeleteCredential = async (id: string) => {
    if (!agentRef.current) return;

    let deleted = false;
    try {
      await agentRef.current.w3cCredentials.removeCredentialRecord(id);
      deleted = true;
    } catch (error: any) {
      // Only try SD-JWT if not found in W3C
      if (
        error.name === 'RecordNotFoundError' ||
        error.message?.includes('not found')
      ) {
        try {
          await agentRef.current.sdJwtVc.deleteById(id);
          deleted = true;
        } catch (sdJwtError) {
          // Ignore if not found in SD-JWT either
        }
      } else {
        console.error('Error deleting credential:', error);
      }
    }
    if (!deleted) {
      console.error('Credential not found in either store:', id);
    } else {
      fetchCredentials(); // Refresh the list
    }
  };

  // Add useEffect to fetch credentials when tab changes
  React.useEffect(() => {
    if (tab === 'MyCredentials') {
      fetchCredentials();
    }
  }, [tab]);

  // Replace getDetailedCredential with a more robust version
  const getDetailedCredential = async (id: string) => {
    if (!agentRef.current) return null;

    try {
      // Try W3C first
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
      console.log('Raw SD-JWT credential record:', sdJwtCred);

      const jwt = (sdJwtCred as any).compactSdJwtVc || (sdJwtCred as any).jwt;
      if (jwt) {
        let claims: Record<string, any> = {};
        try {
          // SD-JWTs may have ~ delimiters, so split at ~ and use the first part (the JWT)
          const jwtParts = jwt.split('~')[0];
          const [header, payload] = jwtParts.split('.').slice(0, 2);
          if (payload) {
            const decoded = JSON.parse(base64UrlDecode(payload));
            console.log('Decoded SD-JWT payload:', decoded);
            claims = decoded.vc?.credentialSubject || decoded || {};
          } else {
            console.warn('No payload found in SD-JWT JWT:', jwt);
          }
        } catch (e) {
          console.warn('Failed to decode SD-JWT claims:', e);
        }
        console.log('Claims to be shown:', claims);
        return {
          id: sdJwtCred.id,
          type: ['SD-JWT-VC'],
          issuer: 'SD-JWT Issuer',
          claims,
        };
      } else {
        console.warn(
          'No JWT or compactSdJwtVc property found on SD-JWT credential record:',
          sdJwtCred,
        );
      }
    } catch (error) {
      console.error('Error fetching credential details:', error);
    }
    return null;
  };

  const handleCredentialPress = async (id: string) => {
    setSelectedCredential(null); // Optional, to clear previous
    const detailedCred = await getDetailedCredential(id);
    console.log('Fetched credential details:', detailedCred);
    if (detailedCred) {
      setSelectedCredential(detailedCred);
      setIsModalVisible(true); // <-- Move this here
    }
  };

  const backgroundStyle = {
    flex: 1,
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const safePadding = 20;

  const handleInputSubmit = () => {
    setCredentialOffer(inputValue);
    setInputValue('');
  };

  const handleAuthInputSubmit = () => {
    setAuthorizationRequest(authInputValue);
    setAuthInputValue('');
  };

  // Tab button component
  const TabButton = ({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 16,
        backgroundColor: selected
          ? isDarkMode
            ? THEME.darkCard
            : THEME.card
          : 'transparent',
        borderBottomWidth: 3,
        borderBottomColor: selected ? THEME.primary : 'transparent',
        alignItems: 'center',
        marginHorizontal: 8,
        borderRadius: selected ? 12 : 0,
      }}>
      <Text
        style={{
          color: selected
            ? THEME.primary
            : isDarkMode
            ? THEME.darkText
            : THEME.text,
          fontWeight: selected ? '700' : '500',
          fontSize: 16,
        }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[
        backgroundStyle,
        {
          backgroundColor: isDarkMode ? THEME.darkBackground : THEME.background,
        },
      ]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? THEME.darkBackground : THEME.background}
      />

      <View style={styles.header}>
        <Text
          style={[
            styles.headerTitle,
            {
              color: isDarkMode ? THEME.darkText : THEME.text,
            },
          ]}>
          Digital Wallet
        </Text>
      </View>

      <View style={styles.tabContainer}>
        <TabButton
          label="Add New"
          selected={tab === 'Credentials'}
          onPress={() => setTab('Credentials')}
        />
        <TabButton
          label="Verify"
          selected={tab === 'Verification'}
          onPress={() => setTab('Verification')}
        />
        <TabButton
          label="My Creds"
          selected={tab === 'MyCredentials'}
          onPress={() => setTab('MyCredentials')}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: isDarkMode
                ? THEME.darkBackground
                : THEME.background,
            },
          ]}>
          {tab === 'MyCredentials' ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDarkMode ? THEME.darkCard : THEME.card,
                },
              ]}>
              <Text style={styles.cardTitle}>My Credentials</Text>
              {credentials.length === 0 ? (
                <Text
                  style={[
                    styles.emptyText,
                    {
                      color: isDarkMode ? THEME.darkText : THEME.text,
                    },
                  ]}>
                  No credentials found
                </Text>
              ) : (
                credentials.map(cred => (
                  <TouchableOpacity
                    key={cred.id}
                    style={styles.credentialItem}
                    onPress={() => handleCredentialPress(cred.id)}>
                    <View style={styles.credentialInfo}>
                      <Text
                        style={[
                          styles.credentialType,
                          {
                            color: THEME.primary,
                          },
                        ]}>
                        {cred.type[0]}
                      </Text>
                      <Text
                        style={[
                          styles.credentialIssuer,
                          {
                            color: isDarkMode ? THEME.darkText : THEME.text,
                          },
                        ]}>
                        {cred.issuer}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteCredential(cred.id)}
                      style={styles.deleteButton}>
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : (
            <>
              {tab === 'Credentials' ? (
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: isDarkMode ? THEME.darkCard : THEME.card,
                    },
                  ]}>
                  <Text style={styles.cardTitle}>Add New Credential</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: isDarkMode ? '#1E1F3A' : '#F0F2F8',
                        color: isDarkMode ? THEME.darkText : THEME.text,
                      },
                    ]}
                    placeholder="Paste credential offer URL or scan QR code"
                    placeholderTextColor={isDarkMode ? '#6C7693' : '#8395A7'}
                    value={inputValue}
                    onChangeText={setInputValue}
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleInputSubmit}>
                    <Text style={styles.buttonText}>Accept Credential</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: isDarkMode ? THEME.darkCard : THEME.card,
                    },
                  ]}>
                  <Text style={styles.cardTitle}>Verification Request</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: isDarkMode ? '#1E1F3A' : '#F0F2F8',
                        color: isDarkMode ? THEME.darkText : THEME.text,
                      },
                    ]}
                    placeholder="Paste verification request or scan QR code"
                    placeholderTextColor={isDarkMode ? '#6C7693' : '#8395A7'}
                    value={authInputValue}
                    onChangeText={setAuthInputValue}
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleAuthInputSubmit}>
                    <Text style={styles.buttonText}>Verify</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: isDarkMode ? THEME.darkCard : THEME.card,
              },
            ]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: THEME.primary}]}>
                Credential Details
              </Text>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedCredential ? (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text
                    style={[
                      styles.detailLabel,
                      {color: isDarkMode ? THEME.darkText : THEME.text},
                    ]}>
                    Type
                  </Text>
                  <Text style={[styles.detailValue, {color: THEME.primary}]}>
                    {selectedCredential.type.join(', ')}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text
                    style={[
                      styles.detailLabel,
                      {color: isDarkMode ? THEME.darkText : THEME.text},
                    ]}>
                    Issuer
                  </Text>
                  <Text
                    style={[
                      styles.detailValue,
                      {color: isDarkMode ? THEME.darkText : THEME.text},
                    ]}>
                    {selectedCredential.issuer}
                  </Text>
                </View>

                {selectedCredential.issuanceDate && (
                  <View style={styles.detailSection}>
                    <Text
                      style={[
                        styles.detailLabel,
                        {color: isDarkMode ? THEME.darkText : THEME.text},
                      ]}>
                      Issued
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        {color: isDarkMode ? THEME.darkText : THEME.text},
                      ]}>
                      {new Date(
                        selectedCredential.issuanceDate,
                      ).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text
                    style={[
                      styles.detailLabel,
                      {color: isDarkMode ? THEME.darkText : THEME.text},
                    ]}>
                    Claims
                  </Text>
                  {Object.entries(selectedCredential.claims).length === 0 ? (
                    <Text style={styles.detailValue}>No claims found</Text>
                  ) : (
                    Object.entries(selectedCredential.claims).map(
                      ([key, value]) => (
                        <View key={key} style={styles.claim}>
                          <Text
                            style={[
                              styles.claimKey,
                              {color: isDarkMode ? THEME.darkText : THEME.text},
                            ]}>
                            {key}:
                          </Text>
                          <Text
                            style={[
                              styles.claimValue,
                              {color: isDarkMode ? THEME.darkText : THEME.text},
                            ]}>
                            {JSON.stringify(value)}
                          </Text>
                        </View>
                      ),
                    )
                  )}
                </View>
              </ScrollView>
            ) : (
              <View style={{alignItems: 'center', padding: 32}}>
                <Text style={{color: THEME.primary, fontSize: 18}}>
                  Loading...
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Replace the existing styles
const styles = StyleSheet.create({
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    flexGrow: 1,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    color: THEME.primary,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: THEME.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: THEME.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  credentialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FE',
    marginBottom: 12,
  },
  credentialInfo: {
    flex: 1,
    marginRight: 12,
  },
  credentialType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  credentialIssuer: {
    fontSize: 14,
    opacity: 0.7,
  },
  deleteButton: {
    backgroundColor: '#FF4757',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    opacity: 0.7,
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: '600',
  },
  modalBody: {
    flex: 1,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.7,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  claim: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  claimKey: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  claimValue: {
    fontSize: 14,
    flex: 1,
  },
});

export default App;
