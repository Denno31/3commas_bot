import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Container, Card, Row, Col } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Validate that we have a token
    if (!token) {
      setError('Invalid password reset link');
    }
  }, [token]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      // Check if passwords match
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      await resetPassword(token, formData.password);
      setSuccess(true);
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="vh-100 d-flex align-items-center justify-content-center">
      <Row className="w-100">
        <Col md={6} className="mx-auto">
          <Card className="shadow-sm">
            <Card.Body className="p-4">
              <h2 className="text-center mb-4">Create New Password</h2>
              
              {error && (
                <Alert variant="danger" className="mb-4">
                  {error}
                </Alert>
              )}
              
              {success ? (
                <Alert variant="success" className="mb-4">
                  Password successfully reset! Redirecting to login page...
                </Alert>
              ) : (
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>New Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                      placeholder="Enter new password"
                    />
                    <Form.Text className="text-muted">
                      Must be at least 6 characters long.
                    </Form.Text>
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Confirm Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="Confirm new password"
                    />
                  </Form.Group>
                  
                  <div className="d-grid gap-2">
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={loading || !token}
                    >
                      {loading ? 'Resetting...' : 'Reset Password'}
                    </Button>
                  </div>
                  
                  <div className="text-center mt-3">
                    <Link to="/login" className="text-decoration-none">
                      Back to Login
                    </Link>
                  </div>
                </Form>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ResetPassword;
