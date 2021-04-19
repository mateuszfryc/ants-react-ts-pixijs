import React, { useEffect, useRef } from 'react';
import styled, { css } from 'styled-components';

import { Navigation } from 'UI/components/Navigation';
import { SEO } from 'UI/components/SEO';
import { setupGraphics, updateRendererSize } from 'utils/graphics';
import { setupSimulation } from 'simulation/simulation';
import { StatusBar } from '../StatusBar';

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
  const simInitLock = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!simInitLock.current) {
      const { current } = contentRef;
      if (current) {
        const { app, particles, draw } = setupGraphics(current);
        setupSimulation(current, app, particles, draw);
        app.start();
        updateRendererSize(current);

        window.addEventListener('resize', () => {
          updateRendererSize(current!);
        });

        simInitLock.current = true;
      }
    }
  }, []);

  return (
    <AppContainer>
      <SEO />
      <Content ref={contentRef} />
      <Navigation />
      <StatusBar />
    </AppContainer>
  );
};
