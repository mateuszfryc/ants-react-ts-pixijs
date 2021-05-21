import styled, { css } from 'styled-components';

export const Paragraph = styled.p(
  ({ theme: { colors, spacings } }) => css`
    color: ${colors.shadeUltraLight};
    font-size: 0.9rem;
    line-height: 1.3rem;
    padding: ${spacings.M};
  `,
);
