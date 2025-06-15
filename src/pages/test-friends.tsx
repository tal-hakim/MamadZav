import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Input,
  VStack,
  Text,
  useToast,
  Container,
  Spinner,
  Flex,
  Heading,
  Divider,
  HStack,
} from '@chakra-ui/react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import ProfileCircle from '@/components/ProfileCircle';

interface FriendRequest {
  id: string;
  name: string;
  username: string;
  email: string;
  createdAt: string;
}

export default function TestFriends() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const toast = useToast();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      fetchFriendRequests();
    }
  }, [user]);

  const fetchFriendRequests = async () => {
    try {
      setIsFetching(true);
      const response = await fetch('/api/user/friends', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch friend requests');
      }
      
      const data = await response.json();
      setFriendRequests(data.friendRequests || []);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      toast({
        title: 'Error fetching friend requests',
        description: error instanceof Error ? error.message : 'Something went wrong',
        status: 'error',
        duration: 3000,
      });
      setFriendRequests([]);
    } finally {
      setIsFetching(false);
    }
  };

  const sendFriendRequest = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send friend request');
      }

      toast({
        title: 'Success!',
        description: data.message,
        status: 'success',
        duration: 3000,
      });

      // Clear input
      setUsername('');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send friend request',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFriendRequest = async (username: string, action: 'accept' | 'reject') => {
    try {
      const response = await fetch('/api/user/friends', {
        method: action === 'accept' ? 'PUT' : 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to ${action} friend request`);
      }

      toast({
        title: 'Success!',
        description: data.message,
        status: 'success',
        duration: 3000,
      });

      // Refresh friend requests
      fetchFriendRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to ${action} friend request`,
        status: 'error',
        duration: 3000,
      });
    }
  };

  if (loading || isFetching) {
    return (
      <Flex justify="center" align="center" minH="calc(100vh - 64px)">
        <Spinner size="xl" />
      </Flex>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Container maxW="container.sm" py={16}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="lg" mb={4}>Add Friends</Heading>
          <VStack spacing={4}>
            <Box w="full">
              <Input
                placeholder="Enter username to add (e.g. israel_israeli)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Box>
            <Button
              colorScheme="blue"
              onClick={sendFriendRequest}
              isLoading={isLoading}
              isDisabled={!username}
              w="full"
            >
              Send Friend Request
            </Button>
          </VStack>
        </Box>

        <Divider />
        
        <Box>
          <Heading size="md" mb={4}>Friend Requests</Heading>
          {friendRequests.length > 0 ? (
            <VStack spacing={4} align="stretch">
              {friendRequests.map((request) => (
                <Box
                  key={request.id}
                  p={4}
                  borderWidth={1}
                  borderRadius="lg"
                  boxShadow="sm"
                >
                  <VStack align="stretch" spacing={3}>
                    <Flex gap={3} align="flex-start">
                      <ProfileCircle name={request.name} />
                      <Box>
                        <Text fontWeight="bold">{request.name}</Text>
                        <Text color="gray.600">@{request.username}</Text>
                      </Box>
                    </Flex>
                    <HStack spacing={4}>
                      <Button
                        colorScheme="green"
                        size="sm"
                        onClick={() => handleFriendRequest(request.username, 'accept')}
                      >
                        Accept
                      </Button>
                      <Button
                        colorScheme="red"
                        variant="outline"
                        size="sm"
                        onClick={() => handleFriendRequest(request.username, 'reject')}
                      >
                        Reject
                      </Button>
                    </HStack>
                  </VStack>
                </Box>
              ))}
            </VStack>
          ) : (
            <Text color="gray.600">No pending friend requests</Text>
          )}
        </Box>
      </VStack>
    </Container>
  );
} 