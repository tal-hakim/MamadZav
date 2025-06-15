import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  VStack,
  Heading,
  Button,
  Text,
  useToast,
  Grid,
  GridItem,
  Badge,
  Flex,
  Spinner,
} from '@chakra-ui/react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import axios from 'axios';

interface Friend {
  id: string;
  name: string;
  username: string;
  email: string;
  lastCheckIn: string | null;
}

interface FriendRequest {
  id: string;
  name: string;
  username: string;
  email: string;
  createdAt: string;
}

export default function Home() {
  const { user, loading, checkIn, pingFriend, logout } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      fetchFriends();
    }
  }, [user]);

  const handleAuthError = (error: any) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      toast({
        title: 'Session expired',
        description: 'Please login again',
        status: 'error',
        duration: 3000,
      });
      logout();
      router.push('/login');
    }
  };

  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get('/api/user/friends', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFriends(response.data.friends || []);
      setFriendRequests(response.data.friendRequests || []);
    } catch (error) {
      handleAuthError(error);
      
      toast({
        title: 'Error fetching friends',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 3000,
      });
      setFriends([]);
      setFriendRequests([]);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleAcceptRequest = async (username: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      await axios.put('/api/user/friends', 
        { username },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast({
        title: 'Friend request accepted',
        status: 'success',
        duration: 3000,
      });
      
      fetchFriends();
    } catch (error) {
      handleAuthError(error);
      
      toast({
        title: 'Error accepting friend request',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleRejectRequest = async (username: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      await axios.delete('/api/user/friends', {
        headers: { Authorization: `Bearer ${token}` },
        data: { username }
      });

      toast({
        title: 'Friend request rejected',
        status: 'success',
        duration: 3000,
      });

      fetchFriends();
    } catch (error) {
      handleAuthError(error);
      
      toast({
        title: 'Error rejecting friend request',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      await checkIn();
      toast({
        title: 'Checked in successfully',
        status: 'success',
        duration: 3000,
      });
      fetchFriends(); // Refresh friend list
    } catch (error) {
      toast({
        title: 'Failed to check in',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handlePing = async (friendId: string) => {
    try {
      await pingFriend(friendId);
      toast({
        title: 'Ping sent successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Failed to send ping',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 3000,
      });
    }
  };

  if (loading) {
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
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="lg">Welcome, {user.name}</Heading>
          <Text mt={2} color="gray.600">
            Let your friends know you're safe
          </Text>
        </Box>

        <Box>
          <Button
            colorScheme="green"
            size="lg"
            width="full"
            onClick={handleCheckIn}
            isLoading={isCheckingIn}
            loadingText="Checking in..."
          >
            I'm Safe
          </Button>
        </Box>

        {friendRequests.length > 0 && (
          <Box>
            <Heading size="md" mb={4}>
              Friend Requests
            </Heading>
            <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={4}>
              {friendRequests.map((request) => (
                <GridItem
                  key={request.id}
                  p={4}
                  borderWidth={1}
                  borderRadius="md"
                  boxShadow="sm"
                >
                  <VStack align="stretch" spacing={3}>
                    <Box>
                      <Text fontWeight="bold">{request.name}</Text>
                      <Text fontSize="sm" color="gray.600">@{request.username}</Text>
                    </Box>
                    <Flex gap={2}>
                      <Button
                        size="sm"
                        colorScheme="green"
                        onClick={() => handleAcceptRequest(request.username)}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        colorScheme="red"
                        variant="outline"
                        onClick={() => handleRejectRequest(request.username)}
                      >
                        Reject
                      </Button>
                    </Flex>
                  </VStack>
                </GridItem>
              ))}
            </Grid>
          </Box>
        )}

        <Box>
          <Heading size="md" mb={4}>
            Friends Status
          </Heading>
          {loadingFriends ? (
            <Flex justify="center" py={8}>
              <Spinner />
            </Flex>
          ) : friends.length === 0 ? (
            <Text color="gray.500" textAlign="center">
              No friends added yet
            </Text>
          ) : (
            <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={4}>
              {friends.map((friend) => (
                <GridItem
                  key={friend.id}
                  p={4}
                  borderWidth={1}
                  borderRadius="md"
                  boxShadow="sm"
                >
                  <Flex justify="space-between" align="center">
                    <Box>
                      <Text fontWeight="bold">{friend.name}</Text>
                      <Text fontSize="sm" color="gray.600" mb={1}>@{friend.username}</Text>
                      <Badge
                        colorScheme={
                          friend.lastCheckIn
                            ? new Date().getTime() - new Date(friend.lastCheckIn).getTime() < 3600000
                              ? 'green'
                              : 'yellow'
                            : 'red'
                        }
                      >
                        {friend.lastCheckIn
                          ? `Last check-in: ${new Date(friend.lastCheckIn).toLocaleString()}`
                          : 'No check-in'}
                      </Badge>
                    </Box>
                    {(!friend.lastCheckIn ||
                      new Date().getTime() - new Date(friend.lastCheckIn).getTime() > 3600000) && (
                      <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={() => handlePing(friend.id)}
                      >
                        Ping
                      </Button>
                    )}
                  </Flex>
                </GridItem>
              ))}
            </Grid>
          )}
        </Box>
      </VStack>
    </Container>
  );
} 