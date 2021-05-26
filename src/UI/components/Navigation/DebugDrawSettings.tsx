import React, { ChangeEvent, useContext } from 'react';
import styled, { css, useTheme } from 'styled-components';
import { action } from 'mobx';
import { observer } from 'mobx-react';

import { InputField } from 'UI/components/InputField';
import storeContext from 'stores/globalStore';
import { Button } from '../Button';
import { Paragraph } from '../Paragraph';
import { NavItem } from './NavItem';
import { NavItemWithContent } from './NavItemWithContent';
import { Flex } from '../Flex';

const Option = styled(Flex)(
  ({ theme: { spacings } }) => css`
    margin-bottom: ${spacings.XS};
  `,
);

const Label = styled.label(
  ({ theme: { spacings, fonts } }) => css`
    ${fonts.size.S}
    padding-left: ${spacings.M};
  `,
);

export const DebugDrawSettings: React.FC = observer(() => {
  const { spacings } = useTheme();
  const { debugDraw } = useContext(storeContext);

  return (
    <NavItemWithContent title='Debug Draw'>
      <Paragraph style={{ padding: spacings.M }}>
        BE CAREFULL: debug draw was not intended for the gameplay. These are CPU heavy draw calls
        that can crash the browser. Use only with minmal objects count on the screen.
      </Paragraph>
      <Paragraph as='div'>
        {debugDraw.drawables.map((item) => (
          <Option>
            <InputField
              type='checkbox'
              name='debug-draw-collisions'
              id='debug-draw-collisions'
              onChange={() => debugDraw.updateQueue(item)}
            />
            <Label htmlFor='debug-draw-collisions'>{item.label}</Label>
          </Option>
        ))}
      </Paragraph>
    </NavItemWithContent>
  );
});
