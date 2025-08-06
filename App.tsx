/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useState, useRef} from 'react';
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
  Platform,
} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';
import {THEME} from './theme';
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
import PassKit, {AddPassButton} from 'react-native-passkit-wallet';
import {Alert} from 'react-native';
import {Buffer} from 'buffer';
import axios from 'axios';
import storage from '@react-native-firebase/storage';
import {create} from 'domain';

if (typeof global.TextDecoder === 'undefined') {
  // @ts-ignore
  global.TextDecoder = TextDecoder;
}
if (typeof global.TextEncoder === 'undefined') {
  // @ts-ignore
  global.TextEncoder = TextEncoder;
}

// Update Tab type to include new screen
type Tab = 'Credentials' | 'Verification' | 'MyCredentials';

// Add new type for credential items
type CredentialItem = {
  id: string;
  type: string[];
  issuer: string;
  vct?: string;
  issueDate?: string;
};

// Add new type for detailed credential view
type DetailedCredentialItem = {
  id: string;
  type: string[];
  issuer: string;
  issueDate?: string;
  expirationDate?: string;
  claims: Record<string, any>;
  pkpassBase64?: string | null;
  vct?: string; // <-- add this line
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
  const [pkpassBase64, setPkpassBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  function base64UrlDecode(input: string) {
    // Replace URL-safe chars and pad with '='
    input = input.replace(/-/g, '+').replace(/_/g, '/');
    while (input.length % 4) input += '=';
    const decoded = Buffer.from(input, 'base64').toString('utf-8');
    return decoded;
  }
  function formatVctLabel(vct?: string) {
    if (!vct) return '';
    // Insert space before capital letters and capitalize first letter
    return vct
      .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to camel Case
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // ABBRWord to ABBR Word
      .replace(/_/g, ' ') // underscores to spaces
      .replace(/([a-z])([0-9])/gi, '$1 $2') // letters and numbers
      .replace(/([0-9])([a-zA-Z])/gi, '$1 $2') // numbers and letters
      .replace(/([a-z])([A-Z])/g, '$1 $2') // lowercase followed by uppercase
      .replace(/\s+/g, ' ') // collapse multiple spaces
      .trim()
      .replace(/^./, s => s.toUpperCase()); // capitalize first letter
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
        try {
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
                    credentialFormat ===
                      OpenId4VciCredentialFormatProfile.SdJwtVc
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
          // if (
          //   resolvedCredentialOffer &&
          //   resolvedCredentialOffer.credentialOfferPayload &&
          //   resolvedCredentialOffer.credentialOfferPayload.pkpassBase64
          // ) {
          //   const pkpassBase64 =
          //     resolvedCredentialOffer.credentialOfferPayload.pkpassBase64;
          //   setPkpassBase64(pkpassBase64);
          //   try {
          //     await PassKit.addPass(pkpassBase64);
          //     Alert.alert('Success', 'Pass added to Apple Wallet!');
          //   } catch (e) {
          //     Alert.alert('Error', 'Failed to add pass to Apple Wallet.');
          //     console.error('Error adding pass:', e);
          //   }
          // }
          setCredentialOffer('');
          setTab('MyCredentials'); // <-- Navigate to MyCredentials tab
          // Use agentRef.current here
          // Example:
          // const credentials = await agentRef.current.modules.openId4VcHolderModule.acceptCredentialOfferUsingPreAuthorizedCode(...);
        } catch (e) {
          console;
        } finally {
          setLoading(false);
        }
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
        ...w3cCredentials.map(cred => {
          // Extract vct from claims (credentialSubject)
          let vct: string | undefined;
          if (cred.credential.credentialSubject) {
            if (
              typeof cred.credential.credentialSubject === 'object' &&
              !Array.isArray(cred.credential.credentialSubject)
            ) {
              vct = (cred.credential.credentialSubject as any)?.vct;
            } else if (Array.isArray(cred.credential.credentialSubject)) {
              for (const item of cred.credential.credentialSubject) {
                if (item && typeof item === 'object' && (item as any)?.vct) {
                  vct = (item as any).vct;
                  break;
                }
              }
            }
          }
          return {
            id: cred.id,
            type: cred.credential.type,
            issuer:
              typeof cred.credential.issuer === 'string'
                ? cred.credential.issuer
                : cred.credential.issuer?.id || 'Unknown Issuer',
            vct,
          };
        }),
        ...sdJwtCredentials.map(cred => {
          // Decode compactSdJwtVc and extract vct and issueDate
          let vct: string | undefined;
          let issueDate: string | undefined;
          try {
            const jwt = (cred as any).compactSdJwtVc || (cred as any).jwt;
            if (jwt) {
              const jwtParts = jwt.split('~')[0];
              const [header, payload] = jwtParts.split('.').slice(0, 2);
              if (payload) {
                const decoded = JSON.parse(base64UrlDecode(payload));
                vct = decoded.vct || decoded?.vc?.credentialSubject?.vct;
                issueDate =
                  decoded.issueDate || decoded.vc?.credentialSubject.issueDate;
              }
            }
          } catch (e) {
            // ignore decoding errors
          }
          return {
            id: cred.id,
            type: ['SD-JWT-VC'],
            issuer: '', // Not used in list anymore
            vct,
            issueDate,
          };
        }),
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
        let pkpassBase64: string | null = null;

        if (w3cCred.credential.credentialSubject) {
          if (
            typeof w3cCred.credential.credentialSubject === 'object' &&
            !Array.isArray(w3cCred.credential.credentialSubject)
          ) {
            claims = w3cCred.credential.credentialSubject;
            if (claims.pkpassAttachment && claims.pkpassAttachment.data) {
              pkpassBase64 = claims.pkpassAttachment.data;
            }
          } else if (Array.isArray(w3cCred.credential.credentialSubject)) {
            w3cCred.credential.credentialSubject.forEach((item: any) => {
              if (typeof item === 'object') {
                claims = {...claims, ...item};
                if (item.pkpassAttachment && item.pkpassAttachment.data) {
                  pkpassBase64 = item.pkpassAttachment.data;
                }
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
          issueDate: issuanceDate,
          expirationDate,
          claims,
          pkpassBase64,
        };
      }
      // Try SD-JWT
      const sdJwtCred = await agentRef.current.sdJwtVc.getById(id);
      console.log('Raw SD-JWT credential record:', sdJwtCred);

      const jwt = (sdJwtCred as any).compactSdJwtVc || (sdJwtCred as any).jwt;
      if (jwt) {
        let claims: Record<string, any> = {};
        try {
          // Split SD-JWT into parts
          const jwtPartsArr = jwt.split('~');
          // First part is the JWT (header.payload.signature)
          const [header, payload] = jwtPartsArr[0].split('.').slice(0, 2);
          if (payload) {
            const decoded = JSON.parse(base64UrlDecode(payload));
            claims = decoded.vc?.credentialSubject || decoded || {};
          } else {
            console.warn('No payload found in SD-JWT JWT:', jwt);
          }
          // The rest are disclosures, decode and merge
          for (let i = 1; i < jwtPartsArr.length; i++) {
            try {
              const disclosureDecoded = base64UrlDecode(jwtPartsArr[i]);
              const disclosureArr = JSON.parse(disclosureDecoded);
              // SD-JWT disclosures are typically [salt, claimName, claimValue]
              if (Array.isArray(disclosureArr) && disclosureArr.length >= 3) {
                const claimName = disclosureArr[1];
                const claimValue = disclosureArr[2];
                claims[claimName] = claimValue;
              }
            } catch (e) {
              console.warn('Failed to decode SD-JWT disclosure:', e);
            }
          }
          console.log('Claims to be shown:', claims);
        } catch (e) {
          console.warn('Failed to decode SD-JWT claims:', e);
        }
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
    setLoading(true);
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
        paddingVertical: 14,
        backgroundColor: selected ? THEME.card : 'transparent',
        borderBottomWidth: 2,
        borderBottomColor: selected ? THEME.primary : 'transparent',
        alignItems: 'center',
        marginHorizontal: 4,
        borderRadius: selected ? 8 : 0,
      }}>
      <Text
        style={{
          color: selected ? THEME.primary : THEME.text,
          fontWeight: selected ? '700' : '500',
          fontSize: 14,
          fontFamily:
            Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif-medium',
          letterSpacing: 0.5,
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
      <>
        {loading ? (
          <View
            style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <Text
              style={{color: THEME.primary, fontSize: 20, marginBottom: 16}}>
              Accepting credential...
            </Text>
          </View>
        ) : (
          <>
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
                        backgroundColor: isDarkMode
                          ? THEME.darkCard
                          : THEME.card,
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
                                  color: THEME.accent,
                                },
                              ]}>
                              {formatVctLabel(cred.vct)}
                            </Text>
                            <Text
                              style={[
                                styles.credentialIssuer,
                                {
                                  color: 'rgba(226, 232, 240, 0.7)',
                                },
                              ]}>
                              {cred.issueDate
                                ? `Issued: ${new Date(
                                    cred.issueDate,
                                  ).toLocaleString()}`
                                : cred.issuer}
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
                            backgroundColor: isDarkMode
                              ? THEME.darkCard
                              : THEME.card,
                          },
                        ]}>
                        <Text style={styles.cardTitle}>Add New Credential</Text>
                        <TextInput
                          style={[
                            styles.input,
                            {
                              backgroundColor: 'rgba(15, 23, 42, 0.6)',
                              color: isDarkMode ? THEME.darkText : THEME.text,
                            },
                          ]}
                          placeholder="Paste credential offer URL or scan QR code"
                          placeholderTextColor={
                            isDarkMode ? '#6C7693' : '#8395A7'
                          }
                          value={inputValue}
                          onChangeText={setInputValue}
                          multiline
                        />
                        <TouchableOpacity
                          style={styles.primaryButton}
                          onPress={handleInputSubmit}>
                          <Text style={styles.buttonText}>
                            Accept Credential
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.card,
                          {
                            backgroundColor: isDarkMode
                              ? THEME.darkCard
                              : THEME.card,
                          },
                        ]}>
                        <Text style={styles.cardTitle}>
                          Verification Request
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            {
                              backgroundColor: 'rgba(15, 23, 42, 0.6)',
                              color: isDarkMode ? THEME.darkText : THEME.text,
                            },
                          ]}
                          placeholder="Paste verification request or scan QR code"
                          placeholderTextColor={
                            isDarkMode ? '#6C7693' : '#8395A7'
                          }
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
                      backgroundColor: THEME.card,
                    },
                  ]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, {color: THEME.accent}]}>
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
                        {selectedCredential &&
                        selectedCredential.claims &&
                        Object.keys(selectedCredential.claims).length > 0 ? (
                          Object.entries(selectedCredential.claims)
                            .filter(
                              ([key]) =>
                                ![
                                  'pkpass',
                                  'pkpassAttachment',
                                  'cnf',
                                  'iss',
                                  'iat',
                                  '_sd',
                                  '_sd_alg',
                                  'vct',
                                  'metadata',
                                  'issueDate',
                                ].includes(key),
                            )
                            .map(([key, value]) => (
                              <View key={key} style={styles.claim}>
                                <Text style={styles.claimKey}>
                                  {formatVctLabel(key)}:
                                </Text>
                                <Text style={styles.claimValue}>
                                  {typeof value === 'object'
                                    ? JSON.stringify(value, null, 2)
                                    : String(value)}
                                </Text>
                              </View>
                            ))
                        ) : (
                          <Text style={styles.detailValue}>
                            No claims found
                          </Text>
                        )}
                      </View>
                      {Platform.OS === 'ios' &&
                      selectedCredential.claims?.pkpass ? (
                        <AddPassButton
                          addPassButtonStyle={1}
                          style={{
                            marginTop: 16,
                            width: 160,
                            height: 50,
                          }}
                          onPress={async () => {
                            try {
                              await PassKit.addPass(
                                selectedCredential.claims.pkpass,
                              );
                            } catch (error: any) {
                              console.error('Error adding pass:', error);
                              Alert.alert(
                                'Error',
                                error.message ||
                                  'Failed to add pass to Apple Wallet. Please try again.',
                              );
                            }
                          }}
                        />
                      ) : Platform.OS === 'ios' ? (
                        <AddPassButton
                          addPassButtonStyle={1}
                          style={{
                            marginTop: 16,
                            width: 160,
                            height: 50,
                          }}
                          onPress={async () => {
                            Alert.alert('No pass data found in credential.');
                          }}
                        />
                      ) : null}
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
          </>
        )}
      </>
    </SafeAreaView>
  );
}

// Replace the existing styles
const styles = StyleSheet.create({
  header: {
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.primary + '30',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.primary,
    fontFamily:
      Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif-condensed',
    letterSpacing: 0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.background,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    flexGrow: 1,
  },
  card: {
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: THEME.card,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    color: THEME.primary,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif-medium',
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    color: THEME.text,
  },
  primaryButton: {
    backgroundColor: THEME.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif-medium',
    letterSpacing: 0.5,
  },
  credentialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: THEME.card,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  credentialInfo: {
    flex: 1,
    marginRight: 12,
  },
  credentialType: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    color: THEME.accent,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif-medium',
    letterSpacing: 0.5,
  },
  credentialIssuer: {
    fontSize: 14,
    color: THEME.text,
    opacity: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  deleteButton: {
    backgroundColor: THEME.error + '15',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.error + '30',
  },
  deleteButtonText: {
    color: THEME.error,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    opacity: 0.7,
    marginTop: 20,
    color: THEME.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    maxHeight: '90%',
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.primary,
    fontFamily: Platform.OS === 'ios' ? 'Orbitron-Bold' : 'Roboto',
  },
  modalBody: {
    paddingBottom: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    opacity: 0.8,
    color: THEME.primary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: THEME.text,
  },
  claim: {
    flexDirection: 'column',
    backgroundColor: '#f0f4fa', // Slightly darker background for better contrast
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d0d7e2', // Darker border for better visibility
  },
  claimKey: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    color: THEME.primary,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif-medium',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  claimValue: {
    fontSize: 16,
    fontWeight: '400',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'SF Mono' : 'monospace',
    letterSpacing: 0.2,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: THEME.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.error + '30',
  },
  closeButtonText: {
    fontSize: 16,
    color: THEME.error,
    fontWeight: '600',
  },
});

export default App;
