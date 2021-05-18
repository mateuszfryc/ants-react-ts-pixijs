import React, { useState } from 'react';
import styled, { css } from 'styled-components';

import { MenuIcon, CloseIcon } from 'UI/icons';
import { Paragraph } from 'UI/components/Paragraph';
import { ScrollVertical } from 'UI/components/ScrollVertical';
import { colorsLibrary, navigationWidth } from 'UI/styles/themeDefault';
import { Flex } from 'UI/components/Flex';
import { NavItem } from './NavItem';
import { NavItemWithContent } from './NavItemWithContent';
import { Simulation } from './Simulation';

const OpenMenuButton = styled(Flex)(
  ({ theme: { spacings } }) => css`
    height: 40px;
    padding: ${spacings.S} ${spacings.M};
    position: fixed;
    right: 0;
    top: 0;
  `,
);

const NavigationOpen = styled.div(
  ({ theme: { colors } }) => css`
    align-items: flex-start;
    background-color: ${colors.primary};
    color: ${colors.secondary};
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: flex-start;
    overflow: hidden;
    position: fixed;
    top: 0;
    right: 0;
    width: ${navigationWidth}px;
    transition: right ease 0.2s;
  `,
);

export const Navigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <OpenMenuButton as='button' type='button' onClick={() => setIsOpen(true)}>
        <MenuIcon color={colorsLibrary.secondary} />
      </OpenMenuButton>
      <NavigationOpen style={{ right: isOpen ? 0 : `${-navigationWidth}px` }}>
        <ScrollVertical>
          <NavItem style={{ fontWeight: 'bold', justifyContent: 'space-between' }}>
            <Flex>
              <MenuIcon color={colorsLibrary.secondary} style={{ marginRight: '0.5rem' }} />
              Ants Simulation
            </Flex>
            <Flex as='button' type='button' onClick={() => setIsOpen(false)}>
              <CloseIcon color={colorsLibrary.secondary} />
            </Flex>
          </NavItem>

          <Simulation />

          <NavItemWithContent title='Graphics'>
            <Paragraph>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua.
            </Paragraph>
          </NavItemWithContent>

          <NavItemWithContent title='Debug Draw'>
            <Paragraph>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua.
            </Paragraph>
          </NavItemWithContent>
        </ScrollVertical>
      </NavigationOpen>
    </>
  );
};
