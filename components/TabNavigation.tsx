import React from 'react';
import {View} from 'react-native';
import TabButton from './TabButton';
import type {Tab} from '../types';

const TabNavigation = ({
  tab,
  setTab,
  isDarkMode,
  THEME,
}: {
  tab: Tab;
  setTab: (tab: Tab) => void;
  isDarkMode: boolean;
  THEME: any;
}) => (
  <View
    style={{flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8}}>
    <TabButton
      label="Add New"
      selected={tab === 'Credentials'}
      onPress={() => setTab('Credentials')}
      isDarkMode={isDarkMode}
      THEME={THEME}
    />
    <TabButton
      label="Verify"
      selected={tab === 'Verification'}
      onPress={() => setTab('Verification')}
      isDarkMode={isDarkMode}
      THEME={THEME}
    />
    <TabButton
      label="My Creds"
      selected={tab === 'MyCredentials'}
      onPress={() => setTab('MyCredentials')}
      isDarkMode={isDarkMode}
      THEME={THEME}
    />
  </View>
);

export default TabNavigation;
