import React, { useState } from 'react';
import styled, { css, useTheme } from 'styled-components';

import { MenuIcon, CloseIcon } from 'UI/icons';
import { Paragraph } from 'UI/components/Paragraph';
import { ScrollVertical } from 'UI/components/ScrollVertical';
import { Flex } from 'UI/components/Flex';
import { NavItem } from './NavItem';
import { NavItemWithContent } from './NavItemWithContent';
import { SimulationSettings } from './SimulationSettings';

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
  ({ theme: { colors, navigationWidth } }) => css`
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
  const { colors, navigationWidth } = useTheme();

  return (
    <>
      <OpenMenuButton as='button' type='button' onClick={() => setIsOpen(true)}>
        <MenuIcon color={colors.secondary} />
      </OpenMenuButton>
      <NavigationOpen style={{ right: isOpen ? 0 : `${-navigationWidth}px` }}>
        <ScrollVertical>
          <NavItem style={{ fontWeight: 'bold', justifyContent: 'space-between' }}>
            <Flex>
              <MenuIcon color={colors.secondary} style={{ marginRight: '0.5rem' }} />
              Ants Simulation
            </Flex>
            <Flex as='button' type='button' onClick={() => setIsOpen(false)}>
              <CloseIcon color={colors.secondary} />
            </Flex>
          </NavItem>

          <SimulationSettings />

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
