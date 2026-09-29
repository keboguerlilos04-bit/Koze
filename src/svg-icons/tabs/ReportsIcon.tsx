import React from 'react';
import Svg, { Rect } from 'react-native-svg';

// Koze: Reports tab icon (three bars), same 49x40 frame as the other tab icons.
export const ReportsIconOutline = () => {
  return (
    <Svg width="49" height="40" viewBox="0 0 49 40" fill="none">
      <Rect x="14" y="14" width="5" height="11" rx="1.5" stroke="#5E7178" strokeWidth="1.5" />
      <Rect x="21.75" y="8" width="5" height="17" rx="1.5" stroke="#5E7178" strokeWidth="1.5" />
      <Rect x="29.5" y="3" width="5" height="22" rx="1.5" stroke="#5E7178" strokeWidth="1.5" />
    </Svg>
  );
};

export const ReportsIconFilled = () => {
  return (
    <Svg width="49" height="40" viewBox="0 0 49 40" fill="none">
      <Rect x="13.25" y="13.25" width="6.5" height="12.5" rx="2" fill="#226476" />
      <Rect x="21" y="7.25" width="6.5" height="18.5" rx="2" fill="#226476" />
      <Rect x="28.75" y="2.25" width="6.5" height="23.5" rx="2" fill="#226476" />
    </Svg>
  );
};
