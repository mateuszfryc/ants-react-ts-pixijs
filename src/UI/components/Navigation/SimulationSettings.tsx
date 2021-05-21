import React, { useContext } from 'react';
import { useTheme } from 'styled-components';
import { observer } from 'mobx-react';

import { InputField } from 'UI/components/InputField';
import storeContext from 'stores/globalStore';
import { Button } from '../Button';
import { Paragraph } from '../Paragraph';
import { NavItem } from './NavItem';
import { NavItemWithContent } from './NavItemWithContent';

export const SimulationSettings: React.FC = observer(() => {
  const store = useContext(storeContext);
  const { spacings } = useTheme();

  return (
    <NavItemWithContent title='Simulation'>
      <Paragraph style={{ padding: spacings.M }}>
        The following settings require to restart simulation after each change.
      </Paragraph>
      <NavItem>
        <InputField
          label='Number of ants'
          inLineLabel
          type='number'
          name='ants-count-field'
          onChange={(value: string) => {
            store.setAntsCount(Number.parseInt(value, 10));
          }}
        />
      </NavItem>
      <NavItem>
        <Button onClick={() => store.createSimulation()}>Restart simulation</Button>
      </NavItem>
    </NavItemWithContent>
  );
});
