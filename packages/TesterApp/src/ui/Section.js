import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { Colors } from 'react-native/Libraries/NewAppScreen';

export const Section = ({ children, title, description }) => {
  return (
    <View style={styles.sectionContainer}>
      <Text
        colorLight={Colors.white}
        colorDark={Colors.black}
        style={styles.sectionTitle}
      >
        {title}
      </Text>
      <Text
        colorLight={Colors.light}
        colorDark={Colors.dark}
        style={styles.sectionDescription}
      >
        {description}
      </Text>
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
