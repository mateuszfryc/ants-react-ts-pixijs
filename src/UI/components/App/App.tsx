import React, { useContext, useEffect, useRef } from 'react';
import styled, { css } from 'styled-components';
import { observer } from 'mobx-react';

import storeContext from 'stores/globalStore';
import { Navigation } from 'UI/components/Navigation';
import { SEO } from 'UI/components/SEO';
import { updateRendererSize } from 'shared/graphics';
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

export const App: React.FC = observer(() => {
  const store = useContext(storeContext);
  const simulationInitalLock = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!simulationInitalLock.current) {
      const { current } = contentRef;
      if (current) {
        updateRendererSize(current);
        store.setSimulationContainer(current);
        store.createSimulation();

        window.addEventListener('resize', () => {
          updateRendererSize(current!);
        });

        simulationInitalLock.current = true;
      }
    }
  }, [store]);

  return (
    <AppContainer>
      <SEO />
      <Content ref={contentRef} />
      <Navigation />
      <StatusBar />
    </AppContainer>
  );
});
