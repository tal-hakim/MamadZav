import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Spinner,
  useToast,
  Flex,
} from '@chakra-ui/react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import axios from 'axios';
import ProfileCircle from '@/components/ProfileCircle';

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  friends: number;
  friendRequests: number;
  lastCheckIn: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminUsers() {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setUsers(response.data.users);
    } catch (error) {
      toast({
        title: 'Error fetching users',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  if (loading || loadingUsers) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="100vh">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="lg">User Management</Heading>
          <Text mt={2} color="gray.600">
            View all registered users
          </Text>
        </Box>

        <Box overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>User</Th>
                <Th>Email</Th>
                <Th>Friends</Th>
                <Th>Friend Requests</Th>
                <Th>Last Check-in</Th>
                <Th>Created At</Th>
              </Tr>
            </Thead>
            <Tbody>
              {users.map((user) => (
                <Tr key={user.id}>
                  <Td>
                    <Flex gap={3} align="flex-start">
                      <ProfileCircle name={user.name} size="32px" fontSize="14px" />
                      <Box>
                        <Text fontWeight="bold">{user.name}</Text>
                        <Text fontSize="sm" color="gray.600">@{user.username}</Text>
                      </Box>
                    </Flex>
                  </Td>
                  <Td>{user.email}</Td>
                  <Td>{user.friends}</Td>
                  <Td>
                    {user.friendRequests > 0 ? (
                      <Badge colorScheme="blue">{user.friendRequests}</Badge>
                    ) : (
                      user.friendRequests
                    )}
                  </Td>
                  <Td>
                    {user.lastCheckIn ? (
                      <Badge
                        colorScheme={
                          new Date().getTime() - new Date(user.lastCheckIn).getTime() < 3600000
                            ? 'green'
                            : 'yellow'
                        }
                      >
                        {new Date(user.lastCheckIn).toLocaleString()}
                      </Badge>
                    ) : (
                      <Badge colorScheme="red">Never</Badge>
                    )}
                  </Td>
                  <Td>{new Date(user.createdAt).toLocaleDateString()}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </VStack>
    </Container>
  );
} 