// Static collection happy path: imports, scoped package and a require.
import FlashList from '@shopify/flash-list';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

const legacy = require('legacy-bridge');

export const styles = StyleSheet.create({ row: {} });
export const list = FlashList;
export const bridge = legacy;
export const hello = React.createElement(Text, null, 'hi');
