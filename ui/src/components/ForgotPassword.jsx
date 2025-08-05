import React, { useState } from 'react';
import { Form, Button, Alert, Container, Card, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      await requestPasswordReset(email);
      setSuccess(true);
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
              <h2 className="text-center mb-4">Reset Password</h2>
              
              {error && (
                <Alert variant="danger" className="mb-4">
                  {error}
                </Alert>
              )}
              
              {success ? (
                <div>
                  <Alert variant="success" className="mb-4">
                    If an account exists with that email, we've sent a password reset link.
                    Please check your email.
                  </Alert>
                  <div className="text-center mt-3">
                    <Link to="/login" className="btn btn-primary">
                      Return to Login
                    </Link>
                  </div>
                </div>
              ) : (
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter your email address"
                    />
                    <Form.Text className="text-muted">
                      We'll send a password reset link to this email address.
                    </Form.Text>
                  </Form.Group>
                  
                  <div className="d-grid gap-2">
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPassword;
