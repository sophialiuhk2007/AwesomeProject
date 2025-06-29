import React from 'react';
import {Modal, View, Text, TouchableOpacity, ScrollView} from 'react-native';

type DetailedCredentialItem = {
  id: string;
  type: string[];
  issuer: string;
  issuanceDate?: string;
  expirationDate?: string;
  claims: Record<string, any>;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  selectedCredential: DetailedCredentialItem | null;
  styles: any;
  THEME: any;
  isDarkMode: boolean;
};

const CredentialModal: React.FC<Props> = ({
  visible,
  onClose,
  selectedCredential,
  styles,
  THEME,
  isDarkMode,
}) => (
  <Modal
    visible={visible}
    animationType="slide"
    transparent={true}
    onRequestClose={onClose}>
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
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
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
                Claims
              </Text>
              {selectedCredential.claims &&
              Object.keys(selectedCredential.claims).length > 0 ? (
                Object.entries(selectedCredential.claims).map(
                  ([key, value]) => (
                    <View key={key} style={styles.claim}>
                      <Text style={styles.claimKey}>{key}:</Text>
                      <Text style={styles.claimValue}>
                        {typeof value === 'object'
                          ? JSON.stringify(value, null, 2)
                          : String(value)}
                      </Text>
                    </View>
                  ),
                )
              ) : (
                <Text style={styles.detailValue}>No claims found</Text>
              )}
            </View>
          </ScrollView>
        ) : (
          <View style={{alignItems: 'center', padding: 32}}>
            <Text style={{color: THEME.primary, fontSize: 18}}>Loading...</Text>
          </View>
        )}
      </View>
    </View>
  </Modal>
);

export default CredentialModal;
