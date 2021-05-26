import React, { useContext } from 'react';
import styled, { css } from 'styled-components';
import { observer } from 'mobx-react';

import storeContext from 'stores/globalStore';
import { Flex } from '../Flex';

const Bar = styled.div(
  ({ theme: { colors } }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px;
    height: 20px;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    border-top: 1px solid ${colors.shadeDark};
    background: ${colors.primary};
  `,
);

const Status = styled.div(
  ({ theme: { colors } }) => css`
    color: ${colors.secondary};
    font-size: 10px;
    height: 11px;
    line-height: 11px;

    &:not(:last-child) {
      margin-right: 10px;
    }
  `,
);

const fpsWidth = '45px';

export const StatusBar: React.FC = observer(() => {
  const { metrics } = useContext(storeContext);

  return (
    <Bar>
      <Flex>
        <Status id='status-fps' style={{ width: fpsWidth }}>
          FPS: <span>{metrics.fps}</span>
        </Status>
        <Status id='status-fps-min' style={{ width: fpsWidth }}>
          MIN: <span>{metrics.fpsMin}</span>
        </Status>
        <Status id='status-fps-max' style={{ width: fpsWidth }}>
          MAX: <span>{metrics.fpsMax}</span>
        </Status>
      </Flex>
      <Flex>
        <Status id='status-pheromones-total' style={{ width: '160px' }}>
          Pheromones count: <span>{metrics.pheromonesCount}</span>
        </Status>
        <Status id='status-ants-total' style={{ width: '100px' }}>
          Ants count: <span>{metrics.antsCount}</span>
        </Status>
        <Status id='status-ants-on-screen' style={{ width: '120px' }}>
          Ants OFF screen: <span>{metrics.antsOffScreenCount}</span>
        </Status>
      </Flex>
    </Bar>
  );
});
