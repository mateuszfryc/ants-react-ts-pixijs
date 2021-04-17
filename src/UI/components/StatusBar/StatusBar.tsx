import React from 'react';
import styled, { css } from 'styled-components';

const Bar = styled.div(
  ({ theme: { colors } }) => css`
    display: flex;
    align-items: center;
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

const fpsWidth = '40px';

export const StatusBar: React.FC = () => {
  return (
    <Bar>
      <Status id='status-fps' style={{ width: fpsWidth }}>
        FPS: <span>0</span>
      </Status>
      <Status id='status-fps-min' style={{ width: fpsWidth }}>
        MIN: <span>0</span>
      </Status>
      <Status id='status-fps-max' style={{ width: fpsWidth }}>
        MAX: <span>0</span>
      </Status>
    </Bar>
  );
};
