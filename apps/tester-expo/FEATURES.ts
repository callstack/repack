import type { Href } from 'expo-router';

export const FEATURE_GROUPS = [
  'Expo modules',
  'Assets',
  'Chunks',
  'Module Federation',
  'Dev loop',
] as const;

export type FeatureGroup = (typeof FEATURE_GROUPS)[number];

export type Feature = {
  key: string;
  name: string;
  group: FeatureGroup;
  href: Href;
};

export const FEATURES: Feature[] = [
  {
    key: 'expo-module',
    name: 'Expo module',
    group: 'Expo modules',
    href: '/details',
  },
  { key: 'image', name: 'Image', group: 'Assets', href: '/image' },
  {
    key: 'density-image',
    name: 'Density image',
    group: 'Assets',
    href: '/density-image',
  },
  { key: 'font', name: 'Font', group: 'Assets', href: '/font' },
  { key: 'lazy', name: 'Lazy chunk', group: 'Chunks', href: '/lazy' },
  {
    key: 'expo-widget',
    name: 'Expo widget',
    group: 'Module Federation',
    href: '/widget',
  },
  {
    key: 'ordinary-widget',
    name: 'Ordinary Re.Pack widget',
    group: 'Module Federation',
    href: '/ordinary-widget',
  },
  {
    key: 'fast-refresh',
    name: 'Fast Refresh',
    group: 'Dev loop',
    href: '/fast-refresh',
  },
  {
    key: 'symbolication',
    name: 'Symbolication',
    group: 'Dev loop',
    href: '/symbolication',
  },
];
