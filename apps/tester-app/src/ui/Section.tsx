import { StyleSheet, View } from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';

import { Text } from './Text';
import type { WithChildren } from './types';

type SectionProps = WithChildren<{
  title: string;
  description?: string;
}>;

export const Section = ({ children, title, description }: SectionProps) => {
  return (
    <View style={styles.sectionContainer}>
      <Text
        colorLight={Colors.white}
        colorDark={Colors.black}
        style={styles.sectionTitle}
      >
        {title}
      </Text>
      {description ? (
        <Text
          colorLight={Colors.light}
          colorDark={Colors.dark}
          style={styles.sectionDescription}
        >
          {description}
        </Text>
      ) : null}
      {children}
    </View>
  );
};

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
});
