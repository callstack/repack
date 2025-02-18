import { Text } from 'react-native';

const variantStyles = {
  default: 'rounded',
  primary: 'bg-blue-500 text-white',
  secondary: 'bg-white-500 text-black',
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
  return (
    <Text
      className={`
        ${variantStyles.default}
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    />
  );
}
