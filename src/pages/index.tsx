import { useEffect, useState, useRef } from 'react';
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
  Input,
  InputGroup,
  InputLeftElement,
  IconButton,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Tooltip,
  HStack,
} from '@chakra-ui/react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import axios from 'axios';
import ProfileCircle from '@/components/ProfileCircle';
import { SearchIcon, CloseIcon } from '@chakra-ui/icons';

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

// Function to check if a check-in is overdue (more than 24 hours old)
const isOverdue = (lastCheckIn: string | null): boolean => {
  if (!lastCheckIn) return true;
  
  const checkInDate = new Date(lastCheckIn);
  const now = new Date();
  const diffInHours = (now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);
  
  return diffInHours >= 24;
};

// Function to format the last check-in time in a user-friendly way
const formatLastCheckIn = (lastCheckIn: string): string => {
  const checkInDate = new Date(lastCheckIn);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor((now.getTime() - checkInDate.getTime()) / (1000 * 60));
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }
};

export default function Home() {
  const { user, loading, checkIn, pingFriend, logout } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [friendToDelete, setFriendToDelete] = useState<Friend | null>(null);
  const { isOpen: isAlertOpen, onOpen: onAlertOpen, onClose: onAlertClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
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
    console.error('Auth error:', error);
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      toast({
        title: 'Session expired',
        description: 'Please log in again',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  };

  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      console.log('Fetching friends list...');
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found');
        return;
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
      const request = friendRequests.find(req => req.username === username);
      if (!request) {
        console.error('Friend request not found');
        return;
      }

      await axios.put('/api/user/friends', 
        { requestId: request.id },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      toast({
        title: 'Friend request accepted',
        status: 'success',
        duration: 3000,
      });

      await fetchFriends();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      handleAuthError(error);
      toast({
        title: 'Error accepting friend request',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleRejectRequest = async (username: string) => {
    try {
      const request = friendRequests.find(req => req.username === username);
      if (!request) {
        console.error('Friend request not found');
        return;
      }

      await axios.delete('/api/user/friends', {
        data: { targetId: request.id },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      toast({
        title: 'Friend request rejected',
        status: 'info',
        duration: 3000,
      });

      await fetchFriends();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      handleAuthError(error);
      toast({
        title: 'Error rejecting friend request',
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
      await axios.post('/api/user/ping', 
        { friendId },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      toast({
        title: 'Check-in reminder sent',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error pinging friend:', error);
      handleAuthError(error);
      toast({
        title: 'Error sending reminder',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDeleteFriend = async () => {
    if (!friendToDelete) return;

    try {
      await axios.delete('/api/user/friends', {
        data: { targetId: friendToDelete.id },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      toast({
        title: 'Friend removed',
        status: 'info',
        duration: 3000,
      });

      onAlertClose();
      await fetchFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
      handleAuthError(error);
      toast({
        title: 'Error removing friend',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const filterFriends = (friend: Friend) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return friend.name.toLowerCase().includes(query) || friend.username.toLowerCase().includes(query);
  };

  if (loading || loadingFriends) {
    return (
      <VStack spacing={4} align="stretch" p={6}>
        <Spinner />
      </VStack>
    );
  }

  if (!user) {
    return (
      <VStack spacing={4} align="stretch" p={6}>
        <Text>Please log in to view this page.</Text>
      </VStack>
    );
  }

  return (
    <Container maxW="container.xl" py={{ base: 4, md: 8 }}>
      <VStack spacing={{ base: 4, md: 8 }} align="stretch">
        <Flex 
          direction={{ base: "column", md: "row" }} 
          align={{ base: "center", md: "center" }} 
          gap={{ base: 2, md: 8 }}
        >
          <Box textAlign={{ base: "center", md: "left" }} mb={{ base: 2, md: 0 }}>
            <Heading size="lg">Welcome, {user.name}</Heading>
            <Text color="gray.600">
              Let your friends know you're safe
            </Text>
          </Box>
          <Button
            colorScheme="green"
            size="lg"
            px={{ base: 8, md: 12 }}
            py={{ base: 6, md: 8 }}
            borderRadius="full"
            onClick={handleCheckIn}
            isLoading={isCheckingIn}
            loadingText="Checking in..."
            fontSize={{ base: "lg", md: "xl" }}
            w={{ base: "full", md: "auto" }}
          >
            I'm Safe!
          </Button>
        </Flex>

        <Box>
          <InputGroup maxW={{ base: "100%", md: "500px" }} mb={4}>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search friends by name or username"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              bg="white"
            />
          </InputGroup>
        </Box>

        {loadingFriends ? (
          <Flex justify="center" align="center" minH="200px">
            <Spinner size="xl" />
          </Flex>
        ) : (
          <Grid
            templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
            gap={8}
          >
            {/* Need to Check In Section - Always First on Mobile */}
            <GridItem order={{ base: 1, md: 2 }}>
              <Box
                bg="white"
                p={6}
                borderRadius="lg"
                boxShadow="sm"
                height="100%"
              >
                <Heading size="md" mb={4}>
                  Need to Check In{" "}
                  {friends.filter(friend => isOverdue(friend.lastCheckIn)).length > 0 && (
                    <Badge colorScheme="red" ml={2}>
                      {friends.filter(friend => isOverdue(friend.lastCheckIn)).length}
                    </Badge>
                  )}
                </Heading>
                <VStack spacing={4} align="stretch">
                  {friends
                    .filter(friend => isOverdue(friend.lastCheckIn))
                    .filter(filterFriends)
                    .map((friend) => (
                      <Flex
                        key={friend.id}
                        justify="space-between"
                        align="center"
                        p={2}
                        bg="red.50"
                        borderRadius="md"
                      >
                        <Flex align="center" gap={3}>
                          <ProfileCircle name={friend.name} />
                          <Box>
                            <Text fontWeight="bold">{friend.name}</Text>
                            <Text fontSize="sm" color="gray.600">
                              @{friend.username}
                            </Text>
                          </Box>
                        </Flex>
                        <HStack>
                          <Tooltip label="Send check-in reminder" hasArrow>
                            <IconButton
                              aria-label="Ping friend"
                              icon={<SearchIcon />}
                              size="sm"
                              onClick={() => handlePing(friend.id)}
                              variant="ghost"
                            />
                          </Tooltip>
                          <Tooltip label="Remove friend" hasArrow>
                            <IconButton
                              aria-label="Remove friend"
                              icon={<CloseIcon />}
                              variant="ghost"
                              colorScheme="red"
                              _hover={{ bg: 'red.100' }}
                              onClick={() => {
                                setFriendToDelete(friend);
                                onAlertOpen();
                              }}
                            />
                          </Tooltip>
                        </HStack>
                      </Flex>
                    ))}
                  {friends.filter(friend => isOverdue(friend.lastCheckIn)).length === 0 && (
                    <Text color="gray.500" textAlign="center">No friends need to check in</Text>
                  )}
                </VStack>
              </Box>
            </GridItem>

            {/* Recently Safe Section */}
            <GridItem order={{ base: 2, md: 1 }}>
              <Box
                bg="white"
                p={6}
                borderRadius="lg"
                boxShadow="sm"
                height="100%"
              >
                <Heading size="md" mb={4}>
                  Recently Safe{" "}
                  {friends.filter(friend => !isOverdue(friend.lastCheckIn)).length > 0 && (
                    <Badge colorScheme="green" ml={2}>
                      {friends.filter(friend => !isOverdue(friend.lastCheckIn)).length}
                    </Badge>
                  )}
                </Heading>
                <VStack spacing={4} align="stretch">
                  {friends
                    .filter(friend => !isOverdue(friend.lastCheckIn))
                    .filter(filterFriends)
                    .map((friend) => (
                      <Flex
                        key={friend.id}
                        justify="space-between"
                        align="center"
                        p={2}
                        bg="green.50"
                        borderRadius="md"
                      >
                        <Flex align="center" gap={3}>
                          <ProfileCircle name={friend.name} />
                          <Box>
                            <Text fontWeight="bold">{friend.name}</Text>
                            <Text fontSize="sm" color="gray.600">
                              @{friend.username}
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                              Last check-in:{" "}
                              {friend.lastCheckIn
                                ? formatLastCheckIn(friend.lastCheckIn)
                                : "Never"}
                            </Text>
                          </Box>
                        </Flex>
                        <Tooltip label="Remove friend" hasArrow>
                          <IconButton
                            aria-label="Remove friend"
                            icon={<CloseIcon />}
                            variant="ghost"
                            colorScheme="red"
                            _hover={{ bg: 'red.100' }}
                            onClick={() => {
                              setFriendToDelete(friend);
                              onAlertOpen();
                            }}
                          />
                        </Tooltip>
                      </Flex>
                    ))}
                  {friends.filter(friend => !isOverdue(friend.lastCheckIn)).length === 0 && (
                    <Text color="gray.500" textAlign="center">No friends have checked in recently</Text>
                  )}
                </VStack>
              </Box>
            </GridItem>
          </Grid>
        )}

        {friendRequests.length > 0 && (
          <Box bg="white" p={6} borderRadius="lg" boxShadow="sm" mt={6}>
            <Heading size="md" mb={4}>Friend Requests</Heading>
            <VStack spacing={4} align="stretch">
              {friendRequests.map(request => (
                <Flex
                  key={request.id}
                  justify="space-between"
                  align="center"
                  bg="gray.50"
                  p={3}
                  borderRadius="md"
                >
                  <Flex align="center" gap={3}>
                    <ProfileCircle name={request.name} />
                    <Box>
                      <Text fontWeight="medium">{request.name}</Text>
                      <Text fontSize="sm" color="gray.500">@{request.username}</Text>
                    </Box>
                  </Flex>
                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      colorScheme="green"
                      onClick={() => handleAcceptRequest(request.username)}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRejectRequest(request.username)}
                    >
                      Reject
                    </Button>
                  </HStack>
                </Flex>
              ))}
            </VStack>
          </Box>
        )}
      </VStack>

      <AlertDialog
        isOpen={isAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={onAlertClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Remove Friend
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to remove {friendToDelete?.name || 'this friend'}? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onAlertClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteFriend} ml={3}>
                Remove
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Container>
  );
} 