import React, { useEffect, useRef } from 'react';
import styled, { css } from 'styled-components';

import { Navigation } from 'UI/components/Navigation';
import { SEO } from 'UI/components/SEO';
import { setupGraphics, updateRendererSize } from 'utils/graphics';
import { setupSimulation } from 'simulation/simulation';

export const AppContainer = styled.div(
  ({ theme: { colors } }) => css`
    width: 100%;
    height: 100%;
    color: ${colors.primary};
    display: flex;
    justify-content: space-between;
  `,
);

export const Content = styled.div(
  () => css`
    overflow: hidden;
    flex: 1;
  `,
);

export const App: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { current } = contentRef;
    if (current) {
      const { app, particles, draw } = setupGraphics(current);
      setupSimulation(current, app, particles, draw);
      app.start();
      updateRendererSize(current);

      window.addEventListener('resize', () => {
        updateRendererSize(current!);
      });
    }
  }, []);

  return (
    <AppContainer>
      <SEO />
      <Content ref={contentRef} />
      <Navigation />
    </AppContainer>
  );
};
