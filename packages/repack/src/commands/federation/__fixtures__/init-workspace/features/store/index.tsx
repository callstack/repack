// Feature folder for federation-init scan tests: static imports only here.
import React from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { formatPrice } from './price';

export function StoreScreen({ products }) {
  return (
    <View>
      <FlashList
        data={products}
        renderItem={({ item }) => <React.Fragment>{formatPrice(item.price)}</React.Fragment>}
      />
    </View>
  );
}
