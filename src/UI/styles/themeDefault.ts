import { DefaultTheme } from 'styled-components';

import { setColor } from 'UI/utils/styles';
import * as colors from './colors';

const setFontSize = (size: number): string => {
  return `
        font-size: ${size}rem;
        line-height: ${size * 1.25}rem;
    `;
};

const spacings = {
  XS: '0.2rem',
  S: '0.5rem',
  M: '0.8rem',
  L: '1.4rem',
};

const fonts = {
  size: {
    S: setFontSize(0.8),
    paragraph: setFontSize(0.95),
    lead: setFontSize(1.1),
    title: setFontSize(2.4),
    sectionTitle: setFontSize(4),
  },
};

export const navigationClosedWidth = 40;
export const navigationWidth = 320;

export const theme: DefaultTheme = {
  colors: {
    primary: setColor(colors.gray40),
    secondary: setColor(colors.white),
    shade: setColor(colors.gray20),
    shadeDark: setColor(colors.gray60),
    shadeMid: setColor(colors.gray80),
    shadeLight: setColor(colors.gray100),
    shadeUltraLight: setColor(colors.gray190),
    hightlight: setColor(colors.blueLight),
  },
  fonts,
  navigationClosedWidth,
  navigationWidth,
  spacings,
};
