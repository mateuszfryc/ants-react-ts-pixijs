import React, { useEffect, useRef } from 'react';
import styled, { css } from 'styled-components';

import { Navigation } from 'components/Navigation';
import { SEO } from 'components/SEO';
import { setupPixiAnts } from 'logic/ants';

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
    flex: 1;
  `,
);

export const App: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) setupPixiAnts(contentRef.current);
  }, []);

  return (
    <AppContainer>
      <SEO />
      <Content ref={contentRef} />
      <Navigation />
    </AppContainer>
  );
};
