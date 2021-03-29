/// <reference types="next" />
/// <reference types="next/types/global" />

declare module '*.module.css' {
  const styles: Record<string, string>;
  export default styles;
}
