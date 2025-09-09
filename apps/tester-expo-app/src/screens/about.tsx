import { useRouter } from 'expo-router';
import { Button, ScrollView } from 'react-native';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <ScrollView
      contentContainerStyle={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Button title="Go back" onPress={router.back} />
    </ScrollView>
  );
}
