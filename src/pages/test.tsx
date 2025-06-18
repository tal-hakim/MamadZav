import { useState, useEffect } from 'react';
import { Box, Button, Text, VStack, useToast } from '@chakra-ui/react';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

export default function TestPage() {
  const { user, loading } = useAuth();
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const runTest = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      
      // Test auth state
      console.log('Auth state:', { user, loading });
      
      // Test API endpoint
      const response = await axios.get('/api/test-error', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      setTestResult(response.data);
      
      toast({
        title: 'Test successful',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      
      toast({
        title: 'Test failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
    }
  };

  return (
    <Box p={8}>
      <VStack spacing={4} align="stretch">
        <Text fontSize="2xl">Test Page</Text>
        
        <Button onClick={runTest} colorScheme="blue">
          Run Test
        </Button>
        
        {error && (
          <Box p={4} bg="red.100" borderRadius="md">
            <Text color="red.800">Error: {error}</Text>
          </Box>
        )}
        
        {testResult && (
          <Box p={4} bg="green.100" borderRadius="md">
            <Text color="green.800">Test Result:</Text>
            <pre>{JSON.stringify(testResult, null, 2)}</pre>
          </Box>
        )}
        
        <Box p={4} bg="blue.100" borderRadius="md">
          <Text color="blue.800">Auth State:</Text>
          <pre>{JSON.stringify({ user, loading }, null, 2)}</pre>
        </Box>
      </VStack>
    </Box>
  );
} 