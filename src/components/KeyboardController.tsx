import React from 'react';
import { View } from 'react-native';
import * as KeyboardController from 'react-native-keyboard-controller';

const KeyboardProviderFallback: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);

const KeyboardStickyViewFallback: React.FC<{ children?: React.ReactNode; style?: any }> = ({
  children,
  style,
}) => <View style={style}>{children}</View>;

export const KeyboardProvider =
  (KeyboardController?.KeyboardProvider ?? KeyboardProviderFallback) as React.ComponentType<any>;
export const KeyboardStickyView =
  (KeyboardController?.KeyboardStickyView ?? KeyboardStickyViewFallback) as React.ComponentType<any>;
