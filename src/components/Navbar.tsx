import {
  Box,
  Flex,
  Button,
  Stack,
  useColorModeValue,
  Text,
} from '@chakra-ui/react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <Box
      bg={bgColor}
      px={4}
      borderBottom={1}
      borderStyle={'solid'}
      borderColor={borderColor}
      position="sticky"
      top={0}
      zIndex={1000}
    >
      <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
        <Text
          fontSize="xl"
          fontWeight="bold"
          cursor="pointer"
          onClick={() => router.push('/')}
        >
          Safety Check
        </Text>

        <Stack direction={'row'} spacing={4}>
          {user ? (
            <>
              <Button
                variant="ghost"
                onClick={() => router.push('/')}
                color={router.pathname === '/' ? 'blue.500' : undefined}
              >
                Home
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push('/test-friends')}
                color={router.pathname === '/test-friends' ? 'blue.500' : undefined}
              >
                Add Friends
              </Button>
              <Button
                variant="ghost"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => router.push('/login')}
                color={router.pathname === '/login' ? 'blue.500' : undefined}
              >
                Login
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push('/register')}
                color={router.pathname === '/register' ? 'blue.500' : undefined}
              >
                Register
              </Button>
            </>
          )}
        </Stack>
      </Flex>
    </Box>
  );
} 