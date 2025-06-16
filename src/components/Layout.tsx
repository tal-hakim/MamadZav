import { Box, Container } from '@chakra-ui/react';
import Navbar from './Navbar';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <Box minH="100vh" bg="#fbf6f0">
      <Navbar />
      <Container maxW="container.xl" px={{ base: 4, md: 8 }} py={{ base: 4, md: 6 }}>
        {children}
      </Container>
    </Box>
  );
} 