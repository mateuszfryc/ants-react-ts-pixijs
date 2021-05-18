import React from 'react';

import { InputField } from 'UI/components/InputField';
import { Button } from '../Button';
import { Paragraph } from '../Paragraph';
import { NavItem } from './NavItem';
import { NavItemWithContent } from './NavItemWithContent';

export const Simulation: React.FC = () => {
  return (
    <NavItemWithContent title='Simulation'>
      <Paragraph>The following settings require to restart simulation after each change.</Paragraph>
      <NavItem>
        <InputField label='Number of ants' inLineLabel type='number' name='ants-count-field' />
      </NavItem>
      <NavItem>
        <Button>Restart simulation</Button>
      </NavItem>
    </NavItemWithContent>
  );
};

export default Simulation;
