import {
  Box,
  Flex,
  Button,
  Stack,
  useColorModeValue,
  Text,
  HStack,
  Image,
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
      bg="#f9f1e2"
      px={4}
      shadow="sm"
      position="sticky"
      top={0}
      zIndex={1000}
    >
      <Flex h={32} alignItems={'center'} justifyContent={'space-between'}>
        <HStack spacing={4} alignItems="center">
          <Image 
            src="/images/logo.png" 
            alt="MamadZav Logo" 
            height="110px"
            width="110px"
            cursor="pointer"
            onClick={() => router.push('/')}
          />
          <Text
            fontSize="5xl"
            fontWeight="bold"
            fontFamily="'Varela Round', sans-serif"
            cursor="pointer"
            onClick={() => router.push('/')}
          >
            MamadZav
          </Text>
        </HStack>

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