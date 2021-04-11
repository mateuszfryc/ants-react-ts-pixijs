import React, { useEffect, useRef } from 'react';
import styled, { css } from 'styled-components';

import { Navigation } from 'components/Navigation';
import { SEO } from 'components/SEO';
import { setupGraphics, updateRendererSize } from 'graphics';
// import { setupSimulation } from 'simulation';
import { SetupStressTest } from 'collisions/stressTest';

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
      const { app, draw /* , particles */ } = setupGraphics(current);
      const { view } = app;
      // setupSimulation(current, app, particles);
      app.start();
      updateRendererSize(current);
      SetupStressTest(draw, view.width, view.height);

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
