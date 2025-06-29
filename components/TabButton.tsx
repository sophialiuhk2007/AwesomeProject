import React from 'react';
import {TouchableOpacity, Text} from 'react-native';

type TabButtonProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  isDarkMode: boolean;
  THEME: any;
};

const TabButton: React.FC<TabButtonProps> = ({
  label,
  selected,
  onPress,
  isDarkMode,
  THEME,
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

export default TabButton;
