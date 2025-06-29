import React from 'react';
import {View, Text, TextInput, TouchableOpacity} from 'react-native';

const InputCard = ({
  title,
  placeholder,
  value,
  setValue,
  buttonLabel,
  onSubmit,
  styles,
  isDarkMode,
  THEME,
}: {
  title: string;
  placeholder: string;
  value: string;
  setValue: (v: string) => void;
  buttonLabel: string;
  onSubmit: () => void;
  styles: any;
  isDarkMode: boolean;
  THEME: any;
}) => (
  <View
    style={[
      styles.card,
      {
        backgroundColor: isDarkMode ? THEME.darkCard : THEME.card,
      },
    ]}>
    <Text style={styles.cardTitle}>{title}</Text>
    <TextInput
      style={[
        styles.input,
        {
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          color: isDarkMode ? THEME.darkText : THEME.text,
        },
      ]}
      placeholder={placeholder}
      placeholderTextColor={isDarkMode ? '#6C7693' : '#8395A7'}
      value={value}
      onChangeText={setValue}
      multiline
    />
    <TouchableOpacity style={styles.primaryButton} onPress={onSubmit}>
      <Text style={styles.buttonText}>{buttonLabel}</Text>
    </TouchableOpacity>
  </View>
);

export default InputCard;
