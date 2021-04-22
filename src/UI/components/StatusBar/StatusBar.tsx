import React from 'react';
import styled, { css } from 'styled-components';
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

export const StatusBar: React.FC = () => {
  return (
    <Bar>
      <Flex>
        <Status id='status-fps' style={{ width: fpsWidth }}>
          FPS: <span>0</span>
        </Status>
        <Status id='status-fps-min' style={{ width: fpsWidth }}>
          MIN: <span>0</span>
        </Status>
        <Status id='status-fps-max' style={{ width: fpsWidth }}>
          MAX: <span>0</span>
        </Status>
      </Flex>
      <Flex>
        <Status id='status-ants-total' style={{ width: '80px' }}>
          Ants total: <span>0</span>
        </Status>
        <Status id='status-ants-on-screen' style={{ width: '120px' }}>
          Ants OFF screen: <span>0</span>
        </Status>
      </Flex>
    </Bar>
  );
};
