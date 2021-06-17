import React from 'react';
import { Info } from './Info';

export function Loader({ className }: { className?: string }) {
  return <Info className={className}>Loading...</Info>;
}
