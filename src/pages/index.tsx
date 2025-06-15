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
import ProfileCircle from '@/components/ProfileCircle';

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
      console.log('Fetching friends list...');
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get('/api/user/friends', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Friends response:', response.data);

      setFriends(response.data.friends || []);
      setFriendRequests(response.data.friendRequests || []);
      console.log('Updated state with new friends and requests');
    } catch (error) {
      console.error('Error fetching friends:', error);
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
      console.log('Accepting friend request for:', username);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Sending PUT request to /api/user/friends');
      const response = await axios.put('/api/user/friends', 
        { username },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Response:', response.data);

      toast({
        title: 'Friend request accepted',
        status: 'success',
        duration: 3000,
      });
      
      console.log('Refreshing friends list...');
      await fetchFriends();
      console.log('Friends list refreshed');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      handleAuthError(error);
      
      toast({
        title: 'Error accepting friend request',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleRejectRequest = async (username: string, userId?: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      await axios.delete('/api/user/friends', {
        headers: { Authorization: `Bearer ${token}` },
        data: userId ? { userId } : { username }
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
          <Box mt={8}>
            <Heading size="md" mb={4}>Friend Requests</Heading>
            <VStack spacing={4} align="stretch">
              {friendRequests.map((request) => (
                <Box key={request.id} p={4} borderWidth={1} borderRadius="lg">
                  <Flex justify="space-between" align="center">
                    <Flex gap={3} align="flex-start">
                      <ProfileCircle name={request.name} />
                      <Box>
                        <Text fontWeight="bold">{request.name}</Text>
                        <Text color="gray.600">@{request.username || 'No username'}</Text>
                      </Box>
                    </Flex>
                    <Flex gap={2}>
                      <Button
                        colorScheme="green"
                        onClick={() => handleAcceptRequest(request.username)}
                        isDisabled={!request.username}
                      >
                        Accept
                      </Button>
                      <Button
                        colorScheme="red"
                        variant="outline"
                        onClick={() => handleRejectRequest(request.username || '', request.id)}
                      >
                        Reject
                      </Button>
                    </Flex>
                  </Flex>
                </Box>
              ))}
            </VStack>
          </Box>
        )}

        <Box>
          <Grid templateColumns="repeat(2, 1fr)" gap={8}>
            {/* Recently Checked In Friends */}
            <GridItem>
              <Box bg="white" p={6} borderRadius="lg" boxShadow="sm" height="100%">
                <Heading size="md" mb={4} color="green.500">
                  Recently Safe ({friends.filter(friend => 
                    friend.lastCheckIn && 
                    new Date().getTime() - new Date(friend.lastCheckIn).getTime() < 10800000 // 3 hours
                  ).length})
                </Heading>
                <VStack spacing={4} align="stretch">
                  {loadingFriends ? (
                    <Flex justify="center" py={8}>
                      <Spinner />
                    </Flex>
                  ) : friends.filter(friend => 
                      friend.lastCheckIn && 
                      new Date().getTime() - new Date(friend.lastCheckIn).getTime() < 10800000
                    ).length === 0 ? (
                    <Text color="gray.500" textAlign="center">
                      No friends have checked in recently
                    </Text>
                  ) : (
                    friends
                      .filter(friend => 
                        friend.lastCheckIn && 
                        new Date().getTime() - new Date(friend.lastCheckIn).getTime() < 10800000
                      )
                      .map((friend) => (
                        <Box
                          key={friend.id}
                          p={4}
                          borderWidth={1}
                          borderRadius="md"
                          bg="green.50"
                        >
                          <Flex justify="space-between" align="center">
                            <Flex gap={3} align="flex-start">
                              <ProfileCircle name={friend.name} />
                              <Box>
                                <Text fontWeight="bold">{friend.name}</Text>
                                <Text fontSize="sm" color="gray.600" mb={1}>@{friend.username}</Text>
                                <Text fontSize="sm" color="green.600">
                                  Last check-in: {new Date(friend.lastCheckIn!).toLocaleString()}
                                </Text>
                              </Box>
                            </Flex>
                          </Flex>
                        </Box>
                      ))
                  )}
                </VStack>
              </Box>
            </GridItem>

            {/* Friends Who Need to Check In */}
            <GridItem>
              <Box bg="white" p={6} borderRadius="lg" boxShadow="sm" height="100%">
                <Heading size="md" mb={4} color="red.500">
                  Need to Check In ({friends.filter(friend => 
                    !friend.lastCheckIn || 
                    new Date().getTime() - new Date(friend.lastCheckIn).getTime() >= 10800000
                  ).length})
                </Heading>
                <VStack spacing={4} align="stretch">
                  {loadingFriends ? (
                    <Flex justify="center" py={8}>
                      <Spinner />
                    </Flex>
                  ) : friends.filter(friend => 
                      !friend.lastCheckIn || 
                      new Date().getTime() - new Date(friend.lastCheckIn).getTime() >= 10800000
                    ).length === 0 ? (
                    <Text color="gray.500" textAlign="center">
                      All friends have checked in recently
                    </Text>
                  ) : (
                    friends
                      .filter(friend => 
                        !friend.lastCheckIn || 
                        new Date().getTime() - new Date(friend.lastCheckIn).getTime() >= 10800000
                      )
                      .map((friend) => (
                        <Box
                          key={friend.id}
                          p={4}
                          borderWidth={1}
                          borderRadius="md"
                          bg="red.50"
                        >
                          <Flex justify="space-between" align="center">
                            <Flex gap={3} align="flex-start">
                              <ProfileCircle name={friend.name} />
                              <Box>
                                <Text fontWeight="bold">{friend.name}</Text>
                                <Text fontSize="sm" color="gray.600" mb={1}>@{friend.username}</Text>
                                <Text fontSize="sm" color="red.600">
                                  {friend.lastCheckIn
                                    ? `Last check-in: ${new Date(friend.lastCheckIn).toLocaleString()}`
                                    : 'No check-in yet'}
                                </Text>
                              </Box>
                            </Flex>
                            <Button
                              size="sm"
                              colorScheme="blue"
                              onClick={() => handlePing(friend.id)}
                            >
                              Ping
                            </Button>
                          </Flex>
                        </Box>
                      ))
                  )}
                </VStack>
              </Box>
            </GridItem>
          </Grid>
        </Box>
      </VStack>
    </Container>
  );
} 