import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';

type CredentialItem = {
  id: string;
  type: string[];
  issuer: string;
};

type Props = {
  credentials: CredentialItem[];
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
  styles: any;
  THEME: any;
  isDarkMode: boolean;
};

const CredentialList: React.FC<Props> = ({
  credentials,
  onPress,
  onDelete,
  styles,
  THEME,
  isDarkMode,
}) => (
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
          onPress={() => onPress(cred.id)}>
          <View style={styles.credentialInfo}>
            <Text
              style={[
                styles.credentialType,
                {
                  color: THEME.accent,
                },
              ]}>
              {cred.type[0]}
            </Text>
            <Text
              style={[
                styles.credentialIssuer,
                {
                  color: 'rgba(226, 232, 240, 0.7)',
                },
              ]}>
              {cred.issuer}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onDelete(cred.id)}
            style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))
    )}
  </View>
);

export default CredentialList;
