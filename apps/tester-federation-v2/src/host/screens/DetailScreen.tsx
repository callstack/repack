import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

const DetailScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>DetailScreen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 20,
    fontWeight: '700',
  },
});

export default DetailScreen;
