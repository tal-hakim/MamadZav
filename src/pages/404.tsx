import { Box, Heading, Text, Button, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/router';

export default function Custom404() {
  const router = useRouter();

  return (
    <Box p={8}>
      <VStack spacing={4} align="stretch">
        <Heading>404 - Page Not Found</Heading>
        <Text>The page you're looking for doesn't exist or has been moved.</Text>
        <Button
          onClick={() => router.push('/')}
          colorScheme="blue"
          width="fit-content"
        >
          Go back home
        </Button>
      </VStack>
    </Box>
  );
} 