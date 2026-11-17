import { StyleSheet, Text, TouchableOpacity } from 'react-native';

type ActionButtonProps = {
  testID: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
};

const ActionButton = ({
  testID,
  label,
  onPress,
  disabled = false,
  variant = 'primary',
}: ActionButtonProps) => (
  <TouchableOpacity
    testID={testID}
    style={[
      styles.button,
      variant === 'secondary' && styles.secondary,
      disabled && styles.disabled,
    ]}
    disabled={disabled}
    onPress={onPress}
  >
    <Text
      style={[styles.text, variant === 'secondary' && styles.secondaryText]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 30, 114, 1)',
  },
  secondary: {
    backgroundColor: '#d8cbe8',
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
  },
  secondaryText: {
    color: '#200a12',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default ActionButton;
