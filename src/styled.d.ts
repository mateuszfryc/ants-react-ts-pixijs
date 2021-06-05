import 'styled-components';

// and extend them!
declare module 'styled-components' {
  export interface DefaultTheme {
    navigationClosedWidth: number;
    navigationWidth: number;

    colors: {
      primary: string;
      secondary: string;
      shade: string;
      shadeDark: string;
      shadeMid: string;
      shadeLight: string;
      shadeUltraLight: string;
      hightlight: string;
    };

    spacings: {
      XS: string;
      S: string;
      M: string;
      L: string;
    };

    fonts: {
      size: {
        S: string;
        paragraph: string;
        lead: string;
        title: string;
        sectionTitle: string;
      };
    };
  }
}
