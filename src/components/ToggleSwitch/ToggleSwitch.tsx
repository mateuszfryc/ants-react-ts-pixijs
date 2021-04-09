import React from 'react';
import styled, { css } from 'styled-components';

import { Flex } from 'components/Flex';

export const Label = styled.label(
  () => css`
    align-items: center;
    cursor: pointer;
    display: flex;
    position: relative;
  `,
);

export const Name = styled(Flex)(
  ({ theme: { colors, padding } }) => css`
    font-size: 0.95rem;
    margin-left: 2rem;
    padding: ${padding.small};

    &::before {
      background-color: ${colors.shadeLight};
      border: 3px solid ${colors.shadeLight};
      content: '';
      display: block;
      border-radius: 2rem;
      position: absolute;
      left: 0;
      width: 2rem;
      height: 1rem;
    }

    &::after {
      background-color: ${colors.secondary};
      /* border: 1px solid ${colors.shadeMid}; */
      content: '';
      display: block;
      border-radius: 50%;
      position: absolute;
      left: 1.2rem;
      width: 1rem;
      height: 1rem;
      transition: left 0.1s ease, background-color 0.1s ease;
    }
  `,
);

export const Input = styled.input(
  ({ theme: { colors } }) => css`
    position: absolute;
    left: 0;
    visibility: hidden;
    width: 2rem;
    height: 1rem;
    border-radius: 35%;

    &:checked + ${Name} {
      &::before {
        background-color: ${colors.hightlight};
        border-color: ${colors.hightlight};
      }

      &::after {
        left: 0.2rem;
      }
    }
  `,
);

type ToggleSwitchPropsType = {
  id: string;
  name?: string;
  value?: string | number | readonly string[];
  disabled?: boolean;
  onChange?: (value: boolean, target?: HTMLInputElement) => void;
};

export const ToggleSwitch: React.FC<ToggleSwitchPropsType> = ({
  id,
  disabled,
  children,
  name,
  onChange,
  value,
}) => {
  const onChangeHandler = ({ currentTarget }: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange && currentTarget && currentTarget.id === id)
      onChange(currentTarget.checked, currentTarget);
  };

  return (
    <Label htmlFor={id}>
      <Input
        disabled={disabled}
        id={id}
        name={name || id}
        onChange={onChangeHandler}
        value={value || id}
        type='checkbox'
      />
      <Name>{children}</Name>
    </Label>
  );
};
