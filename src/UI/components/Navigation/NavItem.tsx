import { Flex } from 'UI/components/Flex';
import styled, { css } from 'styled-components';

export const NavItem = styled(Flex)<{ isColumn?: boolean }>(
  ({ isColumn, theme: { colors, fonts, navigationWidth, spacings } }) => css`
    ${fonts.size.paragraph}
    border-bottom: 1px solid ${colors.shadeMid};
    color: ${colors.secondary};
    margin-right: 10px;
    padding: ${spacings.S} ${spacings.M};
    text-align: left;
    transition: background-color ease 0.3s, color ease 0.3s;
    width: ${navigationWidth}px;
    ${isColumn &&
    css`
      align-items: flex-start;
      flex-direction: column;
    `}
  `,
);
