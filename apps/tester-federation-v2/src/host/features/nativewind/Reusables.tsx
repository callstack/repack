import { Button } from './ui/Button';
import { Text } from './ui/Text';

export default function Reusables() {
  return (
    <Button testID="nativewind-reusables-box" variant="primary">
      <Text testID="nativewind-reusables-text" className="text-white">
        I am a button from RN Reusables
      </Text>
    </Button>
  );
}
