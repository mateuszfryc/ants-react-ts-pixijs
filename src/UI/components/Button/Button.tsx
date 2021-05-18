import React, { MouseEvent } from 'react';
import styled, { css } from 'styled-components';

export const ButtonStyled = styled.button(
  ({ theme: { colors, spacings } }) => css`
    background-color: ${colors.secondary};
    border-radius: 5px;
    color: ${colors.primary};
    padding: ${spacings.S} ${spacings.M};
    transition: background-color 0.3s ease;

    &:hover {
      color: ${colors.secondary};
      background-color: ${colors.hightlight};
    }
  `,
);

type ButtonPropsType = {
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event?: MouseEvent<HTMLButtonElement>) => void;
};

export const Button: React.FC<ButtonPropsType> = ({ type = 'button', ...props }) => {
  return (
    <ButtonStyled type={type} {...props}>
      Restart Simulation
    </ButtonStyled>
  );
};
