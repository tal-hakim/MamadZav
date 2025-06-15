import { Box } from '@chakra-ui/react';
import Navbar from './Navbar';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <Box minH="100vh" bg="#fbf6f0">
      <Navbar />
      <Box>{children}</Box>
    </Box>
  );
} 