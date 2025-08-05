import React, { useState } from 'react';
import { Form, Button, Alert, Container, Card, Row, Col } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { login, register } from '../api';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.username, formData.password);
        // Store username in localStorage
        localStorage.setItem('username', formData.username);
      } else {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        await register(formData.email, formData.username, formData.password);
        // After registration, automatically log in
        await login(formData.username, formData.password);
        // Store username in localStorage
        localStorage.setItem('username', formData.username);
      }
      // Redirect to the main app after successful login
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Container className="vh-100 d-flex align-items-center justify-content-center">
      <Row className="w-100">
        <Col md={6} className="mx-auto">
          <Card className="shadow-sm">
            <Card.Body className="p-4">
              <h2 className="text-center mb-4">
                {isLogin ? 'Login' : 'Register'}
              </h2>
              
              {error && (
                <Alert variant="danger" className="mb-4">
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                {!isLogin && (
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required={!isLogin}
                      placeholder="Enter your email"
                    />
                  </Form.Group>
                )}

                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    placeholder="Enter your username"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter your password"
                  />
                </Form.Group>

                {!isLogin && (
                  <Form.Group className="mb-3">
                    <Form.Label>Confirm Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required={!isLogin}
                      placeholder="Confirm your password"
                    />
                  </Form.Group>
                )}

                <div className="d-grid gap-2">
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
                  </Button>
                </div>
              </Form>

              <div className="text-center mt-3">
                <Button
                  variant="link"
                  onClick={() => setIsLogin(!isLogin)}
                  disabled={loading}
                >
                  {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
                </Button>
                
                {isLogin && (
                  <div className="mt-2">
                    <Link to="/forgot-password" className="text-decoration-none">
                      <small>Forgot password?</small>
                    </Link>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;
