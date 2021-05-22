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
    display: grid;
    grid-template-columns: 50% 50%;
    margin-bottom: ${spacings.M};
  `,
);

const Label = styled.div(
  ({ theme: { spacings, fonts } }) => css`
    ${fonts.size.S}
    padding-right: ${spacings.M};
  `,
);

export const SimulationSettings: React.FC = observer(() => {
  const { spacings } = useTheme();
  const store = useContext(storeContext);
  const { simulationSettings } = store;

  return (
    <NavItemWithContent title='Simulation'>
      <Paragraph style={{ padding: spacings.M }}>
        The following settings require to restart simulation after each change.
      </Paragraph>
      <Paragraph as='div'>
        <Option>
          <Label>Ants total count</Label>
          <InputField
            name='ants-count-field'
            type='number'
            value={`${simulationSettings.antsCount}`}
            onChange={action((event: ChangeEvent<HTMLInputElement>) => {
              store.setAntsCount(Number.parseInt(event.target.value, 10));
            })}
          />
        </Option>
        <Option>
          <Label>Nest position</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '15px 1fr 25px 1fr' }}>
            <span>x</span>
            <div>
              <InputField
                style={{ width: '100%' }}
                type='number'
                value={`${simulationSettings.nestPositon.x}`}
                name='next-position-x'
                onChange={action((event: ChangeEvent<HTMLInputElement>) => {
                  store.setNestPosition({
                    ...simulationSettings.nestPositon,
                    x: Number.parseInt(event.target.value, 10),
                  });
                })}
              />
            </div>
            <div style={{ textAlign: 'center' }}>y</div>
            <div>
              <InputField
                style={{ width: '100%' }}
                type='number'
                value={`${simulationSettings.nestPositon.y}`}
                name='next-position-y'
                onChange={action((event: ChangeEvent<HTMLInputElement>) => {
                  store.setNestPosition({
                    ...simulationSettings.nestPositon,
                    y: Number.parseInt(event.target.value, 10),
                  });
                })}
              />
            </div>
          </div>
        </Option>
        <Option>
          <Label>
            Pheromones life span<Label>(in seconds)</Label>
          </Label>
          <InputField
            name='pheromones-life-span'
            type='number'
            value={`${simulationSettings.pheromonesLifeSpan}`}
            onChange={action((event: ChangeEvent<HTMLInputElement>) => {
              store.setPheromonesLifeSpan(Number.parseInt(event.target.value, 10));
            })}
          />
        </Option>
      </Paragraph>

      <NavItem>
        <Button onClick={() => store.createSimulation()}>Restart simulation</Button>
      </NavItem>
    </NavItemWithContent>
  );
});
