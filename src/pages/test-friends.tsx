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
  InputGroup,
  InputLeftElement,
  List,
  ListItem,
} from '@chakra-ui/react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import ProfileCircle from '@/components/ProfileCircle';
import { SearchIcon } from '@chakra-ui/icons';

interface FriendRequest {
  id: string;
  name: string;
  username: string;
  email: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
}

export default function TestFriends() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
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

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setIsSearching(true);
        const response = await fetch(`/api/user/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to search users');
        }

        const data = await response.json();
        setSearchResults(data.users || []);
      } catch (error) {
        console.error('Error searching users:', error);
        toast({
          title: 'Error searching users',
          description: error instanceof Error ? error.message : 'Something went wrong',
          status: 'error',
          duration: 3000,
        });
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimeout = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimeout);
  }, [searchQuery, toast]);

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

  const sendFriendRequest = async (username: string) => {
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

      // Clear search results
      setSearchQuery('');
      setSearchResults([]);
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
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.300" />
                </InputLeftElement>
                <Input
                  placeholder="Search users by name or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </InputGroup>
            </Box>
            
            {isSearching ? (
              <Flex justify="center" w="full" py={4}>
                <Spinner />
              </Flex>
            ) : searchResults.length > 0 ? (
              <List spacing={2} w="full">
                {searchResults.map((result) => (
                  <ListItem
                    key={result.id}
                    p={3}
                    bg="white"
                    borderRadius="md"
                    boxShadow="sm"
                  >
                    <Flex justify="space-between" align="center">
                      <Flex align="center" gap={3}>
                        <ProfileCircle name={result.name} />
                        <Box>
                          <Text fontWeight="bold">{result.name}</Text>
                          <Text fontSize="sm" color="gray.600">@{result.username}</Text>
                        </Box>
                      </Flex>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={() => sendFriendRequest(result.username)}
                        isLoading={isLoading}
                      >
                        Add Friend
                      </Button>
                    </Flex>
                  </ListItem>
                ))}
              </List>
            ) : searchQuery && !isSearching ? (
              <Text color="gray.500" textAlign="center">No users found</Text>
            ) : null}
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
                  borderRadius="md"
                  bg="white"
                >
                  <Flex justify="space-between" align="center">
                    <Flex align="center" gap={3}>
                      <ProfileCircle name={request.name} />
                      <Box>
                        <Text fontWeight="bold">{request.name}</Text>
                        <Text fontSize="sm" color="gray.600">@{request.username}</Text>
                      </Box>
                    </Flex>
                    <HStack>
                      <Button
                        size="sm"
                        colorScheme="green"
                        onClick={() => handleFriendRequest(request.username, 'accept')}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleFriendRequest(request.username, 'reject')}
                      >
                        Reject
                      </Button>
                    </HStack>
                  </Flex>
                </Box>
              ))}
            </VStack>
          ) : (
            <Text color="gray.500">No pending friend requests</Text>
          )}
        </Box>
      </VStack>
    </Container>
  );
} 