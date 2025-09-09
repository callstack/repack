import { Link } from 'expo-router';
import { Button, ScrollView } from 'react-native';

export default function IndexScreen() {
  return (
    <ScrollView
      contentContainerStyle={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Link href="/about" asChild>
        <Button title="Go to About" />
      </Link>
    </ScrollView>
  );
}
