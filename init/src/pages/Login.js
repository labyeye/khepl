import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

const LoginContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`;

const LoginWrapper = styled.div`
  display: flex;
  background: white;
  border-radius: 15px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  width: 100%;
  max-width: 900px;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ImageSection = styled.div`
  flex: 1;
  background: #f5f7fa;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;

  @media (max-width: 768px) {
    padding: 20px;
    display: none;
  }
`;

const LoginImage = styled.div`
  width: 100%;
  height: 400px;
  background-image: url('https://pbs.twimg.com/profile_images/697013668345589760/Rkfu4ZTw_400x400.png');
  background-size: cover;
  background-position: center;
  border-radius: 10px;
`;

const LoginFormSection = styled.div`
  flex: 1;
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;

  @media (max-width: 480px) {
    padding: 1.5rem;
  }
`;

const FormTitle = styled.h2`
  color: #333;
  text-align: center;
  margin-bottom: 2rem;
  font-weight: 600;
  font-size: 1.8rem;
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  
  img {
    max-width: 150px;
    height: auto;
  }
`;

const InputGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const InputLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-size: 0.9rem;
  font-weight: 500;
`;

const InputField = styled.input`
  width: 100%;
  padding: 0.8rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;

  &:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    outline: none;
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 0.8rem;
  background: linear-gradient(to right, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 0.5rem;

  &:hover {
    opacity: 0.9;
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }
`;

const ErrorMessage = styled.p`
  color: #e74c3c;
  text-align: center;
  margin-top: 1rem;
  font-size: 0.9rem;
`;

const FooterText = styled.p`
  text-align: center;
  margin-top: 2rem;
  color: #777;
  font-size: 0.8rem;

  a {
    color: #667eea;
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await axios.post("https://kalahanu-outstanding.onrender.com/api/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      if (res.data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/staff");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid credentials. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginContainer>
      <LoginWrapper>
        <ImageSection>
          <LoginImage />
        </ImageSection>

        <LoginFormSection>
          <Logo>
            {/* Replace with your actual logo */}
            <div style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#667eea',
              marginBottom: '10px'
            }}>
              Kalahanu Enterprises Private Limited
            </div>
          </Logo>
          
          <FormTitle>Welcome Back</FormTitle>
          
          <form onSubmit={handleLogin}>
            <InputGroup>
              <InputLabel>Email Address</InputLabel>
              <InputField
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </InputGroup>

            <InputGroup>
              <InputLabel>Password</InputLabel>
              <InputField
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </InputGroup>

            <SubmitButton type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  {" "}Logging in...
                </>
              ) : "Login"}
            </SubmitButton>

            {error && <ErrorMessage>{error}</ErrorMessage>}
          </form>

          <FooterText>
            Forgot your password? <a href="/forgot-password">Reset it here</a>
          </FooterText>
        </LoginFormSection>
      </LoginWrapper>
    </LoginContainer>
  );
};

export default Login;