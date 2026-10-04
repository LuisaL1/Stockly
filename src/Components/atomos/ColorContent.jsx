import styled from "styled-components";

export const ColorContent = styled.span`
  display: inline-block;
  height: ${(props) => props.$alto ?? "20px"};
  width: ${(props) => props.$ancho ?? "20px"};
  background-color: ${(props) => props.$color};
  border-radius: 50%;
  box-shadow: 0 0 0 3px ${({ theme }) => theme.surface}, 0 0 0 4px ${({ theme }) => theme.border};
`;
