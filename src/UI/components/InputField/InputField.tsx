import React, { ChangeEvent } from 'react';
import styled, { css } from 'styled-components';

import { inputTypes } from './types';

const Label = styled.label<{ inLineLabel?: boolean }>(
  ({ inLineLabel, theme: { colors, fonts, spacings } }) => css`
    align-items: center;
    color: ${colors.shadeUltraLight};
    display: flex;
    justify-content: space-between;
    flex-direction: ${inLineLabel ? 'row' : 'column'};
    ${fonts.size.S}

    &:not(:last-child) {
      margin-bottom: ${spacings.M};
    }
  `,
);

const Input = styled.input(
  ({ theme: { colors, spacings } }) => css`
    background-color: ${colors.shadeMid};
    border: 1px solid ${colors.shadeLight};
    border-radius: 5px;
    color: ${colors.shadeUltraLight};
    display: block;
    margin-left: 10px;
    padding: ${spacings.XS} ${spacings.S};
    width: 50%;
  `,
);

type InputFieldType = {
  disabled?: boolean;
  label?: string;
  name: string;
  placeholder?: string;
  type?: inputTypes;
  inLineLabel?: boolean;
  onChange?: (value: string) => void;
};

export const InputField: React.FC<InputFieldType> = ({
  label,
  inLineLabel,
  type = 'text',
  onChange,
  ...rest
}) => {
  return (
    <Label inLineLabel={inLineLabel}>
      <div>{label}</div>
      <Input
        type={type}
        {...rest}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          if (event && event.target) {
            const { target } = event;
            if (onChange) onChange(target.value);
          }
        }}
      />
    </Label>
  );
};
