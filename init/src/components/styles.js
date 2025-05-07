import styled from "styled-components";

// Page Layout Components
export const PageContainer = styled.div`
  padding: 1rem;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  
  @media (min-width: 768px) {
    padding: 2rem;
  }
`;

export const PageHeader = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: #333;
  text-align: center;

  @media (min-width: 768px) {
    font-size: 2rem;
    text-align: left;
  }
`;

export const SectionHeader = styled.h2`
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: #444;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;

  @media (min-width: 768px) {
    font-size: 1.5rem;
  }
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-direction: column;
  gap: 1rem;
  
  @media (min-width: 768px) {
    flex-direction: row;
    margin-bottom: 2rem;
  }
`;

export const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  justify-content: center;

  h1 {
    font-size: 1.5rem;
    color: #2d3748;
    margin: 0;
  }

  svg {
    color: #4a5568;
  }
  
  @media (min-width: 768px) {
    width: auto;
    justify-content: flex-start;
    gap: 1rem;
    
    h1 {
      font-size: 1.8rem;
    }
  }
`;

// Form Components
export const FormContainer = styled.form`
  background: white;
  padding: 1.25rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;

  @media (min-width: 768px) {
    padding: 1.5rem;
  }
`;

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

export const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

export const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
  font-size: 0.875rem;

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

export const Input = styled.input`
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid ${(props) => (props.hasError ? "#e74c3c" : "#ddd")};
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  background-color: white;
  min-height: 2.5rem;

  &:focus {
    outline: none;
    border-color: #4299e1;
    box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.15);
  }

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

export const Select = styled.select`
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid ${(props) => (props.hasError ? "#e74c3c" : "#ddd")};
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background-color: white;
  min-height: 2.5rem;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;

  &:focus {
    outline: none;
    border-color: #4299e1;
    box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.15);
  }

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

// Button Components
export const ButtonContainer = styled.div`
  margin-top: 1.25rem;
  display: flex;
  justify-content: center;

  @media (min-width: 768px) {
    justify-content: flex-start;
  }
`;

export const Button = styled.button`
  padding: 0.625rem 1rem;
  background-color: #4299e1;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  max-width: 200px;

  &:hover {
    background-color: #3182ce;
  }

  &:disabled {
    background-color: #a0aec0;
    cursor: not-allowed;
  }

  @media (min-width: 768px) {
    font-size: 1rem;
    padding: 0.75rem 1.25rem;
  }
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-direction: column;
  
  @media (min-width: 480px) {
    flex-direction: row;
    gap: 1rem;
  }
`;

export const PrimaryButton = styled.button`
  padding: 0.75rem 1rem;
  background-color: #4299e1;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;

  &:hover {
    background-color: #3182ce;
  }
  
  @media (min-width: 480px) {
    padding: 0.75rem 1.5rem;
    flex: 1;
  }
`;

export const SecondaryButton = styled.button`
  padding: 0.75rem 1rem;
  background-color: white;
  color: #4299e1;
  border: 1px solid #4299e1;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;

  &:hover {
    background-color: #ebf8ff;
  }
  
  @media (min-width: 480px) {
    padding: 0.75rem 1.5rem;
    flex: 1;
  }
`;

// Action Buttons
export const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
  
  @media (min-width: 768px) {
    justify-content: flex-start;
  }
`;

export const ActionButton = styled.button`
  background-color: ${(props) => props.bgColor || "#ebf8ff"};
  color: ${(props) => props.color || "#3182ce"};
  border: none;
  border-radius: 0.25rem;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${(props) => props.hoverBgColor || "#bee3f8"};
  }
`;

export const AssignButton = styled(ActionButton).attrs({
  bgColor: "#ebf8ff",
  color: "#3182ce",
  hoverBgColor: "#bee3f8"
})``;

export const EditButton = styled(ActionButton).attrs({
  bgColor: "#f0fff4",
  color: "#38a169",
  hoverBgColor: "#c6f6d5"
})``;

export const DeleteButton = styled(ActionButton).attrs({
  bgColor: "#fff5f5",
  color: "#e53e3e",
  hoverBgColor: "#fed7d7"
})``;

// File Upload Components
export const FileUploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;

  @media (min-width: 480px) {
    flex-direction: row;
    align-items: center;
  }
`;

export const FileInputLabel = styled.label`
  display: inline-block;
  padding: 0.625rem 1rem;
  background-color: #edf2f7;
  color: #4a5568;
  border: 1px solid #cbd5e0;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  text-align: center;
  transition: all 0.2s ease;
  width: 100%;

  &:hover {
    background-color: #e2e8f0;
  }

  @media (min-width: 480px) {
    width: auto;
    flex-shrink: 0;
  }

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

export const FileInput = styled.input`
  display: none;
`;

export const FileName = styled.span`
  font-size: 0.875rem;
  color: #4a5568;
  word-break: break-all;
  text-align: center;

  @media (min-width: 480px) {
    text-align: left;
  }

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

// Search Components
export const SearchBox = styled.div`
  display: flex;
  align-items: center;
  background: white;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  width: 100%;

  input {
    border: none;
    outline: none;
    padding: 0.5rem;
    width: 100%;
    font-size: 1rem;
  }

  svg {
    color: #a0aec0;
    margin-right: 0.5rem;
  }
  
  @media (min-width: 768px) {
    width: 300px;
  }
`;

// Table Components
export const TableContainer = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 650px;

  th {
    background-color: #f7fafc;
    color: #4a5568;
    font-weight: 600;
    text-align: left;
    padding: 1rem;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
  }

  td {
    padding: 1rem;
    border-bottom: 1px solid #e2e8f0;
    color: #2d3748;
  }

  tr:hover td {
    background-color: #f8fafc;
  }
`;

export const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  white-space: nowrap;
  
  background-color: ${(props) =>
    props.status === "Paid" || props.status === "paid"
      ? "#ebf8ff"
      : props.status === "Partially Paid" || props.status === "partially paid"
      ? "#fefcbf"
      : props.status === "Unpaid" || props.status === "unpaid" || props.status === "pending"
      ? "#fff5f5"
      : "#f0fff4"};
      
  color: ${(props) =>
    props.status === "Paid" || props.status === "paid"
      ? "#3182ce"
      : props.status === "Partially Paid" || props.status === "partially paid"
      ? "#d69e2e"
      : props.status === "Unpaid" || props.status === "unpaid" || props.status === "pending"
      ? "#e53e3e"
      : "#38a169"};
`;

// Message Components
export const Message = styled.div`
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  font-size: 0.875rem;
  background-color: ${(props) =>
    props.type === "error" ? "#fff5f5" : "#f0fff4"};
  color: ${(props) => (props.type === "error" ? "#e53e3e" : "#38a169")};
  border-left: 4px solid
    ${(props) => (props.type === "error" ? "#e53e3e" : "#38a169")};
  width: 100%;

  @media (min-width: 768px) {
    font-size: 1rem;
    padding: 1rem 1.25rem;
  }
`;

export const SuccessMessage = styled(Message).attrs({
  type: "success"
})``;

export const ErrorMessage = styled(Message).attrs({
  type: "error"
})`
  white-space: pre-line;
`;

export const ErrorText = styled.span`
  color: #e74c3c;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  display: block;

  @media (min-width: 768px) {
    font-size: 0.875rem;
  }
`;

export const NoteText = styled.p`
  font-size: 0.875rem;
  color: #718096;
  margin-top: 1rem;
  line-height: 1.5;

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

// Loading Components
export const LoadingIndicator = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #4a5568;
  gap: 1rem;
`;

export const Spinner = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #4299e1;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

// Modal Components
export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
`;

export const ModalContent = styled.div`
  background: white;
  border-radius: 0.5rem;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
`;

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  border-bottom: 1px solid #e2e8f0;

  h3 {
    margin: 0;
    font-size: 1.15rem;
    color: #2d3748;
  }
  
  @media (min-width: 768px) {
    padding: 1.5rem;
    
    h3 {
      font-size: 1.25rem;
    }
  }
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #a0aec0;
  padding: 0.5rem;

  &:hover {
    color: #718096;
  }
`;

export const Form = styled.form`
  padding: 1.25rem;
  
  @media (min-width: 768px) {
    padding: 1.5rem;
  }
`;