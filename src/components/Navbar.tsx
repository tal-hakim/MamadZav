import {
  Box,
  Flex,
  Button,
  Stack,
  Text,
  HStack,
  Image,
  IconButton,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  VStack,
  useBreakpointValue,
} from '@chakra-ui/react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import { HamburgerIcon } from '@chakra-ui/icons';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isMobile = useBreakpointValue({ base: true, md: false });

  const handleLogout = () => {
    logout();
    router.push('/login');
    onClose();
  };

  const NavLinks = () => (
    <>
      {user ? (
        <>
          <Button
            variant="ghost"
            onClick={() => {
              router.push('/');
              onClose();
            }}
            color={router.pathname === '/' ? 'blue.500' : undefined}
          >
            Home
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              router.push('/test-friends');
              onClose();
            }}
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
            onClick={() => {
              router.push('/login');
              onClose();
            }}
            color={router.pathname === '/login' ? 'blue.500' : undefined}
          >
            Login
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              router.push('/register');
              onClose();
            }}
            color={router.pathname === '/register' ? 'blue.500' : undefined}
          >
            Register
          </Button>
        </>
      )}
    </>
  );

  return (
    <Box
      bg="#f9f1e2"
      px={4}
      shadow="sm"
      position="sticky"
      top={0}
      zIndex={1000}
    >
      <Flex h={{ base: 20, md: 24 }} alignItems="center" justifyContent="space-between">
        <HStack spacing={4} alignItems="center">
          <Image 
            src="/images/logo.png" 
            alt="MamadZav Logo" 
            height={{ base: "50px", md: "80px" }}
            width={{ base: "50px", md: "80px" }}
            cursor="pointer"
            onClick={() => router.push('/')}
          />
          <Text
            fontSize={{ base: "2xl", md: "4xl" }}
            fontWeight="bold"
            fontFamily="'Varela Round', sans-serif"
            cursor="pointer"
            onClick={() => router.push('/')}
          >
            MamadZav
          </Text>
        </HStack>

        {isMobile ? (
          <>
            <IconButton
              aria-label="Open menu"
              icon={<HamburgerIcon />}
              onClick={onOpen}
              variant="ghost"
            />
            <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
              <DrawerOverlay />
              <DrawerContent>
                <DrawerCloseButton />
                <DrawerHeader>Menu</DrawerHeader>
                <DrawerBody>
                  <VStack spacing={4} align="stretch">
                    <NavLinks />
                  </VStack>
                </DrawerBody>
              </DrawerContent>
            </Drawer>
          </>
        ) : (
          <Stack direction="row" spacing={4}>
            <NavLinks />
          </Stack>
        )}
      </Flex>
    </Box>
  );
}