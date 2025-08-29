import { ExpoRoot } from 'expo-router';
import { ctx } from 'expo-router/_ctx';

console.log(ctx.keys());

export default function Application() {
  return <ExpoRoot context={ctx} />;
}
