import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  Container,
  Heading,
  useToast,
  Code,
} from '@chakra-ui/react';

export default function TestFriends() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Function to fetch user data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please login first.');
      }

      const response = await fetch('/api/user/test-friend-request', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const responseData = await response.json();
      console.log('Response:', responseData);
      setData(responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to fetch data');
      }

      toast({
        title: 'Success',
        description: 'Data fetched successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to test accepting a friend request
  const testAccept = async (requestId: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please login first.');
      }

      console.log('Testing accept for request ID:', requestId);

      const response = await fetch('/api/user/test-friend-request', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId }),
      });

      const responseData = await response.json();
      console.log('Accept response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to accept request');
      }

      toast({
        title: 'Success',
        description: 'Friend request tested successfully',
        status: 'success',
        duration: 3000,
      });

      // Refresh data
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Container maxW="container.md" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading>Friend Request Debug Page</Heading>
        
        <Box>
          <Button
            colorScheme="blue"
            onClick={fetchData}
            isLoading={loading}
            mb={4}
          >
            Refresh Data
          </Button>

          {error && (
            <Text color="red.500" mb={4}>
              Error: {error}
            </Text>
          )}

          <VStack align="stretch" spacing={4}>
            {/* Raw Response Data */}
            <Box>
              <Heading size="md" mb={2}>Raw Response Data:</Heading>
              <Code p={4} borderRadius="md" whiteSpace="pre-wrap">
                {JSON.stringify(data, null, 2)}
              </Code>
            </Box>

            {/* Friend Requests */}
            <Box>
              <Heading size="md" mb={2}>Friend Requests:</Heading>
              {data?.userData?.friendRequests?.length > 0 ? (
                data.userData.friendRequests.map((request: any) => (
                  <Box 
                    key={request.from._id} 
                    p={4} 
                    borderWidth={1} 
                    borderRadius="md" 
                    mb={2}
                  >
                    <Text>From: {request.from.username}</Text>
                    <Text>ID: {request.from._id}</Text>
                    <Button
                      colorScheme="green"
                      size="sm"
                      mt={2}
                      onClick={() => testAccept(request.from._id)}
                      isLoading={loading}
                    >
                      Test Accept
                    </Button>
                  </Box>
                ))
              ) : (
                <Text>No friend requests found</Text>
              )}
            </Box>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
} 