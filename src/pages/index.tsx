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
  const hoursDiff = (now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);
  
  return hoursDiff > 24;
};

// Function to format the last check-in time in a user-friendly way
const formatLastCheckIn = (lastCheckIn: string): string => {
  const checkInDate = new Date(lastCheckIn);
  const now = new Date();
  const minutesDiff = Math.floor((now.getTime() - checkInDate.getTime()) / (1000 * 60));
  const hoursDiff = Math.floor(minutesDiff / 60);
  const daysDiff = Math.floor(hoursDiff / 24);

  if (minutesDiff < 60) {
    return `${minutesDiff} minute${minutesDiff === 1 ? '' : 's'} ago`;
  } else if (hoursDiff < 24) {
    return `${hoursDiff} hour${hoursDiff === 1 ? '' : 's'} ago`;
  } else {
    return `${daysDiff} day${daysDiff === 1 ? '' : 's'} ago`;
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

  const handleDeleteFriend = async () => {
    if (!friendToDelete) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      await axios.delete('/api/user/friends', {
        headers: { Authorization: `Bearer ${token}` },
        data: { userId: friendToDelete.id }
      });

      toast({
        title: 'Friend removed',
        status: 'success',
        duration: 3000,
      });

      fetchFriends();
      onAlertClose();
    } catch (error) {
      handleAuthError(error);
      
      toast({
        title: 'Error removing friend',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 3000,
      });
    }
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" minH="50vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  if (!user) {
    return null;
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
                    .filter(friend => 
                      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      friend.username.toLowerCase().includes(searchQuery.toLowerCase())
                    )
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
                    .filter(friend => 
                      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      friend.username.toLowerCase().includes(searchQuery.toLowerCase())
                    )
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
              Are you sure you want to remove {friendToDelete?.name}? This action cannot be undone.
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