import React, { ChangeEvent } from 'react';
import styled, { css } from 'styled-components';

import { inputTypes } from './types';

const Input = styled.input(
  ({ theme: { colors, spacings, fonts } }) => css`
    ${fonts.size.S}
    background-color: ${colors.shadeMid};
    border: 1px solid ${colors.shadeLight};
    border-radius: 5px;
    color: ${colors.shadeUltraLight};
    padding: ${spacings.XS};
  `,
);

type InputFieldType = {
  name: string;

  checked?: boolean;
  disabled?: boolean;
  id?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  type?: inputTypes;
  value?: string;
};

export const InputField: React.FC<InputFieldType> = ({ type = 'text', ...rest }) => {
  return <Input {...rest} type={type} />;
};
