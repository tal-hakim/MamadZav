import { Box, Heading, Text, Button, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/router';

export default function Custom500() {
  const router = useRouter();

  return (
    <Box p={8}>
      <VStack spacing={4} align="stretch">
        <Heading>500 - Server Error</Heading>
        <Text>Sorry, something went wrong on our end. Please try again later.</Text>
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