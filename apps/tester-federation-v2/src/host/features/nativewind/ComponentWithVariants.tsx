import type React from 'react';
import { Text } from 'react-native';

const variantStyles = {
  default: 'rounded',
  primary: 'bg-blue-500 text-white',
};

type Props = {
  variant: keyof typeof variantStyles;
  className?: string;
} & React.ComponentProps<typeof Text>;

export default function ComponentWithVariants({
  variant,
  className,
  ...props
}: Props) {
  const merged = [variantStyles.default, variantStyles[variant], className]
    .filter(Boolean)
    .join(' ');
  return (
    <Text testID="nativewind-variants-text" className={merged} {...props} />
  );
}
