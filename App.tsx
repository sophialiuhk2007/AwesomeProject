/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useState} from 'react';
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
} from '@credo-ts/core';
import {agentDependencies} from '@credo-ts/react-native';
import {AskarModule} from '@credo-ts/askar';
import {ariesAskar} from '@hyperledger/aries-askar-react-native';
import {OpenId4VcHolderModule} from '@credo-ts/openid4vc';

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
        console.log('Agent initialized!');
      })
      .catch(e => {
        console.error(
          `Something went wrong while setting up the agent! Message: ${e}`,
        );
      });
  }, []);

  React.useEffect(() => {
    if (credentialOffer) {
      console.log('Credential Offer:', credentialOffer);
    }
  }, [credentialOffer]);

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const safePadding = '5%';

  const handleInputSubmit = () => {
    setCredentialOffer(inputValue);
    setInputValue('');
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
          <Section title="Step One">
            Initializing <Text style={styles.highlight}>holder</Text> agent.
          </Section>
          <Section title="See Your Changes">
            <ReloadInstructions />
          </Section>
          <Section title="Debug">
            <DebugInstructions />
          </Section>
          <Section title="Learn More">
            Read the docs to discover what to do next:
          </Section>
          <LearnMoreLinks />
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
