import React, { useState } from 'react';
import styled, { css, useTheme } from 'styled-components';

import { ArrowIcon } from 'UI/icons';
import { ScrollVertical } from 'UI/components/ScrollVertical';
import { animateValue } from 'UI/utils/animateValue';
import { NavItem } from './NavItem';
import { Paragraph } from '../Paragraph';

const NavLink = styled(NavItem)(
  ({ theme: { colors } }) => css`
    background-color: ${colors.shadeDark};
    color: ${colors.shadeUltraLight};
    cursor: pointer;
    justify-content: space-between;

    &:hover {
      background-color: ${colors.shadeMid};
      color: ${colors.secondary};

      svg {
        fill: ${colors.secondary};
      }
    }
  `,
);

const ContentWrapper = styled(Paragraph)(
  ({ theme: { colors } }) => css`
    background-color: ${colors.primary};
    padding: 0;
    position: absolute;
    top: 0;
    z-index: 1;
  `,
);

const GoBackButton = styled(NavItem)(
  ({ theme: { colors } }) => css`
    color: ${colors.shadeUltraLight};
    cursor: pointer;
    font-weight: bold;

    &:hover {
      background-color: ${colors.shadeDark};
      color: ${colors.secondary};

      svg {
        fill: ${colors.secondary};
      }
    }
  `,
);

type MenuItemType = {
  title: string;
};

export const NavItemWithContent: React.FC<MenuItemType> = ({ children, title }) => {
  const { colors, navigationWidth } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [leftOffset, setLeftOffset] = useState(navigationWidth);
  const openItem = (): void => {
    setIsOpen(true);
    animateValue({
      from: navigationWidth,
      to: 0,
      callback: setLeftOffset,
    });
  };
  const closeItem = (): void => {
    animateValue({
      from: 0,
      to: navigationWidth,
      callback: setLeftOffset,
      onAnimationEnd: () => setIsOpen(false),
    });
  };

  return (
    <>
      <NavLink as='button' type='button' onClick={openItem}>
        {title}
        <ArrowIcon color={colors.shadeLight} />
      </NavLink>
      {isOpen && (
        <ContentWrapper style={{ left: leftOffset }}>
          <ScrollVertical>
            <GoBackButton as='button' type='button' onClick={closeItem}>
              <ArrowIcon
                color={colors.shadeUltraLight}
                style={{ marginRight: '0.5rem' }}
                transform='scaleX(-1)'
              />
              Go back
            </GoBackButton>
            <div>
              <NavItem
                style={{
                  color: colors.hightlight,
                  fontWeight: 'bold',
                }}
              >
                {title}
              </NavItem>
              <div style={{ width: `${navigationWidth}px` }}>{children}</div>
            </div>
          </ScrollVertical>
        </ContentWrapper>
      )}
    </>
  );
};
